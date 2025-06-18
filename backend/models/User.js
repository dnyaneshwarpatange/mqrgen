const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  clerkId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'super_admin'],
    default: 'user'
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled', 'expired'],
      default: 'active'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      default: null
    },
    razorpaySubscriptionId: {
      type: String,
      default: null
    },
    razorpayCustomerId: {
      type: String,
      default: null
    }
  },
  usage: {
    qrGeneratedToday: {
      type: Number,
      default: 0
    },
    qrGeneratedTotal: {
      type: Number,
      default: 0
    },
    lastResetDate: {
      type: Date,
      default: Date.now
    },
    apiCallsToday: {
      type: Number,
      default: 0
    },
    apiCallsTotal: {
      type: Number,
      default: 0
    }
  },
  apiKey: {
    type: String,
    unique: true,
    sparse: true
  },
  settings: {
    defaultQrSize: {
      type: Number,
      default: 300
    },
    defaultQrColor: {
      type: String,
      default: '#000000'
    },
    defaultQrBackground: {
      type: String,
      default: '#FFFFFF'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
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
userSchema.index({ email: 1 });
userSchema.index({ 'subscription.plan': 1 });
userSchema.index({ 'subscription.status': 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'usage.qrGeneratedToday': 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for subscription limits
userSchema.virtual('subscriptionLimits').get(function() {
  const limits = {
    free: { daily: 100, total: 1000 },
    pro: { daily: 10000, total: 100000 },
    enterprise: { daily: 100000, total: 1000000 }
  };
  return limits[this.subscription.plan] || limits.free;
});

// Virtual for usage status
userSchema.virtual('canGenerateQr').get(function() {
  const limits = this.subscriptionLimits;
  return this.usage.qrGeneratedToday < limits.daily;
});

// Virtual for remaining QR count
userSchema.virtual('remainingQrToday').get(function() {
  const limits = this.subscriptionLimits;
  return Math.max(0, limits.daily - this.usage.qrGeneratedToday);
});

// Method to reset daily usage
userSchema.methods.resetDailyUsage = function() {
  const today = new Date().toDateString();
  const lastReset = this.usage.lastResetDate.toDateString();
  
  if (today !== lastReset) {
    this.usage.qrGeneratedToday = 0;
    this.usage.apiCallsToday = 0;
    this.usage.lastResetDate = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to increment QR generation count
userSchema.methods.incrementQrCount = function(count = 1) {
  this.usage.qrGeneratedToday += count;
  this.usage.qrGeneratedTotal += count;
  return this.save();
};

// Method to increment API call count
userSchema.methods.incrementApiCalls = function(count = 1) {
  this.usage.apiCallsToday += count;
  this.usage.apiCallsTotal += count;
  return this.save();
};

// Method to generate API key
userSchema.methods.generateApiKey = function() {
  const crypto = require('crypto');
  this.apiKey = `mqr_${crypto.randomBytes(32).toString('hex')}`;
  return this.save();
};

// Static method to find by API key
userSchema.statics.findByApiKey = function(apiKey) {
  return this.findOne({ apiKey, isActive: true });
};

// Pre-save middleware to update timestamps
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Pre-save middleware to reset daily usage if needed
userSchema.pre('save', async function(next) {
  if (this.isModified('usage.lastResetDate') || this.isNew) {
    await this.resetDailyUsage();
  }
  next();
});

module.exports = mongoose.model('User', userSchema); 