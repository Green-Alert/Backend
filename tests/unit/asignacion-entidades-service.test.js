import test from 'node:test';
import assert from 'node:assert/strict';
import { resolverAsignacionesEntidades } from '../../src/services/asignacion-entidades.service.js';

const codigos = (reporte) => resolverAsignacionesEntidades(reporte).map((item) => item.codigo);
const principal = (reporte) => resolverAsignacionesEntidades(reporte)[0];

test('asigna incendio forestal a Bomberos como principal', () => {
  const reporte = {
    tipo_contaminacion: 'incendios_forestales',
    subcategoria: 'Incendio activo',
    nivel_severidad: 'critico',
    titulo: 'Incendio forestal activo',
    descripcion: 'Se observan llamas y humo.',
  };

  assert.deepEqual(codigos(reporte), ['bomberos', 'gestion_riesgo', 'corpoamazonia']);
  assert.equal(principal(reporte).prioridad, 'critica');
});

test('asigna derrame de combustible a Gestion del Riesgo con apoyos', () => {
  const reporte = {
    tipo_contaminacion: 'suelo',
    subcategoria: 'Derrame de combustible',
    nivel_severidad: 'critico',
    titulo: 'Derrame de gasolina',
    descripcion: 'Hay combustible cerca de viviendas.',
  };

  assert.deepEqual(codigos(reporte), ['gestion_riesgo', 'bomberos', 'corpoamazonia']);
  assert.equal(principal(reporte).prioridad, 'critica');
});

test('asigna basura comun a Alcaldia y Servicios Publicos', () => {
  const reporte = {
    tipo_contaminacion: 'residuos',
    subcategoria: 'Basura en via publica',
    nivel_severidad: 'medio',
    titulo: 'Basura acumulada',
    descripcion: 'Punto critico de residuos.',
  };

  assert.deepEqual(codigos(reporte), ['alcaldia_servicios_publicos', 'secretaria_salud']);
  assert.equal(principal(reporte).prioridad, 'media');
});

test('no duplica entidades cuando palabra clave y categoria coinciden', () => {
  const reporte = {
    tipo_contaminacion: 'incendios_forestales',
    subcategoria: 'Incendio activo',
    nivel_severidad: 'critico',
    titulo: 'Incendio con fuego y humo',
    descripcion: 'Incendio activo.',
  };

  const asignaciones = resolverAsignacionesEntidades(reporte);
  assert.equal(new Set(asignaciones.map((item) => item.codigo)).size, asignaciones.length);
});
