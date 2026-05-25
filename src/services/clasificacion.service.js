import { CATEGORIAS_FALLBACK } from '../models/categoria-riesgo.model.js';

const CATEGORY_HINTS = [
  {
    categoria: 'agua',
    subcategoria: 'vertimiento',
    severidad: 'alto',
    keywords: ['agua', 'rio', 'quebrada', 'inundacion', 'vertimiento', 'alcantarilla'],
  },
  {
    categoria: 'aire',
    subcategoria: 'humo',
    severidad: 'medio',
    keywords: ['aire', 'humo', 'quema', 'gases', 'polvo'],
  },
  {
    categoria: 'residuos',
    subcategoria: 'basuras',
    severidad: 'medio',
    keywords: ['basura', 'residuo', 'escombro', 'desecho', 'lixiviado'],
  },
  {
    categoria: 'deforestacion',
    subcategoria: 'tala',
    severidad: 'alto',
    keywords: ['arbol', 'bosque', 'tala', 'deforestacion', 'vegetacion'],
  },
  {
    categoria: 'otro',
    subcategoria: null,
    severidad: 'medio',
    keywords: [],
  },
];

const normalizeText = (value) => (
  typeof value === 'string'
    ? value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    : ''
);

const getCategoriaNombre = (codigo) => (
  CATEGORIAS_FALLBACK.find((categoria) => categoria.codigo === codigo)?.nombre || 'Otro'
);

export const clasificarImagen = async ({ originalname = '', mimetype = '' } = {}) => {
  const text = normalizeText(`${originalname} ${mimetype}`);
  const match = CATEGORY_HINTS.find((hint) => (
    hint.keywords.some((keyword) => text.includes(keyword))
  )) || CATEGORY_HINTS[CATEGORY_HINTS.length - 1];
  const matchedKeywords = match.keywords.filter((keyword) => text.includes(keyword));
  const confidence = Math.min(0.95, 0.55 + (matchedKeywords.length * 0.12));
  const etiquetas = [
    match.categoria,
    ...(match.subcategoria ? [match.subcategoria] : []),
    ...matchedKeywords,
  ];

  return {
    categoria: match.categoria,
    nombre: getCategoriaNombre(match.categoria),
    confianza: Number(confidence.toFixed(2)),
    subcategoria: match.subcategoria,
    confianza_subcategoria: match.subcategoria ? Number(Math.max(0.45, confidence - 0.08).toFixed(2)) : 0,
    severidad: match.severidad,
    confianza_severidad: Number(Math.max(0.5, confidence - 0.1).toFixed(2)),
    etiquetas: [...new Set(etiquetas)].slice(0, 8),
  };
};
