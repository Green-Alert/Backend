import test from 'node:test';
import assert from 'node:assert/strict';
import { generateOtpCode } from '../../src/controllers/auth.controller.js';

test('generateOtpCode genera codigos OTP de 6 digitos', () => {
  for (let index = 0; index < 100; index += 1) {
    const code = generateOtpCode();

    assert.match(code, /^\d{6}$/);
    assert.ok(Number(code) >= 100000);
    assert.ok(Number(code) <= 999999);
  }
});

test('generateOtpCode genera multiples valores sin romper el formato', () => {
  const codes = Array.from({ length: 50 }, () => generateOtpCode());

  assert.equal(codes.length, 50);
  assert.ok(codes.every((code) => /^\d{6}$/.test(code)));
});
