import dotenv from "dotenv";
dotenv.config({ path: "./config.env" });
import express from "express";
import morgan from "morgan";
import compression from "compression";
import globalError from "./middlewares/globalHandler.js";
import AppError from "./utils/appError.js";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoute.js";
import userRoute from "./routes/userRoute.js";
import codeSubmissionRoute from "./routes/codeSubmissionRoute.js";
import reviewRoute from "./routes/reviewRoute.js";
import commentRoute from "./routes/commentRoute.js";
import socialRoute from "./routes/socialRoute.js";
import notificationRoute from "./routes/notificationRoute.js";
import realTimeRoute from "./routes/realTimeRoute.js";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import {swaggerSpec} from "./config/swagger.js";

import{responseTimeMiddleware,memoryMonitorMiddleware} from "./middlewares/performance.js";
import { cacheMiddleware } from "./middlewares/cache.js";

// Import rate limiting
import {
  apiRateLimiter,
  authRateLimiter,
  submitRateLimiter,
} from "./utils/rateLimit.js";

const app = express();

// Security headers
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Compression
app.use(compression({
  threshold: 1024, // Only compress responses > 1KB
  level: 6, // Compression level (1-9)
}));

// Response time tracking
app.use(responseTimeMiddleware);

// Memory monitoring
app.use(memoryMonitorMiddleware);

app.use(
  express.json({
    limit: "10kb",
  })
);

app.use(cookieParser());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
app.use(`/api`,apiRateLimiter.middleware());
app.use(`/api/auth`,authRateLimiter.middleware());
app.use(`/api/submissions`,submitRateLimiter.middleware());

// CACHING MIDDLEWARE
app.use('/api/users/leaderboard', cacheMiddleware(900)); // 15 minutes
app.use('/api/submissions/analytics', cacheMiddleware(1800)); // 30 minutes

//Routes for api
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoute);
app.use("/api/submissions", codeSubmissionRoute);
app.use("/api/reviews", reviewRoute);
app.use("/api/comments", commentRoute);
app.use("/api/social", socialRoute);
app.use("/api/notifications", notificationRoute);
app.use("/api/realtime", realTimeRoute);

//API Documentation endpoint
app.get("/api", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "CodeReview Platform API v1.0.0 - Production Ready",
    features: {
      performance: {
        caching: "Redis-powered caching system",
        optimization: "Database indexing and query optimization",
        monitoring: "Real-time performance monitoring",
        compression: "Response compression enabled"
      },
      backgroundJobs: {
        emailProcessing: "Automated email notifications",
        codeAnalysis: "Background code quality analysis",
        reputationCalculation: "Automated reputation updates",
        analytics: "Daily analytics processing",
        cleanup: "Automated maintenance tasks"
      },
      scalability: {
        rateLimiting: "Redis-based rate limiting",
        sessionManagement: "Redis session storage",
        queryOptimization: "Advanced MongoDB aggregations",
        caching: "Multi-layer caching strategy"
      }
    },
    endpoints: {
      authentication: "/api/auth",
      users: "/api/users",
      submissions: "/api/submissions",
      reviews: "/api/reviews",
      comments: "/api/comments",
      social: "/api/social",
      notifications: "/api/notifications",
      realtime: "/api/realtime"
    },
    performanceFeatures: {
      responseTime: "Sub-100ms average response time",
      caching: "Redis caching with intelligent invalidation",
      backgroundJobs: "Queue-based processing with Bull.js",
      monitoring: "Real-time performance metrics",
      optimization: "Database indexing and query optimization"
    },
    features: {
      authentication: "JWT with refresh tokens",
      userManagement: "Profile, reputation, skills",
      submissions: "Code submission with analytics",
      reviews: "Line-by-line code reviews", // NEW
      search: "Advanced search and filtering",
      analytics: "Platform and user statistics",
    },
    documentation: "Visit /api/docs for detailed API documentation",
  });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'CodeReview API Documentation',
  customfavIcon: '/favicon.ico'
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.use("/{*any}", (req, res, next) => {
  next(new AppError(`couldnt find ${req.originalUrl} in our server`));
});

app.use(globalError);

export default app;
