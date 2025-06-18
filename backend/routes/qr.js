const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const qrService = require('../services/qrService');
const QRCode = require('../models/QRCode');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { checkUsageLimit, checkSubscription } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'), false);
    }
  }
});

// Generate single QR code
router.post('/generate', checkUsageLimit(1), asyncHandler(async (req, res) => {
  const { content, title, type, styling } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  const qrCode = await qrService.generateAndSaveQR(req.user._id, {
    content: content
  }, {
    title: title || 'QR Code',
    type: type || 'url',
    styling: styling || {}
  });

  // Increment user's QR count
  await req.user.incrementQrCount(1);

  res.status(201).json({
    success: true,
    data: qrCode
  });
}));

// Bulk upload QR codes from CSV/Excel file
router.post('/bulk-upload', checkUsageLimit(1000), upload.single('file'), async (req, res) => {
  try {
    const { contentColumn, titleColumn } = req.body;
    const styling = req.body.styling ? JSON.parse(req.body.styling) : {};
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'No file uploaded'
        }
      });
    }

    // Check plan limits
    const userPlan = req.user.plan || 'free';
    const planLimits = {
      free: 100,
      premium: 10000,
      enterprise: 100000
    };
    
    const limit = planLimits[userPlan];
    
      // Parse file based on type
    let data = [];
    const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
    
    if (fileExtension === 'csv') {
      // Parse CSV
      const csvContent = req.file.buffer.toString();
      const lines = csvContent.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      data = lines.slice(1).filter(line => line.trim()).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });
    } else if (['xlsx', 'xls'].includes(fileExtension)) {
      // Parse Excel using xlsx library
      const XLSX = require('xlsx');
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length === 0) {
        return res.status(400).json({ 
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Excel file is empty'
          }
        });
      }

      const headers = jsonData[0].map(h => h?.toString().trim() || '');
      data = jsonData.slice(1).filter(row => row.some(cell => cell)).map(row => {
        const rowData = {};
        headers.forEach((header, index) => {
          rowData[header] = row[index]?.toString() || '';
        });
        return rowData;
      });
    } else {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Unsupported file format. Please upload CSV or Excel files.'
        }
      });
    }

    // Check if data exceeds plan limit
    if (data.length > limit) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PLAN_LIMIT_EXCEEDED',
          message: `Your ${userPlan} plan allows maximum ${limit} QR codes. Please upgrade your plan or reduce the number of rows.`,
          details: {
            currentPlan: userPlan,
            limit: limit,
            requested: data.length,
            requiredPlan: data.length <= 10000 ? 'premium' : 'enterprise'
          }
        }
      });
    }

    if (!contentColumn || !data[0].hasOwnProperty(contentColumn)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Content column not found in file'
        }
      });
    }

    const results = [];
    const errors = [];
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const content = row[contentColumn];
      const title = titleColumn ? row[titleColumn] : `QR Code ${i + 1}`;

      if (!content || content.trim() === '') {
        failed++;
        errors.push({
          row: i + 1,
          error: 'Empty content'
        });
        continue;
      }

      try {
        // Generate QR code using external API
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${styling.size || 300}x${styling.size || 300}&data=${encodeURIComponent(content)}&color=${(styling.foregroundColor || '#000000').replace('#', '')}&bgcolor=${(styling.backgroundColor || '#FFFFFF').replace('#', '')}&margin=${styling.margin || 2}`;

        // Create QR code record
        const qrCode = new QRCode({
          userId: req.user.userId,
          title: title,
          content: content,
          type: 'url',
          qrImage: {
            url: qrApiUrl
          },
          styling: styling,
          analytics: {
            scans: 0,
            lastScanned: null
          }
        });

        await qrCode.save();
        successful++;

        results.push({
          success: true,
          qrCode: {
            _id: qrCode._id,
            title: qrCode.title,
            content: qrCode.content,
            qrImage: qrCode.qrImage,
            createdAt: qrCode.createdAt
          }
        });
      } catch (error) {
        failed++;
        errors.push({
          row: i + 1,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      data: {
        totalProcessed: data.length,
        successful: successful,
        failed: failed,
        results: results,
        errors: errors
      }
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to process bulk upload'
      }
    });
  }
});

// Get user's QR codes with pagination and filtering
router.get('/', asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    search, 
    type, 
    sortBy = 'createdAt', 
    sortOrder = 'desc',
    batchId 
  } = req.query;

  const query = { userId: req.user._id, isActive: true };

  // Add search filter
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } }
    ];
  }

  // Add type filter
  if (type) {
    query.type = type;
  }

  // Add batch filter
  if (batchId) {
    query['metadata.batchId'] = batchId;
  }

  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [qrCodes, total] = await Promise.all([
    QRCode.find(query)
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

// Get single QR code
router.get('/:id', asyncHandler(async (req, res) => {
  const qrCode = await QRCode.findOne({ 
    _id: req.params.id, 
    userId: req.user._id, 
    isActive: true 
  });

  if (!qrCode) {
    return res.status(404).json({ error: 'QR code not found' });
  }

  res.json({
    success: true,
    data: qrCode
  });
}));

// Update QR code content
router.put('/:id', asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  const qrCode = await qrService.updateQRContent(req.params.id, content, req.user._id);

  res.json({
    success: true,
    data: qrCode
  });
}));

// Delete QR code
router.delete('/:id', asyncHandler(async (req, res) => {
  await qrService.deleteQR(req.params.id, req.user._id);

  res.json({
    success: true,
    message: 'QR code deleted successfully'
  });
}));

// Download single QR code
router.get('/:id/download', asyncHandler(async (req, res) => {
  const qrCode = await QRCode.findOne({ 
    _id: req.params.id, 
    userId: req.user._id, 
    isActive: true 
  });

  if (!qrCode) {
    return res.status(404).json({ error: 'QR code not found' });
  }

  const filePath = path.join(process.env.UPLOAD_PATH || './uploads', qrCode.qrImage.filename);
  
  res.download(filePath, `${qrCode.title}.${qrCode.qrImage.format}`);
}));

// Generate PDF with selected QR codes
router.post('/download/pdf', asyncHandler(async (req, res) => {
  const { qrCodeIds } = req.body;

  if (!qrCodeIds || !Array.isArray(qrCodeIds) || qrCodeIds.length === 0) {
    return res.status(400).json({ error: 'QR code IDs are required' });
  }

  const qrCodes = await QRCode.find({
    _id: { $in: qrCodeIds },
    userId: req.user._id,
    isActive: true
  });

  if (qrCodes.length === 0) {
    return res.status(404).json({ error: 'No QR codes found' });
  }

  const pdfResult = await qrService.generatePDFWithQR(qrCodes);

  res.json({
    success: true,
    data: {
      downloadUrl: pdfResult.url,
      filename: pdfResult.filename
    }
  });
}));

// Generate Word document with selected QR codes
router.post('/download/word', asyncHandler(async (req, res) => {
  const { qrCodeIds } = req.body;

  if (!qrCodeIds || !Array.isArray(qrCodeIds) || qrCodeIds.length === 0) {
    return res.status(400).json({ error: 'QR code IDs are required' });
  }

  const qrCodes = await QRCode.find({
    _id: { $in: qrCodeIds },
    userId: req.user._id,
    isActive: true
  });

  if (qrCodes.length === 0) {
    return res.status(404).json({ error: 'No QR codes found' });
  }

  const wordResult = await qrService.generateWordWithQR(qrCodes);

  res.json({
    success: true,
    data: {
      downloadUrl: wordResult.url,
      filename: wordResult.filename
    }
  });
}));

// Get QR code statistics
router.get('/stats/overview', asyncHandler(async (req, res) => {
  const stats = await QRCode.getUserStats(req.user._id);
  
  const totalQrCodes = stats[0]?.totalQrCodes || 0;
  const totalScans = stats[0]?.totalScans || 0;
  const averageScans = stats[0]?.averageScans || 0;
  const mostScanned = stats[0]?.mostScanned || 0;

  // Get recent QR codes
  const recentQrCodes = await QRCode.find({ userId: req.user._id, isActive: true })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('title content analytics.scans createdAt');

  // Get QR codes by type
  const typeStats = await QRCode.aggregate([
    { $match: { userId: req.user._id, isActive: true } },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalScans: { $sum: '$analytics.scans' }
      }
    },
    { $sort: { count: -1 } }
  ]);

  res.json({
    success: true,
    data: {
      overview: {
        totalQrCodes,
        totalScans,
        averageScans: Math.round(averageScans * 100) / 100,
        mostScanned
      },
      recentQrCodes,
      typeStats
    }
  });
}));

// Helper function to parse CSV
async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

// Helper function to parse Excel
async function parseExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet);
}

module.exports = router; 