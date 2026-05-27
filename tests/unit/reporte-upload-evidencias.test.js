import test from 'node:test';
import assert from 'node:assert/strict';
import { fileFilter } from '../../middlewares/upload.middleware.js';
import { createReporte } from '../../src/controllers/reporte.controller.js';
import { CategoriaRiesgoModel } from '../../src/models/categoria-riesgo.model.js';
import { EvidenciaModel } from '../../src/models/evidencia.model.js';
import { ReporteModel } from '../../src/models/reporte.model.js';
import { AsignacionEntidadesService } from '../../src/services/asignacion-entidades.service.js';

const EMPTY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

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

const createFile = (index, mimetype = 'image/png') => ({
  mimetype,
  filename: `evidencia-${index}.${mimetype.startsWith('video/') ? 'mp4' : 'png'}`,
  originalname: `original-${index}.${mimetype.startsWith('video/') ? 'mp4' : 'png'}`,
  size: 1024 + index,
});

const createRequest = (files = [], bodyOverrides = {}) => ({
  user: { sub: 7 },
  body: {
    tipo_contaminacion: 'agua',
    nivel_severidad: 'alto',
    subcategoria: 'rio_contaminado',
    titulo: 'Reporte con evidencias',
    descripcion: 'Descripcion del reporte',
    direccion: 'Calle 10',
    municipio: 'Valledupar',
    departamento: 'Cesar',
    latitud: 10.45,
    longitud: -73.25,
    ...bodyOverrides,
  },
  files: {
    files,
  },
});

const mockSuccessfulCreate = (t) => {
  t.mock.method(CategoriaRiesgoModel, 'esValido', async () => true);
  t.mock.method(ReporteModel, 'create', async () => 15);
  t.mock.method(ReporteModel, 'findById', async () => ({
    id_reporte: 15,
    tipo_contaminacion: 'agua',
    subcategoria: 'rio_contaminado',
    estado: 'pendiente',
  }));
  t.mock.method(ReporteModel, 'updateIaAnalysis', async () => true);
  t.mock.method(EvidenciaModel, 'create', async () => 1);
  t.mock.method(AsignacionEntidadesService, 'asignarEntidadesAReporte', async () => []);
};

test('createReporte guarda multiples imagenes con metadata y orden', async (t) => {
  mockSuccessfulCreate(t);

  const req = createRequest([createFile(0), createFile(1), createFile(2)]);
  const res = createResponse();
  const next = t.mock.fn();

  await createReporte(req, res, next);

  assert.equal(res.statusCode, 201);
  assert.equal(EvidenciaModel.create.mock.callCount(), 3);
  assert.deepEqual(EvidenciaModel.create.mock.calls[1].arguments[0], {
    id_reporte: 15,
    id_usuario: 7,
    tipo_archivo: 'imagen',
    url_archivo: '/uploads/evidencia-1.png',
    nombre_original: 'original-1.png',
    mime_type: 'image/png',
    tamano_bytes: 1025,
    hash_sha256: EMPTY_SHA256,
    orden: 1,
  });
  assert.equal(ReporteModel.create.mock.calls[0].arguments[0].subcategoria, 'rio_contaminado');
  assert.equal(typeof ReporteModel.create.mock.calls[0].arguments[0].confianza_evidencia, 'number');
  assert.equal(next.mock.callCount(), 0);
});

test('createReporte permite hasta 10 archivos en files', async (t) => {
  mockSuccessfulCreate(t);

  const req = createRequest(Array.from({ length: 10 }, (_, index) => createFile(index)));
  const res = createResponse();
  const next = t.mock.fn();

  await createReporte(req, res, next);

  assert.equal(res.statusCode, 201);
  assert.equal(EvidenciaModel.create.mock.callCount(), 10);
  assert.equal(EvidenciaModel.create.mock.calls[9].arguments[0].orden, 9);
  assert.equal(next.mock.callCount(), 0);
});

test('createReporte rechaza mas de 10 evidencias antes de crear reporte', async (t) => {
  t.mock.method(CategoriaRiesgoModel, 'esValido', async () => {
    throw new Error('No debe validar categoria con mas de 10 evidencias');
  });
  t.mock.method(ReporteModel, 'create', async () => {
    throw new Error('No debe insertar reportes con mas de 10 evidencias');
  });
  t.mock.method(EvidenciaModel, 'create', async () => {
    throw new Error('No debe insertar evidencias con mas de 10 archivos');
  });

  const req = createRequest(Array.from({ length: 11 }, (_, index) => createFile(index)));
  const res = createResponse();
  const next = t.mock.fn();

  await createReporte(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Solo puedes adjuntar hasta 10 evidencias por reporte.');
  assert.equal(ReporteModel.create.mock.callCount(), 0);
  assert.equal(EvidenciaModel.create.mock.callCount(), 0);
  assert.equal(next.mock.callCount(), 0);
});

test('createReporte permite un video por reporte', async (t) => {
  mockSuccessfulCreate(t);

  const req = createRequest([
    createFile(0, 'image/webp'),
    createFile(1, 'video/mp4'),
  ]);
  const res = createResponse();
  const next = t.mock.fn();

  await createReporte(req, res, next);

  assert.equal(res.statusCode, 201);
  assert.equal(EvidenciaModel.create.mock.callCount(), 2);
  assert.equal(EvidenciaModel.create.mock.calls[1].arguments[0].tipo_archivo, 'video');
  assert.equal(EvidenciaModel.create.mock.calls[1].arguments[0].mime_type, 'video/mp4');
});

test('createReporte rechaza dos videos antes de crear reporte', async (t) => {
  t.mock.method(CategoriaRiesgoModel, 'esValido', async () => {
    throw new Error('No debe validar categoria con dos videos');
  });
  t.mock.method(ReporteModel, 'create', async () => {
    throw new Error('No debe insertar reportes con dos videos');
  });
  t.mock.method(EvidenciaModel, 'create', async () => {
    throw new Error('No debe insertar evidencias con dos videos');
  });

  const req = createRequest([
    createFile(0, 'video/mp4'),
    createFile(1, 'video/quicktime'),
  ]);
  const res = createResponse();
  const next = t.mock.fn();

  await createReporte(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Solo puedes adjuntar un video por reporte.');
  assert.equal(ReporteModel.create.mock.callCount(), 0);
  assert.equal(EvidenciaModel.create.mock.callCount(), 0);
  assert.equal(next.mock.callCount(), 0);
});

test('fileFilter rechaza mime invalido como error 400', () => {
  let callbackError;
  let accepted;

  fileFilter(
    {},
    { mimetype: 'application/pdf' },
    (error, value) => {
      callbackError = error;
      accepted = value;
    }
  );

  assert.equal(callbackError.statusCode, 400);
  assert.equal(callbackError.message, 'Tipo de archivo no permitido. Solo imagenes y videos.');
  assert.equal(accepted, undefined);
});
