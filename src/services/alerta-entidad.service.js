import { AlertaEntidadModel } from '../models/alerta-entidad.model.js';

export const TIPOS_ALERTA_POR_PRIORIDAD = {
  critica: 'reporte_critico_asignado',
  alta: 'reporte_prioritario_asignado',
};

const getCategoriaResumen = (reporte) => (
  reporte?.tipo_contaminacion ||
  reporte?.categoria ||
  reporte?.subcategoria ||
  reporte?.titulo ||
  reporte?.descripcion ||
  'reporte ambiental'
);

export const debeCrearAlertaEntidad = (prioridad) => (
  Object.hasOwn(TIPOS_ALERTA_POR_PRIORIDAD, prioridad)
);

export const buildAlertaEntidadPayload = ({ reporte, assignment }) => {
  const tipo_alerta = TIPOS_ALERTA_POR_PRIORIDAD[assignment.prioridad];
  if (!tipo_alerta) return null;

  const critica = assignment.prioridad === 'critica';
  const resumen = getCategoriaResumen(reporte);

  return {
    id_reporte_entidad: assignment.id_reporte_entidad,
    id_reporte: reporte.id_reporte,
    id_entidad: assignment.id_entidad,
    tipo_alerta,
    prioridad: assignment.prioridad,
    titulo: critica ? 'Reporte critico asignado' : 'Reporte prioritario asignado',
    mensaje: critica
      ? `Se asigno un reporte critico a tu entidad: ${resumen}.`
      : `Se asigno un reporte prioritario a tu entidad: ${resumen}.`,
    metadata: {
      reporte_uuid: reporte.uuid ?? null,
      tipo_asignacion: assignment.tipo_asignacion ?? null,
      entidad_codigo: assignment.entidad?.codigo ?? null,
      entidad_nombre: assignment.entidad?.nombre ?? null,
      categoria: reporte.tipo_contaminacion ?? reporte.categoria ?? null,
      subcategoria: reporte.subcategoria ?? null,
      nivel_severidad: reporte.nivel_severidad ?? null,
      estado: reporte.estado ?? null,
      municipio: reporte.municipio ?? null,
      departamento: reporte.departamento ?? null,
      latitud: reporte.latitud ?? null,
      longitud: reporte.longitud ?? null,
    },
  };
};

export const crearAlertaDesdeAsignacionReporte = async ({ reporte, assignment }) => {
  if (!reporte?.id_reporte || !assignment?.id_reporte_entidad) return null;
  if (!debeCrearAlertaEntidad(assignment.prioridad)) return null;

  const payload = buildAlertaEntidadPayload({ reporte, assignment });
  if (!payload) return null;

  const id_alerta_entidad = await AlertaEntidadModel.create(payload);
  return {
    ...payload,
    id_alerta_entidad,
  };
};

export const crearAlertasDesdeAsignacionesReporte = async ({ reporte, assignments = [] }) => {
  if (!reporte?.id_reporte || !Array.isArray(assignments)) return [];

  const alertas = [];

  for (const assignment of assignments) {
    const alerta = await crearAlertaDesdeAsignacionReporte({ reporte, assignment });
    if (alerta) alertas.push(alerta);
  }

  return alertas;
};

export const listarAlertasEntidad = (idEntidad, filtros = {}) => (
  AlertaEntidadModel.findByEntidad(idEntidad, filtros)
);

export const listarAlertasNoLeidasEntidad = (idEntidad, filtros = {}) => (
  AlertaEntidadModel.findByEntidad(idEntidad, { ...filtros, leida: false })
);

export const contarAlertasNoLeidasEntidad = (idEntidad) => (
  AlertaEntidadModel.countNoLeidasByEntidad(idEntidad)
);

export const marcarAlertaEntidadLeida = (idAlertaEntidad, idEntidad, idUsuario) => (
  AlertaEntidadModel.markAsReadByEntidad(idAlertaEntidad, idEntidad, idUsuario)
);

export const marcarTodasAlertasEntidadLeidas = (idEntidad, idUsuario) => (
  AlertaEntidadModel.markAllAsReadByEntidad(idEntidad, idUsuario)
);

export const AlertaEntidadService = {
  debeCrearAlertaEntidad,
  buildAlertaEntidadPayload,
  crearAlertaDesdeAsignacionReporte,
  crearAlertasDesdeAsignacionesReporte,
  listarAlertasEntidad,
  listarAlertasNoLeidasEntidad,
  contarAlertasNoLeidasEntidad,
  marcarAlertaEntidadLeida,
  marcarTodasAlertasEntidadLeidas,
};

export default AlertaEntidadService;
