import pool from '../config/database.js';

// verifica servidor y base de datos
export const getHealth = async (req, res) => {
  try {
    await pool.query('SELECT 1');

    res.status(200).json({
      status: 'ok',
      message: 'servidor funcionando correctamente',
      database: 'conectada',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'base de datos no responde',
      database: 'desconectada',
      timestamp: new Date().toISOString(),
    });
  }
};
