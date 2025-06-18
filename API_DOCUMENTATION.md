# MQRGen API Documentation

## Overview

The MQRGen API provides comprehensive QR code generation, management, and analytics services. All endpoints require authentication using Clerk JWT tokens.

**Base URL:** `http://localhost:5000` (development) / `https://your-domain.com` (production)

## Authentication

All API requests require a valid JWT token from Clerk authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Rate Limits

- **Free Plan:** 100 requests/hour
- **Premium Plan:** 1,000 requests/hour  
- **Enterprise Plan:** 10,000 requests/hour

## QR Code Management

### Create QR Code

**Endpoint:** `POST /api/qr/create`

**Request Body:**
```json
{
  "title": "My QR Code",
  "content": "https://example.com",
  "type": "url",
  "styling": {
    "size": 300,
    "foregroundColor": "#000000",
    "backgroundColor": "#FFFFFF",
    "margin": 2
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "qr_123456789",
    "title": "My QR Code",
    "content": "https://example.com",
    "type": "url",
    "qrImage": {
      "url": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https%3A//example.com"
    },
    "analytics": {
      "scans": 0,
      "lastScanned": null
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Get QR Codes List

**Endpoint:** `GET /api/qr/list`

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10, max: 100)
- `search` (string): Search by title or content

**Response:**
```json
{
  "success": true,
  "data": {
    "qrCodes": [
      {
        "_id": "qr_123456789",
        "title": "My QR Code",
        "content": "https://example.com",
        "type": "url",
        "qrImage": {
          "url": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https%3A//example.com"
        },
        "analytics": {
          "scans": 5,
          "lastScanned": "2024-01-01T12:00:00.000Z"
        },
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

### Get QR Code by ID

**Endpoint:** `GET /api/qr/{id}`

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "qr_123456789",
    "title": "My QR Code",
    "content": "https://example.com",
    "type": "url",
    "qrImage": {
      "url": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https%3A//example.com"
    },
    "analytics": {
      "scans": 5,
      "lastScanned": "2024-01-01T12:00:00.000Z",
      "scanHistory": [
        {
          "timestamp": "2024-01-01T12:00:00.000Z",
          "ip": "192.168.1.1",
          "userAgent": "Mozilla/5.0..."
        }
      ]
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Update QR Code

**Endpoint:** `PUT /api/qr/{id}`

**Request Body:**
```json
{
  "title": "Updated QR Code",
  "content": "https://updated-example.com",
  "styling": {
    "size": 400,
    "foregroundColor": "#FF0000",
    "backgroundColor": "#FFFFFF",
    "margin": 3
  }
}
```

### Delete QR Code

**Endpoint:** `DELETE /api/qr/{id}`

**Response:**
```json
{
  "success": true,
  "message": "QR code deleted successfully"
}
```

### Bulk Create QR Codes

**Endpoint:** `POST /api/qr/bulk-create`

**Request Body:**
```json
{
  "qrCodes": [
    {
      "title": "QR Code 1",
      "content": "https://example1.com",
      "type": "url"
    },
    {
      "title": "QR Code 2", 
      "content": "https://example2.com",
      "type": "url"
    }
  ],
  "styling": {
    "size": 300,
    "foregroundColor": "#000000",
    "backgroundColor": "#FFFFFF",
    "margin": 2
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalProcessed": 2,
    "successful": 2,
    "failed": 0,
    "results": [
      {
        "success": true,
        "qrCode": {
          "_id": "qr_123456789",
          "title": "QR Code 1",
          "content": "https://example1.com"
        }
      }
    ]
  }
}
```

### Bulk Upload QR Codes

**Endpoint:** `POST /api/qr/bulk-upload`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: CSV or Excel file
- `contentColumn`: Column name containing QR content
- `titleColumn`: Column name containing QR titles
- `styling`: JSON string with styling options

**Response:**
```json
{
  "success": true,
  "data": {
    "totalProcessed": 10,
    "successful": 9,
    "failed": 1,
    "results": [
      {
        "success": true,
        "qrCode": {
          "_id": "qr_123456789",
          "title": "Product 1",
          "content": "https://example.com/product1"
        }
      }
    ],
    "errors": [
      {
        "row": 5,
        "error": "Empty content"
      }
    ]
  }
}
```

### Download QR Code

**Endpoint:** `GET /api/qr/{id}/download`

**Query Parameters:**
- `format`: png, pdf, svg (default: png)

**Response:** File blob

## Analytics

### Get Analytics Overview

**Endpoint:** `GET /api/analytics`

**Query Parameters:**
- `timeRange`: 7d, 30d, 1y (default: 30d)

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalQrCodes": 150,
      "totalScans": 1250,
      "averageScansPerQr": 8.33,
      "mostScannedQr": {
        "title": "Product Landing Page",
        "scans": 245,
        "content": "https://example.com/product"
      }
    },
    "charts": {
      "qrCodesCreated": {
        "labels": ["Jan 1", "Jan 2", "Jan 3"],
        "data": [5, 8, 12]
      },
      "qrCodeScans": {
        "labels": ["Jan 1", "Jan 2", "Jan 3"],
        "data": [25, 45, 67]
      }
    },
    "topQrCodes": [
      {
        "title": "Product Landing Page",
        "scans": 245,
        "content": "https://example.com/product"
      }
    ],
    "recentActivity": [
      {
        "type": "qr_created",
        "title": "New Product QR",
        "timestamp": "2024-01-01T12:00:00.000Z"
      }
    ]
  }
}
```

### Get QR Code Analytics

**Endpoint:** `GET /api/analytics/qr/{qrCodeId}`

**Response:**
```json
{
  "success": true,
  "data": {
    "qrCode": {
      "_id": "qr_123456789",
      "title": "Product QR",
      "totalScans": 245,
      "uniqueScans": 180,
      "lastScanned": "2024-01-01T12:00:00.000Z"
    },
    "scanHistory": [
      {
        "timestamp": "2024-01-01T12:00:00.000Z",
        "ip": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "location": "New York, US"
      }
    ],
    "dailyStats": [
      {
        "date": "2024-01-01",
        "scans": 15
      }
    ]
  }
}
```

### Get Dashboard Stats

**Endpoint:** `GET /api/analytics/dashboard`

**Response:**
```json
{
  "success": true,
  "data": {
    "today": {
      "qrCodesCreated": 5,
      "totalScans": 45
    },
    "thisWeek": {
      "qrCodesCreated": 25,
      "totalScans": 180
    },
    "thisMonth": {
      "qrCodesCreated": 95,
      "totalScans": 750
    }
  }
}
```

## Subscription Management

### Get Subscription Plans

**Endpoint:** `GET /api/subscription/plans`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "free",
      "name": "Free",
      "price": 0,
      "currency": "INR",
      "maxQrCodes": 100,
      "features": [
        "Basic QR generation",
        "Standard analytics",
        "PNG download"
      ]
    },
    {
      "id": "premium",
      "name": "Premium",
      "price": 999,
      "currency": "INR",
      "maxQrCodes": 10000,
      "features": [
        "Advanced QR generation",
        "Detailed analytics",
        "Bulk upload",
        "PDF export",
        "Custom styling"
      ]
    },
    {
      "id": "enterprise",
      "name": "Enterprise",
      "price": 4799,
      "currency": "INR",
      "maxQrCodes": 100000,
      "features": [
        "Unlimited QR generation",
        "Advanced analytics",
        "API access",
        "Priority support",
        "Custom branding"
      ]
    }
  ]
}
```

### Get Current Subscription

**Endpoint:** `GET /api/subscription`

**Response:**
```json
{
  "success": true,
  "data": {
    "plan": {
      "id": "premium",
      "name": "Premium",
      "price": 999,
      "currency": "INR",
      "maxQrCodes": 10000
    },
    "status": "active",
    "currentPeriodStart": "2024-01-01T00:00:00.000Z",
    "currentPeriodEnd": "2024-02-01T00:00:00.000Z",
    "usage": {
      "qrCodesCreated": 150,
      "qrCodesRemaining": 9850
    }
  }
}
```

### Create Subscription

**Endpoint:** `POST /api/subscription/create`

**Request Body:**
```json
{
  "planId": "premium"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "order_123456789",
    "amount": 999,
    "currency": "INR",
    "razorpayOrderId": "order_razorpay_123"
  }
}
```

### Cancel Subscription

**Endpoint:** `POST /api/subscription/cancel`

**Response:**
```json
{
  "success": true,
  "message": "Subscription cancelled successfully"
}
```

## Payment Integration

### Create Payment Order

**Endpoint:** `POST /api/payment/create-order`

**Request Body:**
```json
{
  "amount": 999,
  "currency": "INR"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "order_123456789",
    "razorpayOrderId": "order_razorpay_123",
    "amount": 999,
    "currency": "INR"
  }
}
```

### Verify Payment

**Endpoint:** `POST /api/payment/verify`

**Request Body:**
```json
{
  "paymentId": "pay_123456789",
  "orderId": "order_123456789",
  "signature": "razorpay_signature"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "subscription": {
      "planId": "premium",
      "status": "active"
    }
  }
}
```

## User Management

### Get User Profile

**Endpoint:** `GET /api/user/profile`

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user_123456789",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastLogin": "2024-01-01T12:00:00.000Z"
  }
}
```

### Update User Profile

**Endpoint:** `PUT /api/user/profile`

**Request Body:**
```json
{
  "name": "John Smith",
  "preferences": {
    "defaultQrSize": 300,
    "defaultForegroundColor": "#000000",
    "defaultBackgroundColor": "#FFFFFF"
  }
}
```

### Get User Usage

**Endpoint:** `GET /api/user/usage`

**Response:**
```json
{
  "success": true,
  "data": {
    "currentPlan": {
      "id": "premium",
      "maxQrCodes": 10000
    },
    "usage": {
      "qrCodesCreated": 150,
      "qrCodesRemaining": 9850,
      "totalScans": 1250,
      "thisMonth": {
        "qrCodesCreated": 25,
        "totalScans": 180
      }
    }
  }
}
```

## Export & Download

### Export QR Codes

**Endpoint:** `POST /api/qr/export`

**Request Body:**
```json
{
  "format": "pdf",
  "qrCodeIds": ["qr_123456789", "qr_987654321"]
}
```

**Response:** File blob

## Utility Endpoints

### Health Check

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "version": "1.0.0"
  }
}
```

### Get API Limits

**Endpoint:** `GET /api/limits`

**Response:**
```json
{
  "success": true,
  "data": {
    "currentPlan": "premium",
    "rateLimit": {
      "requestsPerHour": 1000,
      "requestsRemaining": 850,
      "resetTime": "2024-01-01T01:00:00.000Z"
    },
    "qrCodeLimits": {
      "maxQrCodes": 10000,
      "qrCodesCreated": 150,
      "qrCodesRemaining": 9850
    }
  }
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please upgrade your plan.",
    "details": {
      "limit": 1000,
      "resetTime": "2024-01-01T01:00:00.000Z"
    }
  }
}
```

### Common Error Codes

- `UNAUTHORIZED`: Invalid or missing authentication token
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid request data
- `RATE_LIMIT_EXCEEDED`: Rate limit exceeded
- `PLAN_LIMIT_EXCEEDED`: Plan limit exceeded
- `INTERNAL_SERVER_ERROR`: Server error

## SDK Usage

### JavaScript/React

```javascript
import { useApiService } from './services/api';

function MyComponent() {
  const api = useApiService();
  
  const createQR = async () => {
    try {
      const result = await api.createQRCode({
        title: "My QR Code",
        content: "https://example.com",
        type: "url"
      });
      console.log('QR created:', result.data);
    } catch (error) {
      console.error('Error creating QR:', error);
    }
  };
  
  return <button onClick={createQR}>Create QR Code</button>;
}
```

### cURL Examples

```bash
# Create QR Code
curl -X POST http://localhost:5000/api/qr/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My QR Code",
    "content": "https://example.com",
    "type": "url"
  }'

# Get QR Codes List
curl -X GET "http://localhost:5000/api/qr/list?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get Analytics
curl -X GET "http://localhost:5000/api/analytics?timeRange=30d" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Webhooks

The API supports webhooks for real-time notifications:

### QR Code Scanned Webhook

**URL:** `POST /api/webhooks/qr-scanned`

**Payload:**
```json
{
  "event": "qr_code_scanned",
  "data": {
    "qrCodeId": "qr_123456789",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  }
}
```

## Support

For API support and questions:
- Email: support@mqrgen.com
- Documentation: https://docs.mqrgen.com
- Status Page: https://status.mqrgen.com 