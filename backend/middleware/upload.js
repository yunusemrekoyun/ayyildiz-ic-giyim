import multer from "multer";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per image

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10,
  },
});

export default upload;
