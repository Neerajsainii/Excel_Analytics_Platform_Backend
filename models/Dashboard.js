const mongoose = require('mongoose');

const DashboardSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Please add a dashboard title'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  charts: [
    {
      title: {
        type: String,
        required: true
      },
      chartType: {
        type: String,
        enum: ['bar', 'line', 'pie', 'scatter', 'table', '3d-pie', 'doughnut', 'area', 'bubble', 'radar', 'polar', '3d-bar', '3d-line'],
        default: 'bar'
      },
      data: {
        type: mongoose.Schema.Types.Mixed
      },
      configuration: {
        type: mongoose.Schema.Types.Mixed
      }
    }
  ],
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  isPublic: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('Dashboard', DashboardSchema); 