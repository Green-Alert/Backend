import { UsuarioModel } from '../models/usuario.model.js';
import { ReporteModel } from '../models/reporte.model.js';
import { errorResponse, successResponse } from '../utils/response.js';

const VALID_ROLES = ['ciudadano', 'moderador', 'admin'];

const parseLimit = (value, fallback) => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(1, Math.min(100, parsed));
};

const parseOffset = (value, fallback) => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(0, parsed);
};

const parseActivo = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return value === 1 ? 1 : value === 0 ? 0 : null;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return 1;
    if (normalized === 'false' || normalized === '0') return 0;
  }
  return null;
};

export const listarUsuarios = async (req, res, next) => {
  try {
    const { rol, activo, search } = req.query ?? {};
    const limit = parseLimit(req.query?.limit, 20);
    const offset = parseOffset(req.query?.offset, 0);
    const activoValue = parseActivo(activo);

    if (rol && !VALID_ROLES.includes(rol)) {
      return errorResponse(res, 'Rol invalido.', 400);
    }

    const [usuarios, total] = await Promise.all([
      UsuarioModel.findAll({
        rol,
        activo: activoValue,
        search,
        limit,
        offset,
      }),
      UsuarioModel.countAll({
        rol,
        activo: activoValue,
        search,
      }),
    ]);

    return successResponse(
      res,
      { usuarios, total, limit, offset },
      'Usuarios obtenidos correctamente.'
    );
  } catch (error) {
    return next(error);
  }
};

export const statsUsuarios = async (req, res, next) => {
  try {
    const [usuarios, reportes] = await Promise.all([
      UsuarioModel.getStats(),
      ReporteModel.getStats(),
    ]);

    return successResponse(
      res,
      { usuarios, reportes },
      'Estadisticas obtenidas correctamente.'
    );
  } catch (error) {
    return next(error);
  }
};

export const obtenerUsuario = async (req, res, next) => {
  try {
    const id_usuario = Number(req.params.id);
    if (!id_usuario) {
      return errorResponse(res, 'Id de usuario invalido.', 400);
    }

    const usuario = await UsuarioModel.findByIdWithDetails(id_usuario);
    if (!usuario) {
      return errorResponse(res, 'Usuario no encontrado.', 404);
    }

    return successResponse(res, { usuario }, 'Usuario obtenido correctamente.');
  } catch (error) {
    return next(error);
  }
};

export const cambiarRol = async (req, res, next) => {
  try {
    const id_usuario = Number(req.params.id);
    const { rol } = req.body ?? {};
    const currentUserId = req.user?.sub;

    if (!id_usuario) {
      return errorResponse(res, 'Id de usuario invalido.', 400);
    }

    if (!rol || !VALID_ROLES.includes(rol)) {
      return errorResponse(res, 'Rol invalido.', 400);
    }

    if (currentUserId === id_usuario && rol !== 'admin') {
      return errorResponse(res, 'No puedes cambiar tu propio rol.', 403);
    }

    const usuario = await UsuarioModel.updateRol(id_usuario, rol);
    if (!usuario) {
      return errorResponse(res, 'Usuario no encontrado.', 404);
    }

    return successResponse(res, { usuario }, 'Rol actualizado correctamente.');
  } catch (error) {
    return next(error);
  }
};

export const cambiarEstado = async (req, res, next) => {
  try {
    const id_usuario = Number(req.params.id);
    const { activo } = req.body ?? {};
    const currentUserId = req.user?.sub;
    const activoValue = parseActivo(activo);

    if (!id_usuario) {
      return errorResponse(res, 'Id de usuario invalido.', 400);
    }

    if (activoValue === null) {
      return errorResponse(res, 'Estado activo invalido.', 400);
    }

    if (currentUserId === id_usuario && activoValue === 0) {
      return errorResponse(res, 'No puedes desactivar tu propia cuenta.', 403);
    }

    const usuario = await UsuarioModel.updateActivo(id_usuario, activoValue);
    if (!usuario) {
      return errorResponse(res, 'Usuario no encontrado.', 404);
    }

    return successResponse(res, { usuario }, 'Estado actualizado correctamente.');
  } catch (error) {
    return next(error);
  }
};

export const eliminarUsuario = async (req, res, next) => {
  try {
    const id_usuario = Number(req.params.id);
    const currentUserId = req.user?.sub;

    if (!id_usuario) {
      return errorResponse(res, 'Id de usuario invalido.', 400);
    }

    if (currentUserId === id_usuario) {
      return errorResponse(res, 'No puedes eliminar tu propia cuenta.', 403);
    }

    const removed = await UsuarioModel.remove(id_usuario);
    if (!removed) {
      return errorResponse(res, 'Usuario no encontrado.', 404);
    }

    return successResponse(res, null, 'Usuario eliminado correctamente.');
  } catch (error) {
    return next(error);
  }
};
