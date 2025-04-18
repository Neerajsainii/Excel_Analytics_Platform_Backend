const express = require('express');
const router = express.Router();
const Dashboard = require('../models/Dashboard');
const User = require('../models/User');
const ExcelFile = require('../models/ExcelFile');
const { protect, authorize } = require('../middleware/auth');

// @route   GET api/dashboard
// @desc    Get all dashboards for the logged in user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const dashboards = await Dashboard.find({ user: req.user.id });
    
    res.json({
      success: true,
      count: dashboards.length,
      data: dashboards
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false,
      error: 'Server error' 
    });
  }
});

// @route   GET api/dashboard/public
// @desc    Get all public dashboards
// @access  Public
router.get('/public', async (req, res) => {
  try {
    const dashboards = await Dashboard.find({ isPublic: true }).populate('user', 'name');
    
    res.json({
      success: true,
      count: dashboards.length,
      data: dashboards
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false,
      error: 'Server error' 
    });
  }
});

// @route   GET api/dashboard/admin/stats
// @desc    Get admin dashboard statistics
// @access  Private/Admin
router.get('/admin/stats', protect, authorize(['admin']), async (req, res) => {
  try {
    // Get total users
    const totalUsers = await User.countDocuments();
    
    // Get users registered in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsers = await User.countDocuments({ 
      createdAt: { $gte: thirtyDaysAgo } 
    });
    
    // Get active users (logged in the last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activeUsers = await User.countDocuments({ 
      lastLogin: { $gte: sevenDaysAgo } 
    });
    
    // Get dashboard stats
    const totalDashboards = await Dashboard.countDocuments();
    const publicDashboards = await Dashboard.countDocuments({ isPublic: true });
    
    // Get Excel file stats
    const totalFiles = await ExcelFile.countDocuments();
    const fileStorageUsed = await ExcelFile.aggregate([
      { $group: { _id: null, total: { $sum: "$fileSize" } } }
    ]);
    
    const storageUsed = fileStorageUsed.length > 0 ? fileStorageUsed[0].total : 0;
    
    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          new: newUsers,
          active: activeUsers
        },
        dashboards: {
          total: totalDashboards,
          public: publicDashboards
        },
        files: {
          total: totalFiles,
          storageUsed
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

// @route   GET api/dashboard/admin/users
// @desc    Get admin dashboard users data
// @access  Private/Admin
router.get('/admin/users', protect, authorize(['admin']), async (req, res) => {
  try {
    const users = await User.find()
      .select('name email role company jobTitle lastLogin createdAt storageUsed isActive')
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

// @route   GET api/dashboard/user/stats
// @desc    Get user dashboard statistics
// @access  Private
router.get('/user/stats', protect, async (req, res) => {
  try {
    // Get user's dashboards
    const dashboards = await Dashboard.countDocuments({ user: req.user.id });
    
    // Get user's files
    const files = await ExcelFile.find({ user: req.user.id });
    const totalFiles = files.length;
    
    // Calculate storage used
    const storageUsed = files.reduce((total, file) => total + file.fileSize, 0);
    
    // Get latest activities (last 5 files)
    const latestFiles = await ExcelFile.find({ user: req.user.id })
      .sort({ uploadDate: -1 })
      .limit(5)
      .select('originalName fileSize uploadDate');
    
    // Get user details
    const user = await User.findById(req.user.id);
    
    res.json({
      success: true,
      data: {
        user: {
          name: user.name,
          email: user.email,
          company: user.company,
          jobTitle: user.jobTitle,
          storageUsed,
          storageLimit: user.storageLimit,
          storagePercentage: (storageUsed / user.storageLimit) * 100
        },
        stats: {
          dashboards,
          files: totalFiles
        },
        latestActivity: latestFiles
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

// @route   POST api/dashboard
// @desc    Create a new dashboard
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, charts, isPublic } = req.body;

    const newDashboard = new Dashboard({
      user: req.user.id,
      title,
      description,
      charts: charts || [],
      isPublic: isPublic || false
    });

    const dashboard = await newDashboard.save();

    res.status(201).json({
      success: true,
      data: dashboard
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @route   GET api/dashboard/:id
// @desc    Get dashboard by ID
// @access  Private or Public (if dashboard is marked as public)
router.get('/:id', async (req, res) => {
  try {
    const dashboard = await Dashboard.findById(req.params.id).populate('user', 'name email');

    if (!dashboard) {
      return res.status(404).json({
        success: false,
        error: 'Dashboard not found'
      });
    }

    // Check if dashboard is public or if user owns dashboard
    if (!dashboard.isPublic && (!req.user || dashboard.user._id.toString() !== req.user.id)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this dashboard'
      });
    }

    res.json({
      success: true,
      data: dashboard
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @route   PUT api/dashboard/:id
// @desc    Update dashboard
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    let dashboard = await Dashboard.findById(req.params.id);

    if (!dashboard) {
      return res.status(404).json({
        success: false,
        error: 'Dashboard not found'
      });
    }

    // Check if user owns the dashboard
    if (dashboard.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this dashboard'
      });
    }

    const { title, description, charts, isPublic } = req.body;
    
    // Update fields
    if (title) dashboard.title = title;
    if (description !== undefined) dashboard.description = description;
    if (charts) dashboard.charts = charts;
    if (isPublic !== undefined) dashboard.isPublic = isPublic;
    dashboard.lastUpdated = Date.now();

    await dashboard.save();

    res.json({
      success: true,
      data: dashboard
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @route   DELETE api/dashboard/:id
// @desc    Delete dashboard
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const dashboard = await Dashboard.findById(req.params.id);

    if (!dashboard) {
      return res.status(404).json({
        success: false,
        error: 'Dashboard not found'
      });
    }

    // Check if user owns the dashboard
    if (dashboard.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this dashboard'
      });
    }

    await dashboard.deleteOne();

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