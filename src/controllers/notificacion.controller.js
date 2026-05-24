import { NotificacionModel } from '../models/notificacion.model.js';
import { FcmTokenModel } from '../models/fcm-token.model.js';
import { UsuarioModel } from '../models/usuario.model.js';
import { errorResponse, successResponse } from '../utils/response.js';

const FCM_TOKEN_MIN_LENGTH = 20;
const FCM_TOKEN_MAX_LENGTH = 4096;

const validarFcmToken = (token) => {
  if (typeof token !== 'string' || !token.trim()) {
    return 'Token FCM requerido.';
  }

  const normalized = token.trim();
  if (
    normalized.length < FCM_TOKEN_MIN_LENGTH ||
    normalized.length > FCM_TOKEN_MAX_LENGTH ||
    /\s/.test(normalized)
  ) {
    return 'Token FCM invalido.';
  }

  return null;
};

const TIPOS_ACTUALIZACION_REPORTE = new Set([
  'reporte_estado',
  'reporte_comentario',
  'reporte_creado',
]);

const puedeCrearNotificacion = async ({ id_usuario, tipo }) => {
  if (!TIPOS_ACTUALIZACION_REPORTE.has(tipo)) return true;

  const usuario = await UsuarioModel.findByIdWithDetails(id_usuario);
  if (!usuario) return false;

  return usuario.notification_preferences?.report_updates !== false;
};

export const crearNotificacion = async (payload) => {
  try {
    const allowed = await puedeCrearNotificacion(payload);
    if (!allowed) return null;

    return await NotificacionModel.create(payload);
  } catch (error) {
    console.error('[notificaciones] error al crear:', error.message);
    return null;
  }
};

export const listarNotificaciones = async (req, res, next) => {
  try {
    const idUsuario = req.user?.sub;
    if (!idUsuario) return errorResponse(res, 'No autorizado.', 401);

    const filtroLeida = req.query?.leida === 'true'
      ? true
      : req.query?.leida === 'false'
        ? false
        : undefined;

    const data = await NotificacionModel.findByUsuario(idUsuario, {
      leida: filtroLeida,
      limit: req.query?.limit,
      offset: req.query?.offset,
    });

    res.setHeader('Cache-Control', 'no-store');
    return successResponse(res, data, 'Notificaciones obtenidas.');
  } catch (error) {
    return next(error);
  }
};

export const contadorNotificaciones = async (req, res, next) => {
  try {
    const idUsuario = req.user?.sub;
    if (!idUsuario) return errorResponse(res, 'No autorizado.', 401);

    const no_leidas = await NotificacionModel.contarNoLeidas(idUsuario);

    res.setHeader('Cache-Control', 'no-store');
    return successResponse(res, { no_leidas }, 'ok');
  } catch (error) {
    return next(error);
  }
};

export const marcarLeida = async (req, res, next) => {
  try {
    const idUsuario = req.user?.sub;
    if (!idUsuario) return errorResponse(res, 'No autorizado.', 401);

    const { uuid } = req.params;
    if (!uuid) return errorResponse(res, 'UUID requerido.', 400);

    const ok = await NotificacionModel.marcarLeida(uuid, idUsuario);
    if (!ok) return errorResponse(res, 'Notificacion no encontrada.', 404);

    return successResponse(res, { uuid }, 'Notificacion marcada como leida.');
  } catch (error) {
    return next(error);
  }
};

export const marcarTodasLeidas = async (req, res, next) => {
  try {
    const idUsuario = req.user?.sub;
    if (!idUsuario) return errorResponse(res, 'No autorizado.', 401);

    const actualizadas = await NotificacionModel.marcarTodasLeidas(idUsuario);

    return successResponse(
      res,
      { actualizadas },
      'Notificaciones marcadas como leidas.'
    );
  } catch (error) {
    return next(error);
  }
};

export const eliminarNotificacion = async (req, res, next) => {
  try {
    const idUsuario = req.user?.sub;
    if (!idUsuario) return errorResponse(res, 'No autorizado.', 401);

    const { uuid } = req.params;
    if (!uuid) return errorResponse(res, 'UUID requerido.', 400);

    const ok = await NotificacionModel.eliminar(uuid, idUsuario);
    if (!ok) return errorResponse(res, 'Notificacion no encontrada.', 404);

    return successResponse(res, { uuid }, 'Notificacion eliminada.');
  } catch (error) {
    return next(error);
  }
};

export const registrarFcmToken = async (req, res, next) => {
  try {
    const idUsuario = req.user?.sub;
    if (!idUsuario) return errorResponse(res, 'No autorizado.', 401);

    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : req.body?.token;
    const validationError = validarFcmToken(token);
    if (validationError) return errorResponse(res, validationError, 400);

    const data = await FcmTokenModel.registrar({
      id_usuario: idUsuario,
      token,
      user_agent: req.get?.('user-agent') ?? req.headers?.['user-agent'] ?? null,
    });

    return successResponse(res, data, 'Token FCM registrado.');
  } catch (error) {
    return next(error);
  }
};
