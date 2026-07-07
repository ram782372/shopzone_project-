import cloudinary from "../config/cloudinary.config.js";
import fs from "fs";

// uploads a local file to Cloudinary and cleans up the temp file afterwards
// multer saves files to /uploads temporarily — this util handles the rest
// returns the Cloudinary response object on success, null on failure
const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    // log the full error so it shows in your terminal
    console.error("❌ Cloudinary upload error message:", error.message);
    console.error("❌ Cloudinary error detail:", error.error || error);
    return null;
  }
};

export { uploadOnCloudinary };
