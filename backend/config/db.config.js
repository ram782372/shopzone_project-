import mongoose from "mongoose";
// Env vars are loaded once via `import "dotenv/config"` in app.js, which runs before this module is imported.

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
};

export default connectDB;
