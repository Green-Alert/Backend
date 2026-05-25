import pool from '../config/database.js';
import { tableExists } from '../config/schema-compat.js';

export const LikeModel = {
  toggle: async (id_reporte, id_usuario) => {
    if (!await tableExists('reporte_likes')) {
      return { liked: false, votos_relevancia: 0 };
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [existingRows] = await connection.execute(
        `SELECT id_like
         FROM reporte_likes
         WHERE id_reporte = ? AND id_usuario = ?
         LIMIT 1
         FOR UPDATE`,
        [id_reporte, id_usuario]
      );

      const liked = existingRows.length === 0;
      if (liked) {
        await connection.execute(
          `INSERT INTO reporte_likes (id_reporte, id_usuario)
           VALUES (?, ?)`,
          [id_reporte, id_usuario]
        );
        await connection.execute(
          `UPDATE reportes
           SET votos_relevancia = votos_relevancia + 1
           WHERE id_reporte = ? AND deleted_at IS NULL`,
          [id_reporte]
        );
      } else {
        await connection.execute(
          `DELETE FROM reporte_likes
           WHERE id_reporte = ? AND id_usuario = ?`,
          [id_reporte, id_usuario]
        );
        await connection.execute(
          `UPDATE reportes
           SET votos_relevancia = GREATEST(votos_relevancia - 1, 0)
           WHERE id_reporte = ? AND deleted_at IS NULL`,
          [id_reporte]
        );
      }

      const [[row]] = await connection.execute(
        `SELECT votos_relevancia
         FROM reportes
         WHERE id_reporte = ?`,
        [id_reporte]
      );

      await connection.commit();
      return {
        liked,
        votos_relevancia: Number(row?.votos_relevancia) || 0,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  hasLiked: async (id_reporte, id_usuario) => {
    if (!id_usuario || !await tableExists('reporte_likes')) {
      return false;
    }

    const [rows] = await pool.execute(
      `SELECT id_like
       FROM reporte_likes
       WHERE id_reporte = ? AND id_usuario = ?
       LIMIT 1`,
      [id_reporte, id_usuario]
    );

    return rows.length > 0;
  },

  likedSet: async (id_reportes = [], id_usuario) => {
    const ids = [...new Set(id_reportes.map(Number).filter(Number.isFinite))];

    if (!id_usuario || ids.length === 0 || !await tableExists('reporte_likes')) {
      return new Set();
    }

    const placeholders = ids.map(() => '?').join(', ');
    const [rows] = await pool.execute(
      `SELECT id_reporte
       FROM reporte_likes
       WHERE id_usuario = ? AND id_reporte IN (${placeholders})`,
      [id_usuario, ...ids]
    );

    return new Set(rows.map((row) => Number(row.id_reporte)));
  },
};
