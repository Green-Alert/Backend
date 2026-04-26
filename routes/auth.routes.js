import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import {
	register,
	login,
	forgotPassword,
	resetPassword,
	getPerfil,
	updatePerfil,
	changePassword,
	sendVerificationOtp,
	verifyEmailOtp,
	updateNotifications,
	googleLogin,
	googleCallback,
	getGoogleAuthUrl,
} from '../src/controllers/auth.controller.js';

const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/reset-password', resetPassword);
authRouter.get('/perfil', verifyToken, getPerfil);
authRouter.patch('/perfil', verifyToken, updatePerfil);
authRouter.patch('/cambiar-contrasena', verifyToken, changePassword);
authRouter.patch('/notificaciones', verifyToken, updateNotifications);

// Rutas para verificación de email con OTP
authRouter.post('/enviar-verificacion', verifyToken, sendVerificationOtp);
authRouter.post('/verificar-email', verifyToken, verifyEmailOtp);

// Rutas para autenticación con Google OAuth
authRouter.get('/google/url', getGoogleAuthUrl);
authRouter.post('/google/login', googleLogin);
authRouter.get('/google/callback', googleCallback);

export default authRouter;
