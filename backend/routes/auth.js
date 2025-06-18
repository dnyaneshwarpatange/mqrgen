const express = require('express');
const router = express.Router();

// Health check route
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Auth route is working.' });
});

// Example protected route (replace with Clerk middleware in production)
router.get('/me', (req, res) => {
  // In production, verify Clerk JWT and return user info
  res.json({ user: 'demo', message: 'Replace with Clerk user info.' });
});

module.exports = router; 