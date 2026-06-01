import pool from '../config/database.js';

const parseLimit = (value, fallback = 20) => {
  const parsed = parseInt(value, 10);
  return Math.max(1, Math.min(100, Number.isInteger(parsed) ? parsed : fallback));
};

const parseOffset = (value, fallback = 0) => {
  const parsed = parseInt(value, 10);
  return Math.max(0, Number.isInteger(parsed) ? parsed : fallback);
};

const parseMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'string') return metadata ?? null;

  try {
    return JSON.parse(metadata);
  } catch {
    return null;
  }
};

const mapAlertaRow = (row) => ({
  id_alerta_entidad: row.id_alerta_entidad,
  uuid: row.uuid,
  id_reporte_entidad: row.id_reporte_entidad,
  id_reporte: row.id_reporte,
  id_entidad: row.id_entidad,
  tipo_alerta: row.tipo_alerta,
  prioridad: row.prioridad,
  titulo: row.titulo,
  mensaje: row.mensaje,
  leida: Boolean(row.leida),
  leida_at: row.leida_at,
  leida_por: row.leida_por,
  metadata: parseMetadata(row.metadata),
  created_at: row.created_at,
  updated_at: row.updated_at,
  reporte: row.reporte_titulo === undefined
    ? undefined
    : {
        titulo: row.reporte_titulo,
        descripcion: row.reporte_descripcion,
        categoria: row.reporte_categoria,
        subcategoria: row.reporte_subcategoria,
        nivel_severidad: row.reporte_nivel_severidad,
        estado: row.reporte_estado,
        municipio: row.reporte_municipio,
        departamento: row.reporte_departamento,
        latitud: row.reporte_latitud,
        longitud: row.reporte_longitud,
      },
});

const buildAlertasFilter = ({ id_entidad, leida } = {}) => {
  const conditions = ['ae.id_entidad = ?'];
  const params = [id_entidad];

  if (leida === true || leida === false) {
    conditions.push('ae.leida = ?');
    params.push(leida ? 1 : 0);
  }

  return {
    where: conditions.join(' AND '),
    params,
  };
};

export const AlertaEntidadModel = {
  create: async ({
    id_reporte_entidad,
    id_reporte,
    id_entidad,
    tipo_alerta,
    prioridad,
    titulo,
    mensaje,
    metadata = null,
  }) => {
    const [result] = await pool.execute(
      `INSERT INTO alertas_entidad
         (id_reporte_entidad, id_reporte, id_entidad, tipo_alerta, prioridad, titulo, mensaje, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         id_alerta_entidad = LAST_INSERT_ID(id_alerta_entidad)`,
      [
        id_reporte_entidad,
        id_reporte,
        id_entidad,
        tipo_alerta,
        prioridad,
        titulo,
        mensaje,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );

    return result.insertId;
  },

  findByEntidad: async (id_entidad, { leida, limit = 20, offset = 0 } = {}) => {
    const safeLimit = parseLimit(limit);
    const safeOffset = parseOffset(offset);
    const { where, params } = buildAlertasFilter({ id_entidad, leida });

    const [rows] = await pool.execute(
      `SELECT ae.id_alerta_entidad, ae.uuid, ae.id_reporte_entidad,
              ae.id_reporte, ae.id_entidad, ae.tipo_alerta, ae.prioridad,
              ae.titulo, ae.mensaje, ae.leida, ae.leida_at, ae.leida_por,
              ae.metadata, ae.created_at, ae.updated_at,
              r.titulo AS reporte_titulo,
              r.descripcion AS reporte_descripcion,
              r.tipo_contaminacion AS reporte_categoria,
              r.subcategoria AS reporte_subcategoria,
              r.nivel_severidad AS reporte_nivel_severidad,
              r.estado AS reporte_estado,
              r.municipio AS reporte_municipio,
              r.departamento AS reporte_departamento,
              r.latitud AS reporte_latitud,
              r.longitud AS reporte_longitud
       FROM alertas_entidad ae
       INNER JOIN reportes r ON r.id_reporte = ae.id_reporte
       WHERE ${where}
       ORDER BY ae.created_at DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      params
    );

    const [[meta]] = await pool.execute(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN leida = 0 THEN 1 ELSE 0 END) AS no_leidas
       FROM alertas_entidad ae
       WHERE ae.id_entidad = ?`,
      [id_entidad]
    );

    return {
      alertas: rows.map(mapAlertaRow),
      meta: {
        total: Number(meta?.total) || 0,
        no_leidas: Number(meta?.no_leidas) || 0,
        limit: safeLimit,
        offset: safeOffset,
      },
    };
  },

  countNoLeidasByEntidad: async (id_entidad) => {
    const [[row]] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM alertas_entidad
       WHERE id_entidad = ? AND leida = 0`,
      [id_entidad]
    );

    return Number(row?.total) || 0;
  },

  markAsReadByEntidad: async (id_alerta_entidad, id_entidad, id_usuario) => {
    const [result] = await pool.execute(
      `UPDATE alertas_entidad
       SET leida = 1,
           leida_at = COALESCE(leida_at, NOW()),
           leida_por = COALESCE(leida_por, ?)
       WHERE id_alerta_entidad = ? AND id_entidad = ? AND leida = 0`,
      [id_usuario, id_alerta_entidad, id_entidad]
    );

    if (result.affectedRows > 0) return true;

    const [rows] = await pool.execute(
      `SELECT 1
       FROM alertas_entidad
       WHERE id_alerta_entidad = ? AND id_entidad = ?
       LIMIT 1`,
      [id_alerta_entidad, id_entidad]
    );

    return rows.length > 0;
  },

  markAllAsReadByEntidad: async (id_entidad, id_usuario) => {
    const [result] = await pool.execute(
      `UPDATE alertas_entidad
       SET leida = 1,
           leida_at = COALESCE(leida_at, NOW()),
           leida_por = COALESCE(leida_por, ?)
       WHERE id_entidad = ? AND leida = 0`,
      [id_usuario, id_entidad]
    );

    return result.affectedRows;
  },
};

export default AlertaEntidadModel;
