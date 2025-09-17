import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("⚠️  MONGODB_URI bulunamadı. DB bağlantısı atlanıyor.");
    return;
  }
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  console.log("✅ Mongo connected");
}
