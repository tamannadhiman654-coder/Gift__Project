import express from 'express';
import { auth } from '../middleware/auth.js';
import { validate } from '../validation/all_validation.js';
import { upload } from '../middleware/upload.js';
import {
  register, verifyOTP, resendOTP, login,
  updateProfile, forgotPassword, resetPassword,
} from '../controller/controller.js';
import {
  verifyOTPSchema, resendOTPSchema, loginSchema,
  updateProfileSchema, forgotPasswordSchema, resetPasswordSchema
} from '../validation/all_validation.js';

const routes = express.Router();

routes.post('/register', register);
routes.post('/verify-otp', validate(verifyOTPSchema), verifyOTP);
routes.post('/resend-otp', validate(resendOTPSchema), resendOTP);
routes.post('/login', validate(loginSchema), login);

routes.put(
  '/profile',
  auth,
  upload.single('profileimage'),
  validate(updateProfileSchema),
  updateProfile
);

routes.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
routes.post('/reset-password', validate(resetPasswordSchema), resetPassword);

export default routes;