# MQRGen Setup Instructions

## 🚀 Complete Setup Guide

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud)
- Razorpay account (for payments)
- Clerk account (for authentication)

### 1. Environment Configuration

#### Backend Environment (.env file in backend/ directory)
```bash
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/mqrgen

# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_your_razorpay_key_here
RAZORPAY_KEY_SECRET=your_razorpay_secret_here

# Clerk Authentication
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key
CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key
CLERK_JWT_ISSUER=https://clerk.your-domain.com

# Client Configuration
CLIENT_URL=http://localhost:3000

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Frontend Environment (.env file in client/ directory)
```bash
REACT_APP_API_URL=http://localhost:5000
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key
```

### 2. Installation

#### Backend Setup
```bash
cd backend
npm install
npm start
```

#### Frontend Setup
```bash
cd client
npm install
npm start
```

### 3. Key Features & Improvements

#### ✅ Fixed Issues
1. **Razorpay Integration**: Added proper error handling and fallback for development
2. **QR Code Export**: Enhanced Excel export functionality with proper formatting
3. **UI/UX Improvements**: Modern design with better colors and responsiveness
4. **Mobile Responsiveness**: Optimized for all screen sizes
5. **Authentication**: Clean tabbed interface for sign in/sign up

#### 🎨 UI Improvements
- Modern color palette with CSS variables
- Improved button animations and hover effects
- Better mobile navigation
- Enhanced card designs with shadows
- Responsive grid layouts
- Smooth transitions and animations

#### 📱 Mobile Optimizations
- Responsive navigation tabs
- Touch-friendly button sizes
- Optimized spacing for mobile screens
- Improved form layouts
- Better table responsiveness

#### 🔧 Technical Fixes
- Fixed Razorpay configuration errors
- Enhanced QR code export to Excel
- Improved error handling
- Better loading states
- Optimized file upload handling

### 4. Usage

#### Authentication
- Clean tabbed interface for sign in/sign up
- Modern design with smooth transitions
- Responsive for all devices

#### QR Code Generation
- Single QR code generation with customization
- Bulk upload from CSV/Excel files
- Multiple export formats (PDF, Excel, Word, Individual PNG)

#### Payment Integration
- Razorpay integration with proper error handling
- Test mode support for development
- Secure payment processing

### 5. Development Notes

#### Razorpay Setup
1. Create a Razorpay account
2. Get your test API keys
3. Update the backend .env file with your keys
4. For production, use live keys

#### Clerk Authentication
1. Create a Clerk account
2. Set up your application
3. Get your publishable and secret keys
4. Update both frontend and backend .env files

#### MongoDB Setup
1. Install MongoDB locally or use MongoDB Atlas
2. Update the MONGODB_URI in backend .env
3. The application will create necessary collections automatically

### 6. Troubleshooting

#### Common Issues
1. **Razorpay Error**: Ensure API keys are correctly set in .env
2. **MongoDB Connection**: Check if MongoDB is running and accessible
3. **CORS Issues**: Verify CLIENT_URL in backend .env matches frontend URL
4. **File Upload**: Ensure uploads directory exists and has write permissions

#### Development Mode
- Backend runs on http://localhost:5000
- Frontend runs on http://localhost:3000
- Use test credentials for all services

### 7. Production Deployment

#### Environment Variables
- Set NODE_ENV=production
- Use live Razorpay keys
- Configure proper MongoDB connection
- Set up proper CORS origins

#### Security
- Use environment variables for all sensitive data
- Enable HTTPS in production
- Set up proper rate limiting
- Configure proper file upload limits

### 8. Features Overview

#### ✅ Implemented
- Modern responsive UI
- Tabbed authentication interface
- QR code generation and customization
- Bulk upload with Excel/CSV support
- Multiple export formats
- Payment integration
- Mobile-optimized design
- Error handling and loading states

#### 🚀 Ready for Production
- Secure authentication
- Payment processing
- File upload handling
- API rate limiting
- Error logging
- Responsive design

---

## 🎯 Quick Start

1. Clone the repository
2. Set up environment variables
3. Install dependencies (backend & frontend)
4. Start both servers
5. Access the application at http://localhost:3000

The application is now ready with all improvements and fixes applied! 