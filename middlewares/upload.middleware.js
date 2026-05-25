import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '../uploads');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, crypto.randomUUID() + ext);
  },
});

const ALLOWED_MIME = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/quicktime',
];

const MAX_REPORT_FILES = 10;
const MAX_REPORT_VIDEOS = 1;

const toUploadError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const cleanupUploadedFiles = (req) => {
  const uploadedFiles = [];

  if (req.file) uploadedFiles.push(req.file);
  if (Array.isArray(req.files)) uploadedFiles.push(...req.files);
  if (req.files && !Array.isArray(req.files)) {
    for (const files of Object.values(req.files)) {
      if (Array.isArray(files)) uploadedFiles.push(...files);
    }
  }

  for (const file of uploadedFiles) {
    if (file?.path) {
      fs.rm(file.path, { force: true }, () => {});
    }
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: MAX_REPORT_FILES,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return cb(toUploadError('Tipo de archivo no permitido. Solo imagenes y videos.'));
    }

    if (file.mimetype.startsWith('video/')) {
      req.uploadVideoCount = (req.uploadVideoCount || 0) + 1;
      if (req.uploadVideoCount > MAX_REPORT_VIDEOS) {
        return cb(toUploadError('Solo se permite un video por reporte.'));
      }
    }

    return cb(null, true);
  },
});

const reportUpload = upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'files', maxCount: MAX_REPORT_FILES },
]);

export const uploadReportFiles = (req, res, next) => {
  reportUpload(req, res, (error) => {
    if (error) {
      cleanupUploadedFiles(req);
      if (error instanceof multer.MulterError) {
        error.statusCode = 400;
      }
      return next(error);
    }

    const singleFile = req.files?.file?.[0] ?? null;
    const multipleFiles = req.files?.files ?? [];
    const reportFiles = [singleFile, ...multipleFiles].filter(Boolean);

    if (reportFiles.length > MAX_REPORT_FILES) {
      cleanupUploadedFiles(req);
      return next(toUploadError(`Solo se permiten hasta ${MAX_REPORT_FILES} archivos por reporte.`));
    }

    const videoCount = reportFiles.filter((file) => file.mimetype.startsWith('video/')).length;
    if (videoCount > MAX_REPORT_VIDEOS) {
      cleanupUploadedFiles(req);
      return next(toUploadError('Solo se permite un video por reporte.'));
    }

    req.file = singleFile;
    req.reportFiles = reportFiles;
    return next();
  });
};
