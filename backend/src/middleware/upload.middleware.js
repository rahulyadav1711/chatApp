import multer from "multer";
import fs from "fs";
import path from "path";

const uploadDir = path.resolve("uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");

    cb(null, `${Date.now()}-${safeName}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    return cb(null, true);
  }

  if (file.mimetype.startsWith("video/")) {
    return cb(null, true);
  }

  if (file.mimetype.startsWith("audio/")) {
    return cb(null, true);
  }

  const allowedDocumentTypes = [
    "application/pdf",

    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",

    "text/plain",
    "text/csv",

    "application/zip",
    "application/x-zip-compressed",
  ];

  if (allowedDocumentTypes.includes(file.mimetype)) {
    return cb(null, true);
  }

  return cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
};

const upload = multer({
  storage,

  limits: {
    fileSize: 200 * 1024 * 1024,
  },

  fileFilter,
});

export default upload;
