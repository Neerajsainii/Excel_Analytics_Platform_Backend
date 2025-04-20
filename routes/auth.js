const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post(
  '/register',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
    check('confirmPassword', 'Passwords do not match').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
    check('age', 'Age must be between 18 and 100').isInt({ min: 18, max: 100 }),
    check('gender', 'Gender is required').isIn(['male', 'female', 'other']),
    check('phone', 'Please provide a valid phone number').matches(/^\+?[1-9]\d{1,14}$/),
    check('address', 'Address is required').not().isEmpty()
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { 
      name, 
      email, 
      password, 
      confirmPassword,
      age,
      gender,
      phone,
      address,
      role, 
      company, 
      jobTitle, 
      preferences 
    } = req.body;

    try {
      // Check if user already exists (by email)
      let userByEmail = await User.findOne({ email });
      if (userByEmail) {
        return res.status(400).json({ 
          success: false,
          error: 'User with this email already exists' 
        });
      }

      // Check if user already exists (by phone)
      let userByPhone = await User.findOne({ phone });
      if (userByPhone) {
        return res.status(400).json({ 
          success: false,
          error: 'User with this phone number already exists' 
        });
      }

      // Build user object
      const userData = {
        name,
        email,
        password,
        confirmPassword,
        age,
        gender,
        phone,
        address
      };

      // Add optional fields if provided
      if (role && (role === 'user' || role === 'admin')) {
        userData.role = role;
      }
      
      if (company) userData.company = company;
      if (jobTitle) userData.jobTitle = jobTitle;
      
      // Add preferences if provided
      if (preferences) {
        // Validate theme
        if (preferences.theme && 
            ['light', 'dark', 'system'].includes(preferences.theme)) {
          if (!userData.preferences) userData.preferences = {};
          userData.preferences.theme = preferences.theme;
        }
        
        // Validate dashboardLayout
        if (preferences.dashboardLayout && 
            ['grid', 'list', 'compact'].includes(preferences.dashboardLayout)) {
          if (!userData.preferences) userData.preferences = {};
          userData.preferences.dashboardLayout = preferences.dashboardLayout;
        }
        
        // Validate emailNotifications
        if (typeof preferences.emailNotifications === 'boolean') {
          if (!userData.preferences) userData.preferences = {};
          userData.preferences.emailNotifications = preferences.emailNotifications;
        }
      }

      // Create user
      const user = await User.create(userData);

      // Return JWT
      const token = user.getSignedJwtToken();

      res.status(201).json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (err) {
      console.error('Registration error:', err.message);
      
      // Handle MongoDB validation errors
      if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(val => val.message);
        return res.status(400).json({
          success: false,
          errors: messages
        });
      }
      
      // Handle duplicate key errors (backup for unique fields)
      if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(400).json({
          success: false,
          error: `User with this ${field} already exists`
        });
      }
      
      res.status(500).json({ 
        success: false,
        error: 'Server error' 
      });
    }
  }
);

// @route   POST api/auth/login
// @desc    Login user & get token
// @access  Public
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // Check if user exists
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({ 
          success: false,
          error: 'Invalid credentials' 
        });
      }

      // Check if password matches
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({ 
          success: false,
          error: 'Invalid credentials' 
        });
      }

      // Update last login time
      await user.updateLastLogin();

      // Return JWT
      const token = user.getSignedJwtToken();

      res.json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          age: user.age,
          gender: user.gender,
          phone: user.phone,
          address: user.address,
          role: user.role,
          preferences: user.preferences,
          company: user.company,
          jobTitle: user.jobTitle,
          lastLogin: user.lastLogin,
          profileImage: user.profileImage
        }
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ 
        success: false,
        error: 'Server error' 
      });
    }
  }
);

// @route   GET api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false,
      error: 'Server error' 
    });
  }
});

module.exports = router; 