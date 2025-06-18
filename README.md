# MQRGen Enterprise QR Generator

A full-stack QR code generation platform built with React (Frontend) and Express (Backend).

## Project Structure

```
mqrgen.com/
├── backend/          # Express.js API server
│   ├── index.js      # Main server file
│   ├── package.json  # Backend dependencies
│   ├── .env          # Backend environment variables
│   ├── models/       # MongoDB models
│   ├── routes/       # API routes
│   ├── middleware/   # Express middleware
│   └── services/     # Business logic
├── client/           # React frontend
│   ├── src/          # React source files
│   ├── package.json  # Frontend dependencies
│   └── public/       # Static files
└── package.json      # Root package.json for convenience scripts
```

## Quick Start

### Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../client
npm install
```

### Start Backend
```bash
# From project root
npm run backend          # Production mode
npm run backend:dev      # Development mode with nodemon

# Or directly from backend directory
cd backend
npm start                # Production mode
npm run dev              # Development mode with nodemon
```

### Start Frontend
```bash
# From project root
npm run frontend         # Production mode
npm run frontend:dev     # Development mode

# Or directly from client directory
cd client
npm start                # Production mode
npm run dev              # Development mode
```

## Available Scripts

### Root Level
- `npm run backend` - Start backend in production mode
- `npm run backend:dev` - Start backend in development mode
- `npm run frontend` - Start frontend in production mode
- `npm run frontend:dev` - Start frontend in development mode

### Backend
- `npm start` - Start server with `node index.js`
- `npm run dev` - Start server with `nodemon index.js`

### Frontend
- `npm start` - Start React development server
- `npm run dev` - Same as start (alias)
- `npm run build` - Build for production

## Ports
- **Backend**: http://localhost:5000
- **Frontend**: http://localhost:3000

## Environment Setup

### Backend Environment Variables
The backend uses a `.env` file located in the `backend/` directory. Copy the example and configure:

```bash
cd backend
# The .env file is already created with default values
# Update the values as needed for your environment
```

Key environment variables:
- `MONGODB_URI` - MongoDB connection string
- `RAZORPAY_KEY_ID` - Razorpay API key
- `RAZORPAY_KEY_SECRET` - Razorpay secret key
- `CLERK_SECRET_KEY` - Clerk authentication secret
- `CLERK_PUBLISHABLE_KEY` - Clerk publishable key

## Features
- 🔗 Single QR Code Generation
- 📁 Bulk QR Code Upload (CSV/Excel)
- 📊 Analytics Dashboard
- 💳 Payment Integration (Razorpay)
- 🔐 Authentication (Clerk)
- 📱 Responsive Design
- 🚀 API Access

## Technologies Used

### Backend
- Express.js
- MongoDB (Mongoose)
- Razorpay (Payments)
- JWT Authentication
- Multer (File Upload)

### Frontend
- React 18
- JSX
- Clerk Authentication
- Axios (API calls)
- CSS3 with modern styling 