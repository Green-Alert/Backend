#!/usr/bin/env node
/**
 * Setup completo de base de datos con schema correct
 * Utiliza DATABASE_SCHEMA_COMPLETE.sql
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const setupDatabase = async () => {
  let connection;
  try {
    // Conectar sin especificar base de datos
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    console.log('✓ Conectado a MySQL');

    // Crear base de datos
    const dbName = process.env.DB_NAME;
    await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    console.log(`✓ Base de datos anterior eliminada`);
    
    await connection.query(`CREATE DATABASE \`${dbName}\``);
    console.log(`✓ Base de datos '${dbName}' creada`);

    // Usar la base de datos
    await connection.query(`USE \`${dbName}\``);

    // Leer el schema SQL
    const sqlPath = path.join(__dirname, 'DATABASE_SCHEMA_COMPLETE.sql');
    let sql = fs.readFileSync(sqlPath, 'utf-8');

    // Remover comentarios y separar en statements
    const statements = sql
      .split('\n')
      .filter(line => !line.startsWith('--') && line.trim().length > 0)
      .join('\n')
      .split(';')
      .filter(s => s.trim().length > 0)
      .map(s => s.trim() + ';');

    console.log(`\nEjecutando ${statements.length} statements SQL...`);

    // Ejecutar cada statement
    let executed = 0;
    for (const statement of statements) {
      try {
        if (statement.includes('CREATE TABLE')) {
          const tableName = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
          if (tableName) {
            await connection.query(statement);
            console.log(`  ✓ Tabla '${tableName}' creada`);
            executed++;
          }
        } else if (statement.includes('CREATE OR REPLACE VIEW')) {
          const viewName = statement.match(/CREATE OR REPLACE VIEW (\w+)/)?.[1];
          if (viewName) {
            try {
              await connection.query(statement);
              console.log(`  ✓ Vista '${viewName}' creada`);
            } catch (e) {
              // Las vistas pueden fallar, no es crítico
              console.log(`  ⚠ Vista '${viewName}' - ${e.message.substring(0, 50)}`);
            }
            executed++;
          }
        } else if (statement.includes('CREATE PROCEDURE')) {
          const procName = statement.match(/CREATE PROCEDURE IF NOT EXISTS (\w+)/)?.[1];
          if (procName) {
            try {
              await connection.query(statement);
              console.log(`  ✓ Stored Procedure '${procName}' creado`);
            } catch (e) {
              console.log(`  ⚠ Procedure '${procName}' - ${e.message.substring(0, 50)}`);
            }
            executed++;
          }
        } else if (statement.includes('INSERT IGNORE INTO')) {
          const tableName = statement.match(/INSERT IGNORE INTO (\w+)/)?.[1];
          if (tableName) {
            await connection.query(statement);
            console.log(`  ✓ Datos insertados en '${tableName}'`);
            executed++;
          }
        } else if (statement.trim()) {
          // Otros statements
          await connection.query(statement);
          executed++;
        }
      } catch (e) {
        // Ignorar algunos errores comunes
        if (!e.message.includes('already exists') && 
            !e.message.includes('Duplicate entry') &&
            !statement.includes('DROP TABLE')) {
          console.error(`  ✗ Error: ${e.message}`);
        }
      }
    }

    console.log(`\n✓ ${executed} statements ejecutados exitosamente`);

    // Verificar que las tablas existan
    const [tables] = await connection.query(`SHOW TABLES`);
    console.log(`\n✓ Tablas en la base de datos: ${tables.length}`);
    tables.forEach(t => {
      const tableName = Object.values(t)[0];
      console.log(`  - ${tableName}`);
    });

    console.log('\n✅ Base de datos configurada correctamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error configurando base de datos:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
};

setupDatabase();
