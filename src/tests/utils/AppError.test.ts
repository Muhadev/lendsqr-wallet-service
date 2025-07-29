import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  InsufficientFundsError,
  BlacklistError,
} from "../../utils/AppError"

describe("AppError Classes", () => {
  describe("AppError", () => {
    it("should create AppError with default values", () => {
      const error = new AppError("Test error")

      expect(error.message).toBe("Test error")
      expect(error.statusCode).toBe(500)
      expect(error.isOperational).toBe(true)
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(AppError)
    })

    it("should create AppError with custom values", () => {
      const error = new AppError("Custom error", 400, false)

      expect(error.message).toBe("Custom error")
      expect(error.statusCode).toBe(400)
      expect(error.isOperational).toBe(false)
    })

    it("should have proper prototype chain", () => {
      const error = new AppError("Test error")

      expect(error.name).toBe("Error")
      expect(error.stack).toBeDefined()
    })
  })

  describe("ValidationError", () => {
    it("should create ValidationError with correct status code", () => {
      const error = new ValidationError("Validation failed")

      expect(error.message).toBe("Validation failed")
      expect(error.statusCode).toBe(400)
      expect(error.isOperational).toBe(true)
      expect(error).toBeInstanceOf(AppError)
      expect(error).toBeInstanceOf(ValidationError)
    })
  })

  describe("AuthenticationError", () => {
    it("should create AuthenticationError with default message", () => {
      const error = new AuthenticationError()

      expect(error.message).toBe("Authentication failed")
      expect(error.statusCode).toBe(401)
      expect(error.isOperational).toBe(true)
    })

    it("should create AuthenticationError with custom message", () => {
      const error = new AuthenticationError("Invalid credentials")

      expect(error.message).toBe("Invalid credentials")
      expect(error.statusCode).toBe(401)
    })
  })

  describe("AuthorizationError", () => {
    it("should create AuthorizationError with default message", () => {
      const error = new AuthorizationError()

      expect(error.message).toBe("Access denied")
      expect(error.statusCode).toBe(403)
      expect(error.isOperational).toBe(true)
    })

    it("should create AuthorizationError with custom message", () => {
      const error = new AuthorizationError("Insufficient permissions")

      expect(error.message).toBe("Insufficient permissions")
      expect(error.statusCode).toBe(403)
    })
  })

  describe("NotFoundError", () => {
    it("should create NotFoundError with default message", () => {
      const error = new NotFoundError()

      expect(error.message).toBe("Resource not found")
      expect(error.statusCode).toBe(404)
      expect(error.isOperational).toBe(true)
    })

    it("should create NotFoundError with custom message", () => {
      const error = new NotFoundError("User not found")

      expect(error.message).toBe("User not found")
      expect(error.statusCode).toBe(404)
    })
  })

  describe("ConflictError", () => {
    it("should create ConflictError with default message", () => {
      const error = new ConflictError()

      expect(error.message).toBe("Resource already exists")
      expect(error.statusCode).toBe(409)
      expect(error.isOperational).toBe(true)
    })

    it("should create ConflictError with custom message", () => {
      const error = new ConflictError("Email already exists")

      expect(error.message).toBe("Email already exists")
      expect(error.statusCode).toBe(409)
    })
  })

  describe("InsufficientFundsError", () => {
    it("should create InsufficientFundsError with default message", () => {
      const error = new InsufficientFundsError()

      expect(error.message).toBe("Insufficient funds")
      expect(error.statusCode).toBe(400)
      expect(error.isOperational).toBe(true)
    })

    it("should create InsufficientFundsError with custom message", () => {
      const error = new InsufficientFundsError("Balance too low")

      expect(error.message).toBe("Balance too low")
      expect(error.statusCode).toBe(400)
    })
  })

  describe("BlacklistError", () => {
    it("should create BlacklistError with default message", () => {
      const error = new BlacklistError()

      expect(error.message).toBe("User is blacklisted")
      expect(error.statusCode).toBe(403)
      expect(error.isOperational).toBe(true)
    })

    it("should create BlacklistError with custom message", () => {
      const error = new BlacklistError("Account is blacklisted")

      expect(error.message).toBe("Account is blacklisted")
      expect(error.statusCode).toBe(403)
    })
  })
})
