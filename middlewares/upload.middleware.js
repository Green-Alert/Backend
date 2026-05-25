import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { getMaxFileSize, getUploadDir } from '../src/config/upload.config.js';

const uploadsDir = getUploadDir();

// Crear carpeta si no existe
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, crypto.randomUUID() + ext);
  },
});

const ALLOWED_MIME = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/quicktime',
];

export const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME.includes(file.mimetype)) {
    return cb(null, true);
  }

  const error = new Error('Tipo de archivo no permitido. Solo imagenes y videos.');
  error.statusCode = 400;
  return cb(error);
};

export const upload = multer({
  storage,
  limits: { fileSize: getMaxFileSize() },
  fileFilter,
});

export const uploadMultiple = upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'files', maxCount: 10 },
]);
