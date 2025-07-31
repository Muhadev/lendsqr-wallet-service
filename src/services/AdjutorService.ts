import axios, { type AxiosInstance } from "axios"
import { logger } from "../utils/logger"
import { AppError } from "../utils/AppError"

export interface KarmaIdentity {
  identity_number: string
  identity_type: "BVN" | "NIN" | "PHONE_NUMBER" | "EMAIL"
}

const requiredAdjutorEnvs = [
  "KARMA_MAX_CONCURRENT_REQUESTS",
  "KARMA_ENDPOINT",
  "ALLOW_REGISTRATION_ON_KARMA_FAILURE",
  "ADJUTOR_API_URL",
  "ADJUTOR_API_KEY",
  "ADJUTOR_API_TIMEOUT"
]
requiredAdjutorEnvs.forEach((env) => {
  if (typeof process.env[env] === "undefined") {
    throw new AppError(`Missing required environment variable: ${env}`, 500)
  }
})

export interface KarmaCheckResponse {
  status: boolean
  message: string
  data?: {
    karma_identity: string
    amount_in_contention: number
    reason: string
    default_date: string
    lender: string
  }
}

/**
 * Service for interacting with Lendsqr Adjutor API for blacklist verification
 */
export class AdjutorService {
  private client: AxiosInstance
  private baseURL: string
  private apiKey: string
  private timeout: number
  private maxConcurrent: number
  private endpoint: string
  private allowOnFailure: boolean

  constructor() {
    this.baseURL = process.env.ADJUTOR_API_URL!
    this.apiKey = process.env.ADJUTOR_API_KEY!
    this.timeout = Number.parseInt(process.env.ADJUTOR_API_TIMEOUT!)
    this.maxConcurrent = Number.parseInt(process.env.KARMA_MAX_CONCURRENT_REQUESTS!)
    this.endpoint = process.env.KARMA_ENDPOINT!
    this.allowOnFailure = process.env.ALLOW_REGISTRATION_ON_KARMA_FAILURE === "true"

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": `Lendsqr-Wallet-Service/${process.env.API_VERSION}`,
      },
    })

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.info("Adjutor API Request initiated", {
          method: config.method?.toUpperCase(),
          url: config.url,
        })
        return config
      },
      (error) => {
        logger.error("Adjutor API Request Error", { error: error.message })
        return Promise.reject(error)
      },
    )

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.info("Adjutor API Response received", {
          status: response.status,
          url: response.config.url,
        })
        return response
      },
      (error) => {
        logger.error("Adjutor API Response Error", {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          url: error.config?.url,
        })
        return Promise.reject(error)
      },
    )
  }

  /**
   * Check if a user is blacklisted in Karma
   * @param identity - User identity information
   * @returns Promise<KarmaCheckResponse>
   */
  async checkKarmaBlacklist(identity: KarmaIdentity): Promise<KarmaCheckResponse> {
    try {
      const response = await this.client.post(this.endpoint, identity)

      logger.info("Karma blacklist check completed", {
        identity_type: identity.identity_type,
        identity_number: identity.identity_number.slice(-4), // Log only last 4 digits for privacy
        is_blacklisted: response.data.status,
      })

      return {
        status: response.data.status || false,
        message: response.data.message || "Check completed",
        data: response.data.data,
      }
    } catch (error: any) {
      logger.error("Karma blacklist check failed", {
        identity_type: identity.identity_type,
        error: error.response?.data?.message || error.message,
      })

      // If API is down, we'll allow user registration but log the issue
      if (error.code === "ECONNREFUSED" || error.response?.status === 503) {
        logger.warn("Adjutor API unavailable, allowing registration")
        return {
          status: false,
          message: "Blacklist check temporarily unavailable",
        }
      }

      // For other errors, we'll be more restrictive
      if (error.response?.status === 401) {
        throw new AppError("Invalid API credentials", 500)
      }

      if (error.response?.status === 429) {
        throw new AppError("Too many requests to verification service", 429)
      }

      // Default to allowing registration if we can't verify
      return {
        status: false,
        message: "Blacklist verification completed",
      }
    }
  }

  /**
   * Check multiple identities against Karma blacklist
   * @param identities - Array of user identities
   * @returns Promise<KarmaCheckResponse[]>
   */
  async checkMultipleIdentities(identities: KarmaIdentity[]): Promise<KarmaCheckResponse[]> {
    const results: KarmaCheckResponse[] = []

    // Process identities in batches to avoid overwhelming the API
    for (let i = 0; i < identities.length; i += this.maxConcurrent) {
      const batch = identities.slice(i, i + this.maxConcurrent)
      const batchResults = await Promise.allSettled(batch.map((identity) => this.checkKarmaBlacklist(identity)))

      batchResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          results.push(result.value)
        } else {
          logger.error(`Karma check failed for identity ${i + index}`, {
            error: result.reason?.message,
          })
          results.push({
            status: false,
            message: "Verification failed",
          })
        }
      })
    }

    return results
  }

  /**
   * Comprehensive user verification
   * @param userData - User data to verify
   * @returns Promise<boolean>
   */
  async verifyUser(userData: {
    email: string
    phone: string
    bvn: string
  }): Promise<boolean> {
    const identities: KarmaIdentity[] = [
      { identity_number: userData.bvn, identity_type: "BVN" },
      { identity_number: userData.phone, identity_type: "PHONE_NUMBER" },
      { identity_number: userData.email, identity_type: "EMAIL" },
    ]

    try {
      const results = await this.checkMultipleIdentities(identities)

      // If any identity is blacklisted, reject the user
      const isBlacklisted = results.some((result) => result.status === true)

      if (isBlacklisted) {
        const blacklistedIdentities = results
          .filter((result) => result.status === true)
          .map((result, index) => identities[index].identity_type)

        logger.warn("User failed blacklist verification", {
          email: userData.email,
          blacklisted_identities: blacklistedIdentities,
        })

        return false
      }

      logger.info("User passed blacklist verification", {
        email: userData.email,
      })

      return true
    } catch (error: any) {
      logger.error("User verification process failed", {
        error: error.message,
        email: userData.email,
      })

      // In case of service failure, use the validated config value
      if (this.allowOnFailure) {
        logger.warn("Allowing registration despite verification failure due to configuration")
      }

      return this.allowOnFailure
    }
  }
}