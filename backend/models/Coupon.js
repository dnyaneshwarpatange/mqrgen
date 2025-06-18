const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  maxDiscount: {
    type: Number,
    default: null // Maximum discount amount for percentage coupons
  },
  minAmount: {
    type: Number,
    default: 0 // Minimum order amount required
  },
  applicablePlans: [{
    type: String,
    enum: ['pro', 'enterprise'],
    default: ['pro', 'enterprise']
  }],
  usageLimit: {
    type: Number,
    default: null // null means unlimited
  },
  usedCount: {
    type: Number,
    default: 0
  },
  userUsageLimit: {
    type: Number,
    default: 1 // How many times a single user can use this coupon
  },
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  usedBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    usedAt: {
      type: Date,
      default: Date.now
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment'
    }
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
couponSchema.index({ code: 1 });
couponSchema.index({ isActive: 1 });
couponSchema.index({ validUntil: 1 });
couponSchema.index({ createdBy: 1 });

// Virtual for remaining usage
couponSchema.virtual('remainingUsage').get(function() {
  if (this.usageLimit === null) return 'unlimited';
  return Math.max(0, this.usageLimit - this.usedCount);
});

// Virtual for validity status
couponSchema.virtual('isValid').get(function() {
  const now = new Date();
  return this.isActive && 
         now >= this.validFrom && 
         now <= this.validUntil &&
         (this.usageLimit === null || this.usedCount < this.usageLimit);
});

// Method to check if user can use this coupon
couponSchema.methods.canUserUse = function(userId) {
  if (!this.isValid) return false;
  
  const userUsage = this.usedBy.filter(usage => 
    usage.userId.toString() === userId.toString()
  ).length;
  
  return userUsage < this.userUsageLimit;
};

// Method to apply coupon to amount
couponSchema.methods.calculateDiscount = function(amount) {
  if (!this.isValid) return 0;
  
  let discount = 0;
  
  if (this.type === 'percentage') {
    discount = (amount * this.value) / 100;
    if (this.maxDiscount) {
      discount = Math.min(discount, this.maxDiscount);
    }
  } else {
    discount = this.value;
  }
  
  return Math.min(discount, amount); // Discount cannot exceed amount
};

// Method to use coupon
couponSchema.methods.useCoupon = function(userId, paymentId) {
  if (!this.canUserUse(userId)) {
    throw new Error('Coupon cannot be used by this user');
  }
  
  this.usedCount += 1;
  this.usedBy.push({
    userId: userId,
    paymentId: paymentId,
    usedAt: new Date()
  });
  
  return this.save();
};

// Static method to find valid coupon by code
couponSchema.statics.findValidByCode = function(code, userId = null) {
  const query = { 
    code: code.toUpperCase(),
    isActive: true,
    validFrom: { $lte: new Date() },
    validUntil: { $gte: new Date() }
  };
  
  if (userId) {
    query['usedBy.userId'] = { $ne: userId };
  }
  
  return this.findOne(query);
};

// Static method to get coupon statistics
couponSchema.statics.getCouponStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalCoupons: { $sum: 1 },
        activeCoupons: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
        },
        totalUsage: { $sum: '$usedCount' },
        averageUsage: { $avg: '$usedCount' }
      }
    }
  ]);
};

// Static method to get popular coupons
couponSchema.statics.getPopularCoupons = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ usedCount: -1 })
    .limit(limit)
    .populate('createdBy', 'firstName lastName email');
};

// Pre-save middleware to update timestamps
couponSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Pre-save middleware to validate coupon data
couponSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('validUntil')) {
    if (this.validUntil <= new Date()) {
      return next(new Error('Valid until date must be in the future'));
    }
  }
  
  if (this.isNew || this.isModified('value')) {
    if (this.value < 0) {
      return next(new Error('Coupon value cannot be negative'));
    }
    
    if (this.type === 'percentage' && this.value > 100) {
      return next(new Error('Percentage discount cannot exceed 100%'));
    }
  }
  
  if (this.isNew || this.isModified('usageLimit')) {
    if (this.usageLimit !== null && this.usageLimit < 0) {
      return next(new Error('Usage limit cannot be negative'));
    }
  }
  
  next();
});

module.exports = mongoose.model('Coupon', couponSchema); 