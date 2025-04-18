const mongoose = require('mongoose');

const ExcelFileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  sheets: [
    {
      name: String,
      columns: [String],
      rowCount: Number,
      previewData: mongoose.Schema.Types.Mixed
    }
  ],
  processed: {
    type: Boolean,
    default: false
  },
  processingErrors: [String]
});

module.exports = mongoose.model('ExcelFile', ExcelFileSchema); 