const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const ExcelFile = require('../models/ExcelFile');
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');

// Set up multer storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter - only accept excel files
const fileFilter = (req, file, cb) => {
  const allowedFileTypes = ['.xlsx', '.xls', '.csv'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedFileTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only Excel files are allowed.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// @route   GET api/excel
// @desc    Get all Excel files for the logged in user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const files = await ExcelFile.find({ user: req.user.id }).sort({ uploadDate: -1 });
    
    res.json({
      success: true,
      count: files.length,
      data: files
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false,
      error: 'Server error' 
    });
  }
});

// @route   GET api/excel/:id
// @desc    Get Excel file by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const file = await ExcelFile.findById(req.params.id);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    // Check if user owns the file
    if (file.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this file'
      });
    }
    
    res.json({
      success: true,
      data: file
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @route   DELETE api/excel/:id
// @desc    Delete Excel file
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const ExcelData = require('../models/ExcelData');
    
    const file = await ExcelFile.findById(req.params.id);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    // Check if user owns the file
    if (file.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this file'
      });
    }
    
    // Delete the file from the filesystem
    const filePath = path.join('uploads', file.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Delete associated data
    await ExcelData.deleteMany({ file: file._id });
    
    // Update user's storage used
    await User.findByIdAndUpdate(
      file.user,
      { $inc: { storageUsed: -file.fileSize } }
    );
    
    // Delete the file record
    await ExcelFile.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.error('Excel file deletion error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server error: ' + err.message
    });
  }
});

// @route   POST api/excel/upload
// @desc    Upload Excel file
// @access  Private
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Please upload a file'
      });
    }

    // Read the Excel file
    const workbook = XLSX.readFile(req.file.path);
    const sheets = [];
    
    // Process each sheet
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Extract columns from first row
      const columns = jsonData[0] || [];
      
      // Extract a preview (first 5 rows)
      const previewData = jsonData.slice(0, Math.min(6, jsonData.length));
      
      sheets.push({
        name: sheetName,
        columns: columns,
        rowCount: jsonData.length - 1, // Excluding header row
        previewData: previewData
      });
    });

    // Create a new Excel file entry
    const excelFile = new ExcelFile({
      user: req.user.id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      sheets: sheets,
      processed: true
    });

    await excelFile.save();

    // Update user's storage used
    await User.findByIdAndUpdate(
      req.user.id,
      { $inc: { storageUsed: req.file.size } }
    );

    res.status(201).json({
      success: true,
      data: excelFile
    });
  } catch (err) {
    console.error('Excel upload error:', err.message);
    
    // If there was an error, try to delete the uploaded file
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkErr) {
        console.error('Failed to delete uploaded file:', unlinkErr.message);
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Server error: ' + err.message
    });
  }
});

// @route   POST api/excel/:id/parse
// @desc    Parse Excel file and store structured data
// @access  Private
router.post('/:id/parse', protect, async (req, res) => {
  try {
    const excelProcessor = require('../services/excelProcessor');
    const ExcelData = require('../models/ExcelData');
    
    // Get the file
    const file = await ExcelFile.findById(req.params.id);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    // Check if user owns the file
    if (file.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this file'
      });
    }
    
    // Path to the file
    const filePath = path.join('uploads', file.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found on disk'
      });
    }
    
    // Determine sheet to process
    const sheetName = req.body.sheetName || file.sheets[0].name;
    
    // Check if this sheet has already been processed
    const existingData = await ExcelData.findOne({
      file: file._id,
      sheetName: sheetName
    });
    
    if (existingData) {
      return res.json({
        success: true,
        message: 'Sheet already processed',
        data: existingData
      });
    }
    
    // Process the file
    const processedData = excelProcessor.processExcelFile(filePath, sheetName);
    
    // Create a new ExcelData document
    const excelData = new ExcelData({
      file: file._id,
      user: req.user.id,
      sheetName: processedData.sheetName,
      columns: processedData.columns,
      data: processedData.data,
      rowCount: processedData.rowCount,
      summary: processedData.summary
    });
    
    // Save the processed data
    await excelData.save();
    
    res.json({
      success: true,
      data: excelData
    });
  } catch (err) {
    console.error('Excel parsing error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server error: ' + err.message
    });
  }
});

// @route   GET api/excel/:id/data
// @desc    Get parsed data for an Excel file
// @access  Private
router.get('/:id/data', protect, async (req, res) => {
  try {
    const ExcelData = require('../models/ExcelData');
    
    // Get the file
    const file = await ExcelFile.findById(req.params.id);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    // Check if user owns the file
    if (file.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this file'
      });
    }
    
    // Get sheet name from query params or use the first sheet
    const sheetName = req.query.sheet || file.sheets[0].name;
    
    // Find the processed data
    const excelData = await ExcelData.findOne({
      file: file._id,
      sheetName: sheetName
    });
    
    if (!excelData) {
      return res.status(404).json({
        success: false,
        error: 'Processed data not found for this sheet. Please parse the file first.'
      });
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 100;
    
    // Calculate total pages
    const totalPages = Math.ceil(excelData.rowCount / limit);
    
    // Get subset of data
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedData = excelData.data.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      sheetName: excelData.sheetName,
      columns: excelData.columns,
      summary: excelData.summary,
      pagination: {
        page,
        limit,
        totalRows: excelData.rowCount,
        totalPages
      },
      data: paginatedData
    });
  } catch (err) {
    console.error('Excel data retrieval error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server error: ' + err.message
    });
  }
});

// @route   GET api/excel/:id/analyze
// @desc    Analyze Excel file and return data
// @access  Private
router.get('/:id/analyze', protect, async (req, res) => {
  try {
    const file = await ExcelFile.findById(req.params.id);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    // Check if user owns the file
    if (file.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this file'
      });
    }
    
    // Read the file from disk
    const filePath = path.join('uploads', file.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found on disk'
      });
    }
    
    const workbook = XLSX.readFile(filePath);
    const sheetName = req.query.sheet || workbook.SheetNames[0];
    
    if (!workbook.SheetNames.includes(sheetName)) {
      return res.status(404).json({
        success: false,
        error: 'Sheet not found in Excel file'
      });
    }
    
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    // Basic analytics
    const analytics = {
      rowCount: data.length,
      columns: Object.keys(data[0] || {}),
      summary: {}
    };
    
    // Generate summary statistics for numeric columns
    analytics.columns.forEach(column => {
      const values = data.map(row => row[column]).filter(val => typeof val === 'number');
      
      if (values.length > 0) {
        const sum = values.reduce((acc, val) => acc + val, 0);
        const avg = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        
        analytics.summary[column] = {
          type: 'numeric',
          count: values.length,
          sum,
          avg,
          min,
          max
        };
      } else {
        // For non-numeric columns, count unique values
        const uniqueValues = [...new Set(data.map(row => row[column]))];
        analytics.summary[column] = {
          type: 'categorical',
          count: data.length,
          uniqueCount: uniqueValues.length
        };
      }
    });
    
    res.json({
      success: true,
      fileName: file.originalName,
      sheetName,
      analytics,
      data: data.slice(0, 100) // Return only first 100 rows for API response
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Server error: ' + err.message
    });
  }
});

module.exports = router; 