const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { authorizeAdmin, authorizeSuperAdmin } = require('../middleware/auth');

const User = require('../models/User');
const QRCode = require('../models/QRCode');
const Payment = require('../models/Payment');
const Coupon = require('../models/Coupon');

const router = express.Router();

// Apply admin authorization to all routes
router.use(authorizeAdmin);

// Get admin dashboard overview
router.get('/dashboard', asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalQrCodes,
    totalPayments,
    totalRevenue,
    recentUsers,
    recentPayments,
    qrStats,
    paymentStats
  ] = await Promise.all([
    User.countDocuments(),
    QRCode.countDocuments(),
    Payment.countDocuments(),
    Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    User.find().sort({ createdAt: -1 }).limit(5).select('firstName lastName email subscription.plan createdAt'),
    Payment.find().sort({ createdAt: -1 }).limit(5).populate('userId', 'firstName lastName email'),
    QRCode.aggregate([
      {
        $group: {
          _id: null,
          totalScans: { $sum: '$analytics.scans' },
          averageScans: { $avg: '$analytics.scans' }
        }
      }
    ]),
    Payment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ])
  ]);

  const monthlyRevenue = await Payment.aggregate([
    {
      $match: {
        status: 'completed',
        createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        dailyRevenue: { $sum: '$amount' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  res.json({
    success: true,
    data: {
      overview: {
        totalUsers,
        totalQrCodes,
        totalPayments,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalScans: qrStats[0]?.totalScans || 0,
        averageScans: Math.round((qrStats[0]?.averageScans || 0) * 100) / 100
      },
      recentUsers,
      recentPayments,
      paymentStats: paymentStats.reduce((acc, stat) => {
        acc[stat._id] = { count: stat.count, amount: stat.totalAmount };
        return acc;
      }, {}),
      monthlyRevenue
    }
  });
}));

// Get all users with pagination and filtering
router.get('/users', asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    search, 
    plan, 
    status,
    sortBy = 'createdAt', 
    sortOrder = 'desc' 
  } = req.query;

  const query = {};

  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  if (plan) {
    query['subscription.plan'] = plan;
  }

  if (status) {
    query['subscription.status'] = status;
  }

  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [users, total] = await Promise.all([
    User.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-apiKey')
      .lean(),
    User.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
}));

// Get user details
router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-apiKey');
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Get user's QR codes
  const qrCodes = await QRCode.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('title content analytics.scans createdAt');

  // Get user's payments
  const payments = await Payment.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .limit(10);

  // Get user statistics
  const qrStats = await QRCode.getUserStats(user._id);
  const paymentStats = await Payment.getPaymentStats(user._id);

  res.json({
    success: true,
    data: {
      user,
      qrCodes,
      payments,
      qrStats: qrStats[0] || {},
      paymentStats: paymentStats[0] || {}
    }
  });
}));

// Update user role (super admin only)
router.put('/users/:id/role', authorizeSuperAdmin, asyncHandler(async (req, res) => {
  const { role } = req.body;

  if (!['user', 'admin', 'super_admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true }
  ).select('-apiKey');

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    success: true,
    data: user,
    message: 'User role updated successfully'
  });
}));

// Update user subscription
router.put('/users/:id/subscription', asyncHandler(async (req, res) => {
  const { plan, status, endDate } = req.body;

  const updateData = {};
  if (plan) updateData['subscription.plan'] = plan;
  if (status) updateData['subscription.status'] = status;
  if (endDate) updateData['subscription.endDate'] = new Date(endDate);

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: updateData },
    { new: true }
  ).select('-apiKey');

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    success: true,
    data: user,
    message: 'User subscription updated successfully'
  });
}));

// Get all QR codes with pagination and filtering
router.get('/qr-codes', asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    search, 
    type, 
    userId,
    sortBy = 'createdAt', 
    sortOrder = 'desc' 
  } = req.query;

  const query = { isActive: true };

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } }
    ];
  }

  if (type) {
    query.type = type;
  }

  if (userId) {
    query.userId = userId;
  }

  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [qrCodes, total] = await Promise.all([
    QRCode.find(query)
      .populate('userId', 'firstName lastName email')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    QRCode.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: {
      qrCodes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
}));

// Get all payments with pagination and filtering
router.get('/payments', asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    status, 
    plan,
    userId,
    sortBy = 'createdAt', 
    sortOrder = 'desc' 
  } = req.query;

  const query = {};

  if (status) {
    query.status = status;
  }

  if (plan) {
    query.plan = plan;
  }

  if (userId) {
    query.userId = userId;
  }

  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [payments, total] = await Promise.all([
    Payment.find(query)
      .populate('userId', 'firstName lastName email')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Payment.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: {
      payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
}));

// Create coupon (super admin only)
router.post('/coupons', authorizeSuperAdmin, asyncHandler(async (req, res) => {
  const {
    code,
    name,
    description,
    type,
    value,
    maxDiscount,
    minAmount,
    applicablePlans,
    usageLimit,
    userUsageLimit,
    validUntil
  } = req.body;

  const coupon = new Coupon({
    code: code.toUpperCase(),
    name,
    description,
    type,
    value,
    maxDiscount,
    minAmount: minAmount * 100, // Convert to paise
    applicablePlans,
    usageLimit,
    userUsageLimit,
    validUntil: new Date(validUntil),
    createdBy: req.user._id
  });

  await coupon.save();

  res.status(201).json({
    success: true,
    data: coupon,
    message: 'Coupon created successfully'
  });
}));

// Get all coupons
router.get('/coupons', asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    isActive,
    sortBy = 'createdAt', 
    sortOrder = 'desc' 
  } = req.query;

  const query = {};

  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [coupons, total] = await Promise.all([
    Coupon.find(query)
      .populate('createdBy', 'firstName lastName email')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Coupon.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: {
      coupons,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
}));

// Update coupon (super admin only)
router.put('/coupons/:id', authorizeSuperAdmin, asyncHandler(async (req, res) => {
  const {
    name,
    description,
    value,
    maxDiscount,
    minAmount,
    applicablePlans,
    usageLimit,
    userUsageLimit,
    validUntil,
    isActive
  } = req.body;

  const updateData = {};
  if (name) updateData.name = name;
  if (description) updateData.description = description;
  if (value) updateData.value = value;
  if (maxDiscount) updateData.maxDiscount = maxDiscount;
  if (minAmount) updateData.minAmount = minAmount * 100;
  if (applicablePlans) updateData.applicablePlans = applicablePlans;
  if (usageLimit) updateData.usageLimit = usageLimit;
  if (userUsageLimit) updateData.userUsageLimit = userUsageLimit;
  if (validUntil) updateData.validUntil = new Date(validUntil);
  if (isActive !== undefined) updateData.isActive = isActive;

  const coupon = await Coupon.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true }
  ).populate('createdBy', 'firstName lastName email');

  if (!coupon) {
    return res.status(404).json({ error: 'Coupon not found' });
  }

  res.json({
    success: true,
    data: coupon,
    message: 'Coupon updated successfully'
  });
}));

// Delete coupon (super admin only)
router.delete('/coupons/:id', authorizeSuperAdmin, asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);

  if (!coupon) {
    return res.status(404).json({ error: 'Coupon not found' });
  }

  res.json({
    success: true,
    message: 'Coupon deleted successfully'
  });
}));

// Get analytics data
router.get('/analytics', asyncHandler(async (req, res) => {
  const { period = '30' } = req.query;
  const days = parseInt(period);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [
    userGrowth,
    qrGeneration,
    revenueData,
    popularQrCodes,
    planDistribution,
    topUsers
  ] = await Promise.all([
    // User growth over time
    User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),

    // QR generation over time
    QRCode.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          scans: { $sum: '$analytics.scans' }
        }
      },
      { $sort: { _id: 1 } }
    ]),

    // Revenue over time
    Payment.aggregate([
      { 
        $match: { 
          status: 'completed',
          createdAt: { $gte: startDate } 
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),

    // Popular QR codes
    QRCode.getPopularQrCodes(10),

    // Plan distribution
    Payment.getPlanDistribution(),

    // Top users by QR generation
    User.aggregate([
      {
        $lookup: {
          from: 'qrcodes',
          localField: '_id',
          foreignField: 'userId',
          as: 'qrCodes'
        }
      },
      {
        $project: {
          firstName: 1,
          lastName: 1,
          email: 1,
          qrCount: { $size: '$qrCodes' },
          totalScans: { $sum: '$qrCodes.analytics.scans' }
        }
      },
      { $sort: { qrCount: -1 } },
      { $limit: 10 }
    ])
  ]);

  res.json({
    success: true,
    data: {
      userGrowth,
      qrGeneration,
      revenueData,
      popularQrCodes,
      planDistribution,
      topUsers
    }
  });
}));

// Get system statistics
router.get('/system-stats', asyncHandler(async (req, res) => {
  const [
    totalUsers,
    activeUsers,
    totalQrCodes,
    totalScans,
    totalRevenue,
    activeSubscriptions,
    couponStats
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ 'subscription.status': 'active' }),
    QRCode.countDocuments(),
    QRCode.aggregate([
      { $group: { _id: null, total: { $sum: '$analytics.scans' } } }
    ]),
    Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    User.countDocuments({ 'subscription.status': 'active' }),
    Coupon.getCouponStats()
  ]);

  res.json({
    success: true,
    data: {
      users: {
        total: totalUsers,
        active: activeUsers,
        activeSubscriptions
      },
      qrCodes: {
        total: totalQrCodes,
        totalScans: totalScans[0]?.total || 0
      },
      revenue: {
        total: totalRevenue[0]?.total || 0
      },
      coupons: couponStats[0] || {}
    }
  });
}));

module.exports = router; 