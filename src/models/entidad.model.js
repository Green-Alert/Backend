import pool from '../config/database.js';

export const EntidadModel = {
  findAll: async ({ activas } = {}) => {
    const conditions = [];
    const params = [];

    if (activas === true) {
      conditions.push('activo = 1');
    } else if (activas === false) {
      conditions.push('activo = 0');
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.execute(
      `SELECT id_entidad, nombre, codigo, descripcion, activo, created_at, updated_at
       FROM entidades
       ${where}
       ORDER BY nombre ASC`,
      params
    );

    return rows;
  },

  findActive: async () => EntidadModel.findAll({ activas: true }),

  findById: async (id_entidad) => {
    const [rows] = await pool.execute(
      `SELECT id_entidad, nombre, codigo, descripcion, activo, created_at, updated_at
       FROM entidades
       WHERE id_entidad = ?
       LIMIT 1`,
      [id_entidad]
    );

    return rows[0] ?? null;
  },

  findByCodigo: async (codigo) => {
    const [rows] = await pool.execute(
      `SELECT id_entidad, nombre, codigo, descripcion, activo, created_at, updated_at
       FROM entidades
       WHERE codigo = ?
       LIMIT 1`,
      [codigo]
    );

    return rows[0] ?? null;
  },

  findManyByCodigos: async (codigos = []) => {
    const uniqueCodigos = [...new Set(codigos.filter(Boolean))];
    if (uniqueCodigos.length === 0) return [];

    const placeholders = uniqueCodigos.map(() => '?').join(', ');
    const [rows] = await pool.execute(
      `SELECT id_entidad, nombre, codigo, descripcion, activo
       FROM entidades
       WHERE activo = 1 AND codigo IN (${placeholders})`,
      uniqueCodigos
    );

    return rows;
  },
};

export default EntidadModel;
