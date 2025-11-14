// backend/server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { connectDB } from "./config/db.js";
import apiRoutes from "./routes/index.js";
import { configureCloudinary } from "./config/cloudinary.js";

const app = express();

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

const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.RATE_LIMIT_MAX || 300),
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

// JSON body limitini istersen burada artırabilirsin (dosya uploadları multer ile olduğu için kritik değil)
// app.use(express.json({ limit: "2mb" }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

configureCloudinary();

app.use("/api", apiRoutes);

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
    return res.status(status).json({ message: err.message || "Server error" });
  }
  next();
});

const port = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(port, () =>
    console.log(`API running on http://localhost:${port}`)
  );
});
