import Joi from 'joi';
import { AppError } from '../error/error_handling.js';

// ---------- Schemas ----------
export const registerSchema = Joi.object({
  fname: Joi.string().required().trim(),
  lname: Joi.string().required().trim(),
  gender: Joi.string().valid('male', 'female', 'other').required(),
  email: Joi.string().email().required().lowercase(),
  password: Joi.string().min(6).required(),
});

export const verifyOTPSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).required(),
});

export const resendOTPSchema = Joi.object({
  email: Joi.string().email().required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const updateProfileSchema = Joi.object({
  fname: Joi.string().trim().optional(),
  lname: Joi.string().trim().optional(),
  gender: Joi.string().valid('male', 'female', 'other').optional(),
  address: Joi.string().optional(),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

export const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).required(),
  newPassword: Joi.string().min(6).required(),
});

// ---------- Validation Middleware ----------
export const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map(detail => detail.message);
    return next(new AppError('Validation failed', 400, { errors: messages }));
  }
  req.body = value; // replace with validated values
  next();
};