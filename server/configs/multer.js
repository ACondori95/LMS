import multer from "multer";

// Use memoryStorage instead of diskStorage
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    // You can set limits on file size here (e.g., 5MB)
    fileSize: 5 * 1024 * 1024,
  },
});

export default upload;
