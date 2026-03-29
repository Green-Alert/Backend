import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// pool de conexiones reutilizables
const pool = mysql.createPool({
  host:             process.env.DB_HOST,
  port:             Number(process.env.DB_PORT),
  user:             process.env.DB_USER,
  password:         process.env.DB_PASSWORD,
  database:         process.env.DB_NAME,
  connectionLimit:  10,
  waitForConnections: true,
  queueLimit:       0,
});

// verifica la conexión al iniciar el servidor
export const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('conexión a mysql establecida.');
    connection.release();
  } catch (error) {
    console.error('error al conectar con mysql:', error.message);
    process.exit(1);
  }
};

export default pool;
