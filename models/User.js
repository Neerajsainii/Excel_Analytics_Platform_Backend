const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  confirmPassword: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpire: {
    type: Date,
    select: false
  },
  resetPasswordOTP: {
    type: String,
    select: false
  },
  resetPasswordOTPExpire: {
    type: Date,
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  age: {
    type: Number,
    required: [true, 'Please add an age'],
    min: 18,
    max: 100
  },
  gender: {
    type: String,
    required: [true, 'Please add a gender'],
    enum: ['male', 'female', 'other']
  },
  phone: {
    type: String,
    required: [true, 'Please add a phone number'],
    unique: true,
    match: [
      /^\+?[1-9]\d{1,14}$/, 
      'Please add a valid phone number'
    ]
  },
  address: {
    type: String,
    required: [true, 'Please add an address'],
    trim: true
  }, 
  company: {
    type: String,
    trim: true
  },
  jobTitle: {
    type: String,
    trim: true
  },
  profileImage: {
    type: String
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    dashboardLayout: {
      type: String,
      enum: ['grid', 'list', 'compact'],
      default: 'grid'
    },
    emailNotifications: {
      type: Boolean,
      default: true
    }
  },
  storageUsed: {
    type: Number,
    default: 0 // in bytes
  },
  storageLimit: {
    type: Number,
    default: 104857600 // 100MB in bytes
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  
  // Remove confirmPassword field before saving
  this.confirmPassword = undefined;
  
  next();
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Update last login
UserSchema.methods.updateLastLogin = async function() {
  try {
    // Only update the lastLogin field to avoid password-related validation issues
    await mongoose.model('User').findByIdAndUpdate(
      this._id,
      { $set: { lastLogin: Date.now() } },
      { new: true }
    );
    
    // Update the instance property too
    this.lastLogin = Date.now();
    
    return true;
  } catch (err) {
    console.error('Error updating last login:', err.message);
    // Don't throw the error to prevent login failures
    return false;
  }
};

// Generate and hash password token (Legacy - keeping for backward compatibility)
UserSchema.methods.getResetPasswordToken = function() {
  // Generate token
  const resetToken = require('crypto').randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = require('crypto')
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

// Generate OTP for password reset
UserSchema.methods.generateResetPasswordOTP = function() {
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Hash OTP and set to resetPasswordOTP field
  this.resetPasswordOTP = require('crypto')
    .createHash('sha256')
    .update(otp)
    .digest('hex');
  
  // Set expire to 2 minutes
  this.resetPasswordOTPExpire = Date.now() + 2 * 60 * 1000; // 2 minutes
  
  return otp;
};

// Verify OTP
UserSchema.methods.verifyResetPasswordOTP = function(enteredOTP) {
  // Convert OTP to string to handle both number and string inputs
  const otpString = String(enteredOTP);
  
  // Hash the entered OTP
  const hashedOTP = require('crypto')
    .createHash('sha256')
    .update(otpString)
    .digest('hex');
  
  // Check if OTP matches and is not expired
  return this.resetPasswordOTP === hashedOTP && 
         this.resetPasswordOTPExpire > Date.now();
};

// Clear reset token and expire
UserSchema.methods.clearResetPasswordToken = function() {
  this.resetPasswordToken = undefined;
  this.resetPasswordExpire = undefined;
};

// Clear OTP and expire
UserSchema.methods.clearResetPasswordOTP = function() {
  this.resetPasswordOTP = undefined;
  this.resetPasswordOTPExpire = undefined;
};

module.exports = mongoose.model('User', UserSchema);