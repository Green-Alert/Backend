import pool from './database.js';

const columnCache = new Map();
const tableCache = new Map();

const getDatabaseName = () => process.env.DB_NAME;

export const tableExists = async (tableName) => {
  const databaseName = getDatabaseName();
  const cacheKey = `${databaseName}.${tableName}`;

  if (tableCache.has(cacheKey)) {
    return tableCache.get(cacheKey);
  }

  const [[row]] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [databaseName, tableName]
  );

  const exists = Number(row?.total) > 0;
  tableCache.set(cacheKey, exists);
  return exists;
};

export const columnExists = async (tableName, columnName) => {
  const databaseName = getDatabaseName();
  const cacheKey = `${databaseName}.${tableName}.${columnName}`;

  if (columnCache.has(cacheKey)) {
    return columnCache.get(cacheKey);
  }

  const [[row]] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [databaseName, tableName, columnName]
  );

  const exists = Number(row?.total) > 0;
  columnCache.set(cacheKey, exists);
  return exists;
};

export const clearSchemaCompatCache = () => {
  columnCache.clear();
  tableCache.clear();
};
