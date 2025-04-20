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
  this.lastLogin = Date.now();
  return this.save();
};

module.exports = mongoose.model('User', UserSchema); 