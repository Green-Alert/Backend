import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { UsuarioModel } from '../models/usuario.model.js';
import { errorResponse, successResponse } from '../utils/response.js';
import { enviarCorreo, enviarCorreoBienvenida, enviarCorreoVerificacion } from '../services/email.service.js';
import { verifyGoogleToken, exchangeCodeForTokens, getGoogleUserInfo } from '../services/google-oauth.service.js';
import {
  validarNombreUsuario,
  validarTelefono,
  validarPassword,
} from '../utils/constantes-validacion.js';

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
      const otpCode = generateOtpCode();
      const otpCodeHash = hashOtpCode(otpCode);
      const otpExp = new Date(Date.now() + OTP_MINUTES * 60 * 1000);

      // Guardar OTP hasheado en BD
      await UsuarioModel.setOtp(idUsuario, otpCodeHash, otpExp);
      await UsuarioModel.updateOtpLastRequest(idUsuario);

      // Generar plantilla HTML del email
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; text-align: center;">¡Bienvenido a Green Alert!</h2>
          <p style="color: #666; font-size: 16px;">Hola ${createdUser.nombre},</p>
          <p style="color: #666; font-size: 16px;">Tu cuenta ha sido creada correctamente. Por favor verifica tu correo electrónico para completar el registro.</p>
          
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
            Si no creaste esta cuenta, por favor ignora este correo.
          </p>
        </div>
      `;

      await enviarCorreo(createdUser.email, 'Verifica tu Correo - Green Alert', html);
    } catch (emailError) {
      console.error('Error enviando OTP en registro:', emailError);
      // No fallar el registro si falla el email, pero loguear el error
    }

    const token = buildToken(createdUser);

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
        token,
        user: toPublicUser(createdUser),
        pendingEmailVerification: true,
      },
      'Cuenta creada correctamente. Verifica tu email con el código enviado.',
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

    return successResponse(res, null, 'Contrasena actualizada', 200);
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
      const html = `
        <p>Se recibio una solicitud para recuperar tu contrasena.</p>
        <p>Haz clic en el siguiente enlace para crear una nueva contrasena:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>Este enlace expira en ${RESET_TOKEN_MINUTES} minutos.</p>
      `;

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

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await UsuarioModel.findByResetToken(tokenHash);

    if (!user || !user.token_reset_exp) {
      return errorResponse(res, 'Token invalido o expirado.', 400);
    }

    const expiresAt = new Date(user.token_reset_exp);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
      return errorResponse(res, 'Token invalido o expirado.', 400);
    }

    const newPasswordHash = hashPassword(newPassword);
    const updatedUser = await UsuarioModel.updatePassword(user.id_usuario, newPasswordHash);

    if (!updatedUser) {
      return errorResponse(res, 'Usuario no encontrado.', 404);
    }

    await UsuarioModel.clearResetToken(user.id_usuario);

    return successResponse(res, null, 'Contrasena actualizada correctamente.', 200);
  } catch (error) {
    return next(error);
  }
};

// ============ HANDLERS PARA VERIFICACIÓN DE EMAIL CON OTP ============

const OTP_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const MAX_OTP_ATTEMPTS = 5;

// Genera un código OTP de 6 dígitos aleatorio
const generateOtpCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
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

    const { otp_code } = req.body ?? {};

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

    const { preferences } = req.body ?? {};
    if (!preferences || typeof preferences !== 'object')
      return errorResponse(res, 'Las preferencias deben ser un objeto.', 400);

    // Validar estructura de preferencias
    const validKeys = ['email_alerts', 'push_notifications', 'report_updates', 'weekly_summary'];
    const validatedPreferences = {};
    for (const key of validKeys) {
      if (key in preferences) validatedPreferences[key] = Boolean(preferences[key]);
    }

    return successResponse(
      res,
      { preferences: validatedPreferences },
      'Preferencias de notificaciones actualizadas.',
      200
    );
  } catch (error) {
    return next(error);
  }
};

// ============ MÉTODOS PARA AUTENTICACIÓN CON GOOGLE OAUTH ============

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

    // Buscar usuario existente por email o googleId
    let user = await UsuarioModel.findByEmail(email);

    if (user) {
      // Usuario existe con email, actualizar googleId si no lo tiene
      if (!user.google_id && googleId) {
        await UsuarioModel.updateGoogleId(user.id_usuario, googleId);
      }
      // Actualizar último acceso
      await UsuarioModel.updateUltimoAcceso(user.id_usuario);
    } else {
      // Crear nuevo usuario desde Google
      const idUsuario = await UsuarioModel.createFromGoogle({
        google_id: googleId,
        email,
        nombre: nombre || '',
        apellido: apellido || '',
        avatar_url,
      });

      if (!idUsuario) {
        return errorResponse(res, 'No fue posible crear la cuenta con este correo.', 400);
      }

      user = await UsuarioModel.findById(idUsuario);
    }

    if (!user) {
      return errorResponse(res, 'Error al procesar la autenticación con Google.', 500);
    }

    // Generar JWT
    const token = buildToken(user);

    return successResponse(
      res,
      { 
        token,
        user: toPublicUser(user),
      },
      'Autenticación con Google exitosa.',
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

    // Buscar o crear usuario
    let user = await UsuarioModel.findByEmail(email);

    if (user) {
      if (!user.google_id && googleId) {
        await UsuarioModel.updateGoogleId(user.id_usuario, googleId);
      }
      await UsuarioModel.updateUltimoAcceso(user.id_usuario);
    } else {
      const idUsuario = await UsuarioModel.createFromGoogle({
        google_id: googleId,
        email,
        nombre: nombre || '',
        apellido: apellido || '',
        avatar_url,
      });

      if (!idUsuario) {
        return errorResponse(res, 'No fue posible crear la cuenta con este correo.', 400);
      }

      user = await UsuarioModel.findById(idUsuario);
    }

    if (!user) {
      return errorResponse(res, 'Error al procesar la autenticación con Google.', 500);
    }

    // Generar JWT
    const token = buildToken(user);

    // Redirigir al frontend con el token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(toPublicUser(user)))}`;

    return res.redirect(redirectUrl);
  } catch (error) {
    return next(error);
  }
};
