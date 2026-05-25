import test from 'node:test';
import assert from 'node:assert/strict';
import { CategoriaRiesgoModel } from '../../src/models/categoria-riesgo.model.js';

test('CategoriaRiesgoModel.esValido retorna true cuando la categoria existe y esta activa', async (t) => {
  t.mock.method(CategoriaRiesgoModel, 'findByCodigo', async (codigo) => ({
    codigo,
    activo: 1,
  }));

  assert.equal(await CategoriaRiesgoModel.esValido('inundacion'), true);
  assert.equal(CategoriaRiesgoModel.findByCodigo.mock.callCount(), 1);
});

test('CategoriaRiesgoModel.esValido retorna false cuando la categoria no existe o esta inactiva', async (t) => {
  t.mock.method(CategoriaRiesgoModel, 'findByCodigo', async () => null);

  assert.equal(await CategoriaRiesgoModel.esValido('categoria_inexistente'), false);
});

test('CategoriaRiesgoModel.esValido retorna false cuando findByCodigo devuelve categoria inactiva', async (t) => {
  t.mock.method(CategoriaRiesgoModel, 'findByCodigo', async (codigo) => ({
    codigo,
    activo: 0,
  }));

  assert.equal(await CategoriaRiesgoModel.esValido('inundacion'), false);
});

test('CategoriaRiesgoModel.findByCodigo consulta solo categorias activas', () => {
  const source = CategoriaRiesgoModel.findByCodigo.toString();

  assert.match(source, /WHERE cr\.codigo = \? AND cr\.activo = 1/);
});
