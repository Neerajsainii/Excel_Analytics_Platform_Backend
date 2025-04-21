const mongoose = require('mongoose');

const ColumnSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  dataType: {
    type: String,
    enum: ['string', 'number', 'date', 'boolean', 'object', 'array', 'null', 'mixed'],
    default: 'string'
  },
  format: {
    type: String,
    default: null
  },
  statistics: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  nullable: {
    type: Boolean,
    default: true
  }
});

const ExcelDataSchema = new mongoose.Schema({
  file: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExcelFile',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sheetName: {
    type: String,
    required: true
  },
  columns: [ColumnSchema],
  data: [mongoose.Schema.Types.Mixed],
  rowCount: {
    type: Number,
    default: 0
  },
  processedAt: {
    type: Date,
    default: Date.now
  },
  dataSchema: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  summary: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

// Create indexes for faster queries
ExcelDataSchema.index({ file: 1, sheetName: 1 }, { unique: true });
ExcelDataSchema.index({ user: 1 });

module.exports = mongoose.model('ExcelData', ExcelDataSchema); 