import pool from '../config/database.js';

const ESTADOS_ATENCION = ['pendiente', 'en_atencion', 'atendido', 'cerrado'];

const parseLimit = (value, fallback = 20) => {
  const parsed = parseInt(value, 10);
  return Math.max(1, Math.min(100, Number.isInteger(parsed) ? parsed : fallback));
};

const parseOffset = (value, fallback = 0) => {
  const parsed = parseInt(value, 10);
  return Math.max(0, Number.isInteger(parsed) ? parsed : fallback);
};

const buildEntidadReportesFilter = ({
  id_entidad,
  prioridad,
  estado_atencion,
  tipo_asignacion,
  categoria,
  severidad,
} = {}) => {
  const conditions = [
    're.id_entidad = ?',
    'r.deleted_at IS NULL',
  ];
  const params = [id_entidad];

  if (prioridad) {
    conditions.push('re.prioridad = ?');
    params.push(prioridad);
  }
  if (estado_atencion) {
    conditions.push('re.estado_atencion = ?');
    params.push(estado_atencion);
  }
  if (tipo_asignacion) {
    conditions.push('re.tipo_asignacion = ?');
    params.push(tipo_asignacion);
  }
  if (categoria) {
    conditions.push('r.tipo_contaminacion = ?');
    params.push(categoria);
  }
  if (severidad) {
    conditions.push('r.nivel_severidad = ?');
    params.push(severidad);
  }

  return {
    where: conditions.join(' AND '),
    params,
  };
};

const mapAsignacionRow = (row) => ({
  id_reporte: row.id_reporte,
  uuid: row.uuid,
  titulo: row.titulo,
  descripcion: row.descripcion,
  categoria: row.tipo_contaminacion,
  tipo_contaminacion: row.tipo_contaminacion,
  subcategoria: row.subcategoria,
  severidad: row.nivel_severidad,
  nivel_severidad: row.nivel_severidad,
  estado: row.estado,
  latitud: row.latitud,
  longitud: row.longitud,
  direccion: row.direccion,
  municipio: row.municipio,
  departamento: row.departamento,
  created_at: row.created_at,
  updated_at: row.updated_at,
  asignacion: {
    id_reporte_entidad: row.id_reporte_entidad,
    tipo_asignacion: row.tipo_asignacion,
    prioridad: row.prioridad,
    estado_atencion: row.estado_atencion,
    comentario: row.comentario,
    asignado_at: row.asignado_at,
    actualizado_at: row.actualizado_at,
  },
  entidad: {
    id_entidad: row.id_entidad,
    codigo: row.entidad_codigo,
    nombre: row.entidad_nombre,
  },
});

export const ReporteEntidadModel = {
  ESTADOS_ATENCION,

  createAssignment: async ({
    id_reporte,
    id_entidad,
    tipo_asignacion = 'principal',
    prioridad = 'media',
    estado_atencion = 'pendiente',
    comentario = null,
  }) => {
    const [result] = await pool.execute(
      `INSERT INTO reporte_entidades
         (id_reporte, id_entidad, tipo_asignacion, prioridad, estado_atencion, comentario)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         tipo_asignacion = VALUES(tipo_asignacion),
         prioridad = VALUES(prioridad),
         actualizado_at = CURRENT_TIMESTAMP`,
      [id_reporte, id_entidad, tipo_asignacion, prioridad, estado_atencion, comentario]
    );

    return result.insertId;
  },

  bulkCreateAssignments: async (assignments = []) => {
    const created = [];
    for (const assignment of assignments) {
      const id = await ReporteEntidadModel.createAssignment(assignment);
      created.push({ ...assignment, id_reporte_entidad: id || null });
    }
    return created;
  },

  findByReporte: async (id_reporte) => {
    const [rows] = await pool.execute(
      `SELECT re.id_reporte_entidad, re.id_reporte, re.id_entidad,
              re.tipo_asignacion, re.prioridad, re.estado_atencion,
              re.comentario, re.asignado_at, re.actualizado_at,
              e.codigo AS entidad_codigo, e.nombre AS entidad_nombre
       FROM reporte_entidades re
       INNER JOIN entidades e ON e.id_entidad = re.id_entidad
       WHERE re.id_reporte = ?
       ORDER BY FIELD(re.tipo_asignacion, 'principal', 'apoyo'), re.asignado_at ASC`,
      [id_reporte]
    );

    return rows;
  },

  findByEntidad: async (id_entidad, filtros = {}) => {
    const limit = parseLimit(filtros.limit);
    const offset = parseOffset(filtros.offset);
    const { where, params } = buildEntidadReportesFilter({ id_entidad, ...filtros });

    const [rows] = await pool.execute(
      `SELECT r.id_reporte, r.uuid, r.titulo, r.descripcion,
              r.tipo_contaminacion, r.subcategoria, r.nivel_severidad, r.estado,
              r.latitud, r.longitud, r.direccion, r.municipio, r.departamento,
              r.created_at, r.updated_at,
              re.id_reporte_entidad, re.tipo_asignacion, re.prioridad,
              re.estado_atencion, re.comentario, re.asignado_at, re.actualizado_at,
              e.id_entidad, e.codigo AS entidad_codigo, e.nombre AS entidad_nombre
       FROM reporte_entidades re
       INNER JOIN reportes r ON r.id_reporte = re.id_reporte
       INNER JOIN entidades e ON e.id_entidad = re.id_entidad
       WHERE ${where}
       ORDER BY
         FIELD(re.prioridad, 'critica', 'alta', 'media', 'baja'),
         re.asignado_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    const [[meta]] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM reporte_entidades re
       INNER JOIN reportes r ON r.id_reporte = re.id_reporte
       WHERE ${where}`,
      params
    );

    return {
      reportes: rows.map(mapAsignacionRow),
      total: Number(meta?.total) || 0,
      limit,
      offset,
    };
  },

  findOneByReporteAndEntidad: async (id_reporte, id_entidad) => {
    const [rows] = await pool.execute(
      `SELECT re.id_reporte_entidad, re.id_reporte, re.id_entidad,
              re.tipo_asignacion, re.prioridad, re.estado_atencion,
              re.comentario, re.asignado_at, re.actualizado_at,
              e.codigo AS entidad_codigo, e.nombre AS entidad_nombre
       FROM reporte_entidades re
       INNER JOIN entidades e ON e.id_entidad = re.id_entidad
       WHERE re.id_reporte = ? AND re.id_entidad = ?
       LIMIT 1`,
      [id_reporte, id_entidad]
    );

    return rows[0] ?? null;
  },

  findReporteAsignadoByEntidad: async (id_reporte, id_entidad) => {
    const [rows] = await pool.execute(
      `SELECT r.id_reporte, r.uuid, r.titulo, r.descripcion,
              r.tipo_contaminacion, r.subcategoria, r.nivel_severidad, r.estado,
              r.latitud, r.longitud, r.direccion, r.municipio, r.departamento,
              r.created_at, r.updated_at,
              re.id_reporte_entidad, re.tipo_asignacion, re.prioridad,
              re.estado_atencion, re.comentario, re.asignado_at, re.actualizado_at,
              e.id_entidad, e.codigo AS entidad_codigo, e.nombre AS entidad_nombre
       FROM reporte_entidades re
       INNER JOIN reportes r ON r.id_reporte = re.id_reporte
       INNER JOIN entidades e ON e.id_entidad = re.id_entidad
       WHERE re.id_reporte = ? AND re.id_entidad = ? AND r.deleted_at IS NULL
       LIMIT 1`,
      [id_reporte, id_entidad]
    );

    return rows[0] ? mapAsignacionRow(rows[0]) : null;
  },

  updateEstadoAtencion: async (id_reporte_entidad, estado_atencion, comentario = null) => {
    const [result] = await pool.execute(
      `UPDATE reporte_entidades
       SET estado_atencion = ?, comentario = ?, actualizado_at = CURRENT_TIMESTAMP
       WHERE id_reporte_entidad = ?`,
      [estado_atencion, comentario, id_reporte_entidad]
    );

    return result.affectedRows > 0;
  },

  removeAssignment: async (id_reporte, id_entidad) => {
    const [result] = await pool.execute(
      `DELETE FROM reporte_entidades
       WHERE id_reporte = ? AND id_entidad = ?`,
      [id_reporte, id_entidad]
    );

    return result.affectedRows > 0;
  },
};

export default ReporteEntidadModel;
