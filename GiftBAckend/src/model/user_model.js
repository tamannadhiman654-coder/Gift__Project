import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    profileimage: {
      public_id: String,
      url: String,
    },

    fname: {
      type: String,
      required: true,
      trim: true,
    },

    lname: {
      type: String,
      required: true,
      trim: true,
    },

    gender: {
      type: String,
      required: true,
      enum: ['male', 'female', 'other'],
    },

    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    address: {
      type: String,
      default: '',
    },

    is_active: {
      type: Boolean,
      default: false,
    },

    is_delete: {
      type: Boolean,
      default: false,
    },

    verification: {
      user: {
        otp: { type: String },
        otp_expires: { type: Date },
        is_verified: { type: Boolean, default: false },
        otp_attempts: { type: Number, default: 0 },
        lock_until: { type: Date },
        lock_count: { type: Number, default: 0 },
      },
    },

    order_list: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
      },
    ],

    cart_list: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cart',
      },
    ],
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

export default User;