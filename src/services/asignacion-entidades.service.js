import { EntidadModel } from '../models/entidad.model.js';
import { ReporteEntidadModel } from '../models/reporte-entidad.model.js';
import { UsuarioModel } from '../models/usuario.model.js';
import { crearNotificacion } from '../controllers/notificacion.controller.js';

const normalize = (value) => (
  typeof value === 'string'
    ? value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
    : ''
);

const normalizeText = (value) => (
  typeof value === 'string'
    ? value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    : ''
);

const isHighSeverity = (reporte) => ['alto', 'critico'].includes(normalize(reporte?.nivel_severidad));

export const REGLAS_ASIGNACION_ENTIDADES = [
  {
    match: { categoria: ['incendios_forestales'], subcategoria: ['incendio_activo'] },
    keywords: ['incendio', 'llamas', 'fuego', 'humo por incendio', 'explosion', 'explosiones'],
    principal: 'bomberos',
    apoyo: ['gestion_riesgo', 'corpoamazonia'],
    prioridad: 'critica',
  },
  {
    match: { subcategoria: ['quema_a_cielo_abierto', 'quema_de_bosques', 'rastrojos_quemados'] },
    keywords: ['quema', 'humo'],
    principal: 'bomberos',
    apoyo: ['corpoamazonia', 'secretaria_salud'],
    prioridad: 'alta',
  },
  {
    match: { categoria: ['deforestacion'], subcategoria: ['tala_ilegal'] },
    keywords: ['tala', 'arbol', 'deforestacion'],
    principal: 'corpoamazonia',
    apoyo: (reporte) => (isHighSeverity(reporte) ? ['gestion_riesgo'] : []),
    prioridad: 'alta',
  },
  {
    match: { categoria: ['residuos'], subcategoria: ['basura_en_via_publica', 'escombros', 'vertedero_ilegal'] },
    keywords: ['basura', 'escombros', 'puntos criticos de residuos', 'recoleccion de residuos'],
    principal: 'alcaldia_servicios_publicos',
    apoyo: ['secretaria_salud'],
    prioridad: 'media',
  },
  {
    match: { subcategoria: ['residuos_peligrosos', 'residuos_hospitalarios'] },
    keywords: ['hospitalario', 'residuos peligrosos', 'residuo peligroso'],
    principal: 'secretaria_salud',
    apoyo: ['corpoamazonia', 'alcaldia_servicios_publicos'],
    prioridad: 'alta',
  },
  {
    match: {
      categoria: ['avalanchas_fluviotorrenciales'],
      subcategoria: ['deslizamiento_de_tierra', 'derrumbe_de_talud', 'creciente_subita'],
    },
    keywords: ['deslizamiento', 'derrumbe', 'avalancha', 'creciente', 'inundacion'],
    principal: 'gestion_riesgo',
    apoyo: ['bomberos', 'alcaldia_servicios_publicos'],
    prioridad: 'critica',
  },
  {
    match: { subcategoria: ['represamiento_de_rio'] },
    keywords: ['represamiento', 'represamiento rio'],
    principal: 'gestion_riesgo',
    apoyo: ['corpoamazonia', 'bomberos'],
    prioridad: 'critica',
  },
  {
    match: { subcategoria: ['derrame_de_combustible'] },
    keywords: ['derrame', 'petroleo', 'gasolina', 'combustible'],
    principal: 'gestion_riesgo',
    apoyo: ['bomberos', 'corpoamazonia'],
    prioridad: 'critica',
  },
  {
    match: { subcategoria: ['derrame_de_quimicos'] },
    keywords: ['quimico', 'emergencia quimica', 'materiales inflamables'],
    principal: 'gestion_riesgo',
    apoyo: ['bomberos', 'corpoamazonia'],
    prioridad: 'critica',
  },
  {
    match: { subcategoria: ['vertimiento_industrial'] },
    keywords: ['vertimiento', 'vertidos ilegales'],
    principal: 'corpoamazonia',
    apoyo: (reporte) => (isHighSeverity(reporte) ? ['gestion_riesgo'] : []),
    prioridad: 'alta',
  },
  {
    match: { subcategoria: ['aguas_residuales'] },
    keywords: ['aguas negras', 'alcantarilla', 'aguas residuales'],
    principal: 'alcaldia_servicios_publicos',
    apoyo: ['secretaria_salud', 'corpoamazonia'],
    prioridad: 'media',
  },
  {
    match: { subcategoria: ['olores_ofensivos'] },
    keywords: ['mal olor', 'olores', 'olores ofensivos'],
    principal: 'secretaria_salud',
    apoyo: ['corpoamazonia'],
    prioridad: 'media',
  },
  {
    match: { subcategoria: ['contaminacion_por_mineria'] },
    keywords: ['mineria', 'mineria ilegal'],
    principal: 'corpoamazonia',
    apoyo: (reporte) => (isHighSeverity(reporte) ? ['gestion_riesgo'] : []),
    prioridad: 'alta',
  },
  {
    match: { categoria: ['agua', 'aire', 'suelo'] },
    keywords: ['agua contaminada', 'contaminacion', 'fauna', 'flora', 'ecosistema'],
    principal: 'corpoamazonia',
    apoyo: [],
    prioridad: 'media',
  },
  {
    match: { categoria: ['otro'] },
    keywords: [],
    principal: 'corpoamazonia',
    apoyo: [],
    prioridad: 'media',
  },
];

const matchesRule = (rule, reporte) => {
  const categoria = normalize(reporte?.tipo_contaminacion ?? reporte?.categoria);
  const subcategoria = normalize(reporte?.subcategoria);
  const text = normalizeText([
    reporte?.titulo,
    reporte?.descripcion,
    reporte?.subcategoria,
  ].filter(Boolean).join(' '));

  const categoriaMatch = rule.match?.categoria?.includes(categoria);
  const subcategoriaMatch = subcategoria && rule.match?.subcategoria?.includes(subcategoria);
  const keywordMatch = rule.keywords?.some((keyword) => text.includes(normalizeText(keyword)));

  return Boolean(categoriaMatch || subcategoriaMatch || keywordMatch);
};

export const resolverAsignacionesEntidades = (reporte) => {
  const rule = REGLAS_ASIGNACION_ENTIDADES.find((item) => matchesRule(item, reporte))
    ?? REGLAS_ASIGNACION_ENTIDADES[REGLAS_ASIGNACION_ENTIDADES.length - 1];
  const apoyo = typeof rule.apoyo === 'function' ? rule.apoyo(reporte) : rule.apoyo;
  const codigos = [rule.principal, ...apoyo].filter(Boolean);

  return [...new Set(codigos)].map((codigo, index) => ({
    codigo,
    tipo_asignacion: index === 0 ? 'principal' : 'apoyo',
    prioridad: rule.prioridad,
  }));
};

const notificarUsuariosEntidad = async ({ reporte, entidad, prioridad }) => {
  const usuarios = await UsuarioModel.findActiveByEntidad(entidad.id_entidad);
  const critica = prioridad === 'critica';

  for (const usuario of usuarios) {
    await crearNotificacion({
      id_usuario: usuario.id_usuario,
      tipo: 'reporte_asignado_entidad',
      titulo: critica ? 'Nuevo reporte critico asignado' : 'Nuevo reporte asignado',
      mensaje: critica
        ? 'Nuevo reporte critico asignado a tu entidad.'
        : 'Nuevo reporte asignado a tu entidad.',
      referencia_tipo: 'reporte',
      referencia_uuid: reporte.uuid,
      link: `/reports/${reporte.uuid ?? reporte.id_reporte}`,
    });
  }
};

export const asignarEntidadesAReporte = async (reporte) => {
  if (!reporte?.id_reporte) return [];

  const asignacionesResueltas = resolverAsignacionesEntidades(reporte);
  const entidades = await EntidadModel.findManyByCodigos(
    asignacionesResueltas.map((item) => item.codigo)
  );
  const entidadByCodigo = new Map(entidades.map((entidad) => [entidad.codigo, entidad]));

  const assignments = asignacionesResueltas
    .map((item) => {
      const entidad = entidadByCodigo.get(item.codigo);
      if (!entidad) return null;

      return {
        id_reporte: reporte.id_reporte,
        id_entidad: entidad.id_entidad,
        tipo_asignacion: item.tipo_asignacion,
        prioridad: item.prioridad,
        entidad,
      };
    })
    .filter(Boolean);

  await ReporteEntidadModel.bulkCreateAssignments(assignments);

  for (const assignment of assignments) {
    await notificarUsuariosEntidad({
      reporte,
      entidad: assignment.entidad,
      prioridad: assignment.prioridad,
    });
  }

  return assignments;
};

export const AsignacionEntidadesService = {
  asignarEntidadesAReporte,
};
