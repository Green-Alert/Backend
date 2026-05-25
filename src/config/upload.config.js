import path from 'path';

const DEFAULT_UPLOAD_DIR = './uploads';
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;

export const getUploadDir = () => {
  const uploadDir = process.env.UPLOAD_DIR || DEFAULT_UPLOAD_DIR;

  return path.resolve(process.cwd(), uploadDir);
};

export const getMaxFileSize = () => {
  const value = Number(process.env.MAX_FILE_SIZE);

  return Number.isFinite(value) && value > 0
    ? value
    : DEFAULT_MAX_FILE_SIZE;
};
