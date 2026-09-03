import jwt from 'jsonwebtoken';
import { AppError } from '../error/error_handling.js';
import User from '../model/user_model.js';

const JWT_SECRET = process.env.JWT_SECRET || 'my-secret-key';

export const auth = async (req, res, next) => {
  try {
    // Get authorization header
    const authHeader = req.headers.authorization;

    // Check Bearer token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Unauthorized', 401);
    }

    // Extract token
    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new AppError('Token is required', 401);
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Find user
    const user = await User
      .findById(decoded.userId)
      .select('-password');

    // Check user
    if (!user) {
      throw new AppError('User not found', 401);
    }

    // Check deleted user
    if (user.is_delete) {
      throw new AppError('User has been deleted', 401);
    }

    // Optional: check active user
    // Agar inactive user ko login/API access nahi dena hai
    // to ye uncomment kar sakte ho:
    //
    // if (!user.is_active) {
    //   throw new AppError('User account is inactive', 401);
    // }

    // Attach user to request
    req.user = user;

    // Continue
    next();

  } catch (error) {
    next(error);
  }
};
