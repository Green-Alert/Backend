import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const readSslCa = () => {
  if (process.env.DB_SSL_CA) {
    return process.env.DB_SSL_CA.replace(/\\n/g, '\n');
  }

  if (process.env.DB_SSL_CA_PATH) {
    if (!fs.existsSync(process.env.DB_SSL_CA_PATH)) {
      console.warn(`certificado SSL de base de datos no encontrado: ${process.env.DB_SSL_CA_PATH}`);
      return undefined;
    }

    return fs.readFileSync(process.env.DB_SSL_CA_PATH, 'utf8');
  }

  return undefined;
};

const getSslConfig = () => {
  if (process.env.DB_SSL !== 'true') return undefined;

  const ca = readSslCa();
  const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true';

  return ca
    ? { ca, rejectUnauthorized: true }
    : { rejectUnauthorized };
};

// pool de conexiones reutilizables
const pool = mysql.createPool({
  host:             process.env.DB_HOST,
  port:             Number(process.env.DB_PORT),
  user:             process.env.DB_USER,
  password:         process.env.DB_PASSWORD,
  database:         process.env.DB_NAME,
  ssl:              getSslConfig(),
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
  }
};

export default pool;
