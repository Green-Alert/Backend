import { ReporteModel } from '../models/reporte.model.js';

export const PREDICCION_CACHE_TTL_MS = 5 * 60 * 1000;
export const DEFAULT_CELDA_GRADOS = 0.05;

const cache = new Map();
const NIVEL_RANK = { bajo: 1, medio: 2, alto: 3, critico: 4 };
const SCORE_NIVEL = [
  { min: 80, nivel: 'critico' },
  { min: 60, nivel: 'alto' },
  { min: 35, nivel: 'medio' },
  { min: 0, nivel: 'bajo' },
];

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const validationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const clampInt = (value, { fallback, min, max }) => {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw validationError(`El parametro debe ser un entero entre ${min} y ${max}.`);
  }
  return Math.max(min, Math.min(max, parsed));
};

const parseDateDesde = (dias) => {
  const safeDias = clampInt(dias, { fallback: 30, min: 1, max: 365 });
  const desde = new Date();
  desde.setDate(desde.getDate() - safeDias);
  return { safeDias, desde };
};

const cacheKey = (name, params) => `${name}:${JSON.stringify(params)}`;

const getCached = (key) => {
  const entry = cache.get(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.value;
};

const setCached = (key, value) => {
  cache.set(key, {
    value,
    expiresAt: Date.now() + PREDICCION_CACHE_TTL_MS,
  });
  return value;
};

export const invalidatePrediccionCache = () => {
  cache.clear();
};

export const getPrediccionCacheSize = () => cache.size;

const validateTipo = (tipo) => (
  typeof tipo === 'string' && tipo.trim() ? tipo.trim().toLowerCase() : null
);

export const parseZonasParams = (query = {}) => {
  const { safeDias, desde } = parseDateDesde(query.dias);
  const minScore = query.min_score === undefined || query.min_score === ''
    ? 30
    : Number(query.min_score);

  if (!Number.isFinite(minScore) || minScore < 0 || minScore > 100) {
    throw validationError('min_score debe ser un numero entre 0 y 100.');
  }

  return {
    dias: safeDias,
    desde,
    tipo: validateTipo(query.tipo),
    min_score: minScore,
  };
};

export const parseAlertasParams = (query = {}) => {
  const zonasParams = parseZonasParams(query);
  const limite = clampInt(query.limite, { fallback: 10, min: 1, max: 50 });
  const nivel_min = query.nivel_min === undefined || query.nivel_min === ''
    ? 'medio'
    : String(query.nivel_min).toLowerCase();
  if (!NIVEL_RANK[nivel_min]) {
    throw validationError('nivel_min debe ser uno de: bajo, medio, alto, critico.');
  }
  const lat = toNumber(query.lat);
  const lng = toNumber(query.lng);
  const radio_km = toNumber(query.radio_km);

  if (query.lat !== undefined && (lat === null || lat < -90 || lat > 90)) {
    throw validationError('lat debe ser un numero entre -90 y 90.');
  }
  if (query.lng !== undefined && (lng === null || lng < -180 || lng > 180)) {
    throw validationError('lng debe ser un numero entre -180 y 180.');
  }
  if (query.radio_km !== undefined && (radio_km === null || radio_km <= 0 || radio_km > 500)) {
    throw validationError('radio_km debe ser un numero mayor a 0 y menor o igual a 500.');
  }
  const hasLat = query.lat !== undefined && query.lat !== null && query.lat !== '';
  const hasLng = query.lng !== undefined && query.lng !== null && query.lng !== '';
  if (hasLat !== hasLng) {
    throw validationError('lat y lng deben enviarse juntos.');
  }
  if (query.radio_km !== undefined && (!hasLat || !hasLng)) {
    throw validationError('radio_km requiere lat y lng.');
  }

  return {
    ...zonasParams,
    limite,
    nivel_min,
    lat: lat !== null && lat >= -90 && lat <= 90 ? lat : null,
    lng: lng !== null && lng >= -180 && lng <= 180 ? lng : null,
    radio_km: radio_km !== null && radio_km > 0 ? Math.min(radio_km, 500) : null,
  };
};

const gridKeyFor = (lat, lng, cellSize = DEFAULT_CELDA_GRADOS) => {
  const latCell = Math.floor(Number(lat) / cellSize) * cellSize;
  const lngCell = Math.floor(Number(lng) / cellSize) * cellSize;
  return `${latCell.toFixed(4)}:${lngCell.toFixed(4)}`;
};

const scoreZona = (reportes) => {
  const severidadPromedio = reportes.reduce(
    (sum, reporte) => sum + (NIVEL_RANK[reporte.nivel_severidad] || 1),
    0
  ) / Math.max(1, reportes.length);
  const recencia = reportes.reduce((sum, reporte) => {
    const createdAt = new Date(reporte.created_at).getTime();
    const days = Number.isFinite(createdAt)
      ? Math.max(0, (Date.now() - createdAt) / 86400000)
      : 365;
    return sum + Math.max(0, 30 - days);
  }, 0) / Math.max(1, reportes.length);
  const score = Math.min(100, Math.round((reportes.length * 16) + (severidadPromedio * 14) + recencia));
  const nivel = SCORE_NIVEL.find((item) => score >= item.min)?.nivel || 'bajo';

  return { score, nivel, severidadPromedio };
};

const calcularTendencia = (actual, previo) => {
  if (previo === 0) return actual > 0 ? 'subiendo' : 'estable';
  const ratio = actual / previo;
  if (ratio >= 1.2) return 'subiendo';
  if (ratio <= 0.8) return 'bajando';
  return 'estable';
};

// cutoffDate separa el período actual (>= cutoffDate) del período previo (< cutoffDate)
const buildZonas = (reportes, { min_score, cutoffDate }) => {
  const grouped = new Map();     // reportes del período actual
  const groupedPrev = new Map(); // reportes del período previo para tendencia

  for (const reporte of reportes) {
    const lat = Number(reporte.latitud);
    const lng = Number(reporte.longitud);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const key = gridKeyFor(lat, lng);
    const isRecent = !cutoffDate || new Date(reporte.created_at) >= cutoffDate;
    const target = isRecent ? grouped : groupedPrev;
    target.set(key, [...(target.get(key) || []), reporte]);
  }

  return [...grouped.entries()]
    .map(([key, items]) => {
      const [latCell, lngCell] = key.split(':').map(Number);
      const { score, nivel, severidadPromedio } = scoreZona(items);
      const tipoCounts = new Map();
      const subcatCounts = new Map();
      const municipioCounts = new Map();
      const departamentoCounts = new Map();
      let latest = null;

      for (const item of items) {
        tipoCounts.set(item.tipo_contaminacion, (tipoCounts.get(item.tipo_contaminacion) || 0) + 1);
        if (item.subcategoria) subcatCounts.set(item.subcategoria, (subcatCounts.get(item.subcategoria) || 0) + 1);
        if (item.municipio) municipioCounts.set(item.municipio, (municipioCounts.get(item.municipio) || 0) + 1);
        if (item.departamento) departamentoCounts.set(item.departamento, (departamentoCounts.get(item.departamento) || 0) + 1);
        const itemDate = new Date(item.created_at).getTime();
        if (!latest || itemDate > new Date(latest).getTime()) latest = item.created_at;
      }

      const [tipoDominante] = [...tipoCounts.entries()].sort((a, b) => b[1] - a[1])[0] || ['otro'];
      const [subcategoriaDominante = null] = [...subcatCounts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
      const [municipio = null] = [...municipioCounts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
      const [departamento = null] = [...departamentoCounts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);

      const prevItems = groupedPrev.get(key) || [];
      const tendencia = calcularTendencia(items.length, prevItems.length);

      return {
        id: key,
        zona_id: key,
        centro: {
          lat: Number((latCell + (DEFAULT_CELDA_GRADOS / 2)).toFixed(6)),
          lng: Number((lngCell + (DEFAULT_CELDA_GRADOS / 2)).toFixed(6)),
        },
        tipo_dominante: tipoDominante,
        subcategoria_dominante: subcategoriaDominante,
        municipio,
        departamento,
        n_reportes: items.length,
        n_reportes_previo: prevItems.length,
        tendencia,
        severidad_promedio: Number(severidadPromedio.toFixed(2)),
        ultimo_reporte: latest,
        score,
        nivel,
      };
    })
    .filter((zona) => zona.score >= min_score)
    .sort((a, b) => b.score - a.score || b.n_reportes - a.n_reportes);
};

const distanceKm = (a, b) => {
  const radius = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
};

export const calcularZonasRiesgo = async (params) => {
  const key = cacheKey('zonas', {
    dias: params.dias,
    tipo: params.tipo,
    min_score: params.min_score,
  });
  const cached = getCached(key);
  if (cached) return cached;

  // Fetch 2× el período solicitado para calcular tendencia (período actual vs período previo)
  const desdeDoble = new Date(params.desde);
  desdeDoble.setDate(desdeDoble.getDate() - params.dias);

  const reportes = await ReporteModel.findParaPrediccion({
    desde: desdeDoble,
    tipo: params.tipo,
  });
  const payload = {
    actualizado_en: new Date().toISOString(),
    celda_grados: DEFAULT_CELDA_GRADOS,
    zonas: buildZonas(reportes, { min_score: params.min_score, cutoffDate: params.desde }),
  };

  return setCached(key, payload);
};

export const calcularAlertasPredictivas = async (params) => {
  const key = cacheKey('alertas', {
    dias: params.dias,
    tipo: params.tipo,
    min_score: params.min_score,
    limite: params.limite,
    nivel_min: params.nivel_min,
    lat: params.lat,
    lng: params.lng,
    radio_km: params.radio_km,
  });
  const cached = getCached(key);
  if (cached) return cached;

  const zonasPayload = await calcularZonasRiesgo({ ...params, min_score: params.min_score ?? 0 });
  const minRank = NIVEL_RANK[params.nivel_min] || NIVEL_RANK.medio;
  const origin = params.lat !== null && params.lng !== null ? { lat: params.lat, lng: params.lng } : null;

  const alertas = zonasPayload.zonas
    .filter((zona) => (NIVEL_RANK[zona.nivel] || 1) >= minRank)
    .filter((zona) => !params.tipo || zona.tipo_dominante === params.tipo)
    .map((zona) => ({
      id: zona.id,
      zona_id: zona.zona_id,
      centro: zona.centro,
      tipo_dominante: zona.tipo_dominante,
      subcategoria_dominante: zona.subcategoria_dominante,
      municipio: zona.municipio,
      departamento: zona.departamento,
      n_reportes: zona.n_reportes,
      n_reportes_previo: zona.n_reportes_previo,
      tendencia: zona.tendencia,
      score: zona.score,
      nivel: zona.nivel,
      ultimo_reporte: zona.ultimo_reporte,
      distancia_km: origin ? Number(distanceKm(origin, zona.centro).toFixed(2)) : null,
    }))
    .filter((alerta) => !origin || !params.radio_km || alerta.distancia_km <= params.radio_km)
    .sort((a, b) => b.score - a.score)
    .slice(0, params.limite);

  const payload = {
    generado_en: new Date().toISOString(),
    alertas,
  };

  return setCached(key, payload);
};