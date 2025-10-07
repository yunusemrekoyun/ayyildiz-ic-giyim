// backend/server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import multer from "multer";
import { connectDB } from "./config/db.js";
import apiRoutes from "./routes/index.js";
import { configureCloudinary } from "./config/cloudinary.js";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

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
