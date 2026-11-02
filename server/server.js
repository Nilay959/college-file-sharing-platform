require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Security & Configuration
const {
  validateEnvironment,
  securityHeaders,
  apiLimiter,
  sanitizeInput,
  corsOptions,
} = require('./config/security');

// Validate critical environment variables on startup (Requirement 2 & 11)
validateEnvironment();

const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const fileRoutes = require('./routes/fileRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust first proxy if running behind reverse proxy or localhost
app.set('trust proxy', 1);

// 1. Security Headers (Helmet - Requirement 7 & 10)
app.use(securityHeaders);

// 2. Strict CORS Configuration (Requirement 9)
app.use(cors(corsOptions));

// 3. Body Parsing with payload limits to prevent buffer overflow attacks
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. Input Sanitization against NoSQL injection and XSS (Requirement 6, 7 & 15)
app.use(sanitizeInput);

// 5. Global API Rate Limiting (Requirement 8)
app.use('/api', apiLimiter);

// 6. Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected securely'))
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

// 7. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

// 8. 404 Handler for undefined API routes
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Requested API endpoint not found.' });
});

// 9. Centralized Error Handler (Requirement 11: Turn off debug mode / stack trace leaks)
app.use((err, req, res, next) => {
  // Log error internally for debugging without leaking to client
  console.error('[SERVER ERROR]', err.message);

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ message: 'Invalid or missing authentication token' });
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const statusCode = err.status || err.statusCode || 500;

  res.status(statusCode).json({
    message: isProduction
      ? 'An internal error occurred. Please try again later.'
      : err.message || 'An unexpected error occurred.',
  });
});

const server = app.listen(PORT, () => {
  console.log(`Secure FileShare Server running on port ${PORT}`);
});

module.exports = { app, server };
