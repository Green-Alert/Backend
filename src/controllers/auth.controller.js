import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  parseNotificationPreferences,
  UsuarioModel,
} from '../models/usuario.model.js';
import { RefreshTokenModel } from '../models/refresh-token.model.js';
import { errorResponse, successResponse } from '../utils/response.js';
import {
  enviarCorreo,
  enviarCorreoBienvenida,
  generarTemplateBaseCorreo,
} from '../services/email.service.js';
import { verifyGoogleToken, exchangeCodeForTokens, getGoogleUserInfo, generateAuthUrl } from '../services/google-oauth.service.js';
import {
  exchangeFacebookCodeForToken,
  generateFacebookAuthUrl,
  getFacebookUserInfo,
} from '../services/facebook-oauth.service.js';
import {
  consumeOAuthCallbackCode,
  createOAuthCallbackCode,
} from '../services/oauth-callback-code.service.js';
import { getApiPrefix } from '../config/api-prefix.config.js';
import { getCloudinaryConfig } from '../config/cloudinary.config.js';
import { deleteFileByPublicId, uploadFileBuffer } from '../services/cloudinary.service.js';

/**
 * ESTRATEGIA DE AUTENTICACIÓN CON FACEBOOK
 * ==========================================
 * Flujo único: Authorization Code Flow (lado del servidor)
 * 
 * 1. Frontend obtiene URL de autenticación en /facebook/url
 * 2. Usuario se autentica en Facebook
 * 3. Facebook redirige a /facebook/callback con código
 * 4. Backend intercambia código por token (seguro, lado servidor)
 * 5. Backend retorna JWT al cliente
 * 
 * Ventajas:
 * - Secret de Facebook nunca se expone al cliente
 * - Un único flujo consistente
 * - Cumple estándares OAuth 2.0
 * - Mejor seguridad
 */
import {
  validarNombreUsuario,
  validarTelefono,
  validarPassword,
} from '../utils/constantes-validacion.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_ACCESS_EXPIRES_IN = '15m';
const DEFAULT_REFRESH_EXPIRES_DAYS = 7;

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
};

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    const error = new Error('JWT_SECRET no configurado');
    error.statusCode = 500;
    throw error;
  }

  return process.env.JWT_SECRET;
};

const validateGeneratedToken = (token, secret, user) => {
  const decoded = jwt.verify(token, secret);

  if (
    Number(decoded.sub) !== Number(user.id_usuario) ||
    decoded.email !== user.email ||
    decoded.rol !== user.rol ||
    (user.id_entidad && Number(decoded.id_entidad) !== Number(user.id_entidad)) ||
    (user.uuid && decoded.uuid !== user.uuid)
  ) {
    const error = new Error('JWT generado no coincide con el usuario autenticado');
    error.statusCode = 500;
    throw error;
  }

  return decoded;
};

const buildToken = (user) => {
  const secret = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || DEFAULT_ACCESS_EXPIRES_IN;

  const token = jwt.sign(
    {
      sub: user.id_usuario,
      uuid: user.uuid,
      rol: user.rol,
      id_entidad: user.id_entidad ?? null,
      email: user.email,
    },
    secret,
    { expiresIn }
  );

  validateGeneratedToken(token, secret, user);

  return token;
};

const getRefreshExpiresDays = () => {
  const value = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_REFRESH_EXPIRES_DAYS;
};

const getRefreshTokenExpiration = () => {
  const exp = new Date();
  exp.setDate(exp.getDate() + getRefreshExpiresDays());
  return exp;
};

const buildRefreshToken = () => {
  const rawToken = crypto.randomBytes(64).toString('hex');
  return {
    rawToken,
    tokenHash: hashToken(rawToken),
    expiresAt: getRefreshTokenExpiration(),
  };
};

const createRefreshTokenForUser = async (user, req) => {
  const { rawToken, tokenHash, expiresAt } = buildRefreshToken();

  await RefreshTokenModel.create({
    id_usuario: user.id_usuario,
    token_hash: tokenHash,
    expires_at: expiresAt,
    user_agent: req.get('user-agent')?.slice(0, 255) || null,
    ip_address: req.ip || null,
  });

  return {
    refreshToken: rawToken,
    refreshTokenExpiresAt: expiresAt,
  };
};

const buildAuthPayload = async (user, req) => {
  const accessToken = buildToken(user);
  const refresh = await createRefreshTokenForUser(user, req);

  return {
    token: accessToken,
    accessToken,
    refreshToken: refresh.refreshToken,
    refreshTokenExpiresAt: refresh.refreshTokenExpiresAt,
    user: toPublicUser(user),
  };
};

const toPublicUser = (user) => ({
  id_usuario: user.id_usuario,
  uuid: user.uuid,
  nombre: user.nombre,
  apellido: user.apellido,
  email: user.email,
  rol: user.rol,
  id_entidad: user.id_entidad ?? null,
  activo: user.activo,
  email_verificado: user.email_verificado,
  avatar_url: user.avatar_url,
  telefono: user.telefono,
  es_oauth: Boolean(user.google_id || user.facebook_id || (
    typeof user.password_hash === 'string' && user.password_hash.startsWith('oauth:')
  )),
  notification_preferences: parseNotificationPreferences(user.notification_preferences),
  created_at: user.created_at,
});

const isDevelopment = () => process.env.NODE_ENV === 'development';

const buildFrontendAuthCallbackUrl = (authPayload) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const callbackCode = createOAuthCallbackCode(authPayload);
  const url = new URL('/auth/callback', frontendUrl);

  url.hash = `oauth_code=${encodeURIComponent(callbackCode)}`;

  return url.toString();
};

const redirectToFrontendAuthCallback = (res, authPayload) => {
  res.set({
    'Cache-Control': 'no-store',
    Pragma: 'no-cache',
    'Referrer-Policy': 'no-referrer',
  });

  return res.redirect(303, buildFrontendAuthCallbackUrl(authPayload));
};

const errorResponseWithDevelopmentDetails = (
  res,
  message,
  statusCode = 400,
  details = undefined
) => {
  if (!isDevelopment() || !details) {
    return errorResponse(res, message, statusCode);
  }

  return res.status(statusCode).json({
    status: 'error',
    message,
    details,
  });
};

const verifyPassword = (password, storedHash) => {
  if (typeof storedHash !== 'string' || !storedHash.includes(':')) {
    return false;
  }

  const [salt, key] = storedHash.split(':');
  if (!salt || !key) {
    return false;
  }

  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return key === derivedKey;
};

const RESET_TOKEN_MINUTES = 30;

const buildResetToken = () => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, tokenHash };
};

const buildResetLink = (token) => {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${baseUrl}/reset-password?token=${token}`;
};

const VERIFICATION_TOKEN_HOURS = 24;

const buildVerificationToken = () => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, tokenHash };
};

const getVerificationTokenExpiration = () => {
  const exp = new Date();
  exp.setHours(exp.getHours() + VERIFICATION_TOKEN_HOURS);
  return exp;
};

const buildEmailVerificationLink = (token) => {
  const apiBaseUrl = process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`;
  const apiPrefix = getApiPrefix();
  return `${apiBaseUrl}${apiPrefix}/auth/verify-email?token=${token}`;
};

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const buildOtpEmailHtml = ({ user, otpCode }) => generarTemplateBaseCorreo({
  title: 'Verifica tu correo',
  subtitle: 'Codigo de seguridad de GreenAlert',
  previewText: 'Usa este codigo de 6 digitos para activar tu cuenta.',
  content: `
    <div class="message">
      Hola ${user.nombre}, usa este codigo para verificar tu correo electronico en GreenAlert.
    </div>
    <div style="text-align:center;margin:28px 0;">
      <div style="display:inline-block;background:#ecfdf5;border:1px solid #10b981;border-radius:12px;padding:18px 24px;">
        <p style="margin:0 0 8px;color:#047857;font-size:13px;font-weight:600;">Codigo de verificacion</p>
        <p style="margin:0;color:#064e3b;font-size:36px;letter-spacing:8px;font-weight:800;">${otpCode}</p>
      </div>
    </div>
    <div class="panel">
      <h3>Seguridad</h3>
      <p>Este codigo expira en ${OTP_MINUTES} minutos. Si no creaste esta cuenta, ignora este correo.</p>
    </div>
  `,
});

const sendVerificationOtpEmail = async (user) => {
  const otpCode = generateOtpCode();
  const otpCodeHash = hashOtpCode(otpCode);
  const otpExp = new Date(Date.now() + OTP_MINUTES * 60 * 1000);

  await UsuarioModel.setOtp(user.id_usuario, otpCodeHash, otpExp);
  await UsuarioModel.updateOtpLastRequest(user.id_usuario);
  await enviarCorreo(
    user.email,
    'Codigo de verificacion - GreenAlert',
    buildOtpEmailHtml({ user, otpCode })
  );

  return {
    expiresIn: OTP_MINUTES * 60,
  };
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

    // Generar y enviar OTP automáticamente después del registro
    try {
      await sendVerificationOtpEmail(createdUser);
    } catch (emailError) {
      console.error('Error enviando verificacion en registro:', emailError);
      // No fallar el registro si falla el email, pero loguear el error
    }

    const authPayload = await buildAuthPayload(createdUser, req);

    // Enviar correo de bienvenida de forma no-bloqueante (fire-and-forget)
    enviarCorreoBienvenida(
      createdUser.email,
      createdUser.nombre,
      createdUser.apellido
    ).catch((error) => {
      console.error('Error al enviar correo de bienvenida:', error);
    });

    return successResponse(
      res,
      {
        ...authPayload,
        pendingEmailVerification: true,
      },
      'Cuenta creada correctamente. Verifica tu email con el codigo enviado.',
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

    if (!user.password_hash) {
      if (user.google_id || user.facebook_id) {
        return errorResponse(
          res,
          'Cuenta registrada con Google o Facebook. Inicia sesion con ese proveedor o crea una contrasena.',
          400
        );
      }

      return errorResponse(res, 'No se puede iniciar sesion con contrasena en este momento.', 400);
    }

    if (!verifyPassword(password, user.password_hash)) {
      return errorResponse(res, 'Credenciales incorrectas.', 401);
    }

    await UsuarioModel.updateUltimoAcceso(user.id_usuario);

    const authPayload = await buildAuthPayload(user, req);

    return successResponse(res, authPayload, 'Inicio de sesion exitoso.');
  } catch (error) {
    return next(error);
  }
};

export const refreshAccessToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body ?? {};

    if (typeof refreshToken !== 'string' || refreshToken.length < 32) {
      return errorResponse(res, 'Refresh token requerido.', 400);
    }

    const currentHash = hashToken(refreshToken);
    const current = await RefreshTokenModel.findActiveByHash(currentHash);

    if (!current) {
      return errorResponse(res, 'Refresh token invalido o expirado.', 401);
    }

    if (!current.activo) {
      await RefreshTokenModel.revokeByHash(currentHash);
      return errorResponse(res, 'Cuenta desactivada. Contacta al administrador.', 403);
    }

    const next = buildRefreshToken();
    const rotated = await RefreshTokenModel.rotate({
      current_hash: currentHash,
      next_hash: next.tokenHash,
      expires_at: next.expiresAt,
      user_agent: req.get('user-agent')?.slice(0, 255) || null,
      ip_address: req.ip || null,
    });

    if (!rotated) {
      return errorResponse(res, 'Refresh token invalido o expirado.', 401);
    }

    const accessToken = buildToken(current);

    return successResponse(
      res,
      {
        token: accessToken,
        accessToken,
        refreshToken: next.rawToken,
        refreshTokenExpiresAt: next.expiresAt,
        user: toPublicUser(current),
      },
      'Token renovado correctamente.'
    );
  } catch (error) {
    return next(error);
  }
};

export const exchangeOAuthCallbackCode = async (req, res, next) => {
  try {
    const { code } = req.body ?? {};
    const authPayload = consumeOAuthCallbackCode(code);

    if (!authPayload) {
      return errorResponse(res, 'Codigo OAuth invalido o expirado.', 400);
    }

    return successResponse(
      res,
      authPayload,
      'Autenticacion OAuth completada.',
      200
    );
  } catch (error) {
    return next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const { refreshToken, allDevices = false } = req.body ?? {};

    if (allDevices && !req.user?.sub) {
      return errorResponse(res, 'JWT requerido para cerrar sesion en todos los dispositivos.', 401);
    }

    if (allDevices) {
      await RefreshTokenModel.revokeAllForUser(req.user.sub);
      return successResponse(res, null, 'Sesion cerrada en todos los dispositivos.');
    }

    if (typeof refreshToken !== 'string' || refreshToken.length < 32) {
      return errorResponse(res, 'Refresh token requerido.', 400);
    }

    await RefreshTokenModel.revokeByHash(hashToken(refreshToken));
    return successResponse(res, null, 'Sesion cerrada correctamente.');
  } catch (error) {
    return next(error);
  }
};

export const getPerfil = async (req, res, next) => {
  try {
    const id_usuario = req.user?.sub;

    if (!id_usuario) {
      return errorResponse(res, 'No autorizado.', 401);
    }

    const user = await UsuarioModel.findByIdWithDetails(id_usuario);
    if (!user) {
      return errorResponse(res, 'Usuario no encontrado.', 404);
    }

    return successResponse(res, { user }, 'Perfil obtenido correctamente.', 200);
  } catch (error) {
    return next(error);
  }
};

export const updatePerfil = async (req, res, next) => {
  try {
    const id_usuario = req.user?.sub;

    if (!id_usuario) {
      return errorResponse(res, 'No autorizado.', 401);
    }

    const {
      nombre,
      apellido,
      telefono,
      avatar_url,
    } = req.body ?? {};

    if (!validarNombreUsuario(nombre)) {
      return errorResponse(res, 'El nombre no es valido.', 400);
    }

    if (!validarNombreUsuario(apellido)) {
      return errorResponse(res, 'El apellido no es valido.', 400);
    }

    if (!validarTelefono(telefono)) {
      return errorResponse(res, 'El telefono no tiene un formato valido.', 400);
    }

    const payload = {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      telefono: typeof telefono === 'string' ? (telefono.trim() || null) : null,
      avatar_url: typeof avatar_url === 'string' ? (avatar_url.trim() || null) : null,
    };

    const updatedUser = await UsuarioModel.updatePerfil(id_usuario, payload);
    if (!updatedUser) {
      return errorResponse(res, 'Usuario no encontrado.', 404);
    }

    return successResponse(res, { user: updatedUser }, 'Perfil actualizado', 200);
  } catch (error) {
    return next(error);
  }
};

export const updateAvatar = async (req, res, next) => {
  try {
    const id_usuario = req.user?.sub;

    if (!id_usuario) {
      return errorResponse(res, 'No autorizado.', 401);
    }

    if (!req.file) {
      return errorResponse(res, 'Imagen de avatar requerida.', 400);
    }

    const cloudinaryConfig = getCloudinaryConfig({ requireCredentials: true });
    const uploadResult = await uploadFileBuffer({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      folder: cloudinaryConfig.avatarFolder,
      publicId: `usuario-${id_usuario}-${Date.now()}`,
    });

    let updatedUser;
    try {
      updatedUser = await UsuarioModel.updateAvatar(id_usuario, uploadResult.secure_url);
    } catch (error) {
      await deleteFileByPublicId(uploadResult.public_id, {
        resourceType: uploadResult.resource_type || 'image',
      }).catch(() => {});
      throw error;
    }

    if (!updatedUser) {
      await deleteFileByPublicId(uploadResult.public_id, {
        resourceType: uploadResult.resource_type || 'image',
      }).catch(() => {});
      return errorResponse(res, 'Usuario no encontrado.', 404);
    }

    return successResponse(res, { user: updatedUser }, 'Avatar actualizado correctamente.', 200);
  } catch (error) {
    return next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const id_usuario = req.user?.sub;
    const tokenEmail = req.user?.email;

    if (!id_usuario) {
      return errorResponse(res, 'No autorizado.', 401);
    }

    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body ?? {};

    if (
      typeof currentPassword !== 'string' ||
      typeof newPassword !== 'string' ||
      typeof confirmPassword !== 'string'
    ) {
      return errorResponse(
        res,
        'currentPassword, newPassword y confirmPassword son obligatorios.',
        400
      );
    }

    if (newPassword !== confirmPassword) {
      return errorResponse(res, 'La nueva contrasena y la confirmacion no coinciden.', 400);
    }

    if (!validarPassword(newPassword)) {
      return errorResponse(res, 'La nueva contrasena no cumple con los requisitos de seguridad.', 400);
    }

    if (!tokenEmail) {
      return errorResponse(res, 'No autorizado.', 401);
    }

    const user = await UsuarioModel.findByEmail(tokenEmail);
    if (!user || Number(user.id_usuario) !== Number(id_usuario)) {
      return errorResponse(res, 'Usuario no encontrado.', 404);
    }

    if (!verifyPassword(currentPassword, user.password_hash)) {
      return errorResponse(res, 'La contrasena actual es incorrecta.', 401);
    }

    const newPasswordHash = hashPassword(newPassword);
    const updatedUser = await UsuarioModel.updatePassword(id_usuario, newPasswordHash);

    if (!updatedUser) {
      return errorResponse(res, 'Usuario no encontrado.', 404);
    }

    await RefreshTokenModel.revokeAllForUser(id_usuario);

    return successResponse(res, null, 'Contrasena actualizada. Se cerraron las sesiones activas.', 200);
  } catch (error) {
    return next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body ?? {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
      return errorResponse(res, 'Correo electronico invalido.', 400);
    }

    const user = await UsuarioModel.findByEmail(normalizedEmail);

    if (user && user.activo) {
      const { rawToken, tokenHash } = buildResetToken();
      const tokenExp = new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000);

      await UsuarioModel.setResetToken(user.id_usuario, tokenHash, tokenExp);

      const resetLink = buildResetLink(rawToken);
      const html = generarTemplateBaseCorreo({
        title: 'Recupera tu contrasena',
        subtitle: 'Solicitud de restablecimiento',
        previewText: 'Usa este enlace para crear una nueva contrasena.',
        actionUrl: resetLink,
        actionText: 'Restablecer contrasena',
        content: `
          <div class="message">
            Se recibio una solicitud para recuperar tu contrasena.
            Haz clic en el boton para crear una nueva contrasena.
          </div>
          <div class="panel">
            <h3>Seguridad</h3>
            <p>Este enlace expira en ${RESET_TOKEN_MINUTES} minutos. Si no solicitaste este cambio, ignora este correo.</p>
          </div>
        `,
      });

      await enviarCorreo(user.email, 'Recuperacion de contrasena', html);
    }

    return successResponse(
      res,
      null,
      'Si el correo existe, recibiras un enlace de recuperacion.'
    );
  } catch (error) {
    return next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword, confirmPassword } = req.body ?? {};

    if (typeof token !== 'string' || token.length < 10) {
      return errorResponse(res, 'Token invalido.', 400);
    }

    if (
      typeof newPassword !== 'string' ||
      typeof confirmPassword !== 'string'
    ) {
      return errorResponse(
        res,
        'newPassword y confirmPassword son obligatorios.',
        400
      );
    }

    if (newPassword !== confirmPassword) {
      return errorResponse(res, 'La nueva contrasena y la confirmacion no coinciden.', 400);
    }

    if (!validarPassword(newPassword)) {
      return errorResponse(res, 'La nueva contrasena no cumple con los requisitos de seguridad.', 400);
    }

    const tokenHash = hashToken(token);
    const user = await UsuarioModel.findByResetToken(tokenHash);

    if (!user || !user.token_reset_exp) {
      return errorResponse(res, 'Token invalido o expirado.', 400);
    }

    const expiresAt = new Date(user.token_reset_exp);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
      await UsuarioModel.clearResetToken(user.id_usuario);
      return errorResponse(res, 'Token invalido o expirado.', 400);
    }

    const newPasswordHash = hashPassword(newPassword);
    const updatedUser = await UsuarioModel.updatePassword(user.id_usuario, newPasswordHash);

    if (!updatedUser) {
      return errorResponse(res, 'Usuario no encontrado.', 404);
    }

    await UsuarioModel.clearResetToken(user.id_usuario);
    await RefreshTokenModel.revokeAllForUser(user.id_usuario);

    return successResponse(res, null, 'Contrasena actualizada correctamente. Se cerraron las sesiones activas.', 200);
  } catch (error) {
    return next(error);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query ?? {};

    if (typeof token !== 'string' || token.length < 10) {
      return errorResponse(res, 'Token de verificacion invalido.', 400);
    }

    const tokenHash = hashToken(token);
    const user = await UsuarioModel.findByEmailVerificationToken(tokenHash);

    if (!user || !user.email_verification_exp) {
      return errorResponse(res, 'Token de verificacion invalido o expirado.', 400);
    }

    if (user.email_verificado) {
      await UsuarioModel.clearEmailVerificationToken(user.id_usuario);
      return successResponse(res, null, 'El correo ya estaba verificado.', 200);
    }

    const expiresAt = new Date(user.email_verification_exp);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
      await UsuarioModel.clearEmailVerificationToken(user.id_usuario);
      return errorResponse(res, 'Token de verificacion invalido o expirado.', 400);
    }

    await UsuarioModel.verifyEmail(user.id_usuario);

    return successResponse(res, null, 'Correo verificado correctamente.', 200);
  } catch (error) {
    return next(error);
  }
};

// ============ HANDLERS PARA VERIFICACIÓN DE EMAIL CON OTP ============

const OTP_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const MAX_OTP_ATTEMPTS = 5;

// Genera un codigo OTP de 6 digitos con aleatoriedad criptografica.
export const generateOtpCode = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

// Hashea el código OTP con SHA-256
const hashOtpCode = (otpCode) => {
  return crypto.createHash('sha256').update(otpCode).digest('hex');
};

// Envía OTP por correo electrónico
export const sendVerificationOtp = async (req, res, next) => {
  try {
    const id_usuario = req.user?.sub;

    if (!id_usuario) {
      return errorResponse(res, 'No autorizado.', 401);
    }

    const user = await UsuarioModel.findById(id_usuario);
    if (!user) {
      return errorResponse(res, 'Usuario no encontrado.', 404);
    }

    // Si email ya está verificado, retorna 409
    if (user.email_verificado) {
      return errorResponse(res, 'El email ya está verificado.', 409);
    }

    // Verificar cooldown de 1 minuto entre reenvíos
    const lastRequest = await UsuarioModel.getOtpLastRequest(id_usuario);
    if (lastRequest) {
      const lastRequestTime = new Date(lastRequest).getTime();
      const timeDiffSeconds = (Date.now() - lastRequestTime) / 1000;
      if (timeDiffSeconds < OTP_RESEND_COOLDOWN_SECONDS) {
        const remainingSeconds = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - timeDiffSeconds);
        return errorResponse(
          res,
          `Por favor espera ${remainingSeconds} segundos antes de solicitar otro código.`,
          429
        );
      }
    }

    const otp = await sendVerificationOtpEmail(user);

    return successResponse(
      res,
      {
        message: `Codigo de verificacion enviado a ${user.email}`,
        expiresIn: otp.expiresIn,
      },
      'Codigo OTP enviado correctamente.',
      200
    );

    // Generar OTP
    const otpCode = generateOtpCode();
    const otpCodeHash = hashOtpCode(otpCode);
    const otpExp = new Date(Date.now() + OTP_MINUTES * 60 * 1000);

    // Guardar OTP hasheado en BD
    await UsuarioModel.setOtp(id_usuario, otpCodeHash, otpExp);
    await UsuarioModel.updateOtpLastRequest(id_usuario);

    // Generar plantilla HTML del email
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; text-align: center;">Verifica tu Correo Electrónico</h2>
        <p style="color: #666; font-size: 16px;">Hola ${user.nombre},</p>
        <p style="color: #666; font-size: 16px;">Se ha solicitado la verificación de tu correo electrónico en <strong>Green Alert</strong>.</p>
        
        <div style="background-color: #f5f5f5; border: 2px solid #007bff; border-radius: 8px; padding: 30px; margin: 30px 0; text-align: center;">
          <p style="color: #999; font-size: 14px; margin: 0 0 15px 0;">Tu código de verificación:</p>
          <h1 style="color: #007bff; font-size: 48px; letter-spacing: 10px; margin: 0;">${otpCode}</h1>
          <p style="color: #999; font-size: 14px; margin: 15px 0 0 0;">Este código expira en ${OTP_MINUTES} minutos</p>
        </div>
        
        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="color: #856404; margin: 0; font-size: 14px;">
            <strong>[SECURITY]</strong> Nunca compartas este código con nadie. El equipo de Green Alert nunca te pedirá este código.
          </p>
        </div>
        
        <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
          Si no solicitaste este código, por favor ignora este correo.
        </p>
      </div>
    `;

    await enviarCorreo(user.email, 'Código de Verificación de Correo - Green Alert', html);

    return successResponse(
      res,
      {
        message: `Código de verificación enviado a ${user.email}`,
        expiresIn: OTP_MINUTES * 60,
      },
      'Código OTP enviado correctamente.',
      200
    );
  } catch (error) {
    return next(error);
  }
};

// Verifica el OTP y marca el email como verificado
export const verifyEmailOtp = async (req, res, next) => {
  try {
    const id_usuario = req.user?.sub;

    if (!id_usuario) {
      return errorResponse(res, 'No autorizado.', 401);
    }

    const otp_code = req.body?.otp_code ?? req.body?.codigo;

    if (typeof otp_code !== 'string' || otp_code.length !== 6 || !/^\d{6}$/.test(otp_code)) {
      return errorResponse(res, 'El código OTP debe ser un número de 6 dígitos.', 400);
    }

    const user = await UsuarioModel.findById(id_usuario);
    if (!user) {
      return errorResponse(res, 'Usuario no encontrado.', 404);
    }

    // Si email ya está verificado, retorna 409
    if (user.email_verificado) {
      return errorResponse(res, 'El email ya está verificado.', 409);
    }

    // Verificar si hay un OTP pendiente
    const otpCodeHash = hashOtpCode(otp_code);
    const userWithOtp = await UsuarioModel.findByOtpHash(otpCodeHash);

    if (!userWithOtp || Number(userWithOtp.id_usuario) !== Number(id_usuario)) {
      await UsuarioModel.incrementOtpAttempts(id_usuario);
      return errorResponse(res, 'Código OTP incorrecto.', 400);
    }

    // Verificar expiración
    const expiresAt = new Date(userWithOtp.otp_exp).getTime();
    if (Number.isNaN(expiresAt) || expiresAt < Date.now()) {
      await UsuarioModel.clearOtp(id_usuario);
      return errorResponse(res, 'El código OTP ha expirado. Solicita uno nuevo.', 400);
    }

    // Verificar intentos fallidos
    if (userWithOtp.otp_attempts >= MAX_OTP_ATTEMPTS) {
      await UsuarioModel.clearOtp(id_usuario);
      return errorResponse(
        res,
        'Demasiados intentos fallidos. Se ha generado un nuevo código. Solicítalo nuevamente.',
        429
      );
    }

    // Marcar email como verificado
    await UsuarioModel.verifyEmail(id_usuario);
    
    // Limpiar OTP
    await UsuarioModel.clearOtp(id_usuario);

    const verifiedUser = await UsuarioModel.findByIdWithDetails(id_usuario);

    return successResponse(
      res,
      { user: toPublicUser(verifiedUser) },
      'Email verificado correctamente.',
      200
    );
  } catch (error) {
    return next(error);
  }
};

// ============ HANDLER PARA ACTUALIZAR PREFERENCIAS DE NOTIFICACIONES ============

export const updateNotifications = async (req, res, next) => {
  try {
    const id_usuario = req.user?.sub;
    if (!id_usuario) return errorResponse(res, 'No autorizado.', 401);

    const preferences = req.body?.preferences ?? req.body;
    if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) {
      return errorResponse(res, 'Las preferencias deben ser un objeto.', 400);
    }

    const validKeys = ['email_alerts', 'push_notifications', 'report_updates', 'weekly_summary'];
    const validatedPreferences = {};
    const invalidKeys = Object.keys(preferences).filter((key) => !validKeys.includes(key));

    if (invalidKeys.length > 0) {
      return errorResponse(
        res,
        `Preferencias no permitidas: ${invalidKeys.join(', ')}.`,
        400
      );
    }

    for (const key of validKeys) {
      if (key in preferences) validatedPreferences[key] = Boolean(preferences[key]);
    }

    if (Object.keys(validatedPreferences).length === 0) {
      return errorResponse(res, 'Debe enviar al menos una preferencia valida.', 400);
    }

    const user = await UsuarioModel.findByIdWithDetails(id_usuario);
    if (!user) {
      return errorResponse(res, 'Usuario no encontrado.', 404);
    }

    const notificationPreferences = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...(user.notification_preferences || {}),
      ...validatedPreferences,
    };

    const updatedUser = await UsuarioModel.updateNotificationPreferences(
      id_usuario,
      notificationPreferences
    );

    if (!updatedUser) {
      return errorResponse(res, 'Usuario no encontrado.', 404);
    }

    return successResponse(
      res,
      {
        preferences: updatedUser.notification_preferences,
        user: toPublicUser(updatedUser),
      },
      'Preferencias de notificaciones actualizadas.',
      200
    );
  } catch (error) {
    return next(error);
  }
};

// ============ MÉTODOS PARA AUTENTICACIÓN CON GOOGLE OAUTH ============

const findOrCreateGoogleUser = async ({ googleId, email, nombre, apellido, avatar_url }) => {
  if (!googleId || !email) {
    const error = new Error('No se recibio identificacion completa de Google.');
    error.statusCode = 400;
    throw error;
  }

  let user = googleId ? await UsuarioModel.findByGoogleId(googleId) : null;

  if (!user) {
    user = await UsuarioModel.findByEmail(email);

    if (user?.google_id && user.google_id !== googleId) {
      const error = new Error('El correo ya esta vinculado a otra cuenta de Google.');
      error.statusCode = 409;
      throw error;
    }

    if (user && !user.google_id && googleId) {
      await UsuarioModel.updateGoogleId(user.id_usuario, googleId);
      user.google_id = googleId;
    }
  }

  if (user) {
    if (!user.activo) {
      const error = new Error('Cuenta desactivada. Contacta al administrador.');
      error.statusCode = 403;
      throw error;
    }

    await UsuarioModel.updateUltimoAcceso(user.id_usuario);
    return user;
  }

  const idUsuario = await UsuarioModel.createFromGoogle({
    google_id: googleId,
    email,
    nombre: nombre || '',
    apellido: apellido || '',
    avatar_url,
  });

  if (!idUsuario) {
    return null;
  }

  return UsuarioModel.findById(idUsuario);
};

export const googleLogin = async (req, res, next) => {
  try {
    const { id_token } = req.body ?? {};

    if (!id_token || typeof id_token !== 'string') {
      return errorResponse(res, 'El id_token de Google es requerido.', 400);
    }

    // Verificar token de Google
    const googleVerification = await verifyGoogleToken(id_token);
    if (!googleVerification.success) {
      return errorResponse(res, 'Token de Google inválido.', 401);
    }

    const {
      googleId,
      email,
      nombre,
      apellido,
      avatar_url,
      email_verified,
    } = googleVerification;

    let user;
    try {
      user = await findOrCreateGoogleUser({
        googleId,
        email,
        nombre,
        apellido,
        avatar_url,
      });
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.message, error.statusCode);
      }
      throw error;
    }

    if (!user) {
      return errorResponse(res, 'No fue posible crear la cuenta con este correo.', 400);
    }

    // Generar JWT
    const authPayload = await buildAuthPayload(user, req);

    return successResponse(
      res,
      authPayload,
      'Autenticación con Google exitosa.',
      200
    );
  } catch (error) {
    return next(error);
  }
};

export const googleAccessTokenLogin = async (req, res, next) => {
  try {
    const { access_token, id_token } = req.body ?? {};

    if (id_token) {
      req.body.id_token = id_token;
      return googleLogin(req, res, next);
    }

    if (!access_token || typeof access_token !== 'string') {
      return errorResponse(res, 'El access_token de Google es requerido.', 400);
    }

    const googleUser = await getGoogleUserInfo(access_token);
    if (!googleUser.success) {
      return errorResponse(res, 'No fue posible obtener informacion de Google.', 401);
    }

    let user;
    try {
      user = await findOrCreateGoogleUser(googleUser);
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.message, error.statusCode);
      }
      throw error;
    }

    if (!user) {
      return errorResponse(res, 'No fue posible crear la cuenta con este correo.', 400);
    }

    const authPayload = await buildAuthPayload(user, req);

    return successResponse(
      res,
      authPayload,
      'Autenticacion con Google exitosa.',
      200
    );
  } catch (error) {
    return next(error);
  }
};

export const googleCallback = async (req, res, next) => {
  try {
    const { code } = req.query ?? {};

    if (!code || typeof code !== 'string') {
      return errorResponse(res, 'Código de autorización de Google requerido.', 400);
    }

    // Intercambiar código por tokens
    const tokenExchange = await exchangeCodeForTokens(code);
    if (!tokenExchange.success) {
      return errorResponse(res, 'No fue posible intercambiar el código de Google.', 400);
    }

    const { tokens } = tokenExchange;
    const { id_token, access_token } = tokens;

    if (!id_token && !access_token) {
      return errorResponse(res, 'No se recibieron tokens de Google.', 400);
    }

    // Obtener información del usuario
    let googleUser;
    
    if (id_token) {
      const verification = await verifyGoogleToken(id_token);
      if (!verification.success) {
        return errorResponse(res, 'Token de Google inválido.', 401);
      }
      googleUser = verification;
    } else {
      const userInfo = await getGoogleUserInfo(access_token);
      if (!userInfo.success) {
        return errorResponse(res, 'No fue posible obtener información de Google.', 400);
      }
      googleUser = userInfo;
    }

    const {
      googleId,
      email,
      nombre,
      apellido,
      avatar_url,
    } = googleUser;

    let user;
    try {
      user = await findOrCreateGoogleUser({
        googleId,
        email,
        nombre,
        apellido,
        avatar_url,
      });
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.message, error.statusCode);
      }
      throw error;
    }

    if (!user) {
      return errorResponse(res, 'No fue posible crear la cuenta con este correo.', 400);
    }

    // Generar JWT
    const authPayload = await buildAuthPayload(user, req);

    return redirectToFrontendAuthCallback(res, authPayload);
  } catch (error) {
    return next(error);
  }
};

export const getGoogleAuthUrl = async (req, res, next) => {
  try {
    const result = generateAuthUrl();

    if (!result.success) {
      return errorResponse(res, 'No fue posible generar la URL de autenticación de Google.', 500);
    }

    return successResponse(
      res,
      {
        authUrl: result.authUrl,
        configured: result.isConfigured,
      },
      'URL de autenticación generada exitosamente.',
      200
    );
  } catch (error) {
    return next(error);
  }
};

// ============ METODOS PARA AUTENTICACION CON FACEBOOK OAUTH ============

const findOrCreateFacebookUser = async ({ facebookId, email, nombre, apellido, avatar_url }) => {
  if (!facebookId || !email) {
    const error = new Error('No se recibio identificacion completa de Facebook.');
    error.statusCode = 400;
    throw error;
  }

  let user = await UsuarioModel.findByFacebookId(facebookId);

  if (!user) {
    user = await UsuarioModel.findByEmail(email);

    if (user?.facebook_id && user.facebook_id !== facebookId) {
      const error = new Error('El correo ya esta vinculado a otra cuenta de Facebook.');
      error.statusCode = 409;
      throw error;
    }

    if (user && !user.facebook_id) {
      await UsuarioModel.updateFacebookId(user.id_usuario, facebookId);
      user.facebook_id = facebookId;
    }
  }

  if (user) {
    if (!user.activo) {
      const error = new Error('Cuenta desactivada. Contacta al administrador.');
      error.statusCode = 403;
      throw error;
    }

    await UsuarioModel.updateUltimoAcceso(user.id_usuario);
    return user;
  }

  const idUsuario = await UsuarioModel.createFromFacebook({
    facebook_id: facebookId,
    email,
    nombre: nombre || '',
    apellido: apellido || '',
    avatar_url,
  });

  if (!idUsuario) {
    return null;
  }

  return UsuarioModel.findById(idUsuario);
};

export const getFacebookAuthUrl = async (req, res, next) => {
  try {
    const result = generateFacebookAuthUrl();

    if (!result.success) {
      return errorResponse(res, 'No fue posible generar la URL de autenticacion con Facebook.', 500);
    }

    return successResponse(
      res,
      { authUrl: result.authUrl },
      'URL de autenticacion con Facebook generada correctamente.',
      200
    );
  } catch (error) {
    return next(error);
  }
};

export const facebookLogin = async (req, res, next) => {
  try {
    const { code, access_token } = req.body ?? {};

    let accessToken = access_token;
    if (!accessToken) {
      if (!code || typeof code !== 'string') {
        return errorResponse(res, 'Codigo de autorizacion de Facebook requerido.', 400);
      }

      const tokenExchange = await exchangeFacebookCodeForToken(code);
      if (!tokenExchange.success) {
        return errorResponseWithDevelopmentDetails(
          res,
          'No fue posible intercambiar el codigo de Facebook.',
          400,
          tokenExchange.facebookError || tokenExchange.error
        );
      }
      accessToken = tokenExchange.accessToken;
    }

    const facebookUser = await getFacebookUserInfo(accessToken);
    if (!facebookUser.success) {
      return errorResponseWithDevelopmentDetails(
        res,
        'No fue posible obtener informacion de Facebook.',
        400,
        facebookUser.facebookError || facebookUser.error
      );
    }

    let user;
    try {
      user = await findOrCreateFacebookUser(facebookUser);
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.message, error.statusCode);
      }
      throw error;
    }

    if (!user) {
      return errorResponse(res, 'No fue posible autenticar con Facebook.', 400);
    }

    const authPayload = await buildAuthPayload(user, req);
    return successResponse(res, authPayload, 'Inicio de sesion con Facebook exitoso.', 200);
  } catch (error) {
    return next(error);
  }
};

export const facebookCallback = async (req, res, next) => {
  try {
    const { code } = req.query ?? {};

    if (!code || typeof code !== 'string') {
      return errorResponse(res, 'Codigo de autorizacion de Facebook requerido.', 400);
    }

    const tokenExchange = await exchangeFacebookCodeForToken(code);
    if (!tokenExchange.success) {
      return errorResponseWithDevelopmentDetails(
        res,
        'No fue posible intercambiar el codigo de Facebook.',
        400,
        tokenExchange.facebookError || tokenExchange.error
      );
    }

    const facebookUser = await getFacebookUserInfo(tokenExchange.accessToken);
    if (!facebookUser.success) {
      return errorResponseWithDevelopmentDetails(
        res,
        'No fue posible obtener informacion de Facebook.',
        400,
        facebookUser.facebookError || facebookUser.error
      );
    }

    let user;
    try {
      user = await findOrCreateFacebookUser(facebookUser);
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.message, error.statusCode);
      }
      throw error;
    }

    if (!user) {
      return errorResponse(res, 'No fue posible autenticar con Facebook.', 400);
    }

    const authPayload = await buildAuthPayload(user, req);
    const publicUser = authPayload.user;
    const callbackResponseMode = (process.env.FACEBOOK_CALLBACK_RESPONSE || '').toLowerCase();
    const shouldRedirect = callbackResponseMode === 'redirect' || (
      callbackResponseMode !== 'json' && !isDevelopment()
    );

    if (!shouldRedirect) {
      return successResponse(
        res,
        {
          token: authPayload.accessToken,
          accessToken: authPayload.accessToken,
          refreshToken: authPayload.refreshToken,
          refreshTokenExpiresAt: authPayload.refreshTokenExpiresAt,
          user: publicUser,
        },
        'Inicio de sesion con Facebook exitoso.',
        200
      );
    }

    return redirectToFrontendAuthCallback(res, {
      ...authPayload,
      user: publicUser,
    });
  } catch (error) {
    return next(error);
  }
};
