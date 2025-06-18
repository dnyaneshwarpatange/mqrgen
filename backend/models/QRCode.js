const mongoose = require('mongoose');

const qrCodeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['url', 'text', 'email', 'phone', 'sms', 'wifi', 'vcard', 'custom'],
    default: 'url'
  },
  qrImage: {
    url: {
      type: String,
      required: true
    },
    filename: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      default: 300
    },
    format: {
      type: String,
      enum: ['png', 'svg', 'pdf'],
      default: 'png'
    }
  },
  styling: {
    foregroundColor: {
      type: String,
      default: '#000000'
    },
    backgroundColor: {
      type: String,
      default: '#FFFFFF'
    },
    margin: {
      type: Number,
      default: 2
    },
    logo: {
      url: {
        type: String,
        default: null
      },
      size: {
        type: Number,
        default: 50
      }
    }
  },
  metadata: {
    originalFilename: {
      type: String,
      default: null
    },
    rowIndex: {
      type: Number,
      default: null
    },
    columnName: {
      type: String,
      default: null
    },
    batchId: {
      type: String,
      default: null,
      index: true
    }
  },
  analytics: {
    scans: {
      type: Number,
      default: 0
    },
    lastScanned: {
      type: Date,
      default: null
    },
    uniqueScans: {
      type: Number,
      default: 0
    },
    scanLocations: [{
      country: String,
      city: String,
      timestamp: Date
    }]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better performance
qrCodeSchema.index({ userId: 1, createdAt: -1 });
qrCodeSchema.index({ batchId: 1 });
qrCodeSchema.index({ type: 1 });
qrCodeSchema.index({ isActive: 1 });
qrCodeSchema.index({ 'analytics.scans': -1 });
qrCodeSchema.index({ tags: 1 });

// Virtual for scan rate
qrCodeSchema.virtual('scanRate').get(function() {
  const daysSinceCreation = Math.max(1, (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  return this.analytics.scans / daysSinceCreation;
});

// Virtual for QR code URL
qrCodeSchema.virtual('qrUrl').get(function() {
  return `${process.env.CLIENT_URL || 'http://localhost:3000'}/uploads/${this.qrImage.filename}`;
});

// Method to increment scan count
qrCodeSchema.methods.incrementScan = function(location = null) {
  this.analytics.scans += 1;
  this.analytics.lastScanned = new Date();
  
  if (location) {
    this.analytics.scanLocations.push({
      country: location.country || 'Unknown',
      city: location.city || 'Unknown',
      timestamp: new Date()
    });
  }
  
  return this.save();
};

// Method to update QR code content
qrCodeSchema.methods.updateContent = function(newContent) {
  this.content = newContent;
  this.updatedAt = new Date();
  return this.save();
};

// Static method to find by batch
qrCodeSchema.statics.findByBatch = function(batchId, userId) {
  return this.find({ batchId, userId, isActive: true }).sort({ createdAt: 1 });
};

// Static method to get user statistics
qrCodeSchema.statics.getUserStats = function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId), isActive: true } },
    {
      $group: {
        _id: null,
        totalQrCodes: { $sum: 1 },
        totalScans: { $sum: '$analytics.scans' },
        averageScans: { $avg: '$analytics.scans' },
        mostScanned: { $max: '$analytics.scans' },
        types: { $addToSet: '$type' }
      }
    }
  ]);
};

// Static method to get popular QR codes
qrCodeSchema.statics.getPopularQrCodes = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ 'analytics.scans': -1 })
    .limit(limit)
    .populate('userId', 'firstName lastName email');
};

// Pre-save middleware to update timestamps
qrCodeSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Pre-save middleware to validate content based on type
qrCodeSchema.pre('save', function(next) {
  if (this.isModified('content') || this.isNew) {
    switch (this.type) {
      case 'url':
        if (!this.content.startsWith('http://') && !this.content.startsWith('https://')) {
          this.content = 'https://' + this.content;
        }
        break;
      case 'email':
        if (!this.content.includes('@')) {
          return next(new Error('Invalid email format'));
        }
        break;
      case 'phone':
        if (!/^\+?[\d\s\-\(\)]+$/.test(this.content)) {
          return next(new Error('Invalid phone number format'));
        }
        break;
    }
  }
  next();
});

module.exports = mongoose.model('QRCode', qrCodeSchema); 