// src/app.js
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/error-handler');
const config = require('./config');

// Import routers
const authRouter = require('./routes/auth.routes');
const userRouter = require('./routes/user.routes');
const provinceRouter = require('./routes/province.routes');
const newsRouter = require('./routes/news.routes');
const eventRouter = require('./routes/event.routes');
const shoppingRouter = require('./routes/shopping.routes');
const trafficRouter = require('./routes/traffic.routes');
const paymentRouter = require('./routes/payment.routes');
const aiRouter = require('./routes/ai.routes');
const healthRouter = require('./routes/health.routes');

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: config.cors.origin,
    credentials: true
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compression
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
});

app.use('/api/', limiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check (no rate limit)
app.use('/health', healthRouter);

// API Routes - v1
const apiV1 = '/api/v1';
app.use(`${apiV1}/auth`, authRouter);
app.use(`${apiV1}/users`, userRouter);
app.use(`${apiV1}/provinces`, provinceRouter);
app.use(`${apiV1}/news`, newsRouter);
app.use(`${apiV1}/events`, eventRouter);
app.use(`${apiV1}/shopping`, shoppingRouter);
app.use(`${apiV1}/traffic`, trafficRouter);
app.use(`${apiV1}/payments`, paymentRouter);
app.use(`${apiV1}/ai`, aiRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path
  });
});

// Global error handler
app.use(errorHandler);

// Socket.IO setup
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });

  // Traffic updates subscription
  socket.on('subscribe:traffic', (provinceId) => {
    socket.join(`traffic:${provinceId}`);
    logger.info(`Socket ${socket.id} subscribed to traffic:${provinceId}`);
  });

  socket.on('unsubscribe:traffic', (provinceId) => {
    socket.leave(`traffic:${provinceId}`);
  });
});

// Make io accessible to routes
app.set('io', io);

module.exports = { app, httpServer };

