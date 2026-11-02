const jwt = require('jsonwebtoken');
const User = require('../models/User');

const requireAuth = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
      // Query token fallback for direct browser download / preview links
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ message: 'Authentication required. Please sign in.' });
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_must_change_in_production_32chars!';
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify user still exists in database and is active
    const user = await User.findById(decoded.id).lean();
    if (!user) {
      return res.status(401).json({ message: 'User account no longer exists.' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: 'Account has been deactivated. Please contact support.' });
    }

    req.user = {
      id: user._id.toString(),
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      isVerified: user.isVerified,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please sign in again.' });
    }
    return res.status(401).json({ message: 'Invalid authentication token.' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Administrator privileges required.' });
  }
  next();
};

module.exports = { requireAuth, requireAdmin };
