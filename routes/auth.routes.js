import { Router } from 'express';
import { verifyToken, verifyTokenWhenAllDevicesLogout } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';
import {
	authRateLimit,
	loginRateLimit,
	passwordResetRateLimit,
} from '../middlewares/rateLimit.middleware.js';
import {
	register,
	login,
	refreshAccessToken,
	exchangeOAuthCallbackCode,
	logout,
	forgotPassword,
	resetPassword,
	verifyEmail,
	getPerfil,
	updatePerfil,
	updateAvatar,
	changePassword,
	sendVerificationOtp,
	verifyEmailOtp,
	updateNotifications,
	googleLogin,
	googleAccessTokenLogin,
	googleCallback,
	getGoogleAuthUrl,
	facebookLogin,
	facebookCallback,
	getFacebookAuthUrl,
} from '../src/controllers/auth.controller.js';

const authRouter = Router();

authRouter.post('/register', authRateLimit, register);
authRouter.post('/login', loginRateLimit, login);
authRouter.post('/refresh', authRateLimit, refreshAccessToken);
authRouter.post('/oauth/exchange', authRateLimit, exchangeOAuthCallbackCode);
authRouter.post('/logout', authRateLimit, verifyTokenWhenAllDevicesLogout, logout);
authRouter.get('/verify-email', authRateLimit, verifyEmail);
authRouter.post('/forgot-password', passwordResetRateLimit, forgotPassword);
authRouter.post('/reset-password', passwordResetRateLimit, resetPassword);
authRouter.get('/perfil', verifyToken, getPerfil);
authRouter.patch('/perfil', verifyToken, updatePerfil);
authRouter.patch('/avatar', verifyToken, upload.single('avatar'), updateAvatar);
authRouter.patch('/cambiar-contrasena', passwordResetRateLimit, verifyToken, changePassword);
authRouter.patch('/notificaciones', verifyToken, updateNotifications);

// Rutas para verificación de email con OTP
authRouter.post('/enviar-verificacion', authRateLimit, verifyToken, sendVerificationOtp);
authRouter.post('/verificar-email', authRateLimit, verifyToken, verifyEmailOtp);

// Rutas para autenticación con Google OAuth
authRouter.get('/google/url', getGoogleAuthUrl);
authRouter.post('/google', authRateLimit, googleAccessTokenLogin);
authRouter.post('/google/login', authRateLimit, googleLogin);
authRouter.get('/google/callback', googleCallback);

// Rutas para autenticacion con Facebook OAuth (Authorization Code Flow)
authRouter.get('/facebook/url', getFacebookAuthUrl);
authRouter.post('/facebook', authRateLimit, facebookLogin);
authRouter.get('/facebook/callback', facebookCallback);

export default authRouter;
