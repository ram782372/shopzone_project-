import multer from "multer";

// memory storage: the uploaded file is buffered in memory so the controller can
// stream it directly to Cloudinary — nothing is written to backend/uploads/.
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5_242_880 }, // 5 MB — file is fully buffered in RAM
});

export default upload;
