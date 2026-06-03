import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { getMaxFileSize } from '../src/config/upload.config.js';

const storage = multer.memoryStorage();

const ALLOWED_MIME = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/quicktime',
];

const MP4_COMPATIBLE_BRANDS = new Set([
  'avc1', 'dash', 'iso2', 'iso5', 'iso6', 'isom', 'm4v ', 'mp41', 'mp42', 'msnv',
]);

const hasPrefix = (buffer, bytes) => (
  Buffer.isBuffer(buffer) &&
  buffer.length >= bytes.length &&
  bytes.every((byte, index) => buffer[index] === byte)
);

const hasAsciiAt = (buffer, offset, value) => (
  Buffer.isBuffer(buffer) &&
  buffer.length >= offset + value.length &&
  buffer.subarray(offset, offset + value.length).toString('ascii').toLowerCase() === value.toLowerCase()
);

const getIsoBaseMediaBrands = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12 || !hasAsciiAt(buffer, 4, 'ftyp')) {
    return [];
  }

  const boxSize = buffer.readUInt32BE(0);
  if (boxSize < 12 || boxSize > buffer.length) {
    return [];
  }

  const brands = [buffer.subarray(8, 12).toString('ascii').toLowerCase()];
  for (let offset = 16; offset + 4 <= boxSize; offset += 4) {
    brands.push(buffer.subarray(offset, offset + 4).toString('ascii').toLowerCase());
  }

  return brands;
};

const isJpeg = (buffer) => hasPrefix(buffer, [0xff, 0xd8, 0xff]);
const isPng = (buffer) => hasPrefix(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const isWebp = (buffer) => hasAsciiAt(buffer, 0, 'RIFF') && hasAsciiAt(buffer, 8, 'WEBP');
const isGif = (buffer) => hasAsciiAt(buffer, 0, 'GIF87a') || hasAsciiAt(buffer, 0, 'GIF89a');
const isMp4 = (buffer) => getIsoBaseMediaBrands(buffer).some((brand) => MP4_COMPATIBLE_BRANDS.has(brand));
const isQuicktime = (buffer) => getIsoBaseMediaBrands(buffer).includes('qt  ');

const SIGNATURE_VALIDATORS = {
  'image/jpeg': isJpeg,
  'image/jpg': isJpeg,
  'image/png': isPng,
  'image/webp': isWebp,
  'image/gif': isGif,
  'video/mp4': isMp4,
  'video/quicktime': isQuicktime,
};

const buildUploadError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

export const validateUploadedFilesContent = (files = []) => {
  for (const file of files.filter(Boolean)) {
    const validator = SIGNATURE_VALIDATORS[file.mimetype];
    if (!validator) {
      return 'Tipo de archivo no permitido. Solo imagenes y videos.';
    }

    if (!validator(file.buffer)) {
      const filename = file.originalname || file.filename || 'archivo';
      return `El contenido del archivo "${filename}" no coincide con el tipo declarado o esta corrupto.`;
    }
  }

  return null;
};

export const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME.includes(file.mimetype)) {
    return cb(null, true);
  }

  return cb(buildUploadError('Tipo de archivo no permitido. Solo imagenes y videos.'));
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

const getRequestUploadedFiles = (req) => ([
  ...(req.file ? [req.file] : []),
  ...(Array.isArray(req.files) ? req.files : []),
  ...(Array.isArray(req.files?.file) ? req.files.file : []),
  ...(Array.isArray(req.files?.files) ? req.files.files : []),
]);

const wrapUploadMiddleware = (middleware) => (req, res, next) => {
  middleware(req, res, (error) => {
    if (error) {
      return next(error);
    }

    decorateUploadedFiles(req);
    const contentError = validateUploadedFilesContent(getRequestUploadedFiles(req));
    if (contentError) {
      return next(buildUploadError(contentError));
    }

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
