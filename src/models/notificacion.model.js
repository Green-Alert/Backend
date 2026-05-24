import { randomUUID } from 'crypto';
import pool from '../config/database.js';

export const NotificacionModel = {
  create: async ({
    id_usuario,
    tipo,
    titulo,
    mensaje,
    referencia_tipo = null,
    referencia_uuid = null,
    link = null,
  }) => {
    const uuid = randomUUID();
    const params = [
      uuid,
      id_usuario,
      tipo,
      titulo,
      mensaje,
      referencia_tipo,
      referencia_uuid,
      link,
    ];
    let result;

    try {
      [result] = await pool.execute(
        `INSERT INTO notificaciones
           (uuid, id_usuario, tipo, titulo, mensaje, referencia_tipo, referencia_uuid, link)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        params
      );
    } catch (error) {
      if (tipo === 'reporte_asignado_entidad') {
        params[2] = 'sistema';
        [result] = await pool.execute(
          `INSERT INTO notificaciones
             (uuid, id_usuario, tipo, titulo, mensaje, referencia_tipo, referencia_uuid, link)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          params
        );
      } else {
        throw error;
      }
    }

    return { id_notificacion: result.insertId, uuid };
  },

  findByUsuario: async (id_usuario, { leida, limit = 20, offset = 0 } = {}) => {
    const where = ['id_usuario = ?'];
    const params = [id_usuario];

    if (leida === true || leida === false) {
      where.push('leida = ?');
      params.push(leida ? 1 : 0);
    }

    const safeLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const safeOffset = Math.max(0, parseInt(offset, 10) || 0);

    const [rows] = await pool.execute(
      `SELECT id_notificacion, uuid, tipo, titulo, mensaje,
              referencia_tipo, referencia_uuid, link,
              leida, leida_at, created_at
       FROM notificaciones
       WHERE ${where.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      params
    );

    const [[meta]] = await pool.execute(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN leida = 0 THEN 1 ELSE 0 END) AS no_leidas
       FROM notificaciones
       WHERE id_usuario = ?`,
      [id_usuario]
    );

    return {
      items: rows.map((row) => ({
        ...row,
        leida: Boolean(row.leida),
      })),
      meta: {
        total: Number(meta?.total) || 0,
        no_leidas: Number(meta?.no_leidas) || 0,
        limit: safeLimit,
        offset: safeOffset,
      },
    };
  },

  contarNoLeidas: async (id_usuario) => {
    const [[row]] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM notificaciones
       WHERE id_usuario = ? AND leida = 0`,
      [id_usuario]
    );

    return Number(row?.total) || 0;
  },

  marcarLeida: async (uuid, id_usuario) => {
    const [result] = await pool.execute(
      `UPDATE notificaciones
       SET leida = 1, leida_at = COALESCE(leida_at, NOW())
       WHERE uuid = ? AND id_usuario = ? AND leida = 0`,
      [uuid, id_usuario]
    );

    if (result.affectedRows > 0) {
      return true;
    }

    const [rows] = await pool.execute(
      `SELECT 1
       FROM notificaciones
       WHERE uuid = ? AND id_usuario = ?
       LIMIT 1`,
      [uuid, id_usuario]
    );

    return rows.length > 0;
  },

  marcarTodasLeidas: async (id_usuario) => {
    const [result] = await pool.execute(
      `UPDATE notificaciones
       SET leida = 1, leida_at = COALESCE(leida_at, NOW())
       WHERE id_usuario = ? AND leida = 0`,
      [id_usuario]
    );

    return result.affectedRows;
  },

  eliminar: async (uuid, id_usuario) => {
    const [result] = await pool.execute(
      `DELETE FROM notificaciones
       WHERE uuid = ? AND id_usuario = ?`,
      [uuid, id_usuario]
    );

    return result.affectedRows > 0;
  },
};

export default NotificacionModel;
