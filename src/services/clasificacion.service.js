import { CATEGORIAS_FALLBACK } from '../models/categoria-riesgo.model.js';

const HF_MODEL = process.env.HF_IMAGE_MODEL || 'zai-org/GLM-4.5V';
const HF_URL = 'https://router.huggingface.co/v1/chat/completions';

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
const CATEGORIAS_VALIDAS = new Set(CATEGORIAS_FALLBACK.map((categoria) => categoria.codigo));
const SEVERIDADES_VALIDAS = new Set(['bajo', 'medio', 'alto', 'critico']);

const normalizarCategoria = (value) => {
  const key = normalizeText(value).replace(/\s+/g, '_');
  return CATEGORIAS_VALIDAS.has(key) ? key : 'otro';
};

const clampScore = (value) => {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
};

const normalizarSeveridad = (value) => {
  const severity = normalizeText(value);
  return SEVERIDADES_VALIDAS.has(severity) ? severity : null;
};

const getFileBuffer = async (file) => {
  if (file?.buffer) return file.buffer;
  return null;
};

const toDataUri = (buffer, mimeType = 'image/jpeg') => (
  `data:${mimeType};base64,${buffer.toString('base64')}`
);

const extraerJson = (texto) => {
  if (!texto) return null;
  const limpio = texto
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(limpio);
  } catch {
    const start = limpio.indexOf('{');
    const end = limpio.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(limpio.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
};

const callVisionModel = async ({ file, systemPrompt, userText, maxTokens = 1200, temperature = 0.2 }) => {
  if (!process.env.HF_API_KEY) return null;

  const buffer = await getFileBuffer(file);
  if (!buffer) return null;

  const payload = {
    model: HF_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: userText },
          { type: 'image_url', image_url: { url: toDataUri(buffer, file?.mimetype || 'image/jpeg') } },
        ],
      },
    ],
    temperature,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
  };

  const res = await fetch(HF_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.HF_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HF API ${res.status}: ${text || res.statusText}`);
  }

  const data = await res.json();
  return extraerJson(data?.choices?.[0]?.message?.content);
};

const buildContenidoSugeridoFallback = ({ categoria = 'otro', nombre = 'Otro', subcategoria = null }) => {
  const label = nombre || categoria || 'incidencia ambiental';
  const detail = subcategoria ? ` asociada a ${subcategoria}` : '';

  return {
    titulo: `${label}${detail} reportada en la zona`.slice(0, 80),
    descripcion:
      `Se reporta una posible situacion de ${label.toLowerCase()}${detail} en el sector indicado. ` +
      'La evidencia adjunta muestra condiciones que requieren revision por parte de la comunidad o las autoridades competentes. ' +
      'Se solicita verificar el sitio, evaluar el nivel de afectacion y tomar las medidas necesarias.',
  };
};

export const clasificarImagen = async (file = {}) => {
  const { originalname = '', mimetype = '' } = file;

  try {
    const parsed = await callVisionModel({
      file,
      systemPrompt:
        'Eres un asistente experto en problemas ambientales en Colombia. ' +
        'Clasifica la imagen y responde solo con JSON valido.',
      userText:
        'Clasifica la imagen en una categoria ambiental. Usa una de estas keys exactas: ' +
        [...CATEGORIAS_VALIDAS].join(', ') +
        '. Devuelve JSON con "categoria", "confianza" de 0 a 100, "subcategoria", ' +
        '"confianza_subcategoria", "severidad" como bajo, medio, alto o critico, ' +
        '"confianza_severidad" y "etiquetas" como arreglo de palabras clave.',
      maxTokens: 1200,
      temperature: 0.2,
    });

    if (parsed?.categoria) {
      const categoria = normalizarCategoria(parsed.categoria);
      const subcategoria = typeof parsed.subcategoria === 'string' && parsed.subcategoria.trim()
        ? parsed.subcategoria.trim()
        : null;
      const severidad = normalizarSeveridad(parsed.severidad);
      const etiquetas = Array.isArray(parsed.etiquetas)
        ? parsed.etiquetas.filter((tag) => typeof tag === 'string' && tag.trim()).map((tag) => tag.trim())
        : [];

      return {
        categoria,
        nombre: getCategoriaNombre(categoria),
        confianza: clampScore(parsed.confianza),
        subcategoria,
        confianza_subcategoria: subcategoria ? clampScore(parsed.confianza_subcategoria) : 0,
        severidad,
        confianza_severidad: severidad ? clampScore(parsed.confianza_severidad) : 0,
        etiquetas: [...new Set([categoria, ...(subcategoria ? [subcategoria] : []), ...etiquetas])].slice(0, 8),
      };
    }
  } catch {
    // El formulario debe seguir funcionando aunque el proveedor externo falle.
  }

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

export const sugerirContenidoDesdeImagen = async (file, categoria = null) => {
  const analysis = await clasificarImagen({
    ...file,
    originalname: `${categoria || ''} ${file?.originalname || ''}`.trim(),
  });

  try {
    const parsed = await callVisionModel({
      file,
      systemPrompt:
        'Eres un asistente que ayuda a redactar reportes ambientales claros, concretos y objetivos. ' +
        'Analiza la imagen y responde solo con JSON valido.',
      userText:
        'Genera un JSON con "titulo" y "descripcion" para un reporte ciudadano ambiental. ' +
        'El titulo debe tener maximo 10 palabras. La descripcion debe tener 2 a 4 oraciones, ' +
        'describir solo lo visible y no especular sobre causas o responsables.' +
        (categoria ? ` Categoria sugerida: "${categoria}".` : ''),
      maxTokens: 1500,
      temperature: 0.3,
    });

    if (typeof parsed?.titulo === 'string' && typeof parsed?.descripcion === 'string') {
      return {
        titulo: parsed.titulo.trim().slice(0, 150),
        descripcion: parsed.descripcion.trim().slice(0, 1000),
        categoria: analysis.categoria,
        subcategoria: analysis.subcategoria,
        confianza: analysis.confianza,
        etiquetas: analysis.etiquetas,
      };
    }
  } catch {
    // Si falla el proveedor de IA, mantenemos una respuesta util para el formulario.
  }

  return {
    ...buildContenidoSugeridoFallback(analysis),
    categoria: analysis.categoria,
    subcategoria: analysis.subcategoria,
    confianza: analysis.confianza,
    etiquetas: analysis.etiquetas,
  };
};
