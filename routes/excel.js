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
      
      // Extract a larger preview to support pagination (up to 100 rows + header)
      const maxPreviewRows = 101; // 100 data rows + 1 header row
      const previewData = jsonData.slice(0, Math.min(maxPreviewRows, jsonData.length));
      
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
        totalPages,
        hasNextPage: endIndex < excelData.rowCount,
        hasPrevPage: page > 1,
        startIndex: startIndex + 1, // 1-based for display
        endIndex: Math.min(endIndex, excelData.rowCount),
        returnedRows: paginatedData.length
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
    
    // Handle data limiting based on query parameters
    const limit = parseInt(req.query.limit, 10) || 100; // Default to 100 if not specified
    const page = parseInt(req.query.page, 10) || 1;
    const preview = req.query.preview === 'true';
    
    let responseData;
    let pagination = null;
    
    // Always use proper pagination - respect the limit parameter
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    responseData = data.slice(startIndex, endIndex);
    
    pagination = {
      page,
      limit,
      totalRows: data.length,
      totalPages: Math.ceil(data.length / limit),
      hasNextPage: endIndex < data.length,
      hasPrevPage: page > 1,
      isPreview: preview
    };

    res.json({
      success: true,
      fileName: file.originalName,
      sheetName,
      analytics,
      totalRows: data.length,
      returnedRows: responseData.length,
      pagination,
      debug: {
        requestParams: {
          limit: req.query.limit,
          page: req.query.page,
          preview: req.query.preview
        },
        parsedParams: {
          limit,
          page,
          preview
        },
        dataSlice: {
          startIndex,
          endIndex,
          slicedLength: responseData.length
        }
      },
      data: responseData
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Server error: ' + err.message
    });
  }
});

// @route   GET api/excel/:id/table-data
// @desc    Get paginated table data (optimized for frontend tables)
// @access  Private
router.get('/:id/table-data', protect, async (req, res) => {
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
    
    // Parse pagination parameters
    const limit = parseInt(req.query.limit, 10) || 10; // Default to 10 for tables
    const page = parseInt(req.query.page, 10) || 1;
    
    // Calculate pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedData = data.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      fileName: file.originalName,
      sheetName,
      totalRows: data.length,
      returnedRows: paginatedData.length,
      columns: Object.keys(data[0] || {}),
      pagination: {
        page,
        limit,
        totalRows: data.length,
        totalPages: Math.ceil(data.length / limit),
        hasNextPage: endIndex < data.length,
        hasPrevPage: page > 1,
        startIndex: startIndex + 1, // 1-based for display
        endIndex: Math.min(endIndex, data.length)
      },
      debug: {
        requestParams: {
          limit: req.query.limit,
          page: req.query.page,
          sheet: req.query.sheet
        },
        parsedParams: { limit, page, sheetName },
        calculatedIndexes: { startIndex, endIndex }
      },
      data: paginatedData
    });
  } catch (err) {
    console.error('Table data error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server error: ' + err.message
    });
  }
});

// @route   GET api/excel/:id/chart-metadata
// @desc    Get metadata for chart axis selection
// @access  Private
router.get('/:id/chart-metadata', protect, async (req, res) => {
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
    
    // Format fields for chart axis selection
    const availableFields = excelData.columns.map(column => {
      const suitableFor = [];
      
      // Determine what this field is suitable for based on data type
      if (column.dataType === 'number') {
        suitableFor.push('x-axis', 'y-axis', 'value', 'size');
      } else if (column.dataType === 'date') {
        suitableFor.push('x-axis', 'category');
      } else if (column.dataType === 'string') {
        suitableFor.push('category', 'label', 'group');
      }
      
      return {
        name: column.name,
        label: column.originalName,
        dataType: column.dataType,
        suitableFor: suitableFor,
        statistics: column.statistics,
        nullable: column.nullable || false
      };
    });
    
    // Recommend chart types based on available data types
    const dataTypes = excelData.columns.map(col => col.dataType);
    const hasNumeric = dataTypes.includes('number');
    const hasDate = dataTypes.includes('date');
    const hasCategorical = dataTypes.includes('string');
    
    const recommendedCharts = [];
    if (hasNumeric && hasCategorical) {
      recommendedCharts.push('bar', 'line', 'pie');
    }
    if (hasNumeric && hasDate) {
      recommendedCharts.push('line', 'area');
    }
    if (hasNumeric) {
      recommendedCharts.push('scatter', 'histogram');
    }
    if (hasCategorical) {
      recommendedCharts.push('pie', 'doughnut');
    }
    
    res.json({
      success: true,
      sheetName: excelData.sheetName,
      availableFields: availableFields,
      recommendedCharts: [...new Set(recommendedCharts)], // Remove duplicates
      summary: excelData.summary
    });
  } catch (err) {
    console.error('Chart metadata error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server error: ' + err.message
    });
  }
});

// @route   GET api/excel/:id/chart-data
// @desc    Get data formatted for chart consumption
// @access  Private
router.get('/:id/chart-data', protect, async (req, res) => {
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
    
    // Get parameters
    const sheetName = req.query.sheet || file.sheets[0].name;
    const chartType = req.query.chartType || 'bar';
    const xAxis = req.query.xAxis;
    const yAxis = req.query.yAxis;
    const groupBy = req.query.groupBy;
    const limit = parseInt(req.query.limit, 10) || 1000; // Default limit for chart data
    
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
    
    // Validate required fields
    if (!xAxis) {
      return res.status(400).json({
        success: false,
        error: 'xAxis parameter is required'
      });
    }
    
    // Get limited data for chart performance
    const chartData = excelData.data.slice(0, limit);
    
    // Format data based on chart type
    let formattedData;
    
    if (chartType === 'pie' || chartType === 'doughnut') {
      // For pie charts, group by xAxis and sum yAxis values
      const grouped = {};
      chartData.forEach(row => {
        const key = row[xAxis];
        if (key !== null && key !== undefined) {
          if (!grouped[key]) {
            grouped[key] = 0;
          }
          if (yAxis && row[yAxis] !== null && row[yAxis] !== undefined) {
            grouped[key] += Number(row[yAxis]) || 1;
          } else {
            grouped[key] += 1; // Count occurrences if no yAxis
          }
        }
      });
      
      formattedData = {
        labels: Object.keys(grouped),
        datasets: [{
          data: Object.values(grouped),
          backgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
          ]
        }]
      };
    } else if (chartType === 'scatter') {
      // For scatter plots, need both x and y values
      if (!yAxis) {
        return res.status(400).json({
          success: false,
          error: 'yAxis parameter is required for scatter charts'
        });
      }
      
      const scatterData = chartData
        .filter(row => row[xAxis] !== null && row[yAxis] !== null)
        .map(row => ({
          x: row[xAxis],
          y: row[yAxis]
        }));
      
      formattedData = {
        datasets: [{
          label: `${yAxis} vs ${xAxis}`,
          data: scatterData,
          backgroundColor: '#36A2EB'
        }]
      };
    } else {
      // For bar, line, area charts
      if (groupBy) {
        // Group data by groupBy field
        const grouped = {};
        chartData.forEach(row => {
          const groupKey = row[groupBy];
          const xValue = row[xAxis];
          
          if (!grouped[groupKey]) {
            grouped[groupKey] = {};
          }
          
          if (!grouped[groupKey][xValue]) {
            grouped[groupKey][xValue] = 0;
          }
          
          if (yAxis && row[yAxis] !== null) {
            grouped[groupKey][xValue] += Number(row[yAxis]) || 0;
          } else {
            grouped[groupKey][xValue] += 1;
          }
        });
        
        // Get all unique x values
        const allXValues = [...new Set(chartData.map(row => row[xAxis]))].sort();
        
        formattedData = {
          labels: allXValues,
          datasets: Object.keys(grouped).map((groupKey, index) => ({
            label: groupKey,
            data: allXValues.map(xVal => grouped[groupKey][xVal] || 0),
            backgroundColor: `hsl(${index * 60}, 70%, 50%)`,
            borderColor: `hsl(${index * 60}, 70%, 40%)`,
            borderWidth: 1
          }))
        };
      } else {
        // Simple x-y chart
        const labels = [];
        const data = [];
        
        if (yAxis) {
          // Aggregate by xAxis, sum yAxis
          const aggregated = {};
          chartData.forEach(row => {
            const xValue = row[xAxis];
            if (xValue !== null && xValue !== undefined) {
              if (!aggregated[xValue]) {
                aggregated[xValue] = 0;
              }
              aggregated[xValue] += Number(row[yAxis]) || 0;
            }
          });
          
          Object.keys(aggregated).sort().forEach(key => {
            labels.push(key);
            data.push(aggregated[key]);
          });
        } else {
          // Count occurrences of xAxis values
          const counts = {};
          chartData.forEach(row => {
            const xValue = row[xAxis];
            if (xValue !== null && xValue !== undefined) {
              counts[xValue] = (counts[xValue] || 0) + 1;
            }
          });
          
          Object.keys(counts).sort().forEach(key => {
            labels.push(key);
            data.push(counts[key]);
          });
        }
        
        formattedData = {
          labels: labels,
          datasets: [{
            label: yAxis || 'Count',
            data: data,
            backgroundColor: '#36A2EB',
            borderColor: '#36A2EB',
            borderWidth: 1
          }]
        };
      }
    }
    
    res.json({
      success: true,
      chartType: chartType,
      xAxis: xAxis,
      yAxis: yAxis,
      groupBy: groupBy,
      dataPoints: chartData.length,
      chartData: formattedData
    });
  } catch (err) {
    console.error('Chart data error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server error: ' + err.message
    });
  }
});

// @route   GET api/excel/:id/download-data
// @desc    Download complete Excel data (all rows)
// @access  Private
router.get('/:id/download-data', protect, async (req, res) => {
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
    
    // Return ALL data without any limits
    res.json({
      success: true,
      fileName: file.originalName,
      sheetName,
      totalRows: data.length,
      columns: Object.keys(data[0] || {}),
      data: data // Complete dataset
    });
  } catch (err) {
    console.error('Download data error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server error: ' + err.message
    });
  }
});

// @route   GET api/excel/:id/preview
// @desc    Get dynamic preview data with configurable limit
// @access  Private
router.get('/:id/preview', protect, async (req, res) => {
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
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Get limit from query parameter (default to 10 data rows + header)
    const limit = parseInt(req.query.limit, 10) || 10;
    const previewRows = limit + 1; // +1 for header row
    
    // Extract columns and preview data
    const columns = jsonData[0] || [];
    const previewData = jsonData.slice(0, Math.min(previewRows, jsonData.length));
    
    res.json({
      success: true,
      fileName: file.originalName,
      sheetName,
      columns,
      rowCount: jsonData.length - 1, // Excluding header row
      previewData,
      requestedLimit: limit,
      actualDataRows: previewData.length - 1, // Excluding header
      totalRows: jsonData.length - 1
    });
  } catch (err) {
    console.error('Preview data error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server error: ' + err.message
    });
  }
});

module.exports = router; 