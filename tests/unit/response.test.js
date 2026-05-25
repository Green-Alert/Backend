import test from 'node:test';
import assert from 'node:assert/strict';
import { errorResponse, successResponse } from '../../src/utils/response.js';

const createMockResponse = () => {
  const res = {
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
  };

  return res;
};

test('successResponse responde con estado success, mensaje y data', () => {
  const res = createMockResponse();
  const data = { id: 1 };

  successResponse(res, data, 'creado', 201);

  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body, {
    status: 'success',
    message: 'creado',
    data,
  });
});

test('successResponse usa valores por defecto', () => {
  const res = createMockResponse();

  successResponse(res, { ok: true });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    status: 'success',
    message: 'ok',
    data: { ok: true },
  });
});

test('errorResponse responde con estado error y mensaje', () => {
  const res = createMockResponse();

  errorResponse(res, 'no autorizado', 401);

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, {
    status: 'error',
    message: 'no autorizado',
  });
});

test('errorResponse usa valores por defecto', () => {
  const res = createMockResponse();

  errorResponse(res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, {
    status: 'error',
    message: 'error',
  });
});
