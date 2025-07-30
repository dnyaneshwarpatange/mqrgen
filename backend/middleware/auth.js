const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mockDataService = require('../services/mockData');

// Verify Clerk JWT token
const verifyClerkToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.CLERK_SECRET_KEY, {
      issuer: process.env.CLERK_JWT_ISSUER,
      algorithms: ['HS256']
    });
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Authenticate user middleware
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' });
    }
    
    const token = authHeader.substring(7);
    
    // Verify the token
    const decoded = await verifyClerkToken(token);
    
    try {
      // Try to find or create user in MongoDB
      let user = await User.findOne({ clerkId: decoded.sub });
      
      if (!user) {
        // Create new user if not exists
        user = new User({
          clerkId: decoded.sub,
          email: decoded.email,
          firstName: decoded.first_name || decoded.given_name || 'User',
          lastName: decoded.last_name || decoded.family_name || '',
          avatar: decoded.picture || null
        });
        await user.save();
      } else {
        // Update last login
        user.lastLogin = new Date();
        await user.save();
      }
      
      req.user = user;
      next();
    } catch (dbError) {
      console.log('MongoDB not available, using mock data');
      
      // Fallback to mock data
      let user = mockDataService.getMockUser(decoded.sub);
      
      if (!user) {
        // Create mock user
        user = mockDataService.createMockUser(decoded.sub, {
          email: decoded.email,
          firstName: decoded.first_name || decoded.given_name || 'User',
          lastName: decoded.last_name || decoded.family_name || 'Name'
        });
      }
      
      req.user = user;
      next();
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// Authenticate API key middleware
const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }
    
    const user = await User.findByApiKey(apiKey);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    // Check if user subscription is active
    if (user.subscription.status !== 'active') {
      return res.status(403).json({ error: 'Subscription inactive' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// Role-based authorization middleware
const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Admin authorization middleware
const authorizeAdmin = authorizeRole('admin', 'super_admin');

// Super admin authorization middleware
const authorizeSuperAdmin = authorizeRole('super_admin');

// Subscription check middleware
const checkSubscription = (requiredPlan = 'free') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const planHierarchy = {
      free: 0,
      pro: 1,
      enterprise: 2
    };
    
    const userPlanLevel = planHierarchy[req.user.subscription.plan] || 0;
    const requiredPlanLevel = planHierarchy[requiredPlan] || 0;
    
    if (userPlanLevel < requiredPlanLevel) {
      return res.status(403).json({ 
        error: 'Subscription upgrade required',
        currentPlan: req.user.subscription.plan,
        requiredPlan: requiredPlan
      });
    }
    
    if (req.user.subscription.status !== 'active') {
      return res.status(403).json({ error: 'Subscription inactive' });
    }
    
    next();
  };
};

// Usage limit check middleware
const checkUsageLimit = (qrCount = 1) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Reset daily usage if needed
      await req.user.resetDailyUsage();
      
      const limits = req.user.subscriptionLimits;
      const currentUsage = req.user.usage.qrGeneratedToday;
      const requestedUsage = currentUsage + qrCount;
      
      if (requestedUsage > limits.daily) {
        return res.status(429).json({
          error: 'Daily QR generation limit exceeded',
          currentUsage: currentUsage,
          limit: limits.daily,
          requested: qrCount,
          remaining: Math.max(0, limits.daily - currentUsage)
        });
      }
      
      next();
    } catch (error) {
      console.error('Usage limit check error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Rate limiting middleware for API calls
const checkApiRateLimit = (maxCalls = 100) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Reset daily usage if needed
      await req.user.resetDailyUsage();
      
      const currentApiCalls = req.user.usage.apiCallsToday;
      
      if (currentApiCalls >= maxCalls) {
        return res.status(429).json({
          error: 'API rate limit exceeded',
          currentCalls: currentApiCalls,
          limit: maxCalls
        });
      }
      
      next();
    } catch (error) {
      console.error('API rate limit check error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

module.exports = {
  authenticateUser,
  authenticateApiKey,
  authorizeRole,
  authorizeAdmin,
  authorizeSuperAdmin,
  checkSubscription,
  checkUsageLimit,
  checkApiRateLimit
}; 