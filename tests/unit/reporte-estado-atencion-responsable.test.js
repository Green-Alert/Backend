import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/database.js';
import { ReporteModel } from '../../src/models/reporte.model.js';

test('ReporteModel.findByUsuario expone estado_atencion_responsable derivado de asignaciones', async (t) => {
  let sqlEjecutado = '';
  t.mock.method(pool, 'execute', async (sql) => {
    sqlEjecutado = String(sql);
    return [[{
      id_reporte: 15,
      uuid: 'reporte-15',
      tipo_contaminacion: 'agua',
      estado: 'pendiente',
      estado_atencion_responsable: 'en_atencion',
      ia_etiquetas: '[]',
      ia_confianza: null,
      ia_procesado: 0,
    }]];
  });

  const [reporte] = await ReporteModel.findByUsuario(21);

  assert.match(sqlEjecutado, /reporte_entidades re/);
  assert.match(sqlEjecutado, /estado_atencion_responsable/);
  assert.equal(reporte.estado, 'pendiente');
  assert.equal(reporte.estado_atencion_responsable, 'en_atencion');
});

test('ReporteModel.findById expone estado_atencion_responsable sin cambiar reportes.estado', async (t) => {
  t.mock.method(pool, 'execute', async () => [[{
    id_reporte: 15,
    uuid: 'reporte-15',
    tipo_contaminacion: 'agua',
    estado: 'pendiente',
    estado_atencion_responsable: 'atendido',
    ia_etiquetas: '[]',
    ia_confianza: null,
    ia_procesado: 0,
  }]]);

  const reporte = await ReporteModel.findById(15);

  assert.equal(reporte.estado, 'pendiente');
  assert.equal(reporte.estado_atencion_responsable, 'atendido');
});

