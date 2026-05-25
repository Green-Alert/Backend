import pool from '../config/database.js';
import { columnExists } from '../config/schema-compat.js';
import { randomUUID } from 'crypto';

export const EvidenciaModel = {
  
    // Trae todas las evidencias de un reporten 
   
  findByReporte: async (id_reporte) => {
    const hasDeletedAt = await columnExists('evidencias', 'deleted_at');
    // En esquemas con borrado logico se aplica: WHERE id_reporte = ? AND deleted_at IS NULL
    const deletedFilter = hasDeletedAt ? 'AND deleted_at IS NULL' : '';

    const [rows] = await pool.execute(
      `SELECT id_evidencia, uuid, id_usuario, tipo_archivo,
              url_archivo, nombre_original, mime_type, tamano_bytes,
              hash_sha256, verificado, orden, created_at
       FROM evidencias
       WHERE id_reporte = ? ${deletedFilter}
       ORDER BY orden ASC, created_at ASC`,
      [id_reporte]
    );
    return rows;
  },

  findById: async (id_evidencia) => {
    const hasDeletedAt = await columnExists('evidencias', 'deleted_at');
    const deletedFilter = hasDeletedAt ? 'AND deleted_at IS NULL' : '';

    const [rows] = await pool.execute(
      `SELECT id_evidencia, uuid, id_reporte, id_usuario, tipo_archivo,
              url_archivo, nombre_original, mime_type, tamano_bytes,
              hash_sha256, verificado, orden, created_at
       FROM evidencias
       WHERE id_evidencia = ? ${deletedFilter}
       LIMIT 1`,
      [id_evidencia]
    );

    return rows[0] ?? null;
  },

  
    // Registra una nueva evidencia asociada a un reporte
   
  create: async ({
    id_reporte,
    id_usuario,
    tipo_archivo,
    url_archivo,
    nombre_original,
    mime_type,
    tamano_bytes,
    hash_sha256 = null,
    orden = 0,
  }) => {
    const uuid = randomUUID();
    const [result] = await pool.execute(
      `INSERT INTO evidencias
         (uuid, id_reporte, id_usuario, tipo_archivo, url_archivo, nombre_original,
          mime_type, tamano_bytes, hash_sha256, orden)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuid,
        id_reporte, id_usuario, tipo_archivo, url_archivo, nombre_original,
        mime_type, tamano_bytes, hash_sha256, orden,
      ]
    );
    return result.insertId;
  },

  remove: async (id_evidencia) => {
    if (!await columnExists('evidencias', 'deleted_at')) {
      const [result] = await pool.execute(
        `DELETE FROM evidencias
         WHERE id_evidencia = ?`,
        [id_evidencia]
      );

      return result.affectedRows > 0;
    }

    const [result] = await pool.execute(
      `UPDATE evidencias
       SET deleted_at = NOW()
       WHERE id_evidencia = ? AND deleted_at IS NULL`,
      [id_evidencia]
    );

    return result.affectedRows > 0;
  },

};
