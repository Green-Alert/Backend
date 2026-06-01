import test from 'node:test';
import assert from 'node:assert/strict';
import { resolverAsignacionesEntidades } from '../../src/services/asignacion-entidades.service.js';
import {
  ENTIDADES_INSTITUCIONALES_CODIGOS,
  isEntidadInstitucionalPermitida,
} from '../../src/models/entidad.model.js';

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

test('asigna derrame de combustible a Bomberos como principal', () => {
  const reporte = {
    tipo_contaminacion: 'suelo',
    subcategoria: 'Derrame de combustible',
    nivel_severidad: 'critico',
    titulo: 'Derrame de gasolina',
    descripcion: 'Hay combustible cerca de viviendas.',
  };

  assert.deepEqual(codigos(reporte), ['bomberos', 'corpoamazonia']);
  assert.equal(principal(reporte).prioridad, 'critica');
});

test('asigna derrame de quimicos a Bomberos como principal', () => {
  const reporte = {
    tipo_contaminacion: 'suelo',
    subcategoria: 'Derrame de químicos',
    nivel_severidad: 'critico',
    titulo: 'Derrame de quimicos en bodega',
    descripcion: 'Sustancia peligrosa con riesgo inmediato.',
  };

  assert.deepEqual(codigos(reporte), ['bomberos', 'corpoamazonia']);
  assert.equal(principal(reporte).prioridad, 'critica');
});

test('asigna derrame de petroleo o hidrocarburos a Bomberos como principal', () => {
  const reporte = {
    tipo_contaminacion: 'agua',
    subcategoria: 'Derrame de hidrocarburos',
    nivel_severidad: 'critico',
    titulo: 'Derrame de petróleo en la via',
    descripcion: 'Hidrocarburos cerca de viviendas.',
  };

  assert.deepEqual(codigos(reporte), ['bomberos', 'corpoamazonia']);
});

test('asigna accidente vehicular con derrame a Bomberos y Corpoamazonia', () => {
  const reporte = {
    tipo_contaminacion: 'suelo',
    subcategoria: 'Accidente vehicular con derrame',
    nivel_severidad: 'critico',
    titulo: 'Tractomula accidentada con derrame',
    descripcion: 'Hay liquido inflamable sobre la via.',
  };

  const asignaciones = resolverAsignacionesEntidades(reporte);
  assert.equal(asignaciones[0].codigo, 'bomberos');
  assert.equal(asignaciones[0].tipo_asignacion, 'principal');
  assert.equal(asignaciones[1].codigo, 'corpoamazonia');
  assert.equal(asignaciones[1].tipo_asignacion, 'apoyo');
});

test('asigna rescate o personas atrapadas a Bomberos', () => {
  const reporte = {
    tipo_contaminacion: 'otro',
    subcategoria: 'Rescate',
    nivel_severidad: 'critico',
    titulo: 'Personas atrapadas tras accidente',
    descripcion: 'Hay lesionados y riesgo directo a personas.',
  };

  assert.equal(principal(reporte).codigo, 'bomberos');
});

test('mantiene Gestion del Riesgo como principal para avalanchas y deslizamientos', () => {
  const reporte = {
    tipo_contaminacion: 'deslizamientos',
    subcategoria: 'Amenaza de deslizamiento',
    nivel_severidad: 'alto',
    titulo: 'Creciente subita y deslizamiento',
    descripcion: 'Evento natural sin fuego ni derrames peligrosos.',
  };

  assert.equal(principal(reporte).codigo, 'gestion_riesgo');
});

test('mantiene Corpoamazonia como principal para tala ilegal o deforestacion', () => {
  const reporte = {
    tipo_contaminacion: 'deforestacion',
    subcategoria: 'Tala ilegal',
    nivel_severidad: 'alto',
    titulo: 'Tala ilegal cerca de la ronda hidrica',
    descripcion: 'Afectacion a flora y ecosistema.',
  };

  assert.equal(principal(reporte).codigo, 'corpoamazonia');
});

test('mantiene Secretaria de Salud para agua contaminada de consumo humano', () => {
  const reporte = {
    tipo_contaminacion: 'agua',
    subcategoria: 'Agua contaminada para consumo humano',
    nivel_severidad: 'alto',
    titulo: 'Agua potable contaminada',
    descripcion: 'Riesgo sanitario para la comunidad.',
  };

  assert.equal(principal(reporte).codigo, 'secretaria_salud');
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

test('asigna alcantarillado a Alcaldia y Servicios Publicos', () => {
  const reporte = {
    tipo_contaminacion: 'residuos',
    subcategoria: 'Aguas residuales',
    nivel_severidad: 'medio',
    titulo: 'Problema de alcantarillado',
    descripcion: 'Aguas negras en la via publica.',
  };

  assert.equal(principal(reporte).codigo, 'alcaldia_servicios_publicos');
});

test('no asigna categoria otro sin coincidencia clara', () => {
  const reporte = {
    tipo_contaminacion: 'otro',
    subcategoria: 'Sin clasificar',
    nivel_severidad: 'medio',
    titulo: 'Caso por revisar',
    descripcion: 'No hay informacion suficiente para decidir una entidad.',
  };

  assert.deepEqual(resolverAsignacionesEntidades(reporte), []);
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

test('solo permite entidades institucionales priorizadas para asignaciones manuales', () => {
  assert.deepEqual(ENTIDADES_INSTITUCIONALES_CODIGOS, [
    'bomberos',
    'corpoamazonia',
    'gestion_riesgo',
    'secretaria_salud',
    'alcaldia_servicios_publicos',
  ]);

  for (const codigo of ENTIDADES_INSTITUCIONALES_CODIGOS) {
    assert.equal(isEntidadInstitucionalPermitida(codigo), true);
  }

  assert.equal(isEntidadInstitucionalPermitida('gobernacion_putumayo'), false);
  assert.equal(isEntidadInstitucionalPermitida('parques_nacionales'), false);
});
