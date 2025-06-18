const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  razorpayPaymentId: {
    type: String,
    required: true,
    unique: true
  },
  razorpayOrderId: {
    type: String,
    required: true
  },
  razorpaySignature: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  plan: {
    type: String,
    enum: ['pro', 'enterprise'],
    required: true
  },
  planDetails: {
    name: String,
    price: Number,
    duration: Number, // in days
    qrLimit: Number,
    features: [String]
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    default: 'razorpay'
  },
  billingDetails: {
    name: String,
    email: String,
    phone: String,
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    }
  },
  discount: {
    couponCode: {
      type: String,
      default: null
    },
    discountAmount: {
      type: Number,
      default: 0
    },
    discountPercentage: {
      type: Number,
      default: 0
    }
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    referrer: String
  },
  refundDetails: {
    refundId: String,
    refundAmount: Number,
    refundReason: String,
    refundedAt: Date
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
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ razorpayPaymentId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ plan: 1 });
paymentSchema.index({ createdAt: -1 });

// Virtual for formatted amount
paymentSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: this.currency
  }).format(this.amount / 100); // Razorpay amounts are in paise
});

// Virtual for final amount after discount
paymentSchema.virtual('finalAmount').get(function() {
  return this.amount - this.discount.discountAmount;
});

// Method to mark as completed
paymentSchema.methods.markCompleted = function() {
  this.status = 'completed';
  this.updatedAt = new Date();
  return this.save();
};

// Method to mark as failed
paymentSchema.methods.markFailed = function() {
  this.status = 'failed';
  this.updatedAt = new Date();
  return this.save();
};

// Method to process refund
paymentSchema.methods.processRefund = function(refundAmount, reason) {
  this.status = 'refunded';
  this.refundDetails = {
    refundAmount: refundAmount,
    refundReason: reason,
    refundedAt: new Date()
  };
  this.updatedAt = new Date();
  return this.save();
};

// Static method to get payment statistics
paymentSchema.statics.getPaymentStats = function(userId = null) {
  const match = userId ? { userId: mongoose.Types.ObjectId(userId) } : {};
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalPayments: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        completedPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        completedAmount: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] }
        },
        failedPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        },
        refundedPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] }
        },
        averageAmount: { $avg: '$amount' }
      }
    }
  ]);
};

// Static method to get monthly revenue
paymentSchema.statics.getMonthlyRevenue = function(year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  return this.aggregate([
    {
      $match: {
        status: 'completed',
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        dailyRevenue: { $sum: '$amount' },
        paymentCount: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

// Static method to get plan distribution
paymentSchema.statics.getPlanDistribution = function() {
  return this.aggregate([
    { $match: { status: 'completed' } },
    {
      $group: {
        _id: '$plan',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$amount' }
      }
    },
    { $sort: { totalRevenue: -1 } }
  ]);
};

// Pre-save middleware to update timestamps
paymentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Pre-save middleware to validate payment data
paymentSchema.pre('save', function(next) {
  if (this.isNew) {
    // Validate plan details
    const planDetails = {
      pro: { price: 59900, duration: 30, qrLimit: 10000 },
      enterprise: { price: 479900, duration: 30, qrLimit: 100000 }
    };
    
    if (!planDetails[this.plan]) {
      return next(new Error('Invalid plan selected'));
    }
    
    // Set plan details if not provided
    if (!this.planDetails.name) {
      this.planDetails = {
        name: this.plan.charAt(0).toUpperCase() + this.plan.slice(1),
        price: planDetails[this.plan].price,
        duration: planDetails[this.plan].duration,
        qrLimit: planDetails[this.plan].qrLimit,
        features: this.plan === 'pro' 
          ? ['10,000 QR codes per day', 'API Access', 'Analytics', 'Priority Support']
          : ['100,000 QR codes per day', 'API Access', 'Advanced Analytics', 'Dedicated Support', 'Custom Branding']
      };
    }
  }
  next();
});

module.exports = mongoose.model('Payment', paymentSchema); 