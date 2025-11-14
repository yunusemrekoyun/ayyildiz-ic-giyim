// backend/server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer";
import helmet from "helmet";
import * as Sentry from "@sentry/node";
import { connectDB } from "./config/db.js";
import apiRoutes from "./routes/index.js";
import { configureCloudinary } from "./config/cloudinary.js";
import { generalLimiter } from "./middleware/rateLimiters.js";
import { httpLogger } from "./middleware/httpLogger.js";
import { logger } from "./utils/logger.js";

const sentryEnabled = Boolean(process.env.SENTRY_DSN);
if (sentryEnabled) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
  });
}

const app = express();

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        fontSrc: ["'self'", "https:", "data:"],
        connectSrc: [
          "'self'",
          process.env.FRONTEND_URL || "http://localhost:5173",
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https:"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        frameAncestors: ["'self'"],
        objectSrc: ["'none'"],
      },
    },
  })
);

if (sentryEnabled) {
  app.use(Sentry.Handlers.requestHandler());
}

const corsAllowlist = (
  process.env.CORS_ALLOWLIST ||
  process.env.FRONTEND_URL ||
  "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || corsAllowlist.includes(origin)) {
        return callback(null, origin || true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use("/api", generalLimiter);
app.use(httpLogger);
app.use(express.json());
app.use(cookieParser());

configureCloudinary();

app.use("/api", apiRoutes);

if (sentryEnabled) {
  app.use(Sentry.Handlers.errorHandler());
}

// --- Multer ve genel hata yakalayıcı ---
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const maxMb = process.env.HERO_MAX_FILE_MB || 200;
    return res
      .status(413)
      .json({ message: `File too large. Max ${maxMb}MB allowed.` });
  }
  if (err) {
    const status = err.status || 500;
    if (status >= 500) {
      logger.error({ err }, "Unhandled server error");
    }
    return res.status(status).json({ message: err.message || "Server error" });
  }
  next();
});

const port = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(port, () => {
    logger.info({ port }, "API running");
  });
});
