import crypto from 'node:crypto';
import fs from 'node:fs/promises';

const MAX_EXIF_AGE_HOURS = Number(process.env.EXIF_MAX_HORAS || 72);
const SCORE_WITHOUT_FILES = null;

const clampScore = (value) => Math.max(0, Math.min(100, Math.round(value)));

const isTestEnv = () => process.env.NODE_ENV === 'test';

const readFileBuffer = async (file) => {
  if (Buffer.isBuffer(file?.buffer)) return file.buffer;
  if (file?.path) return fs.readFile(file.path);
  return Buffer.alloc(0);
};

const hashBuffer = (buffer) => crypto
  .createHash('sha256')
  .update(buffer)
  .digest('hex');

const parseExifDate = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const normalized = String(value)
    .replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')
    .replace(' ', 'T');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const readExif = async (file, buffer) => {
  if (isTestEnv() && !process.env.ENABLE_EXIF_IN_TESTS) {
    return null;
  }

  try {
    const { default: exifr } = await import('exifr');
    return await exifr.parse(file?.path || buffer, {
      tiff: true,
      ifd0: true,
      exif: true,
      gps: true,
      xmp: true,
      icc: false,
    });
  } catch {
    return null;
  }
};

const detectGeneratedImageHints = ({ file, exif }) => {
  const source = [
    file?.originalname,
    exif?.Software,
    exif?.CreatorTool,
    exif?.ProcessingSoftware,
    exif?.ImageDescription,
    exif?.Make,
    exif?.Model,
  ].filter(Boolean).join(' ').toLowerCase();

  return [
    'midjourney',
    'stable diffusion',
    'dall-e',
    'dalle',
    'firefly',
    'generative',
    'ai generated',
    'chatgpt',
  ].some((keyword) => source.includes(keyword));
};

const scoreFile = async ({ file, now, knownHashes }) => {
  const buffer = await readFileBuffer(file);
  const hash_sha256 = hashBuffer(buffer);
  const exif = await readExif(file, buffer);
  let score = 55;
  const reasons = [];

  if (file?.mimetype?.startsWith('image/')) {
    score += 10;
  } else if (file?.mimetype?.startsWith('video/')) {
    score += 5;
  }

  if (buffer.length > 0) {
    score += 8;
  } else {
    score -= 20;
    reasons.push('archivo_sin_contenido');
  }

  if (knownHashes.has(hash_sha256)) {
    score -= 25;
    reasons.push('hash_duplicado_en_lote');
  }
  knownHashes.add(hash_sha256);

  if (exif) {
    score += 12;
    reasons.push('exif_presente');

    const exifDate = parseExifDate(exif.DateTimeOriginal || exif.CreateDate || exif.ModifyDate);
    if (exifDate) {
      const ageHours = Math.abs(now.getTime() - exifDate.getTime()) / 36e5;
      if (ageHours <= MAX_EXIF_AGE_HOURS) {
        score += 8;
        reasons.push('exif_reciente');
      }
    }
  } else if (file?.mimetype?.startsWith('image/')) {
    score -= 8;
    reasons.push('exif_ausente');
  }

  if (detectGeneratedImageHints({ file, exif })) {
    score -= 30;
    reasons.push('posible_imagen_generada');
  }

  return {
    hash_sha256,
    score: clampScore(score),
    metadata: {
      mimetype: file?.mimetype ?? null,
      size: file?.size ?? buffer.length,
      exif_presente: Boolean(exif),
      reasons,
    },
  };
};

export const calcularScoreEvidencias = async (files = [], _nivelSeveridad, now = new Date()) => {
  const evidencias = files.filter(Boolean);
  if (evidencias.length === 0) {
    return {
      score: SCORE_WITHOUT_FILES,
      accion: 'sin_evidencias',
      evidencias: [],
      metadata: { total: 0, reasons: ['sin_evidencias'] },
    };
  }

  const knownHashes = new Set();
  const scoredFiles = [];

  for (const file of evidencias) {
    scoredFiles.push(await scoreFile({ file, now, knownHashes }));
  }

  const average = scoredFiles.reduce((sum, item) => sum + item.score, 0) / scoredFiles.length;
  const score = clampScore(average);
  const accion = score >= 60 ? 'aceptar' : 'moderar';

  return {
    score,
    accion,
    evidencias: scoredFiles,
    metadata: {
      total: scoredFiles.length,
      min_score: Math.min(...scoredFiles.map((item) => item.score)),
      max_score: Math.max(...scoredFiles.map((item) => item.score)),
      reasons: [...new Set(scoredFiles.flatMap((item) => item.metadata.reasons))],
    },
  };
};

export default {
  calcularScoreEvidencias,
};
