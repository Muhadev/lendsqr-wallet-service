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

  constructor() {
    this.baseURL = process.env.ADJUTOR_API_URL!
    this.apiKey = process.env.ADJUTOR_API_KEY!
    this.timeout = Number.parseInt(process.env.ADJUTOR_API_TIMEOUT!)
    this.maxConcurrent = Number.parseInt(process.env.KARMA_MAX_CONCURRENT_REQUESTS!)
    this.endpoint = process.env.KARMA_ENDPOINT!

    // Log configuration for debugging
    logger.info("AdjutorService initialized", {
      baseURL: this.baseURL,
      endpoint: this.endpoint,
      timeout: this.timeout,
      apiKeyPresent: !!this.apiKey,
      apiKeyPrefix: this.apiKey.substring(0, 8) + "..."
    })

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": `Lendsqr-Wallet-Service/${process.env.API_VERSION}`,
        "Accept": "application/json"
      },
    })

    // Request interceptor for detailed logging
    this.client.interceptors.request.use(
      (config) => {
        logger.info("Adjutor API Request initiated", {
          method: config.method?.toUpperCase(),
          url: config.url,
          fullURL: `${config.baseURL}${config.url}`,
          headers: {
            "Content-Type": config.headers["Content-Type"],
            "Accept": config.headers["Accept"],
            "Authorization": `Bearer ${this.apiKey.substring(0, 8)}...`,
            "User-Agent": config.headers["User-Agent"]
          },
          data: config.data
        })
        return config
      },
      (error) => {
        logger.error("Adjutor API Request Error", { error: error.message })
        return Promise.reject(error)
      },
    )

    // Response interceptor for detailed logging
    this.client.interceptors.response.use(
      (response) => {
        logger.info("Adjutor API Response received", {
          status: response.status,
          statusText: response.statusText,
          url: response.config.url,
          data: response.data,
          headers: response.headers
        })
        return response
      },
      (error) => {
        logger.error("Adjutor API Response Error", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.response?.data?.message || error.message,
          url: error.config?.url,
          method: error.config?.method,
          requestData: error.config?.data,
          responseHeaders: error.response?.headers,
          fullError: error.toJSON ? error.toJSON() : error
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
      logger.info("Starting Karma blacklist check", {
        identity_type: identity.identity_type,
        identity_number_masked: identity.identity_number.slice(-4),
        endpoint: this.endpoint,
        baseURL: this.baseURL,
        requestPayload: identity
      })

      const response = await this.client.post(this.endpoint, identity)

      logger.info("Karma blacklist check completed successfully", {
        identity_type: identity.identity_type,
        identity_number_masked: identity.identity_number.slice(-4),
        is_blacklisted: response.data.status,
        response_status: response.status,
        full_response: response.data
      })

      return {
        status: response.data.status || false,
        message: response.data.message || "Check completed",
        data: response.data.data,
      }
    } catch (error: any) {
      logger.error("Karma blacklist check failed - Detailed Error", {
        identity_type: identity.identity_type,
        identity_number_masked: identity.identity_number.slice(-4),
        error_message: error.response?.data?.message || error.message,
        error_status: error.response?.status,
        error_data: error.response?.data,
        error_code: error.code,
        error_name: error.name,
        stack: error.stack,
        isTimeout: error.code === 'ECONNABORTED',
        isNetworkError: !error.response,
        fullErrorObject: JSON.stringify(error, Object.getOwnPropertyNames(error))
      })

      // Enhanced error handling with more specific messages
      if (error.response) {
        const statusCode = error.response.status
        const errorData = error.response.data
        
        if (statusCode === 401) {
          logger.error("Authentication failed with Adjutor API", {
            apiKey: this.apiKey.substring(0, 8) + "...",
            message: "Please verify your API key is correct and active"
          })
          throw new AppError("Invalid API key for Adjutor service. Please check your credentials.", 503)
        } else if (statusCode === 403) {
          throw new AppError("Access forbidden to Adjutor API. Your account may not have access to the Karma service.", 503)
        } else if (statusCode === 404) {
          throw new AppError(`Adjutor API endpoint not found: ${this.baseURL}${this.endpoint}`, 503)
        } else if (statusCode === 422) {
          throw new AppError(`Invalid request data sent to Adjutor API: ${errorData?.message || 'Validation failed'}`, 503)
        } else if (statusCode === 429) {
          throw new AppError("Rate limit exceeded for Adjutor API. Please try again later.", 503)
        } else if (statusCode >= 500) {
          throw new AppError(`Adjutor API server error (${statusCode}): ${errorData?.message || 'Service temporarily unavailable'}`, 503)
        } else {
          throw new AppError(`Adjutor API error (${statusCode}): ${errorData?.message || error.message}`, 503)
        }
      } else if (error.request) {
        if (error.code === 'ECONNABORTED') {
          throw new AppError(`Adjutor API request timed out after ${this.timeout}ms. The service may be slow or unavailable.`, 503)
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          throw new AppError(`Cannot connect to Adjutor API at ${this.baseURL}. Please check the URL is correct.`, 503)
        } else {
          throw new AppError(`Network error connecting to Adjutor API: ${error.message}`, 503)
        }
      } else {
        throw new AppError(`Adjutor API request setup error: ${error.message}`, 503)
      }
    }
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      // Test with a simple BVN check
      const testIdentity: KarmaIdentity = {
        identity_number: "12345678901", // Test BVN
        identity_type: "BVN"
      }
      
      logger.info("Testing Adjutor API connection", {
        baseURL: this.baseURL,
        endpoint: this.endpoint,
        testIdentity
      })
      
      await this.checkKarmaBlacklist(testIdentity)
      return true
    } catch (error: any) {
      logger.error("Adjutor API connection test failed", {
        error: error.message
      })
      return false
    }
  }

  /**
   * Check multiple identities against Karma blacklist
   * @param identities - Array of user identities
   * @returns Promise<KarmaCheckResponse[]>
   */
  async checkMultipleIdentities(identities: KarmaIdentity[]): Promise<KarmaCheckResponse[]> {
    const results: KarmaCheckResponse[] = []

    logger.info("Starting multiple identity checks", {
      identityCount: identities.length,
      identityTypes: identities.map(i => i.identity_type),
      maxConcurrent: this.maxConcurrent
    })

    // Process identities in batches to avoid overwhelming the API
    for (let i = 0; i < identities.length; i += this.maxConcurrent) {
      const batch = identities.slice(i, i + this.maxConcurrent)
      
      logger.info(`Processing batch ${Math.floor(i / this.maxConcurrent) + 1}`, {
        batchSize: batch.length,
        identityTypes: batch.map(identity => identity.identity_type)
      })
      
      const batchResults = await Promise.allSettled(batch.map((identity) => this.checkKarmaBlacklist(identity)))

      batchResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          results.push(result.value)
          logger.info(`Identity check ${i + index} succeeded`, {
            identity_type: batch[index].identity_type,
            is_blacklisted: result.value.status
          })
        } else {
          logger.error(`Identity check ${i + index} failed`, {
            identity_type: batch[index].identity_type,
            error: result.reason?.message,
          })
          
          // Check if we should allow registration on failure
          const allowOnFailure = process.env.ALLOW_REGISTRATION_ON_KARMA_FAILURE === 'true'
          
          if (allowOnFailure) {
            logger.warn("Proceeding despite Karma check failure", {
              reason: "ALLOW_REGISTRATION_ON_KARMA_FAILURE is enabled",
              identity_type: batch[index].identity_type
            })
            // Push a default "not blacklisted" result
            results.push({
              status: false,
              message: "Check bypassed due to API failure"
            })
          } else {
            throw new AppError("Unable to verify blacklist status. Registration denied.", 503)
          }
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

    logger.info("Starting comprehensive user verification", {
      email: userData.email,
      identityCount: identities.length
    })

    const results = await this.checkMultipleIdentities(identities)

    // If any identity is blacklisted, reject the user
    const blacklistedResults = results.filter((result) => result.status === true)
    const isBlacklisted = blacklistedResults.length > 0

    if (isBlacklisted) {
      const blacklistedIdentities = blacklistedResults
        .map((result, index) => identities[index].identity_type)

      logger.warn("User failed blacklist verification", {
        email: userData.email,
        blacklisted_identities: blacklistedIdentities,
        blacklisted_count: blacklistedResults.length
      })

      return false
    }

    logger.info("User passed blacklist verification", {
      email: userData.email,
      checks_passed: results.length
    })

    return true
  }
}