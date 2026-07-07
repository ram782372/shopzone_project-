import { v2 as cloudinary } from "cloudinary";

// called explicitly after dotenv has loaded (from app.js)
export function initCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export default cloudinary;
