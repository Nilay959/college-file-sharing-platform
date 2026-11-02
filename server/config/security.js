const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

/**
 * 1. Environment Variables Validation (Requirement 2 & 11)
 */
function validateEnvironment() {
  const missing = [];
  if (!process.env.MONGO_URI) missing.push('MONGO_URI');
  if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      missing.push('JWT_SECRET');
    } else {
      console.warn('⚠️ WARNING: JWT_SECRET not provided. Using fallback development secret.');
      process.env.JWT_SECRET = 'dev_jwt_secret_must_change_in_production_32chars!';
    }
  } else if (process.env.JWT_SECRET.length < 32 && process.env.NODE_ENV === 'production') {
    console.error('❌ FATAL: JWT_SECRET must be at least 32 characters in production.');
    process.exit(1);
  }

  if (missing.length > 0) {
    console.error(`❌ FATAL: Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

/**
 * 2. Security Headers (Requirement 7 & 10)
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "*"],
      connectSrc: ["'self'", "https:", "http://localhost:*", "http://127.0.0.1:*"],
      frameSrc: ["'self'", "https:", "blob:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: "sameorigin" },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true,
});

/**
 * 3. Rate Limiters (Requirement 8)
 */
// General API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
});

// Strict Auth Limiter (Prevents Brute-Force Attacks on Login)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 login attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. For security, please try again in 15 minutes.' },
});

// Strict OTP Limiter (Prevents OTP spam and enumeration)
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 8, // Limit each IP to 8 OTP requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many verification code requests. Please wait 10 minutes before trying again.' },
});

// File Upload Limiter
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'File upload rate limit reached. Please wait before uploading more files.' },
});

/**
 * 4. Input Sanitization (Requirement 6, 7 & 15: NoSQL injection & XSS prevention)
 */
function sanitizeInput(req, res, next) {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    for (const key of Object.keys(obj)) {
      // Prevent NoSQL query injection by blocking '$' and '.' in object keys
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
        continue;
      }
      if (typeof obj[key] === 'string') {
        // Strip out dangerous script injection patterns
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '');
      } else if (typeof obj[key] === 'object') {
        sanitize(obj[key]);
      }
    }
    return obj;
  };

  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);

  next();
}

/**
 * 5. Allowed CORS Origins (Requirement 9)
 */
const getAllowedOrigins = () => {
  const defaults = [
    'http://localhost:8443',
    'http://127.0.0.1:8443',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];
  if (process.env.CLIENT_URL) {
    defaults.push(process.env.CLIENT_URL);
  }
  return defaults;
};

const corsOptions = {
  origin: (origin, callback) => {
    const allowed = getAllowedOrigins();
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server) or from allowed origins
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24 hours
};

module.exports = {
  validateEnvironment,
  securityHeaders,
  apiLimiter,
  authLimiter,
  otpLimiter,
  uploadLimiter,
  sanitizeInput,
  corsOptions,
};
