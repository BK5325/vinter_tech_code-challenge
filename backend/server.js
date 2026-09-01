require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const { validateEnv } = require('./config/env');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const challengeRoutes = require('./routes/challenges');
const questionRoutes = require('./routes/questions');
const attemptRoutes = require('./routes/attempts');
const resultRoutes = require('./routes/results');
const rankingRoutes = require('./routes/rankings');
const reportRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');
const securityRoutes = require('./routes/security');

const { errorHandler } = require('./middleware/errorHandler');

// Validate environment variables
validateEnv();

const app = express();

// ─── Trust Proxy ──────────────────────────────────────────────────────────────
// Required for Render (or any reverse proxy) so rate limiters see the real client IPs
// instead of the load balancer's IP.
app.set('trust proxy', 1);

// ─── Database Connection ──────────────────────────────────────────────────────
connectDB();

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────
const clientUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/$/, '') : '';

const allowedOrigins = [
  clientUrl,
  'http://localhost:3000',
  'http://localhost:5173',
  'https://vintertech-code-challenge.vercel.app' // Hardcoded frontend URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check against allowed origins (stripping trailing slash from incoming origin just in case)
    const incomingOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(incomingOrigin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Too many authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Logging ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/attempts', attemptRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/rankings', rankingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/security', securityRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Code Challenge API Server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health:      http://localhost:${PORT}/health\n`);
});

module.exports = app;
