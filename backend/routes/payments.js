const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { asyncHandler } = require('../middleware/errorHandler');
const { checkSubscription } = require('../middleware/auth');

const Payment = require('../models/Payment');
const User = require('../models/User');
const Coupon = require('../models/Coupon');

const router = express.Router();

// Initialize Razorpay (temporarily disabled for development)
// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET
// });

// Mock Razorpay for development
const razorpay = {
  orders: {
    create: async (options) => {
      return {
        id: `order_${Date.now()}_mock`,
        amount: options.amount,
        currency: options.currency,
        receipt: options.receipt
      };
    }
  }
};

// Get subscription plans
router.get('/plans', asyncHandler(async (req, res) => {
  const plans = [
    {
      id: 'pro',
      name: 'Pro Plan',
      price: 599,
      originalPrice: 599,
      currency: 'INR',
      duration: 30,
      qrLimit: 10000,
      features: [
        '10,000 QR codes per day',
        'API Access',
        'Analytics Dashboard',
        'Priority Support',
        'Bulk QR Generation',
        'PDF/Word Export',
        'Custom Styling'
      ],
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise Plan',
      price: 4799,
      originalPrice: 4799,
      currency: 'INR',
      duration: 30,
      qrLimit: 100000,
      features: [
        '100,000 QR codes per day',
        'API Access',
        'Advanced Analytics',
        'Dedicated Support',
        'Custom Branding',
        'White-label Solutions',
        'Priority Processing'
      ],
      popular: false
    }
  ];

  res.json({
    success: true,
    data: plans
  });
}));

// Create payment order
router.post('/create-order', asyncHandler(async (req, res) => {
  const { plan, couponCode } = req.body;

  if (!plan || !['pro', 'enterprise'].includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan selected' });
  }

  const planDetails = {
    pro: { price: 59900, name: 'Pro Plan' },
    enterprise: { price: 479900, name: 'Enterprise Plan' }
  };

  let amount = planDetails[plan].price;
  let discountAmount = 0;
  let discountPercentage = 0;
  let coupon = null;

  // Apply coupon if provided
  if (couponCode) {
    coupon = await Coupon.findValidByCode(couponCode, req.user._id);
    
    if (!coupon) {
      return res.status(400).json({ error: 'Invalid or expired coupon code' });
    }

    if (!coupon.applicablePlans.includes(plan)) {
      return res.status(400).json({ error: 'Coupon not applicable for this plan' });
    }

    if (amount < coupon.minAmount) {
      return res.status(400).json({ 
        error: `Minimum order amount of ₹${coupon.minAmount / 100} required for this coupon` 
      });
    }

    discountAmount = coupon.calculateDiscount(amount);
    discountPercentage = coupon.type === 'percentage' ? coupon.value : 0;
    amount = amount - discountAmount;
  }

  // Create Razorpay order
  const orderOptions = {
    amount: amount,
    currency: 'INR',
    receipt: `order_${Date.now()}_${req.user._id}`,
    notes: {
      userId: req.user._id.toString(),
      plan: plan,
      couponCode: couponCode || null,
      discountAmount: discountAmount,
      discountPercentage: discountPercentage
    }
  };

  const order = await razorpay.orders.create(orderOptions);

  // Create payment record
  const payment = new Payment({
    userId: req.user._id,
    razorpayOrderId: order.id,
    amount: amount,
    currency: 'INR',
    plan: plan,
    planDetails: {
      name: planDetails[plan].name,
      price: planDetails[plan].price,
      duration: 30,
      qrLimit: plan === 'pro' ? 10000 : 100000,
      features: plan === 'pro' 
        ? ['10,000 QR codes per day', 'API Access', 'Analytics', 'Priority Support']
        : ['100,000 QR codes per day', 'API Access', 'Advanced Analytics', 'Dedicated Support', 'Custom Branding']
    },
    discount: {
      couponCode: couponCode || null,
      discountAmount: discountAmount,
      discountPercentage: discountPercentage
    },
    metadata: {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip,
      referrer: req.get('Referrer')
    }
  });

  await payment.save();

  res.json({
    success: true,
    data: {
      orderId: order.id,
      amount: amount,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock',
      paymentId: payment._id,
      plan: plan,
      discount: {
        amount: discountAmount,
        percentage: discountPercentage
      }
    }
  });
}));

// Verify payment
router.post('/verify', asyncHandler(async (req, res) => {
  const { 
    razorpay_order_id, 
    razorpay_payment_id, 
    razorpay_signature,
    paymentId 
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !paymentId) {
    return res.status(400).json({ error: 'Missing payment verification parameters' });
  }

  // For development, skip signature verification
  // const body = razorpay_order_id + '|' + razorpay_payment_id;
  // const expectedSignature = crypto
  //   .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
  //   .update(body.toString())
  //   .digest('hex');

  // if (expectedSignature !== razorpay_signature) {
  //   return res.status(400).json({ error: 'Invalid payment signature' });
  // }

  // Get payment record
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    return res.status(404).json({ error: 'Payment record not found' });
  }

  // Update payment status
  payment.status = 'completed';
  payment.razorpayPaymentId = razorpay_payment_id;
  payment.completedAt = new Date();
  await payment.save();

  // Update user subscription
  const user = await User.findById(req.user._id);
  if (user) {
    user.subscription = {
      plan: payment.plan,
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      paymentId: payment._id
    };
    await user.save();
  }

  res.json({
    success: true,
    data: {
      message: 'Payment verified successfully',
      subscription: user.subscription
    }
  });
}));

// Get payment history
router.get('/history', asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  const query = { userId: req.user._id };
  if (status) {
    query.status = status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [payments, total] = await Promise.all([
    Payment.find(query)
      .sort({ createdAt: -1 })
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

// Get current subscription status
router.get('/subscription', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('subscription usage apiKey');
  
  const limits = user.subscriptionLimits;
  const canGenerateQr = user.canGenerateQr;
  const remainingQrToday = user.remainingQrToday;

  res.json({
    success: true,
    data: {
      subscription: user.subscription,
      usage: user.usage,
      limits: limits,
      canGenerateQr: canGenerateQr,
      remainingQrToday: remainingQrToday,
      apiKey: user.apiKey
    }
  });
}));

// Validate coupon code
router.post('/validate-coupon', asyncHandler(async (req, res) => {
  const { couponCode, plan } = req.body;

  if (!couponCode) {
    return res.status(400).json({ error: 'Coupon code is required' });
  }

  const coupon = await Coupon.findValidByCode(couponCode, req.user._id);
  
  if (!coupon) {
    return res.status(400).json({ error: 'Invalid or expired coupon code' });
  }

  if (plan && !coupon.applicablePlans.includes(plan)) {
    return res.status(400).json({ error: 'Coupon not applicable for this plan' });
  }

  const planDetails = {
    pro: { price: 59900 },
    enterprise: { price: 479900 }
  };

  const discountAmount = coupon.calculateDiscount(planDetails[plan]?.price || 0);
  const discountPercentage = coupon.type === 'percentage' ? coupon.value : 0;

  res.json({
    success: true,
    data: {
      coupon: {
        code: coupon.code,
        name: coupon.name,
        description: coupon.description,
        type: coupon.type,
        value: coupon.value,
        maxDiscount: coupon.maxDiscount,
        minAmount: coupon.minAmount
      },
      discount: {
        amount: discountAmount,
        percentage: discountPercentage
      },
      applicable: true
    }
  });
}));

// Cancel subscription
router.post('/cancel-subscription', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  if (user.subscription.status !== 'active') {
    return res.status(400).json({ error: 'No active subscription to cancel' });
  }

  // Update subscription status
  user.subscription.status = 'cancelled';
  user.subscription.endDate = new Date();
  await user.save();

  res.json({
    success: true,
    message: 'Subscription cancelled successfully',
    data: {
      subscription: user.subscription
    }
  });
}));

// Get payment statistics
router.get('/stats', asyncHandler(async (req, res) => {
  const stats = await Payment.getPaymentStats(req.user._id);
  
  const totalPayments = stats[0]?.totalPayments || 0;
  const totalAmount = stats[0]?.totalAmount || 0;
  const completedPayments = stats[0]?.completedPayments || 0;
  const completedAmount = stats[0]?.completedAmount || 0;

  // Get recent payments
  const recentPayments = await Payment.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('plan amount status createdAt');

  res.json({
    success: true,
    data: {
      overview: {
        totalPayments,
        totalAmount: totalAmount / 100, // Convert from paise to rupees
        completedPayments,
        completedAmount: completedAmount / 100,
        averageAmount: stats[0]?.averageAmount ? stats[0].averageAmount / 100 : 0
      },
      recentPayments
    }
  });
}));

// Webhook for Razorpay events (for production)
router.post('/webhook', asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  
  if (!signature) {
    return res.status(400).json({ error: 'Missing signature' });
  }

  // Verify webhook signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = req.body;

  // Handle different webhook events
  switch (event.event) {
    case 'payment.captured':
      // Payment was successful
      console.log('Payment captured:', event.payload.payment.entity);
      break;
    
    case 'payment.failed':
      // Payment failed
      console.log('Payment failed:', event.payload.payment.entity);
      break;
    
    case 'subscription.activated':
      // Subscription activated
      console.log('Subscription activated:', event.payload.subscription.entity);
      break;
    
    case 'subscription.cancelled':
      // Subscription cancelled
      console.log('Subscription cancelled:', event.payload.subscription.entity);
      break;
    
    default:
      console.log('Unhandled webhook event:', event.event);
  }

  res.json({ success: true });
}));

module.exports = router; 