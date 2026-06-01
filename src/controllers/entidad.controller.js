import { EntidadModel } from '../models/entidad.model.js';
import { EvidenciaModel } from '../models/evidencia.model.js';
import { ReporteEntidadModel } from '../models/reporte-entidad.model.js';
import { errorResponse, successResponse } from '../utils/response.js';

const getEntidadIdFromUser = (req) => Number(req.user?.id_entidad ?? req.user?.entidad_id);

export const listarEntidades = async (_req, res, next) => {
  try {
    const entidades = await EntidadModel.findActive();
    return successResponse(
      res,
      { entidades, total: entidades.length },
      'Entidades obtenidas correctamente.'
    );
  } catch (error) {
    return next(error);
  }
};

export const listarMisReportesEntidad = async (req, res, next) => {
  try {
    const idEntidad = getEntidadIdFromUser(req);
    if (!idEntidad) {
      return errorResponse(res, 'Usuario entidad sin entidad asignada.', 403);
    }

    const data = await ReporteEntidadModel.findByEntidad(idEntidad, {
      prioridad: req.query?.prioridad,
      estado_atencion: req.query?.estado_atencion,
      tipo_asignacion: req.query?.tipo_asignacion,
      categoria: req.query?.categoria,
      severidad: req.query?.severidad,
      limit: req.query?.limit,
      offset: req.query?.offset,
    });

    return successResponse(res, data, 'Reportes asignados obtenidos correctamente.');
  } catch (error) {
    return next(error);
  }
};

export const listarReportesPorEntidad = async (req, res, next) => {
  try {
    const idEntidad = Number(req.params.id);
    if (!idEntidad) {
      return errorResponse(res, 'Id de entidad invalido.', 400);
    }

    if (req.user?.rol === 'entidad' && getEntidadIdFromUser(req) !== idEntidad) {
      return errorResponse(res, 'No tienes permiso para consultar esta entidad.', 403);
    }

    const entidad = await EntidadModel.findActiveAllowedByIdOrCodigo({ id_entidad: idEntidad });
    if (!entidad) {
      return errorResponse(res, 'Entidad no encontrada, inactiva o fuera de alcance.', 404);
    }

    const data = await ReporteEntidadModel.findByEntidad(idEntidad, {
      prioridad: req.query?.prioridad,
      estado_atencion: req.query?.estado_atencion,
      tipo_asignacion: req.query?.tipo_asignacion,
      categoria: req.query?.categoria,
      severidad: req.query?.severidad,
      limit: req.query?.limit,
      offset: req.query?.offset,
    });

    return successResponse(
      res,
      { entidad, ...data },
      'Reportes asignados a entidad obtenidos correctamente.'
    );
  } catch (error) {
    return next(error);
  }
};

export const obtenerMiReporteEntidad = async (req, res, next) => {
  try {
    const idEntidad = getEntidadIdFromUser(req);
    const idReporte = Number(req.params.id);

    if (!idEntidad) {
      return errorResponse(res, 'Usuario entidad sin entidad asignada.', 403);
    }
    if (!idReporte) {
      return errorResponse(res, 'Id de reporte invalido.', 400);
    }

    const reporte = await ReporteEntidadModel.findReporteAsignadoByEntidad(idReporte, idEntidad);
    if (!reporte) {
      return errorResponse(res, 'Reporte asignado no encontrado.', 404);
    }

    const evidencias = await EvidenciaModel.findByReporte(idReporte);
    return successResponse(
      res,
      { reporte, evidencias },
      'Reporte asignado obtenido correctamente.'
    );
  } catch (error) {
    return next(error);
  }
};

export const actualizarAtencionMiEntidad = async (req, res, next) => {
  try {
    const idEntidad = getEntidadIdFromUser(req);
    const idReporte = Number(req.params.id);
    const { estado_atencion, comentario = null } = req.body ?? {};

    if (!idEntidad) {
      return errorResponse(res, 'Usuario entidad sin entidad asignada.', 403);
    }
    if (!idReporte) {
      return errorResponse(res, 'Id de reporte invalido.', 400);
    }
    if (!ReporteEntidadModel.ESTADOS_ATENCION.includes(estado_atencion)) {
      return errorResponse(
        res,
        `estado_atencion debe ser uno de: ${ReporteEntidadModel.ESTADOS_ATENCION.join(', ')}.`,
        400
      );
    }

    const asignacion = await ReporteEntidadModel.findOneByReporteAndEntidad(idReporte, idEntidad);
    if (!asignacion) {
      return errorResponse(res, 'Reporte asignado no encontrado.', 404);
    }

    await ReporteEntidadModel.updateEstadoAtencion(
      asignacion.id_reporte_entidad,
      estado_atencion,
      typeof comentario === 'string' ? comentario.trim() || null : null
    );

    const reporte = await ReporteEntidadModel.findReporteAsignadoByEntidad(idReporte, idEntidad);
    return successResponse(
      res,
      { reporte },
      'Estado de atencion actualizado correctamente.'
    );
  } catch (error) {
    return next(error);
  }
};
