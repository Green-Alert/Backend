import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { UsuarioModel } from '../models/usuario.model.js';
import { errorResponse, successResponse } from '../utils/response.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
};

const buildToken = (user) => {
  if (!process.env.JWT_SECRET) {
    const error = new Error('JWT_SECRET no configurado ');
    error.statusCode = 500;
    throw error;
  }

  return jwt.sign(
    {
      sub: user.id_usuario,
      uuid: user.uuid,
      rol: user.rol,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const toPublicUser = (user) => ({
  id_usuario: user.id_usuario,
  uuid: user.uuid,
  nombre: user.nombre,
  apellido: user.apellido,
  email: user.email,
  rol: user.rol,
  activo: user.activo,
  email_verificado: user.email_verificado,
  avatar_url: user.avatar_url,
  telefono: user.telefono,
  created_at: user.created_at,
});

const verifyPassword = (password, storedHash) => {
  const [salt, key] = storedHash.split(':');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return key === derivedKey;
};

export const register = async (req, res, next) => {
  try {
    const { nombre, apellido, email, password, telefono } = req.body ?? {};

    const normalizedNombre  = typeof nombre   === 'string' ? nombre.trim()   : '';
    const normalizedApellido = typeof apellido === 'string' ? apellido.trim() : '';
    const normalizedEmail   = typeof email    === 'string' ? email.trim().toLowerCase() : '';
    const normalizedTelefono = typeof telefono === 'string' ? telefono.trim() : null;

    if (!normalizedNombre || normalizedNombre.length < 2) {
      return errorResponse(res, 'El nombre debe tener al menos 2 caracteres.', 400);
    }

    if (!normalizedApellido || normalizedApellido.length < 2) {
      return errorResponse(res, 'El apellido debe tener al menos 2 caracteres.', 400);
    }

    if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
      return errorResponse(res, 'Correo electronico invalido.', 400);
    }

    if (typeof password !== 'string' || password.length < 8) {
      return errorResponse(res, 'La contrasena debe tener al menos 8 caracteres.', 400);
    }

    const existingUser = await UsuarioModel.findByEmail(normalizedEmail);
    if (existingUser) {
      return errorResponse(res, 'Ya existe una cuenta registrada con ese correo.', 409);
    }

    const password_hash = hashPassword(password);

    const idUsuario = await UsuarioModel.create({
      nombre: normalizedNombre,
      apellido: normalizedApellido,
      email: normalizedEmail,
      password_hash,
      rol: 'ciudadano',
      telefono: normalizedTelefono || null,
    });

    const createdUser = await UsuarioModel.findById(idUsuario);
    if (!createdUser) {
      return errorResponse(res, 'No fue posible recuperar el usuario recien creado.', 500);
    }

    const token = buildToken(createdUser);

    return successResponse(
      res,
      {
        token,
        user: toPublicUser(createdUser),
      },
      'Cuenta creada correctamente.',
      201
    );
  } catch (error) {
    return next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
      return errorResponse(res, 'Correo electronico invalido.', 400);
    }

    if (typeof password !== 'string' || password.length < 1) {
      return errorResponse(res, 'Contrasena requerida.', 400);
    }

    const user = await UsuarioModel.findByEmail(normalizedEmail);
    if (!user) {
      return errorResponse(res, 'Credenciales incorrectas.', 401);
    }

    if (!user.activo) {
      return errorResponse(res, 'Cuenta desactivada. Contacta al administrador.', 403);
    }

    if (!verifyPassword(password, user.password_hash)) {
      return errorResponse(res, 'Credenciales incorrectas.', 401);
    }

    await UsuarioModel.updateUltimoAcceso(user.id_usuario);

    const token = buildToken(user);

    return successResponse(res, { token, user: toPublicUser(user) }, 'Inicio de sesion exitoso.');
  } catch (error) {
    return next(error);
  }
};
