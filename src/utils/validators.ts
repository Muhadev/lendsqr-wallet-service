import Joi from 'joi';

export const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  phone: Joi.string().pattern(/^(\+234|0)[789][01]\d{8}$/).required().messages({
    'string.pattern.base': 'Please provide a valid Nigerian phone number',
    'any.required': 'Phone number is required'
  }),
  firstName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'First name must be at least 2 characters',
    'string.max': 'First name cannot exceed 50 characters',
    'any.required': 'First name is required'
  }),
  lastName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Last name must be at least 2 characters',
    'string.max': 'Last name cannot exceed 50 characters',
    'any.required': 'Last name is required'
  }),
  bvn: Joi.string().pattern(/^\d{11}$/).required().messages({
    'string.pattern.base': 'BVN must be exactly 11 digits',
    'any.required': 'BVN is required'
  }),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required().messages({
    'string.min': 'Password must be at least 8 characters',
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    'any.required': 'Password is required'
  })
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
});

export const fundAccountSchema = Joi.object({
  amount: Joi.number().positive().min(100).max(1000000).required().messages({
    'number.positive': 'Amount must be a positive number',
    'number.min': 'Minimum funding amount is ₦100',
    'number.max': 'Maximum funding amount is ₦1,000,000',
    'any.required': 'Amount is required'
  }),
  description: Joi.string().max(255).optional().messages({
    'string.max': 'Description cannot exceed 255 characters'
  })
});

export const transferSchema = Joi.object({
  recipientAccountNumber: Joi.string().pattern(/^\d{10}$/).required().messages({
    'string.pattern.base': 'Account number must be exactly 10 digits',
    'any.required': 'Recipient account number is required'
  }),
  amount: Joi.number().positive().min(10).max(500000).required().messages({
    'number.positive': 'Amount must be a positive number',
    'number.min': 'Minimum transfer amount is ₦10',
    'number.max': 'Maximum transfer amount is ₦500,000',
    'any.required': 'Amount is required'
  }),
  description: Joi.string().max(255).optional().messages({
    'string.max': 'Description cannot exceed 255 characters'
  })
});

export const withdrawSchema = Joi.object({
  amount: Joi.number().positive().min(100).max(200000).required().messages({
    'number.positive': 'Amount must be a positive number',
    'number.min': 'Minimum withdrawal amount is ₦100',
    'number.max': 'Maximum withdrawal amount is ₦200,000',
    'any.required': 'Amount is required'
  }),
  description: Joi.string().max(255).optional().messages({
    'string.max': 'Description cannot exceed 255 characters'
  })
});

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  type: Joi.string().optional(),
  status: Joi.string().optional()
});

export const kycSubmissionSchema = Joi.object({
  documentType: Joi.string().valid("national_id", "drivers_license", "passport", "voters_card").required().messages({
    "any.only": "Document type must be one of: national_id, drivers_license, passport, voters_card",
    "any.required": "Document type is required",
  }),
  documentNumber: Joi.string().min(5).max(50).required().messages({
    "string.min": "Document number must be at least 5 characters",
    "string.max": "Document number cannot exceed 50 characters",
    "any.required": "Document number is required",
  }),
  documentUrl: Joi.string().uri().optional().messages({
    "string.uri": "Document URL must be a valid URL",
  }),
})
