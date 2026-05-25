import test from 'node:test';
import assert from 'node:assert/strict';
import {
  actualizarCategoria,
  cambiarEstadoCategoria,
  crearCategoria,
} from '../../src/controllers/categoria-riesgo.controller.js';
import { CategoriaRiesgoModel } from '../../src/models/categoria-riesgo.model.js';

const createResponse = () => ({
  statusCode: null,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

test('crearCategoria crea una categoria valida', async (t) => {
  let findCalls = 0;
  t.mock.method(CategoriaRiesgoModel, 'findByCodigoIncludingInactive', async (codigo) => {
    findCalls += 1;
    if (findCalls === 1) {
      assert.equal(codigo, 'calidad_aire');
      return null;
    }

    return {
      id_categoria: 10,
      codigo,
      nombre: 'Calidad del aire',
      activo: 1,
    };
  });
  t.mock.method(CategoriaRiesgoModel, 'create', async () => 10);

  const req = {
    body: {
      codigo: ' Calidad_Aire ',
      nombre: 'Calidad del aire',
      descripcion: 'Reportes sobre contaminacion atmosferica',
      color_hex: '#16a34a',
      activo: true,
    },
  };
  const res = createResponse();
  const next = t.mock.fn();

  await crearCategoria(req, res, next);

  assert.equal(res.statusCode, 201);
  assert.equal(CategoriaRiesgoModel.create.mock.callCount(), 1);
  assert.deepEqual(CategoriaRiesgoModel.create.mock.calls[0].arguments[0], {
    codigo: 'calidad_aire',
    nombre: 'Calidad del aire',
    descripcion: 'Reportes sobre contaminacion atmosferica',
    color_hex: '#16a34a',
    activo: true,
  });
  assert.equal(next.mock.callCount(), 0);
});

test('crearCategoria rechaza codigo duplicado', async (t) => {
  t.mock.method(CategoriaRiesgoModel, 'findByCodigoIncludingInactive', async () => ({
    codigo: 'inundacion',
  }));
  t.mock.method(CategoriaRiesgoModel, 'create', async () => {
    throw new Error('No debe crear categorias duplicadas');
  });

  const req = {
    body: {
      codigo: 'inundacion',
      nombre: 'Inundacion',
    },
  };
  const res = createResponse();
  const next = t.mock.fn();

  await crearCategoria(req, res, next);

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.message, 'Ya existe una categoria con ese codigo.');
  assert.equal(CategoriaRiesgoModel.create.mock.callCount(), 0);
  assert.equal(next.mock.callCount(), 0);
});

test('actualizarCategoria actualiza metadata permitida', async (t) => {
  t.mock.method(CategoriaRiesgoModel, 'findByCodigoIncludingInactive', async (codigo) => ({
    id_categoria: 5,
    codigo,
    nombre: 'Categoria existente',
    activo: 1,
  }));
  t.mock.method(CategoriaRiesgoModel, 'updateByCodigo', async () => true);

  const req = {
    params: { codigo: 'inundacion' },
    body: {
      nombre: 'Inundaciones',
      color_hex: '#2563eb',
      nivel_prioridad_default: 2,
    },
  };
  const res = createResponse();
  const next = t.mock.fn();

  await actualizarCategoria(req, res, next);

  assert.equal(res.statusCode, 200);
  assert.equal(CategoriaRiesgoModel.updateByCodigo.mock.callCount(), 1);
  assert.equal(CategoriaRiesgoModel.updateByCodigo.mock.calls[0].arguments[0], 'inundacion');
  assert.deepEqual(CategoriaRiesgoModel.updateByCodigo.mock.calls[0].arguments[1], {
    nombre: 'Inundaciones',
    color_hex: '#2563eb',
    nivel_prioridad_default: 2,
  });
  assert.equal(next.mock.callCount(), 0);
});

test('cambiarEstadoCategoria activa o desactiva categoria', async (t) => {
  t.mock.method(CategoriaRiesgoModel, 'findByCodigoIncludingInactive', async (codigo) => ({
    id_categoria: 5,
    codigo,
    nombre: 'Inundacion',
    activo: 0,
  }));
  t.mock.method(CategoriaRiesgoModel, 'updateActivoByCodigo', async () => true);

  const req = {
    params: { codigo: 'inundacion' },
    body: { activo: false },
  };
  const res = createResponse();
  const next = t.mock.fn();

  await cambiarEstadoCategoria(req, res, next);

  assert.equal(res.statusCode, 200);
  assert.equal(CategoriaRiesgoModel.updateActivoByCodigo.mock.callCount(), 1);
  assert.deepEqual(CategoriaRiesgoModel.updateActivoByCodigo.mock.calls[0].arguments, [
    'inundacion',
    false,
  ]);
  assert.equal(next.mock.callCount(), 0);
});
