const KEYWORD_TAGS = [
  {
    tag: 'agua',
    keywords: ['agua', 'rio', 'quebrada', 'inundacion', 'vertimiento', 'alcantarilla'],
  },
  {
    tag: 'aire',
    keywords: ['aire', 'humo', 'quema', 'olor', 'gases', 'polvo'],
  },
  {
    tag: 'residuos',
    keywords: ['basura', 'residuos', 'escombros', 'desechos', 'lixiviado'],
  },
  {
    tag: 'vegetacion',
    keywords: ['arbol', 'bosque', 'tala', 'deforestacion', 'vegetacion'],
  },
  {
    tag: 'fauna',
    keywords: ['animal', 'fauna', 'peces', 'aves', 'muerte animal'],
  },
  {
    tag: 'riesgo_salud',
    keywords: ['enfermedad', 'salud', 'toxico', 'contaminado', 'plaga'],
  },
];

const SEVERITY_WEIGHT = {
  bajo: 0.15,
  medio: 0.25,
  alto: 0.35,
  critico: 0.45,
};

const normalizeText = (value) => (
  typeof value === 'string'
    ? value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    : ''
);

const clampConfidence = (value) => Math.max(0.1, Math.min(0.99, value));

export const analyzeReporte = (reporte) => {
  const text = normalizeText([
    reporte?.tipo_contaminacion,
    reporte?.nivel_severidad,
    reporte?.titulo,
    reporte?.descripcion,
    reporte?.direccion,
    reporte?.municipio,
    reporte?.departamento,
  ].filter(Boolean).join(' '));

  const tags = new Set();
  const matchedKeywords = [];

  for (const group of KEYWORD_TAGS) {
    const matches = group.keywords.filter((keyword) => text.includes(keyword));
    if (matches.length > 0) {
      tags.add(group.tag);
      matchedKeywords.push(...matches);
    }
  }

  if (reporte?.tipo_contaminacion) {
    tags.add(normalizeText(reporte.tipo_contaminacion).replace(/\s+/g, '_'));
  }

  if (reporte?.nivel_severidad) {
    tags.add(`severidad_${normalizeText(reporte.nivel_severidad)}`);
  }

  const hasLocation = reporte?.latitud !== null && reporte?.latitud !== undefined &&
    reporte?.longitud !== null && reporte?.longitud !== undefined;
  const confidence = clampConfidence(
    0.35 +
    (matchedKeywords.length * 0.08) +
    (SEVERITY_WEIGHT[normalizeText(reporte?.nivel_severidad)] || 0) +
    (hasLocation ? 0.1 : 0)
  );

  return {
    etiquetas: Array.from(tags).slice(0, 8),
    confianza: Number(confidence.toFixed(2)),
    procesado: true,
    resumen: {
      matchedKeywords: Array.from(new Set(matchedKeywords)).slice(0, 12),
      hasLocation,
    },
  };
};
