const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

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
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
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

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Your account has been deactivated. Please contact admin.'
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

      // Generate JWT token
      const token = user.getSignedJwtToken();

      // Update last login time - wrap in try/catch to prevent this from breaking login
      try {
        await user.updateLastLogin();
      } catch (updateErr) {
        console.error('Error updating last login time:', updateErr.message);
        // Continue with login even if updating last login fails
      }

      // Return successful response
      res.status(200).json({
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
      console.error('Login error:', err.message);
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

// @route   POST api/auth/forgot-password
// @desc    Forgot password
// @access  Public
router.post(
  '/forgot-password',
  [check('email', 'Please include a valid email').isEmail()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    try {
      const user = await User.findOne({ email: req.body.email });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'No user found with that email'
        });
      }

      // Generate OTP
      const otp = user.generateResetPasswordOTP();
      await user.save();

      // Create email transporter
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
          user: process.env.SMTP_EMAIL,
          pass: process.env.SMTP_PASSWORD
        }
      });

      // Create professional email message
      const message = {
        from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
        to: user.email,
        subject: 'Password Reset OTP - Excel Analytics Platform',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #333; text-align: center; margin-bottom: 30px;">Password Reset Request</h2>
              
              <p style="color: #666; font-size: 16px; line-height: 1.5;">Hello ${user.name},</p>
              
              <p style="color: #666; font-size: 16px; line-height: 1.5;">
                You have requested to reset your password for Excel Analytics Platform. 
                Please use the following OTP to proceed with password reset:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <div style="background-color: #007bff; color: white; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 8px; letter-spacing: 5px; display: inline-block;">
                  ${otp}
                </div>
              </div>
              
              <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="color: #856404; margin: 0; font-size: 14px;">
                  <strong>⚠️ Important:</strong> This OTP will expire in <strong>2 minutes</strong>. 
                  If you didn't request this password reset, please ignore this email.
                </p>
              </div>
              
              <p style="color: #666; font-size: 14px; line-height: 1.5; margin-top: 30px;">
                If you're having trouble, please contact our support team.
              </p>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              
              <p style="color: #999; font-size: 12px; text-align: center;">
                This email was sent from Excel Analytics Platform. Please do not reply to this email.
              </p>
            </div>
          </div>
        `,
        text: `
          Password Reset OTP - Excel Analytics Platform
          
          Hello ${user.name},
          
          You have requested to reset your password. Please use the following OTP:
          
          OTP: ${otp}
          
          This OTP will expire in 2 minutes.
          
          If you didn't request this, please ignore this email.
        `
      };

      await transporter.sendMail(message);

      res.json({
        success: true,
        message: 'OTP sent to your email address',
        data: {
          email: user.email,
          expiresIn: '2 minutes'
        }
      });
    } catch (err) {
      console.error('Password reset error:', err);

      // If there's an error, clear the OTP fields
      if (user) {
        user.clearResetPasswordOTP();
        await user.save();
      }

      return res.status(500).json({
        success: false,
        error: 'Email could not be sent'
      });
    }
  }
);

// @route   POST api/auth/verify-otp
// @desc    Verify OTP for password reset
// @access  Public
router.post(
  '/verify-otp',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('otp', 'Please provide a valid 6-digit OTP').custom((value) => {
      // Convert to string for validation
      const otpStr = String(value);
      if (!/^\d{6}$/.test(otpStr)) {
        throw new Error('OTP must be exactly 6 digits');
      }
      return true;
    })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map(err => err.msg).join(', '),
        errors: errors.array()
      });
    }

    try {
      const { email, otp } = req.body;
      
      // Need to explicitly select OTP fields since they have select: false
      const user = await User.findOne({ email }).select('+resetPasswordOTP +resetPasswordOTPExpire');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'No user found with that email'
        });
      }

      // Verify OTP
      const isValidOTP = user.verifyResetPasswordOTP(otp);

      if (!isValidOTP) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired OTP'
        });
      }

      // Generate a temporary reset token for password reset
      const resetToken = user.getResetPasswordToken();
      await user.save();

      res.json({
        success: true,
        message: 'OTP verified successfully',
        data: {
          resetToken,
          expiresIn: '10 minutes'
        }
      });
    } catch (err) {
      console.error('OTP verification error:', err);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

// @route   POST api/auth/reset-password-with-otp
// @desc    Reset password directly with OTP (alternative flow)
// @access  Public
router.post(
  '/reset-password-with-otp',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('otp', 'Please provide a valid 6-digit OTP').custom((value) => {
      // Convert to string for validation
      const otpStr = String(value);
      if (!/^\d{6}$/.test(otpStr)) {
        throw new Error('OTP must be exactly 6 digits');
      }
      return true;
    }),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
    check('confirmPassword', 'Passwords do not match').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map(err => err.msg).join(', '),
        errors: errors.array()
      });
    }

    try {
      const { email, otp, password, confirmPassword } = req.body;
      
      // Need to explicitly select OTP fields since they have select: false
      const user = await User.findOne({ email }).select('+resetPasswordOTP +resetPasswordOTPExpire');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'No user found with that email'
        });
      }

      // Verify OTP
      const isValidOTP = user.verifyResetPasswordOTP(otp);

      if (!isValidOTP) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired OTP'
        });
      }

      // Set new password
      user.password = password;
      user.confirmPassword = confirmPassword;
      
      // Clear OTP fields
      user.clearResetPasswordOTP();
      
      await user.save();

      // Return token for auto login
      const token = user.getSignedJwtToken();

      res.json({
        success: true,
        message: 'Password reset successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (err) {
      console.error('Password reset error:', err);
      res.status(500).json({
        success: false,
        message: 'Could not reset password'
      });
    }
  }
);

// @route   PUT api/auth/reset-password/:resettoken
// @desc    Reset password
// @access  Public
router.put(
  '/reset-password/:resettoken',
  [
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
    check('confirmPassword', 'Passwords do not match').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    try {
      // Get hashed token
      const resetPasswordToken = crypto
        .createHash('sha256')
        .update(req.params.resettoken)
        .digest('hex');

      const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired reset token'
        });
      }

      // Set new password
      user.password = req.body.password;
      user.confirmPassword = req.body.confirmPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save();

      // Return token for auto login
      const token = user.getSignedJwtToken();

      res.json({
        success: true,
        token,
        data: 'Password reset successful'
      });
    } catch (err) {
      console.error('Password reset error:', err);
      res.status(500).json({
        success: false,
        error: 'Could not reset password'
      });
    }
  }
);

module.exports = router;