import "dotenv/config";
import express from "express";
import authController from "./controllers/auth.controller.js";
import orderController from "./controllers/order.controller.js";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import errorMiddleware from "./middlewares/error.middleware.js";
import { initCloudinary } from "./config/cloudinary.config.js";

initCloudinary(); // runs after dotenv/config has populated process.env

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
}))

// app.post("/api/auth/register", (req, res) => {
//     res.json({ message: "User Registered" });
// });


// app.get("/", (req, res) => {
//   res.send("Hello World!");
// });

// console.log("CLOUD_API_KEY:", process.env.CLOUD_API_KEY);

app.use("/api/auth", authController);
app.use("/api/orders", orderController);
//for server health

app.get("/health", (req, res) => {
  res.json({ message: "Server is running" });
});

// Serve frontend dist from public/dist
const distPath = path.join(__dirname, "public/dist");
app.use(express.static(distPath));

// Catch-all: send index.html for client-side routing
app.get("/{*path}", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.use(errorMiddleware);

export default app;
