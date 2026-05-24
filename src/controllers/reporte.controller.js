import {
  ESTADO_INICIAL_REPORTE,
  ESTADOS_REPORTE_PERMITIDOS,
  NIVELES_SEVERIDAD_PERMITIDOS,
  ReporteModel,
} from '../models/reporte.model.js';
import fs from 'node:fs/promises';
import { CategoriaRiesgoModel } from '../models/categoria-riesgo.model.js';
import { UsuarioModel }   from '../models/usuario.model.js';
import { EvidenciaModel } from '../models/evidencia.model.js';
import { LikeModel } from '../models/like.model.js';
import { ReporteEntidadModel } from '../models/reporte-entidad.model.js';
import { analyzeReporte } from '../services/ia.service.js';
import { clasificarImagen } from '../services/clasificacion.service.js';
import { invalidatePrediccionCache } from '../services/prediccion.service.js';
import { AsignacionEntidadesService } from '../services/asignacion-entidades.service.js';
import { errorResponse, successResponse } from '../utils/response.js';
import { crearNotificacion } from './notificacion.controller.js';

const ANONYMOUS_VIEW_THROTTLE_MS = 5 * 60 * 1000;
const anonymousViewThrottle = new Map();

const parseCoordinate = (value, { field, min, max }) => {
  if (value === undefined || value === null || value === '') {
    return { value: null };
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return {
      error: `${field} debe ser un numero valido.`,
    };
  }

  if (parsed < min || parsed > max) {
    return {
      error: `${field} debe estar entre ${min} y ${max}.`,
    };
  }

  return { value: parsed };
};

const normalizeEnumValue = (value) => (
  typeof value === 'string' ? value.trim().toLowerCase() : ''
);

const buildAllowedValuesMessage = (field, allowedValues) => (
  `${field} debe ser uno de: ${allowedValues.join(', ')}.`
);

const TRANSICIONES_ESTADO_REPORTE = {
  pendiente: ['en_revision', 'rechazado'],
  en_revision: ['verificado', 'en_proceso', 'rechazado'],
  verificado: ['en_proceso', 'resuelto', 'rechazado'],
  en_proceso: ['resuelto', 'rechazado'],
  resuelto: [],
  rechazado: ['pendiente'],
};

const canTransitionReporteEstado = (estadoActual, estadoNuevo) => {
  if (estadoActual === estadoNuevo) return true;
  return (TRANSICIONES_ESTADO_REPORTE[estadoActual] ?? []).includes(estadoNuevo);
};

const buildReporteLink = (reporte) => `/reports/${reporte.uuid ?? reporte.id_reporte}`;

const canManageReporteEvidence = (reporte, user) => {
  if (!reporte || !user) {
    return false;
  }

  return (
    Number(reporte.id_usuario) === Number(user.sub) ||
    user.rol === 'moderador' ||
    user.rol === 'admin'
  );
};

const getReporteForEvidenceManagement = async (req, res) => {
  const id = Number(req.params.id);
  const reporte = await ReporteModel.findById(id);

  if (!reporte) {
    errorResponse(res, 'Reporte no encontrado.', 404);
    return null;
  }

  if (!canManageReporteEvidence(reporte, req.user)) {
    errorResponse(res, 'No tienes permiso para gestionar evidencias de este reporte.', 403);
    return null;
  }

  return reporte;
};

const toCsvValue = (value) => {
  if (value === null || value === undefined) return '';
  const raw = String(value);
  const escaped = raw.replace(/"/g, '""');
  return /[",\n\r]/.test(raw) ? `"${escaped}"` : escaped;
};

const normalizeHasta = (value) => {
  if (!value) return value;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value} 23:59:59` : value;
};

const parseAnalyticsLimit = (value, defaultValue = 12, maxValue = 60) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return defaultValue;
  return Math.max(1, Math.min(maxValue, parsed));
};

const getUploadedFiles = (req) => ([
  ...(req.file ? [req.file] : []),
  ...(Array.isArray(req.files) ? req.files : []),
  ...(Array.isArray(req.files?.file) ? req.files.file : []),
  ...(Array.isArray(req.files?.files) ? req.files.files : []),
]);

const validateReporteEvidenceFiles = (files) => {
  if (files.length > 10) {
    return 'Solo puedes adjuntar hasta 10 evidencias por reporte.';
  }

  const videoCount = files.filter((file) => file.mimetype?.startsWith('video/')).length;
  if (videoCount > 1) {
    return 'Solo puedes adjuntar un video por reporte.';
  }

  return null;
};

const parseBooleanLike = (value) => (
  value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true'
);

const parseAcceptedIaPayload = ({ ia_etiquetas, ia_confianza, ia_procesado }) => {
  if (!parseBooleanLike(ia_procesado)) {
    return { procesado: false };
  }

  let etiquetas = [];
  if (typeof ia_etiquetas === 'string') {
    try {
      etiquetas = JSON.parse(ia_etiquetas);
    } catch {
      return { error: 'ia_etiquetas debe ser un arreglo JSON valido.' };
    }
  } else {
    etiquetas = ia_etiquetas ?? [];
  }

  if (!Array.isArray(etiquetas)) {
    return { error: 'ia_etiquetas debe ser un arreglo.' };
  }

  const confianza = Number(ia_confianza);
  if (!Number.isFinite(confianza) || confianza < 0 || confianza > 100) {
    return { error: 'ia_confianza debe ser un numero entre 0 y 100.' };
  }

  return {
    procesado: true,
    analysis: {
      etiquetas,
      confianza,
      procesado: true,
    },
  };
};

const getAnonymousViewerKey = (req, idReporte) => {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown-ip';
  const userAgent = req.get?.('user-agent') || req.headers?.['user-agent'] || 'unknown-agent';
  return `${idReporte}:${ip}:${userAgent}`;
};

const registerReporteView = async (req, idReporte) => {
  if (req.query?.skip_view === 'true') return false;

  if (req.user?.sub) {
    return ReporteModel.registrarVistaUsuario(idReporte, req.user.sub);
  }

  const now = Date.now();
  const key = getAnonymousViewerKey(req, idReporte);
  const lastSeenAt = anonymousViewThrottle.get(key) || 0;

  if (now - lastSeenAt < ANONYMOUS_VIEW_THROTTLE_MS) {
    return false;
  }

  anonymousViewThrottle.set(key, now);
  await ReporteModel.incrementarVistas(idReporte);
  return true;
};

const enrichLikedByMe = async (reportes, idUsuario) => {
  const items = Array.isArray(reportes) ? reportes : [reportes].filter(Boolean);
  if (!idUsuario || items.length === 0) return reportes;

  const likedSet = await LikeModel.likedSet(
    items.map((reporte) => reporte.id_reporte),
    idUsuario
  );
  const enriched = items.map((reporte) => ({
    ...reporte,
    liked_by_me: likedSet.has(Number(reporte.id_reporte)),
  }));

  return Array.isArray(reportes) ? enriched : enriched[0];
};

export const createReporte = async (req, res, next) => {
  try {
    const {
      tipo_contaminacion,
      nivel_severidad,
      subcategoria,
      titulo,
      descripcion,
      direccion,
      municipio,
      departamento,
      ia_etiquetas,
      ia_confianza,
      ia_procesado,
      latitud,
      longitud,
    } = req.body ?? {};

    if (!tipo_contaminacion?.trim()) {
      return errorResponse(res, 'El tipo de contaminación es requerido.', 400);
    }
    if (!nivel_severidad?.trim()) {
      return errorResponse(res, 'El nivel de severidad es requerido.', 400);
    }
    if (!titulo?.trim() || titulo.trim().length < 5) {
      return errorResponse(res, 'El título debe tener al menos 5 caracteres.', 400);
    }
    if (!direccion?.trim() || direccion.trim().length < 3) {
      return errorResponse(res, 'La dirección es requerida.', 400);
    }

    const tipoContaminacion = tipo_contaminacion.trim().toLowerCase();
    const nivelSeveridad = normalizeEnumValue(nivel_severidad);
    const uploadedFiles = getUploadedFiles(req);
    const evidenceError = validateReporteEvidenceFiles(uploadedFiles);
    const iaPayload = parseAcceptedIaPayload({ ia_etiquetas, ia_confianza, ia_procesado });

    if (evidenceError) {
      return errorResponse(res, evidenceError, 400);
    }

    if (iaPayload.error) {
      return errorResponse(res, iaPayload.error, 400);
    }

    if (!NIVELES_SEVERIDAD_PERMITIDOS.includes(nivelSeveridad)) {
      return errorResponse(
        res,
        buildAllowedValuesMessage('El nivel de severidad', NIVELES_SEVERIDAD_PERMITIDOS),
        400
      );
    }

    const categoriaValida = await CategoriaRiesgoModel.esValido(tipoContaminacion);

    if (!categoriaValida) {
      return errorResponse(res, 'La categoría de contaminación no existe o está inactiva.', 400);
    }

    const parsedLatitud = parseCoordinate(latitud, {
      field: 'La latitud',
      min: -90,
      max: 90,
    });

    if (parsedLatitud.error) {
      return errorResponse(res, parsedLatitud.error, 400);
    }

    const parsedLongitud = parseCoordinate(longitud, {
      field: 'La longitud',
      min: -180,
      max: 180,
    });

    if (parsedLongitud.error) {
      return errorResponse(res, parsedLongitud.error, 400);
    }

    const idReporte = await ReporteModel.create({
      id_usuario:       req.user.sub,
      tipo_contaminacion: tipoContaminacion,
      subcategoria:        subcategoria?.trim() || null,
      nivel_severidad:    nivelSeveridad,
      titulo:             titulo.trim(),
      descripcion:        descripcion?.trim() || null,
      direccion:          direccion.trim(),
      municipio:          municipio?.trim() || null,
      departamento:       departamento?.trim() || null,
      latitud:            parsedLatitud.value,
      longitud:           parsedLongitud.value,
    });

    let reporte = await ReporteModel.findById(idReporte);

    let iaAnalysis;
    if (iaPayload.procesado) {
      iaAnalysis = iaPayload.analysis;
    } else {
      iaAnalysis = analyzeReporte({
        ...reporte,
        tipo_contaminacion: tipoContaminacion,
        nivel_severidad: nivelSeveridad,
        titulo: titulo.trim(),
        descripcion: descripcion?.trim() || null,
        direccion: direccion.trim(),
        municipio: municipio?.trim() || null,
        departamento: departamento?.trim() || null,
        latitud: parsedLatitud.value,
        longitud: parsedLongitud.value,
      });
    }

    await ReporteModel.updateIaAnalysis(idReporte, iaAnalysis);
    reporte = await ReporteModel.findById(idReporte);

    for (const [index, file] of uploadedFiles.entries()) {
      const tipo = file.mimetype.startsWith('video/') ? 'video' : 'imagen';
      await EvidenciaModel.create({
        id_reporte:      idReporte,
        id_usuario:      req.user.sub,
        tipo_archivo:    tipo,
        url_archivo:     `/uploads/${file.filename}`,
        nombre_original: file.originalname,
        mime_type:       file.mimetype,
        tamano_bytes:    file.size,
        orden:           index,
      });
    }

    try {
      await AsignacionEntidadesService.asignarEntidadesAReporte(reporte);
    } catch (error) {
      console.error('[asignacion-entidades] no se pudo asignar reporte:', error.message);
    }

    invalidatePrediccionCache();
    return successResponse(res, { reporte }, 'Reporte creado correctamente.', 201);
  } catch (error) {
    return next(error);
  }
};

export const getReportes = async (req, res, next) => {
  try {
    const { estado, tipo_contaminacion, nivel_severidad, municipio, limit = 20, offset = 0 } = req.query;

    if (req.user?.rol === 'entidad') {
      if (!req.user.id_entidad) {
        return errorResponse(res, 'Usuario entidad sin entidad asignada.', 403);
      }

      const data = await ReporteEntidadModel.findByEntidad(req.user.id_entidad, {
        categoria: tipo_contaminacion,
        severidad: nivel_severidad,
        limit,
        offset,
      });

      return successResponse(res, {
        reportes: data.reportes,
        total: data.total,
        limit: data.limit,
        offset: data.offset,
      });
    }

    const filters = {
      estado, tipo_contaminacion, nivel_severidad, municipio,
      limit: Number(limit),
      offset: Number(offset),
    };
    const countFilters = {
      estado,
      tipo_contaminacion,
      nivel_severidad,
      municipio,
    };
    const [reportes, total] = await Promise.all([
      ReporteModel.findAll(filters),
      ReporteModel.countAll(countFilters),
    ]);
    const enrichedReportes = await enrichLikedByMe(reportes, req.user?.sub);

    return successResponse(res, {
      reportes: enrichedReportes,
      total,
      limit: Math.max(1, Math.min(100, parseInt(limit, 10) || 20)),
      offset: Math.max(0, parseInt(offset, 10) || 0),
    });
  } catch (error) {
    return next(error);
  }
};

export const exportReportes = async (req, res, next) => {
  try {
    const {
      format,
      tipo_contaminacion,
      estado,
      nivel_severidad,
      municipio,
      desde,
      hasta,
    } = req.query ?? {};

    const reportes = await ReporteModel.findForExport({
      tipo_contaminacion,
      estado,
      nivel_severidad,
      municipio,
      desde,
      hasta: normalizeHasta(hasta),
    });

    if (String(format).toLowerCase() === 'json') {
      return successResponse(
        res,
        { reportes },
        'Exportacion de reportes generada correctamente.'
      );
    }

    const headers = [
      'titulo',
      'tipo_contaminacion',
      'nivel_severidad',
      'estado',
      'municipio',
      'autor_nombre',
      'autor_apellido',
      'created_at',
    ];

    const csvRows = [
      headers.join(','),
      ...reportes.map((row) => headers.map((key) => toCsvValue(row[key])).join(',')),
    ];

    const csvContent = `\ufeff${csvRows.join('\n')}`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="reportes_export.csv"');
    return res.status(200).send(csvContent);
  } catch (error) {
    return next(error);
  }
};

export const getMisReportes = async (req, res, next) => {
  try {
    const id_usuario = req.user?.sub;

    if (!id_usuario) {
      return errorResponse(res, 'No autorizado.', 401);
    }

    const { limit = 20, offset = 0 } = req.query;

    const reportes = await ReporteModel.findByUsuario(id_usuario, {
      limit: Number(limit),
      offset: Number(offset),
    });

    const total = await ReporteModel.countByUsuario(id_usuario);

    return successResponse(
      res,
      { reportes, total },
      'Reportes del usuario obtenidos correctamente.',
      200
    );
  } catch (error) {
    return next(error);
  }
};

export const getStats = async (req, res, next) => {
  try {
    const stats = await ReporteModel.getStats();
    return successResponse(res, { stats });
  } catch (error) {
    return next(error);
  }
};

export const getStatsByCategoria = async (req, res, next) => {
  try {
    const data = await ReporteModel.getStatsByCategoria();
    return successResponse(
      res,
      { data, total: data.length },
      'Estadisticas por categoria obtenidas correctamente.'
    );
  } catch (error) {
    return next(error);
  }
};

export const getStatsTimeline = async (req, res, next) => {
  try {
    const bucket = String(req.query.bucket ?? 'week').toLowerCase();

    if (!['week', 'month'].includes(bucket)) {
      return errorResponse(res, 'El parametro bucket debe ser week o month.', 400);
    }

    const limit = parseAnalyticsLimit(req.query.limit);
    const data = await ReporteModel.getStatsTimeline({ bucket, limit });

    return successResponse(
      res,
      { data, bucket, limit, total: data.length },
      'Timeline de reportes obtenido correctamente.'
    );
  } catch (error) {
    return next(error);
  }
};

export const getHeatmapPoints = async (req, res, next) => {
  try {
    const data = await ReporteModel.getHeatmapPoints();
    return successResponse(
      res,
      { data, total: data.length },
      'Puntos de heatmap obtenidos correctamente.'
    );
  } catch (error) {
    return next(error);
  }
};

export const getStatsIA = async (req, res, next) => {
  try {
    const data = await ReporteModel.getStatsIA({ dias: req.query?.dias });
    return successResponse(
      res,
      { data },
      'Estadisticas IA obtenidas correctamente.'
    );
  } catch (error) {
    return next(error);
  }
};

export const getZonasRiesgo = async (req, res, next) => {
  try {
    const zonas = await ReporteModel.getZonasRiesgo({
      dias: req.query?.dias,
      min_score: req.query?.min_score,
    });

    return successResponse(
      res,
      { zonas, total: zonas.length },
      'Zonas de riesgo obtenidas correctamente.'
    );
  } catch (error) {
    return next(error);
  }
};

export const getAlertasPredictivas = async (req, res, next) => {
  try {
    const alertas = await ReporteModel.getAlertasPredictivas({
      nivel_min: req.query?.nivel_min,
      tipo: req.query?.tipo,
      limite: req.query?.limite,
      dias: req.query?.dias,
      lat: req.query?.lat,
      lng: req.query?.lng,
      radio_km: req.query?.radio_km,
    });

    return successResponse(
      res,
      { alertas, total: alertas.length },
      'Alertas predictivas obtenidas correctamente.'
    );
  } catch (error) {
    return next(error);
  }
};

export const getTrendingReportes = async (req, res, next) => {
  try {
    const reportes = await ReporteModel.findTrending({ limit: req.query?.limit });
    const enrichedReportes = await enrichLikedByMe(reportes, req.user?.sub);
    return successResponse(
      res,
      { reportes: enrichedReportes, total: reportes.length },
      'Reportes en tendencia obtenidos correctamente.'
    );
  } catch (error) {
    return next(error);
  }
};

export const toggleLikeReporte = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const idUsuario = req.user?.sub;

    const reporte = await ReporteModel.findById(id);
    if (!reporte) return errorResponse(res, 'Reporte no encontrado.', 404);

    if (Number(reporte.id_usuario) === Number(idUsuario)) {
      return errorResponse(res, 'No puedes reaccionar a tu propio reporte.', 400);
    }

    const result = await LikeModel.toggle(id, idUsuario);

    return successResponse(
      res,
      result,
      result.liked ? 'Like registrado.' : 'Like retirado.'
    );
  } catch (error) {
    return next(error);
  }
};

export const analizarImagen = async (req, res, next) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'Imagen requerida.', 400);
    }

    const analysis = await clasificarImagen(req.file);
    return successResponse(
      res,
      analysis,
      'Imagen analizada correctamente.'
    );
  } catch (error) {
    return next(error);
  } finally {
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
  }
};

export const updateReporte = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const reporte = await ReporteModel.findById(id);
    if (!reporte) return errorResponse(res, 'Reporte no encontrado.', 404);

    const { rol, sub } = req.user;
    const isOwner = reporte.id_usuario === sub;
    const isMod   = rol === 'moderador' || rol === 'admin';

    if (!isOwner && !isMod) {
      return errorResponse(res, 'No tienes permiso para editar este reporte.', 403);
    }

    // Owners solo pueden editar reportes en estado inicial.
    if (isOwner && !isMod && reporte.estado !== ESTADO_INICIAL_REPORTE) {
      return errorResponse(
        res,
        'No puedes editar un reporte que ya está en revisión o procesado.',
        403
      );
    }

    // Owners can edit content fields; mods/admins can also change estado y comentario_moderacion
    const allowed = isOwner
      ? ['titulo', 'descripcion', 'direccion', 'municipio', 'departamento']
      : ['estado', 'nivel_severidad', 'titulo', 'descripcion', 'direccion', 'municipio', 'departamento', 'comentario_moderacion'];

    const campos = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body ?? {}, key)) {
        campos[key] = req.body[key];
      }
    }

    if (Object.keys(campos).length === 0) {
      return errorResponse(res, 'No se enviaron campos válidos para actualizar.', 400);
    }

    if (Object.prototype.hasOwnProperty.call(campos, 'estado')) {
      const estado = normalizeEnumValue(campos.estado);

      if (!ESTADOS_REPORTE_PERMITIDOS.includes(estado)) {
        return errorResponse(
          res,
          buildAllowedValuesMessage('El estado', ESTADOS_REPORTE_PERMITIDOS),
          400
        );
      }

      campos.estado = estado;

      if (!canTransitionReporteEstado(reporte.estado, campos.estado)) {
        return errorResponse(
          res,
          `Transicion de estado no permitida: ${reporte.estado} -> ${campos.estado}.`,
          400
        );
      }
    }

    if (Object.prototype.hasOwnProperty.call(campos, 'nivel_severidad')) {
      const nivelSeveridad = normalizeEnumValue(campos.nivel_severidad);

      if (!NIVELES_SEVERIDAD_PERMITIDOS.includes(nivelSeveridad)) {
        return errorResponse(
          res,
          buildAllowedValuesMessage('El nivel de severidad', NIVELES_SEVERIDAD_PERMITIDOS),
          400
        );
      }

      campos.nivel_severidad = nivelSeveridad;
    }

    // Validar que comentario_moderacion es obligatorio si se rechaza
    if (isMod && campos.estado === 'rechazado') {
      const comentario = campos.comentario_moderacion?.trim();
      if (!comentario) {
        return errorResponse(res, 'El comentario es obligatorio al rechazar un reporte.', 400);
      }
    }

    await ReporteModel.update(id, campos);
    if (
      Object.prototype.hasOwnProperty.call(campos, 'estado') ||
      Object.prototype.hasOwnProperty.call(campos, 'nivel_severidad')
    ) {
      invalidatePrediccionCache();
    }
    const updated = await ReporteModel.findById(id);

    if (isMod && reporte.id_usuario && Number(reporte.id_usuario) !== Number(sub)) {
      const cambioEstado = (
        Object.prototype.hasOwnProperty.call(campos, 'estado') &&
        campos.estado !== reporte.estado
      );
      const nuevoComentario = (
        Object.prototype.hasOwnProperty.call(campos, 'comentario_moderacion') &&
        String(campos.comentario_moderacion ?? '').trim().length > 0 &&
        campos.comentario_moderacion !== reporte.comentario_moderacion
      );

      if (cambioEstado) {
        await crearNotificacion({
          id_usuario: reporte.id_usuario,
          tipo: 'reporte_estado',
          titulo: `Tu reporte cambio a "${campos.estado}"`,
          mensaje: `El reporte "${reporte.titulo}" ahora esta en estado: ${campos.estado}.`,
          referencia_tipo: 'reporte',
          referencia_uuid: reporte.uuid,
          link: buildReporteLink(reporte),
        });
      }

      if (nuevoComentario) {
        await crearNotificacion({
          id_usuario: reporte.id_usuario,
          tipo: 'reporte_comentario',
          titulo: 'Comentario de moderacion en tu reporte',
          mensaje: String(campos.comentario_moderacion).slice(0, 240),
          referencia_tipo: 'reporte',
          referencia_uuid: reporte.uuid,
          link: buildReporteLink(reporte),
        });
      }
    }

    return successResponse(res, { reporte: updated }, 'Reporte actualizado.');
  } catch (error) {
    return next(error);
  }
};

export const deleteReporte = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const reporte = await ReporteModel.findById(id);
    if (!reporte) return errorResponse(res, 'Reporte no encontrado.', 404);

    const { rol, sub } = req.user;
    const isOwner = reporte.id_usuario === sub;
    const isMod   = rol === 'moderador' || rol === 'admin';

    if (!isOwner && !isMod) {
      return errorResponse(res, 'No tienes permiso para eliminar este reporte.', 403);
    }

    // Owners solo pueden eliminar reportes en estado inicial.
    if (isOwner && !isMod && reporte.estado !== ESTADO_INICIAL_REPORTE) {
      return errorResponse(
        res,
        'No puedes eliminar un reporte que ya está en revisión o procesado.',
        403
      );
    }

    await ReporteModel.remove(id);
    invalidatePrediccionCache();
    return successResponse(res, null, 'Reporte eliminado.');
  } catch (error) {
    return next(error);
  }
};

export const getReporteById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (req.user?.rol === 'entidad') {
      if (!req.user.id_entidad) {
        return errorResponse(res, 'Usuario entidad sin entidad asignada.', 403);
      }

      const asignado = await ReporteEntidadModel.findOneByReporteAndEntidad(id, req.user.id_entidad);
      if (!asignado) {
        return errorResponse(res, 'No tienes permiso para ver este reporte.', 403);
      }
    }

    const reporte = await ReporteModel.findById(id);
    if (!reporte) return errorResponse(res, 'Reporte no encontrado.', 404);
    await registerReporteView(req, id);
    const enrichedReporte = await enrichLikedByMe(reporte, req.user?.sub);

    // Fetch related data in parallel
    const [evidencias, usuario] = await Promise.all([
      EvidenciaModel.findByReporte(id),
      UsuarioModel.findById(reporte.id_usuario),
    ]);

    // Strip sensitive user fields
    const autor = usuario
      ? { nombre: usuario.nombre, apellido: usuario.apellido, rol: usuario.rol, avatar_url: usuario.avatar_url ?? null }
      : null;

    return successResponse(res, { reporte: enrichedReporte, evidencias, autor });
  } catch (error) {
    return next(error);
  }
};

export const listEvidenciasReporte = async (req, res, next) => {
  try {
    const reporte = await getReporteForEvidenceManagement(req, res);
    if (!reporte) return null;

    const evidencias = await EvidenciaModel.findByReporte(reporte.id_reporte);

    return successResponse(
      res,
      { evidencias, total: evidencias.length },
      'Evidencias obtenidas correctamente.'
    );
  } catch (error) {
    return next(error);
  }
};

export const addEvidenciaReporte = async (req, res, next) => {
  try {
    const reporte = await getReporteForEvidenceManagement(req, res);
    if (!reporte) return null;

    if (!req.file) {
      return errorResponse(res, 'Archivo de evidencia requerido.', 400);
    }

    const tipo = req.file.mimetype.startsWith('video/') ? 'video' : 'imagen';
    const idEvidencia = await EvidenciaModel.create({
      id_reporte: reporte.id_reporte,
      id_usuario: req.user.sub,
      tipo_archivo: tipo,
      url_archivo: `/uploads/${req.file.filename}`,
      nombre_original: req.file.originalname,
      mime_type: req.file.mimetype,
      tamano_bytes: req.file.size,
      orden: 0,
    });

    const evidencia = await EvidenciaModel.findById(idEvidencia);

    return successResponse(
      res,
      { evidencia },
      'Evidencia agregada correctamente.',
      201
    );
  } catch (error) {
    return next(error);
  }
};

export const deleteEvidenciaReporte = async (req, res, next) => {
  try {
    const reporte = await getReporteForEvidenceManagement(req, res);
    if (!reporte) return null;

    const evidenciaId = Number(req.params.evidenciaId);
    const evidencia = await EvidenciaModel.findById(evidenciaId);

    if (!evidencia || Number(evidencia.id_reporte) !== Number(reporte.id_reporte)) {
      return errorResponse(res, 'Evidencia no encontrada.', 404);
    }

    await EvidenciaModel.remove(evidenciaId);

    return successResponse(res, null, 'Evidencia eliminada correctamente.');
  } catch (error) {
    return next(error);
  }
};
