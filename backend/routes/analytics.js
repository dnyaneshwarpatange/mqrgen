const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Mock analytics data generator
const generateMockAnalytics = (timeRange = '30d') => {
  const now = new Date();
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 365;
  
  const qrCodes = [];
  const scans = [];
  const dates = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    dates.push(date.toLocaleDateString());
    
    const qrCount = Math.floor(Math.random() * 10) + 1;
    qrCodes.push(qrCount);
    
    const scanCount = Math.floor(Math.random() * 50) + qrCount;
    scans.push(scanCount);
  }

  return {
    overview: {
      totalQrCodes: qrCodes.reduce((a, b) => a + b, 0),
      totalScans: scans.reduce((a, b) => a + b, 0),
      averageScansPerQr: Math.round((scans.reduce((a, b) => a + b, 0) / qrCodes.reduce((a, b) => a + b, 0)) * 100) / 100,
      mostScannedQr: {
        title: 'Product Landing Page',
        scans: 245,
        content: 'https://example.com/product'
      }
    },
    charts: {
      qrCodesCreated: {
        labels: dates,
        data: qrCodes
      },
      qrCodeScans: {
        labels: dates,
        data: scans
      }
    },
    topQrCodes: [
      { title: 'Product Landing Page', scans: 245, content: 'https://example.com/product' },
      { title: 'Contact Information', scans: 189, content: 'https://example.com/contact' },
      { title: 'Social Media Profile', scans: 156, content: 'https://instagram.com/username' },
      { title: 'WiFi Network', scans: 134, content: 'WIFI:T:WPA;S:MyNetwork;P:password123;;' },
      { title: 'Business Card', scans: 98, content: 'https://example.com/business-card' }
    ],
    recentActivity: [
      { type: 'qr_created', title: 'New Product QR', timestamp: new Date(Date.now() - 1000 * 60 * 30) },
      { type: 'qr_scanned', title: 'Contact QR Scanned', timestamp: new Date(Date.now() - 1000 * 60 * 60) },
      { type: 'qr_created', title: 'Event QR Code', timestamp: new Date(Date.now() - 1000 * 60 * 120) },
      { type: 'qr_scanned', title: 'WiFi QR Scanned', timestamp: new Date(Date.now() - 1000 * 60 * 180) },
      { type: 'qr_created', title: 'Social Media QR', timestamp: new Date(Date.now() - 1000 * 60 * 240) }
    ]
  };
};

// Get analytics overview
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    
    // Check plan limits
    const userPlan = req.user.plan || 'free';
    const planLimits = {
      free: { analytics: true, detailedCharts: false },
      premium: { analytics: true, detailedCharts: true },
      enterprise: { analytics: true, detailedCharts: true }
    };
    
    if (!planLimits[userPlan]?.analytics) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PLAN_LIMIT_EXCEEDED',
          message: 'Analytics not available in your current plan. Please upgrade to access analytics.',
          details: { requiredPlan: 'premium' }
        }
      });
    }
    
    const analytics = generateMockAnalytics(timeRange);
    
    // Filter data based on plan
    if (userPlan === 'free') {
      analytics.charts = {
        qrCodesCreated: analytics.charts.qrCodesCreated,
        qrCodeScans: analytics.charts.qrCodeScans
      };
      analytics.topQrCodes = analytics.topQrCodes.slice(0, 3);
      analytics.recentActivity = analytics.recentActivity.slice(0, 3);
    }
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch analytics'
      }
    });
  }
});

// Get QR code specific analytics
router.get('/qr/:qrCodeId', authenticateToken, async (req, res) => {
  try {
    const { qrCodeId } = req.params;
    
    // Check plan limits
    const userPlan = req.user.plan || 'free';
    if (userPlan === 'free') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PLAN_LIMIT_EXCEEDED',
          message: 'Detailed QR analytics not available in free plan. Please upgrade to access detailed analytics.',
          details: { requiredPlan: 'premium' }
        }
      });
    }
    
    // Mock QR code analytics
    const qrAnalytics = {
      qrCode: {
        _id: qrCodeId,
        title: 'Product QR Code',
        totalScans: Math.floor(Math.random() * 500) + 50,
        uniqueScans: Math.floor(Math.random() * 400) + 40,
        lastScanned: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
      },
      scanHistory: Array.from({ length: 10 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        location: 'New York, US'
      })),
      dailyStats: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scans: Math.floor(Math.random() * 20) + 1
      }))
    };
    
    res.json({
      success: true,
      data: qrAnalytics
    });
  } catch (error) {
    console.error('QR analytics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch QR analytics'
      }
    });
  }
});

// Get dashboard stats
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userPlan = req.user.plan || 'free';
    
    const dashboardStats = {
      today: {
        qrCodesCreated: Math.floor(Math.random() * 10) + 1,
        totalScans: Math.floor(Math.random() * 100) + 10
      },
      thisWeek: {
        qrCodesCreated: Math.floor(Math.random() * 50) + 10,
        totalScans: Math.floor(Math.random() * 500) + 100
      },
      thisMonth: {
        qrCodesCreated: Math.floor(Math.random() * 200) + 50,
        totalScans: Math.floor(Math.random() * 2000) + 500
      }
    };
    
    // Limit data for free plan
    if (userPlan === 'free') {
      dashboardStats.thisMonth = {
        qrCodesCreated: Math.min(dashboardStats.thisMonth.qrCodesCreated, 100),
        totalScans: Math.min(dashboardStats.thisMonth.totalScans, 1000)
      };
    }
    
    res.json({
      success: true,
      data: dashboardStats
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch dashboard stats'
      }
    });
  }
});

module.exports = router; 