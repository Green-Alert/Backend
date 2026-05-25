import test from 'node:test';
import assert from 'node:assert/strict';
import { generarTemplateBaseCorreo } from '../../src/services/email.service.js';

test('generarTemplateBaseCorreo incluye titulo, subtitulo y contenido', () => {
  const html = generarTemplateBaseCorreo({
    title: 'Verificacion',
    subtitle: 'Cuenta',
    previewText: 'Previsualizacion',
    content: '<p>Contenido seguro</p>',
  });

  assert.match(html, /Verificacion/);
  assert.match(html, /Cuenta/);
  assert.match(html, /Previsualizacion/);
  assert.match(html, /Contenido seguro/);
});

test('generarTemplateBaseCorreo escapa datos controlados por parametros', () => {
  const html = generarTemplateBaseCorreo({
    title: '<script>alert(1)</script>',
    subtitle: '"subtitulo"',
    previewText: '<preview>',
    content: '<p>Contenido interno</p>',
    actionUrl: 'https://example.com?a=<x>',
    actionText: 'Click <aqui>',
  });

  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /&quot;subtitulo&quot;/);
  assert.match(html, /Click &lt;aqui&gt;/);
  assert.match(html, /https:\/\/example\.com\?a=&lt;x&gt;/);
});
