import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { getMaxFileSize } from '../src/config/upload.config.js';

const storage = multer.memoryStorage();

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

const baseUpload = multer({
  storage,
  limits: { fileSize: getMaxFileSize() },
  fileFilter,
});

const assignCompatibleFilename = (file) => {
  if (!file || file.filename) return file;

  const ext = path.extname(file.originalname || '').toLowerCase();
  file.filename = `${crypto.randomUUID()}${ext}`;
  return file;
};

const decorateUploadedFiles = (req) => {
  assignCompatibleFilename(req.file);

  if (Array.isArray(req.files)) {
    req.files.forEach(assignCompatibleFilename);
    return;
  }

  if (req.files && typeof req.files === 'object') {
    Object.values(req.files)
      .flat()
      .forEach(assignCompatibleFilename);
  }
};

const wrapUploadMiddleware = (middleware) => (req, res, next) => {
  middleware(req, res, (error) => {
    if (error) {
      return next(error);
    }

    decorateUploadedFiles(req);
    return next();
  });
};

export const upload = {
  single: (...args) => wrapUploadMiddleware(baseUpload.single(...args)),
  array: (...args) => wrapUploadMiddleware(baseUpload.array(...args)),
  fields: (...args) => wrapUploadMiddleware(baseUpload.fields(...args)),
  none: (...args) => wrapUploadMiddleware(baseUpload.none(...args)),
};

export const uploadMultiple = upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'files', maxCount: 10 },
]);
