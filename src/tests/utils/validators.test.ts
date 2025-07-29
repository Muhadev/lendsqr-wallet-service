import * as validators from "../../utils/validators"

describe("Validators", () => {
  describe("registerSchema", () => {
    const validData = {
      email: "test@example.com",
      phone: "08123456789",
      firstName: "John",
      lastName: "Doe",
      bvn: "12345678901",
      password: "Password123!",
    }

    it("should validate correct registration data", () => {
      const { error, value } = validators.registerSchema.validate(validData)

      expect(error).toBeUndefined()
      expect(value).toEqual(validData)
    })

    it("should reject invalid email", () => {
      const invalidData = { ...validData, email: "invalid-email" }
      const { error } = validators.registerSchema.validate(invalidData)

      expect(error).toBeDefined()
      expect(error?.details[0].message).toContain("valid email address")
    })

    it("should reject invalid phone number", () => {
      const invalidData = { ...validData, phone: "1234567890" }
      const { error } = validators.registerSchema.validate(invalidData)

      expect(error).toBeDefined()
      expect(error?.details[0].message).toContain("valid Nigerian phone number")
    })

    it("should reject short first name", () => {
      const invalidData = { ...validData, firstName: "J" }
      const { error } = validators.registerSchema.validate(invalidData)

      expect(error).toBeDefined()
      expect(error?.details[0].message).toContain("at least 2 characters")
    })

    it("should reject invalid BVN", () => {
      const invalidData = { ...validData, bvn: "1234567890" }
      const { error } = validators.registerSchema.validate(invalidData)

      expect(error).toBeDefined()
      expect(error?.details[0].message).toContain("exactly 11 digits")
    })

    it("should reject weak password", () => {
      const invalidData = { ...validData, password: "weak" }
      const { error } = validators.registerSchema.validate(invalidData)

      expect(error).toBeDefined()
      expect(error?.details[0].message).toContain("at least 8 characters")
    })

    it("should reject password without uppercase", () => {
      const invalidData = { ...validData, password: "password123!" }
      const { error } = validators.registerSchema.validate(invalidData)

      expect(error).toBeDefined()
      expect(error?.details[0].message).toContain("uppercase letter")
    })
  })

  describe("loginSchema", () => {
    const validData = {
      email: "test@example.com",
      password: "Password123!",
    }

    it("should validate correct login data", () => {
      const { error, value } = validators.loginSchema.validate(validData)

      expect(error).toBeUndefined()
      expect(value).toEqual(validData)
    })

    it("should reject missing email", () => {
      const invalidData = { password: "Password123!" }
      const { error } = validators.loginSchema.validate(invalidData)

      expect(error).toBeDefined()
      expect(error?.details[0].message).toContain("Email is required")
    })

    it("should reject missing password", () => {
      const invalidData = { email: "test@example.com" }
      const { error } = validators.loginSchema.validate(invalidData)

      expect(error).toBeDefined()
      expect(error?.details[0].message).toContain("Password is required")
    })
  })

  describe("fundAccountSchema", () => {
    const validData = {
      amount: 1000,
      description: "Test funding",
    }

    it("should validate correct fund data", () => {
      const { error, value } = validators.fundAccountSchema.validate(validData)

      expect(error).toBeUndefined()
      expect(value).toEqual(validData)
    })

    it("should reject negative amount", () => {
      const invalidData = { ...validData, amount: -100 }
      const { error } = validators.fundAccountSchema.validate(invalidData)

      expect(error).toBeDefined()
      expect(error?.details[0].message).toContain("positive number")
    })

    it("should reject amount below minimum", () => {
      const invalidData = { ...validData, amount: 50 }
      const { error } = validators.fundAccountSchema.validate(invalidData)

      expect(error).toBeDefined()
      expect(error?.details[0].message).toContain("Minimum funding amount is ₦100")
    })

    it("should reject amount above maximum", () => {
      const invalidData = { ...validData, amount: 2000000 }
      const { error } = validators.fundAccountSchema.validate(invalidData)

      expect(error).toBeDefined()
      expect(error?.details[0].message).toContain("Maximum funding amount is ₦1,000,000")
    })

    it("should allow optional description", () => {
      const dataWithoutDescription = { amount: 1000 }
      const { error } = validators.fundAccountSchema.validate(dataWithoutDescription)

      expect(error).toBeUndefined()
    })
  })

  describe("transferSchema", () => {
    const validData = {
      recipientAccountNumber: "1234567890",
      amount: 500,
      description: "Test transfer",
    }

    it("should validate correct transfer data", () => {
      const { error, value } = validators.transferSchema.validate(validData)

      expect(error).toBeUndefined()
      expect(value).toEqual(validData)
    })

    it("should reject invalid account number format", () => {
      const invalidData = { ...validData, recipientAccountNumber: "123" }
      const { error } = validators.transferSchema.validate(invalidData)

      expect(error).toBeDefined()
      expect(error?.details[0].message).toContain("exactly 10 digits")
    })

    it("should reject amount below minimum", () => {
      const invalidData = { ...validData, amount: 5 }
      const { error } = validators.transferSchema.validate(invalidData)

      expect(error).toBeDefined()
      expect(error?.details[0].message).toContain("Minimum transfer amount is ₦10")
    })

    it("should reject amount above maximum", () => {
      const invalidData = { ...validData, amount: 600000 }
      const { error } = validators.transferSchema.validate(invalidData)

      expect(error).toBeDefined()
      expect(error?.details[0].message).toContain("Maximum transfer amount is ₦500,000")
    })
  })

  describe("withdrawSchema", () => {
    const validData = {
      amount: 200,
      description: "ATM withdrawal",
    }

    it("should validate correct withdraw data", () => {
      const { error, value } = validators.withdrawSchema.validate(validData)

      expect(error).toBeUndefined()
      expect(value).toEqual(validData)
    })

    it("should reject amount below minimum", () => {
      const invalidData = { ...validData, amount: 50 }
      const { error } = validators.withdrawSchema.validate(invalidData)

      expect(error).toBeDefined()
      expect(error?.details[0].message).toContain("Minimum withdrawal amount is ₦100")
    })

    it("should reject amount above maximum", () => {
      const invalidData = { ...validData, amount: 300000 }
      const { error } = validators.withdrawSchema.validate(invalidData)

      expect(error).toBeDefined()
      expect(error?.details[0].message).toContain("Maximum withdrawal amount is ₦200,000")
    })
  })

  describe("paginationSchema", () => {
    it("should validate correct pagination data", () => {
      const validData = { page: 2, limit: 10 }
      const { error, value } = validators.paginationSchema.validate(validData)

      expect(error).toBeUndefined()
      expect(value).toEqual(validData)
    })

    it("should use default values", () => {
      const { error, value } = validators.paginationSchema.validate({})

      expect(error).toBeUndefined()
      expect(value).toEqual({ page: 1, limit: 20 })
    })

    it("should reject negative page number", () => {
      const invalidData = { page: -1 }
      const { error } = validators.paginationSchema.validate(invalidData)

      expect(error).toBeDefined()
    })

    it("should reject limit above maximum", () => {
      const invalidData = { limit: 150 }
      const { error } = validators.paginationSchema.validate(invalidData)

      expect(error).toBeDefined()
    })
  })
})
