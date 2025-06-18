const express = require('express');
const qrService = require('../services/qrService');
const User = require('../models/User');
const QRCode = require('../models/QRCode');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateApiKey, checkApiRateLimit, checkUsageLimit } = require('../middleware/auth');

const router = express.Router();

// Apply API key authentication to all routes
router.use(authenticateApiKey);

// Generate single QR code via API
router.post('/qr/generate', 
  checkApiRateLimit(100),
  checkUsageLimit(1),
  asyncHandler(async (req, res) => {
    const { content, title, type, styling } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const qrCode = await qrService.generateAndSaveQR(req.user._id, {
      content: content
    }, {
      title: title || 'API Generated QR',
      type: type || 'url',
      styling: styling || {}
    });

    // Increment user's QR count and API calls
    await Promise.all([
      req.user.incrementQrCount(1),
      req.user.incrementApiCalls(1)
    ]);

    res.status(201).json({
      success: true,
      data: {
        id: qrCode._id,
        title: qrCode.title,
        content: qrCode.content,
        type: qrCode.type,
        qrUrl: qrCode.qrUrl,
        downloadUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}${qrCode.qrImage.url}`,
        createdAt: qrCode.createdAt
      }
    });
  })
);

// Generate bulk QR codes via API
router.post('/qr/bulk-generate',
  checkApiRateLimit(10),
  asyncHandler(async (req, res) => {
    const { data, styling } = req.body;
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: 'Data array is required' });
    }

    if (data.length > 1000) {
      return res.status(400).json({ error: 'Maximum 1000 QR codes allowed per request' });
    }

    // Check usage limits
    const limits = req.user.subscriptionLimits;
    if (data.length > limits.daily - req.user.usage.qrGeneratedToday) {
      return res.status(429).json({
        error: 'Daily QR generation limit exceeded',
        requested: data.length,
        available: limits.daily - req.user.usage.qrGeneratedToday
      });
    }

    const result = await qrService.generateBulkQR(req.user._id, data, {
      styling: styling || {},
      metadata: {
        source: 'api'
      }
    });

    // Increment user's QR count and API calls
    await Promise.all([
      req.user.incrementQrCount(result.successful),
      req.user.incrementApiCalls(1)
    ]);

    res.status(201).json({
      success: true,
      data: {
        batchId: result.batchId,
        totalProcessed: result.totalProcessed,
        successful: result.successful,
        failed: result.failed,
        qrCodes: result.results.filter(r => r.success).map(r => ({
          id: r.qrCode._id,
          title: r.qrCode.title,
          content: r.qrCode.content,
          qrUrl: r.qrCode.qrUrl,
          downloadUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}${r.qrCode.qrImage.url}`,
          rowIndex: r.rowIndex
        }))
      }
    });
  })
);

// Get user's QR codes
router.get('/qr', 
  checkApiRateLimit(50),
  asyncHandler(async (req, res) => {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      type, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;

    const query = { userId: req.user._id, isActive: true };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    if (type) {
      query.type = type;
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [qrCodes, total] = await Promise.all([
      QRCode.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .select('title content type qrImage.url analytics.scans createdAt')
        .lean(),
      QRCode.countDocuments(query)
    ]);

    // Increment API calls
    await req.user.incrementApiCalls(1);

    res.json({
      success: true,
      data: {
        qrCodes: qrCodes.map(qr => ({
          id: qr._id,
          title: qr.title,
          content: qr.content,
          type: qr.type,
          qrUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}${qr.qrImage.url}`,
          scans: qr.analytics.scans,
          createdAt: qr.createdAt
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  })
);

// Get single QR code
router.get('/qr/:id', 
  checkApiRateLimit(50),
  asyncHandler(async (req, res) => {
    const qrCode = await QRCode.findOne({ 
      _id: req.params.id, 
      userId: req.user._id, 
      isActive: true 
    }).select('title content type qrImage.url analytics.scans createdAt');

    if (!qrCode) {
      return res.status(404).json({ error: 'QR code not found' });
    }

    // Increment API calls
    await req.user.incrementApiCalls(1);

    res.json({
      success: true,
      data: {
        id: qrCode._id,
        title: qrCode.title,
        content: qrCode.content,
        type: qrCode.type,
        qrUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}${qrCode.qrImage.url}`,
        scans: qrCode.analytics.scans,
        createdAt: qrCode.createdAt
      }
    });
  })
);

// Update QR code content
router.put('/qr/:id', 
  checkApiRateLimit(20),
  asyncHandler(async (req, res) => {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const qrCode = await qrService.updateQRContent(req.params.id, content, req.user._id);

    // Increment API calls
    await req.user.incrementApiCalls(1);

    res.json({
      success: true,
      data: {
        id: qrCode._id,
        title: qrCode.title,
        content: qrCode.content,
        type: qrCode.type,
        qrUrl: qrCode.qrUrl,
        updatedAt: qrCode.updatedAt
      }
    });
  })
);

// Delete QR code
router.delete('/qr/:id', 
  checkApiRateLimit(20),
  asyncHandler(async (req, res) => {
    await qrService.deleteQR(req.params.id, req.user._id);

    // Increment API calls
    await req.user.incrementApiCalls(1);

    res.json({
      success: true,
      message: 'QR code deleted successfully'
    });
  })
);

// Get user statistics
router.get('/stats', 
  checkApiRateLimit(30),
  asyncHandler(async (req, res) => {
    const stats = await QRCode.getUserStats(req.user._id);
    
    const totalQrCodes = stats[0]?.totalQrCodes || 0;
    const totalScans = stats[0]?.totalScans || 0;
    const averageScans = stats[0]?.averageScans || 0;

    // Get usage information
    const limits = req.user.subscriptionLimits;
    const remainingQrToday = req.user.remainingQrToday;

    // Increment API calls
    await req.user.incrementApiCalls(1);

    res.json({
      success: true,
      data: {
        qrCodes: {
          total: totalQrCodes,
          totalScans: totalScans,
          averageScans: Math.round(averageScans * 100) / 100
        },
        usage: {
          qrGeneratedToday: req.user.usage.qrGeneratedToday,
          qrGeneratedTotal: req.user.usage.qrGeneratedTotal,
          apiCallsToday: req.user.usage.apiCallsToday,
          apiCallsTotal: req.user.usage.apiCallsTotal,
          remainingQrToday: remainingQrToday,
          dailyLimit: limits.daily
        },
        subscription: {
          plan: req.user.subscription.plan,
          status: req.user.subscription.status
        }
      }
    });
  })
);

// Get API documentation
router.get('/docs', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      title: 'MQRGen API Documentation',
      version: '1.0.0',
      baseUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/api/v1`,
      authentication: {
        type: 'API Key',
        header: 'X-API-Key',
        description: 'Include your API key in the request header'
      },
      rateLimits: {
        qrGeneration: '100 requests per day',
        bulkGeneration: '10 requests per day',
        dataRetrieval: '50 requests per day',
        updates: '20 requests per day'
      },
      endpoints: [
        {
          method: 'POST',
          path: '/qr/generate',
          description: 'Generate a single QR code',
          parameters: {
            content: 'string (required) - The content to encode in QR code',
            title: 'string (optional) - Title for the QR code',
            type: 'string (optional) - Type of QR code (url, text, email, etc.)',
            styling: 'object (optional) - Styling options'
          }
        },
        {
          method: 'POST',
          path: '/qr/bulk-generate',
          description: 'Generate multiple QR codes from data array',
          parameters: {
            data: 'array (required) - Array of objects with content',
            styling: 'object (optional) - Styling options for all QR codes'
          }
        },
        {
          method: 'GET',
          path: '/qr',
          description: 'Get user\'s QR codes with pagination and filtering',
          parameters: {
            page: 'number (optional) - Page number',
            limit: 'number (optional) - Items per page',
            search: 'string (optional) - Search term',
            type: 'string (optional) - Filter by type',
            sortBy: 'string (optional) - Sort field',
            sortOrder: 'string (optional) - Sort order (asc/desc)'
          }
        },
        {
          method: 'GET',
          path: '/qr/:id',
          description: 'Get a specific QR code by ID'
        },
        {
          method: 'PUT',
          path: '/qr/:id',
          description: 'Update QR code content',
          parameters: {
            content: 'string (required) - New content for QR code'
          }
        },
        {
          method: 'DELETE',
          path: '/qr/:id',
          description: 'Delete a QR code'
        },
        {
          method: 'GET',
          path: '/stats',
          description: 'Get user statistics and usage information'
        }
      ],
      responseFormat: {
        success: 'boolean - Indicates if the request was successful',
        data: 'object/array - Response data',
        error: 'string - Error message (if success is false)'
      },
      examples: {
        generateQr: {
          request: {
            method: 'POST',
            url: '/api/v1/qr/generate',
            headers: {
              'X-API-Key': 'your_api_key_here',
              'Content-Type': 'application/json'
            },
            body: {
              content: 'https://example.com',
              title: 'My Website',
              type: 'url'
            }
          },
          response: {
            success: true,
            data: {
              id: 'qr_code_id',
              title: 'My Website',
              content: 'https://example.com',
              type: 'url',
              qrUrl: 'https://your-domain.com/uploads/qr_image.png',
              downloadUrl: 'https://your-domain.com/uploads/qr_image.png',
              createdAt: '2024-01-01T00:00:00.000Z'
            }
          }
        }
      }
    }
  });
}));

module.exports = router; 