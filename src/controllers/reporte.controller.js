import { ReporteModel }   from '../models/reporte.model.js';
import { UsuarioModel }   from '../models/usuario.model.js';
import { EvidenciaModel } from '../models/evidencia.model.js';
import { errorResponse, successResponse } from '../utils/response.js';

const parseCoord = (val) => {
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
};

export const createReporte = async (req, res, next) => {
  try {
    const {
      tipo_contaminacion,
      nivel_severidad,
      titulo,
      descripcion,
      direccion,
      municipio,
      departamento,
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

    const lat = parseCoord(latitud);
    const lng = parseCoord(longitud);

    const idReporte = await ReporteModel.create({
      id_usuario:       req.user.sub,
      tipo_contaminacion: tipo_contaminacion.trim(),
      nivel_severidad:    nivel_severidad.trim(),
      titulo:             titulo.trim(),
      descripcion:        descripcion?.trim() || null,
      direccion:          direccion.trim(),
      municipio:          municipio?.trim() || null,
      departamento:       departamento?.trim() || null,
      latitud:            lat,
      longitud:           lng,
    });

    const reporte = await ReporteModel.findById(idReporte);

    // Guardar evidencia si se adjuntó archivo
    if (req.file) {
      const tipo = req.file.mimetype.startsWith('video/') ? 'video' : 'imagen';
      await EvidenciaModel.create({
        id_reporte:      idReporte,
        id_usuario:      req.user.sub,
        tipo_archivo:    tipo,
        url_archivo:     `/uploads/${req.file.filename}`,
        nombre_original: req.file.originalname,
        mime_type:       req.file.mimetype,
        tamano_bytes:    req.file.size,
        orden:           0,
      });
    }

    return successResponse(res, { reporte }, 'Reporte creado correctamente.', 201);
  } catch (error) {
    return next(error);
  }
};

export const getReportes = async (req, res, next) => {
  try {
    const { estado, tipo_contaminacion, nivel_severidad, municipio, limit = 20, offset = 0 } = req.query;
    const reportes = await ReporteModel.findAll({
      estado, tipo_contaminacion, nivel_severidad, municipio,
      limit: Number(limit),
      offset: Number(offset),
    });
    return successResponse(res, { reportes, total: reportes.length });
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

    // Owners can edit content fields; mods/admins can also change estado
    const allowed = isOwner
      ? ['titulo', 'descripcion', 'direccion', 'municipio', 'departamento']
      : ['estado', 'nivel_severidad', 'titulo', 'descripcion', 'direccion', 'municipio', 'departamento'];

    const campos = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body ?? {}, key)) {
        campos[key] = req.body[key];
      }
    }

    if (Object.keys(campos).length === 0) {
      return errorResponse(res, 'No se enviaron campos válidos para actualizar.', 400);
    }

    await ReporteModel.update(id, campos);
    const updated = await ReporteModel.findById(id);
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

    await ReporteModel.remove(id);
    return successResponse(res, null, 'Reporte eliminado.');
  } catch (error) {
    return next(error);
  }
};

export const getReporteById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const reporte = await ReporteModel.findById(id);
    if (!reporte) return errorResponse(res, 'Reporte no encontrado.', 404);
    await ReporteModel.incrementarVistas(id);

    // Fetch related data in parallel
    const [evidencias, usuario] = await Promise.all([
      EvidenciaModel.findByReporte(id),
      UsuarioModel.findById(reporte.id_usuario),
    ]);

    // Strip sensitive user fields
    const autor = usuario
      ? { nombre: usuario.nombre, apellido: usuario.apellido, rol: usuario.rol, avatar_url: usuario.avatar_url ?? null }
      : null;

    return successResponse(res, { reporte, evidencias, autor });
  } catch (error) {
    return next(error);
  }
};
