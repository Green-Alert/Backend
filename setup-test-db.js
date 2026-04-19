#!/usr/bin/env node
/**
 * Script para configurar la base de datos de prueba
 * Crea la base de datos y todas las tablas necesarias
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const setupDatabase = async () => {
  let connection;
  try {
    // Conectar sin especificar base de datos para crear la BD
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    console.log('✓ Conectado a MySQL');

    // Crear base de datos (sin prepared statement)
    const dbName = process.env.DB_NAME;
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`✓ Base de datos '${dbName}' creada/verificada`);

    // Usar la base de datos (sin prepared statement)
    await connection.query(`USE \`${dbName}\``);

    // Crear tabla usuarios
    await connection.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id_usuario INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        rol ENUM('ciudadano', 'moderador', 'admin') DEFAULT 'ciudadano',
        email_verificado BOOLEAN DEFAULT FALSE,
        otp_code_hash VARCHAR(64),
        otp_exp DATETIME,
        otp_attempts INT DEFAULT 0,
        otp_last_request DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME,
        INDEX idx_email (email),
        INDEX idx_otp_code_hash (otp_code_hash),
        INDEX idx_otp_exp (otp_exp)
      )
    `);
    console.log('✓ Tabla usuarios creada');

    // Crear tabla categorias_riesgo
    await connection.query(`
      CREATE TABLE IF NOT EXISTS categorias_riesgo (
        id_categoria INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT,
        color VARCHAR(7),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME
      )
    `);
    console.log('✓ Tabla categorias_riesgo creada');

    // Crear tabla reportes
    await connection.query(`
      CREATE TABLE IF NOT EXISTS reportes (
        id_reporte INT AUTO_INCREMENT PRIMARY KEY,
        id_usuario INT NOT NULL,
        id_categoria INT,
        titulo VARCHAR(255) NOT NULL,
        descripcion TEXT,
        ubicacion VARCHAR(255),
        latitud DECIMAL(10, 8),
        longitud DECIMAL(11, 8),
        estado ENUM('pendiente', 'en_revision', 'verificado', 'en_proceso', 'rechazado', 'resuelto') DEFAULT 'pendiente',
        comentario_moderacion TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME,
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
        FOREIGN KEY (id_categoria) REFERENCES categorias_riesgo(id_categoria),
        INDEX idx_usuario (id_usuario),
        INDEX idx_estado (estado),
        INDEX idx_comentario_moderacion (comentario_moderacion)
      )
    `);
    console.log('✓ Tabla reportes creada');

    // Crear tabla evidencias
    await connection.query(`
      CREATE TABLE IF NOT EXISTS evidencias (
        id_evidencia INT AUTO_INCREMENT PRIMARY KEY,
        id_reporte INT NOT NULL,
        tipo VARCHAR(50),
        url_archivo VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME,
        FOREIGN KEY (id_reporte) REFERENCES reportes(id_reporte)
      )
    `);
    console.log('✓ Tabla evidencias creada');

    // Insertar categorías de prueba
    await connection.query(`
      INSERT IGNORE INTO categorias_riesgo (id_categoria, nombre, descripcion, color)
      VALUES 
        (1, 'Inundación', 'Riesgo de inundación', '#0066FF'),
        (2, 'Deslizamiento', 'Riesgo de deslizamiento', '#FF6600'),
        (3, 'Incendio', 'Riesgo de incendio', '#FF0000')
    `);
    console.log('✓ Categorías de riesgo insertadas');

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
