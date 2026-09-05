import fs from 'fs';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../model/user_model.js';
import { sendEmail } from '../mail/all_mail.js';
import { uploadImage, deleteImage } from '../images/img.js';
import { AppError } from '../error/error_handling.js';

// ---------- Constants ----------
const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 3;
const LOCK_DURATIONS = [1, 5, 10, 30, 60]; // minutes
const JWT_SECRET = process.env.JWT_SECRET || 'my-secret-key';
const JWT_EXPIRY = '7d';

// ---------- Utility Functions ----------
const generateOTP = () => crypto.randomInt(100000, 999999).toString();
const isOTPExpired = (expiresAt) => new Date() > new Date(expiresAt);
const hashPassword = async (plain) => await bcrypt.hash(plain, 10);
const comparePassword = async (plain, hashed) => await bcrypt.compare(plain, hashed);
const generateToken = (userId) => jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

// Helper: Handle OTP failure with lock escalation
const handleOTPFailure = async (user) => {
  const verification = user.verification.user;
  verification.otp_attempts += 1;

  if (verification.otp_attempts >= MAX_OTP_ATTEMPTS) {
    const lockIndex = Math.min(verification.lock_count, LOCK_DURATIONS.length - 1);
    const durationMinutes = LOCK_DURATIONS[lockIndex];
    const lockUntil = new Date(Date.now() + durationMinutes * 60 * 1000);

    verification.lock_until = lockUntil;
    verification.lock_count += 1;
    verification.otp_attempts = 0;
    await user.save();

    throw new AppError(
      `Too many failed attempts. Account locked for ${durationMinutes} minute(s).`,
      403,
      { lock_until: lockUntil }
    );
  }

  await user.save();
  throw new AppError('Invalid OTP', 400, {
    remaining_attempts: MAX_OTP_ATTEMPTS - verification.otp_attempts,
  });
};

// ---------- Controllers ----------

export const register = async (req, res, next) => {
  try {
    const { fname, lname, gender, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('Email already registered', 400);
    }

    const hashed = await hashPassword(password);
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    const user = new User({
      fname,
      lname,
      gender,
      email,
      password: hashed,
      verification: {
        user: {
          otp,
          otp_expires: otpExpires,
          is_verified: false,
          otp_attempts: 0,
          lock_until: null,
          lock_count: 0,
        },
      },
    });

    await user.save();
    await sendEmail(fname, email, otp);

    res.status(201).json({ message: 'User registered. OTP sent.', userId: user._id });
  } catch (error) {
    next(error);
  }
};

export const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) throw new AppError('User not found', 404);

    const verification = user.verification.user;

    if (verification.is_verified) throw new AppError('Account already verified', 400);

    const now = new Date();
    if (verification.lock_until && verification.lock_until > now) {
      const remaining = Math.ceil((verification.lock_until - now) / 1000 / 60);
      throw new AppError(`Account locked. Try after ${remaining} minute(s).`, 403, {
        lock_until: verification.lock_until,
      });
    }

    if (isOTPExpired(verification.otp_expires)) {
      throw new AppError('OTP expired. Request a new one.', 400);
    }

    if (verification.otp !== otp) {
      await handleOTPFailure(user);
      return;
    }

    verification.is_verified = true;
    verification.otp_attempts = 0;
    verification.lock_until = null;
    verification.lock_count = 0;
    verification.otp = null;
    verification.otp_expires = null;
    user.is_active = true;

    await user.save();
    res.status(200).json({ message: 'Account verified successfully' });
  } catch (error) {
    next(error);
  }
};

export const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) throw new AppError('User not found', 404);

    const verification = user.verification.user;
    const { fname } = user;

    if (verification.is_verified) throw new AppError('Account already verified', 400);

    const now = new Date();
    if (verification.lock_until && verification.lock_until > now) {
      const remaining = Math.ceil((verification.lock_until - now) / 1000 / 60);
      throw new AppError(`Account locked. Try after ${remaining} minute(s).`, 403, {
        lock_until: verification.lock_until,
      });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    verification.otp = otp;
    verification.otp_expires = otpExpires;
    verification.otp_attempts = 0;

    await user.save();
    await sendEmail(fname, email, otp);

    res.status(200).json({ message: 'New OTP sent to email' });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) throw new AppError('Invalid credentials.Please check your email..', 401);

    if (!user.is_active || !user.verification.user.is_verified) {
      throw new AppError('Account not verified.pls verify your account by otp...', 403);
    }
    if (user.is_delete) throw new AppError('your Account has deleted.Please make another one....', 403);

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) throw new AppError('Invalid Password', 401);

    const token = generateToken(user._id);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        fname: user.fname,
        lname: user.lname,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { fname, lname, gender, address } = req.body;

    const updates = {};
    if (fname) updates.fname = fname;
    if (lname) updates.lname = lname;
    if (gender) updates.gender = gender;
    if (address) updates.address = address;

    if (req.file) {
      const currentUser = await User.findById(userId);
      if (!currentUser) throw new AppError('User not found', 404);

      // Purani image delete karo Cloudinary se
      if (currentUser.profileimage?.public_id) {
        await deleteImage(currentUser.profileimage.public_id);
      }

      // Nayi image upload karo
      const uploaded = await uploadImage(req.file.path);
      updates.profileimage = uploaded;

      // Local file delete karo
      fs.unlinkSync(req.file.path);
    }

    const user = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    }).select('-password');

    res.status(200).json({
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) throw new AppError('User not found', 404);

    const { fname } = user;
    const verification = user.verification.user;
    const now = new Date();

    if (verification.lock_until && verification.lock_until > now) {
      const remaining = Math.ceil((verification.lock_until - now) / 1000 / 60);
      throw new AppError(`Account locked. Try after ${remaining} minute(s).`, 403, {
        lock_until: verification.lock_until,
      });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    verification.otp = otp;
    verification.otp_expires = otpExpires;
    verification.otp_attempts = 0;

    await user.save();
    await sendEmail(fname, email, otp);

    res.status(200).json({ message: 'Password reset OTP sent to email' });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user) throw new AppError('User not found', 404);

    const verification = user.verification.user;
    const now = new Date();

    if (verification.lock_until && verification.lock_until > now) {
      const remaining = Math.ceil((verification.lock_until - now) / 1000 / 60);
      throw new AppError(`Account locked. Try after ${remaining} minute(s).`, 403, {
        lock_until: verification.lock_until,
      });
    }

    if (isOTPExpired(verification.otp_expires)) {
      throw new AppError('OTP expired. Request a new one.', 400);
    }

    if (verification.otp !== otp) {
      await handleOTPFailure(user);
      return;
    }

    const hashed = await hashPassword(newPassword);
    user.password = hashed;
    verification.otp = null;
    verification.otp_expires = null;
    verification.otp_attempts = 0;
    verification.lock_until = null;
    verification.lock_count = 0;

    await user.save();

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};