#!/usr/bin/env node
/**
 * Setup de base de datos simplificado para testing
 * Solo crea las tablas esenciales sin features avanzadas
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

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

    // Crear tabla usuarios
    await connection.query(`
      CREATE TABLE usuarios (
        id_usuario INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) UNIQUE NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        rol ENUM('ciudadano', 'moderador', 'admin') DEFAULT 'ciudadano',
        activo BOOLEAN DEFAULT TRUE,
        email_verificado BOOLEAN DEFAULT FALSE,
        avatar_url VARCHAR(255) NULL,
        telefono VARCHAR(20) NULL,
        ultimo_acceso DATETIME NULL,
        token_reset VARCHAR(64) NULL,
        token_reset_exp DATETIME NULL,
        otp_code_hash VARCHAR(64) NULL,
        otp_exp DATETIME NULL,
        otp_attempts INT DEFAULT 0,
        otp_last_request DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        INDEX idx_email (email),
        INDEX idx_uuid (uuid),
        INDEX idx_otp_code_hash (otp_code_hash),
        INDEX idx_otp_exp (otp_exp)
      )
    `);
    console.log('✓ Tabla usuarios creada');

    // Crear tabla categorias_riesgo
    await connection.query(`
      CREATE TABLE categorias_riesgo (
        id_categoria INT AUTO_INCREMENT PRIMARY KEY,
        codigo VARCHAR(50) UNIQUE NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT NULL,
        icono VARCHAR(255) NULL,
        color_hex VARCHAR(7) NULL,
        nivel_prioridad_default INT NULL,
        activo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        INDEX idx_codigo (codigo),
        INDEX idx_activo (activo)
      )
    `);
    console.log('✓ Tabla categorias_riesgo creada');

    // Crear tabla reportes
    await connection.query(`
      CREATE TABLE reportes (
        id_reporte INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) UNIQUE NOT NULL,
        id_usuario INT NOT NULL,
        tipo_contaminacion VARCHAR(50) NOT NULL,
        estado ENUM('pendiente', 'en_revision', 'verificado', 'en_proceso', 'rechazado', 'resuelto') DEFAULT 'en_revision',
        nivel_severidad ENUM('bajo', 'medio', 'alto', 'critico') DEFAULT 'medio',
        titulo VARCHAR(255) NOT NULL,
        descripcion TEXT NULL,
        latitud DECIMAL(10, 8) NULL,
        longitud DECIMAL(11, 8) NULL,
        direccion VARCHAR(255) NULL,
        municipio VARCHAR(100) NULL,
        departamento VARCHAR(100) NULL,
        votos_relevancia INT DEFAULT 0,
        vistas INT DEFAULT 0,
        ia_etiquetas TEXT NULL,
        ia_confianza DECIMAL(3, 2) NULL,
        ia_procesado BOOLEAN DEFAULT FALSE,
        comentario_moderacion TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        CONSTRAINT fk_reportes_usuario FOREIGN KEY (id_usuario) 
          REFERENCES usuarios(id_usuario) ON DELETE RESTRICT ON UPDATE CASCADE,
        INDEX idx_uuid (uuid),
        INDEX idx_usuario (id_usuario),
        INDEX idx_estado (estado),
        INDEX idx_tipo_contaminacion (tipo_contaminacion)
      )
    `);
    console.log('✓ Tabla reportes creada');

    // Crear tabla evidencias
    await connection.query(`
      CREATE TABLE evidencias (
        id_evidencia INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) UNIQUE NOT NULL,
        id_reporte INT NOT NULL,
        id_usuario INT NOT NULL,
        tipo_archivo VARCHAR(50) NULL,
        url_archivo VARCHAR(255) NOT NULL,
        nombre_original VARCHAR(255) NULL,
        mime_type VARCHAR(100) NULL,
        tamano_bytes BIGINT NULL,
        hash_sha256 VARCHAR(64) NULL,
        ia_analisis TEXT NULL,
        ia_procesado BOOLEAN DEFAULT FALSE,
        verificado BOOLEAN DEFAULT FALSE,
        orden INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        CONSTRAINT fk_evidencias_reporte FOREIGN KEY (id_reporte) 
          REFERENCES reportes(id_reporte) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_evidencias_usuario FOREIGN KEY (id_usuario) 
          REFERENCES usuarios(id_usuario) ON DELETE RESTRICT ON UPDATE CASCADE,
        INDEX idx_uuid (uuid),
        INDEX idx_reporte (id_reporte),
        INDEX idx_usuario (id_usuario)
      )
    `);
    console.log('✓ Tabla evidencias creada');

    // Insertar categorías de prueba
    await connection.query(`
      INSERT INTO categorias_riesgo 
      (id_categoria, codigo, nombre, descripcion, icono, color_hex, nivel_prioridad_default, activo) 
      VALUES 
      (1, 'inundacion', 'Inundación', 'Riesgo de inundación', '🌊', '#0066FF', 3, TRUE),
      (2, 'deslizamiento', 'Deslizamiento', 'Riesgo de deslizamiento', '⛰️', '#FF6600', 2, TRUE),
      (3, 'incendio', 'Incendio', 'Riesgo de incendio', '🔥', '#FF0000', 1, TRUE),
      (4, 'contaminacion_aire', 'Contaminación de Aire', 'Contaminación del aire', '💨', '#9933FF', 2, TRUE),
      (5, 'contaminacion_agua', 'Contaminación de Agua', 'Contaminación de agua', '💧', '#3399FF', 2, TRUE)
    `);
    console.log('✓ Categorías de riesgo insertadas');

    // Verificar que las tablas existan
    const [tables] = await connection.query(`SHOW TABLES`);
    console.log(`\n✓ Tablas en la base de datos: ${tables.length}`);
    tables.forEach(t => {
      const tableName = Object.values(t)[0];
      console.log(`  - ${tableName}`);
    });

    console.log('\n✅ Base de datos configurada correctamente para testing');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error configurando base de datos:', error.message);
    console.error('Error completo:', error);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
};

setupDatabase();
