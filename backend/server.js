// backend/server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js"; // <-- src kaldırmıştık
import apiRoutes from "./routes/index.js";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true, // refresh token cookie için gerekli
  })
);
app.use(express.json());
app.use(cookieParser()); 
app.use(morgan("dev"));

app.use("/api", apiRoutes);

const port = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(port, () =>
    console.log(`API running on http://localhost:${port}`)
  );
});
