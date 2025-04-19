const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ExcelFile = require('../models/ExcelFile');
const Dashboard = require('../models/Dashboard');
const { protect, authorize } = require('../middleware/auth');

// @route   GET api/users
// @desc    Get all users
// @access  Private/Admin
router.get('/', protect, authorize(['admin']), async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false,
      error: 'Server error' 
    });
  }
});

// @route   GET api/users/:id
// @desc    Get user by ID
// @access  Private/Admin
router.get('/:id', protect, authorize(['admin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    res.status(500).json({ 
      success: false,
      error: 'Server error' 
    });
  }
});

// @route   PUT api/users/:id
// @desc    Update user
// @access  Private/Admin
router.put('/:id', protect, authorize(['admin']), async (req, res) => {
  const { 
    name, 
    email, 
    role, 
    company, 
    jobTitle, 
    isActive, 
    storageLimit,
    preferences,
    address,
    phone,
    age,
    gender,
    profileImage
  } = req.body;
  
  // Build user object
  const userFields = {};
  if (name) userFields.name = name;
  if (email) userFields.email = email;
  if (role) userFields.role = role;
  if (company !== undefined) userFields.company = company;
  if (jobTitle !== undefined) userFields.jobTitle = jobTitle;
  if (isActive !== undefined) userFields.isActive = isActive;
  if (storageLimit) userFields.storageLimit = storageLimit;
  if (address) userFields.address = address;
  if (phone) userFields.phone = phone;
  if (age) userFields.age = age;
  if (gender) userFields.gender = gender;
  if (profileImage) userFields.profileImage = profileImage;
  
  if (preferences) {
    userFields.preferences = {};
    if (preferences.theme) userFields.preferences.theme = preferences.theme;
    if (preferences.dashboardLayout) userFields.preferences.dashboardLayout = preferences.dashboardLayout;
    if (preferences.emailNotifications !== undefined) userFields.preferences.emailNotifications = preferences.emailNotifications;
  }
  
  try {
    let user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    // Validate email if changing
    if (email && email !== user.email) {
      const userWithEmailExists = await User.findOne({ email, _id: { $ne: req.params.id } });
      if (userWithEmailExists) {
        return res.status(400).json({
          success: false,
          error: 'Email is already in use'
        });
      }
    }
    
    // Validate phone if changing
    if (phone && phone !== user.phone) {
      const userWithPhoneExists = await User.findOne({ phone, _id: { $ne: req.params.id } });
      if (userWithPhoneExists) {
        return res.status(400).json({
          success: false,
          error: 'Phone number is already in use'
        });
      }
    }
    
    // Update
    user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: userFields },
      { new: true }
    ).select('-password');
    
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

// @route   GET api/users/:id/activity
// @desc    Get user activity
// @access  Private/Admin
router.get('/:id/activity', protect, authorize(['admin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    // Get user's dashboards
    const dashboards = await Dashboard.find({ user: req.params.id })
      .sort({ lastUpdated: -1 })
      .limit(5)
      .select('title description lastUpdated');
    
    // Get user's files
    const files = await ExcelFile.find({ user: req.params.id })
      .sort({ uploadDate: -1 })
      .limit(5)
      .select('originalName fileSize uploadDate');
    
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          company: user.company,
          jobTitle: user.jobTitle,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          isActive: user.isActive,
          storageUsed: user.storageUsed,
          storageLimit: user.storageLimit
        },
        recentActivity: {
          dashboards,
          files
        }
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false,
      error: 'Server error' 
    });
  }
});

// @route   PUT api/users/profile/update
// @desc    Update current user profile
// @access  Private
router.put('/profile/update', protect, async (req, res) => {
  const { 
    name, 
    company, 
    jobTitle, 
    preferences, 
    address, 
    phone, 
    age, 
    gender,
    profileImage
  } = req.body;
  
  // Build user object
  const userFields = {};
  if (name) userFields.name = name;
  if (company !== undefined) userFields.company = company;
  if (jobTitle !== undefined) userFields.jobTitle = jobTitle;
  if (address) userFields.address = address;
  if (phone) userFields.phone = phone;
  if (age) userFields.age = age;
  if (gender) userFields.gender = gender;
  if (profileImage) userFields.profileImage = profileImage;
  
  if (preferences) {
    userFields.preferences = {};
    if (preferences.theme) userFields.preferences.theme = preferences.theme;
    if (preferences.dashboardLayout) userFields.preferences.dashboardLayout = preferences.dashboardLayout;
    if (preferences.emailNotifications !== undefined) userFields.preferences.emailNotifications = preferences.emailNotifications;
  }
  
  try {
    let user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    // Validate phone number if changing
    if (phone && phone !== user.phone) {
      // Check if phone number is already taken
      const userWithPhoneExists = await User.findOne({ phone, _id: { $ne: req.user.id } });
      if (userWithPhoneExists) {
        return res.status(400).json({
          success: false,
          error: 'Phone number is already in use'
        });
      }
    }
    
    // Update
    user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: userFields },
      { new: true }
    ).select('-password');
    
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

// @route   DELETE api/users/:id
// @desc    Delete user
// @access  Private/Admin
router.delete('/:id', protect, authorize(['admin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    // Delete user's files
    const files = await ExcelFile.find({ user: req.params.id });
    
    // TODO: Implement actual file deletion from storage
    
    // Delete user's dashboards
    await Dashboard.deleteMany({ user: req.params.id });
    
    // Delete user's Excel files
    await ExcelFile.deleteMany({ user: req.params.id });
    
    // Delete user
    await User.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      data: {}
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