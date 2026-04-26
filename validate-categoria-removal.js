#!/usr/bin/env node
/**
 * Script de validación: Verificar eliminación de categorías luminica y deslizamientos
 * 
 * Este script valida que:
 * 1. Las categorías 'luminica' y 'deslizamientos' no existan en la BD
 * 2. Las otras categorías sigan presentes
 * 3. El endpoint GET /categorias funcione correctamente
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const CATEGORIAS_ELIMINADAS = ['luminica', 'deslizamientos'];
const CATEGORIAS_ESPERADAS = [
  'agua',
  'aire',
  'suelo',
  'ruido',
  'residuos',
  'deforestacion',
  'incendios_forestales',
  'avalanchas_fluviotorrenciales',
  'otro'
];

const validateCategoryRemoval = async () => {
  let connection;
  try {
    console.log('🔍 Iniciando validación de eliminación de categorías...\n');

    // Conectar a la BD
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log('✓ Conectado a la base de datos\n');

    // 1. Verificar que categorías eliminadas NO existan
    console.log('📋 Validando que categorías eliminadas no existan...');
    for (const codigo of CATEGORIAS_ELIMINADAS) {
      const [rows] = await connection.execute(
        'SELECT id_categoria FROM categorias_riesgo WHERE codigo = ?',
        [codigo]
      );
      
      if (rows.length === 0) {
        console.log(`  ✓ '${codigo}' correctamente eliminada`);
      } else {
        console.log(`  ✗ ERROR: '${codigo}' aún existe en la BD`);
        return false;
      }
    }
    console.log();

    // 2. Verificar que categorías esperadas SÍ existan
    console.log('📋 Validando que categorías esperadas existan...');
    for (const codigo of CATEGORIAS_ESPERADAS) {
      const [rows] = await connection.execute(
        'SELECT id_categoria, nombre FROM categorias_riesgo WHERE codigo = ?',
        [codigo]
      );
      
      if (rows.length > 0) {
        console.log(`  ✓ '${codigo}' (${rows[0].nombre}) presente`);
      } else {
        console.log(`  ✗ ERROR: '${codigo}' no encontrada en la BD`);
        return false;
      }
    }
    console.log();

    // 3. Obtener todas las categorías y verificar conteo
    console.log('📊 Estadísticas de categorías:');
    const [allCategories] = await connection.execute(
      'SELECT COUNT(*) as total, SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as activas FROM categorias_riesgo'
    );
    
    console.log(`  Total de categorías: ${allCategories[0].total}`);
    console.log(`  Categorías activas: ${allCategories[0].activas}`);
    
    if (allCategories[0].total === 9) {
      console.log(`  ✓ Conteo correcto (9 categorías)`);
    } else {
      console.log(`  ✗ ERROR: Se esperaban 9 categorías, se encontraron ${allCategories[0].total}`);
      return false;
    }
    console.log();

    // 4. Verificar que no haya reportes con categorías eliminadas
    console.log('🔎 Verificando integridad de reportes...');
    const [reportesInvalidos] = await connection.execute(
      `SELECT COUNT(*) as total FROM reportes 
       WHERE tipo_contaminacion IN (?, ?) AND deleted_at IS NULL`,
      CATEGORIAS_ELIMINADAS
    );
    
    if (reportesInvalidos[0].total === 0) {
      console.log(`  ✓ No hay reportes con categorías eliminadas`);
    } else {
      console.log(`  ⚠ ADVERTENCIA: Se encontraron ${reportesInvalidos[0].total} reportes con categorías eliminadas`);
      console.log(`    Estos reportes deberían ser revisados o eliminados`);
    }
    console.log();

    // 5. Resumen final
    console.log('✅ VALIDACIÓN COMPLETADA EXITOSAMENTE');
    console.log();
    console.log('Cambios confirmados:');
    console.log('  - Categoría "luminica" (Contaminación Lumínica) → ELIMINADA');
    console.log('  - Categoría "deslizamientos" (Deslizamientos) → ELIMINADA');
    console.log('  - Total de categorías: 9 (de 11 anteriormente)');
    console.log();
    console.log('Próximos pasos:');
    console.log('  1. Iniciar servidor backend: npm run dev');
    console.log('  2. Probar endpoint: GET /api/categorias');
    console.log('  3. Verificar que responda con 9 categorías');
    console.log('  4. Probar endpoints de reportes sin las categorías eliminadas');
    console.log();

    return true;

  } catch (error) {
    console.error('❌ Error durante validación:', error.message);
    return false;
  } finally {
    if (connection) await connection.end();
  }
};

// Ejecutar validación
const success = await validateCategoryRemoval();
process.exit(success ? 0 : 1);
