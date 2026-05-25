import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePositiveIdParam } from '../../middlewares/validate-id.middleware.js';

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

test('validatePositiveIdParam permite enteros positivos', () => {
  const req = { params: { id: '42' } };
  const res = createResponse();
  let nextCalled = false;

  validatePositiveIdParam('id')(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.params.id, '42');
  assert.equal(res.statusCode, null);
});

test('validatePositiveIdParam rechaza IDs invalidos', () => {
  const invalidIds = ['0', '-1', '1.5', 'abc', 'NaN', '', ' 1 '];

  for (const id of invalidIds) {
    const req = { params: { id } };
    const res = createResponse();
    let nextCalled = false;

    validatePositiveIdParam('id')(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, {
      status: 'error',
      message: 'id invalido. Debe ser un entero positivo.',
    });
  }
});
