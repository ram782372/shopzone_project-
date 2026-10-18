import cloudinary from "../config/cloudinary.config.js";
import { Readable } from "stream";

// uploads an in-memory file buffer directly to Cloudinary — nothing is written
// to disk. multer keeps the file in memory (memoryStorage); this util streams it
// straight to Cloudinary.
// returns the Cloudinary response object on success, null on failure
const uploadOnCloudinary = async (fileBuffer) => {
  try {
    if (!fileBuffer) return null;

    const response = await new Promise((resolve) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: "auto" },
        (error, result) => {
          if (error) {
            // log the full error so it shows in your terminal
            console.error("❌ Cloudinary upload error message:", error.message);
            console.error("❌ Cloudinary error detail:", error.error || error);
            return resolve(null);
          }
          resolve(result);
        }
      );
      Readable.from(fileBuffer).pipe(stream);
    });

    return response;
  } catch (error) {
    console.error("❌ Cloudinary upload error message:", error.message);
    console.error("❌ Cloudinary error detail:", error.error || error);
    return null;
  }
};

export { uploadOnCloudinary };
