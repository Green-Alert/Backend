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
	sendVerificationEmail,
	verifyEmail,
} from '../src/controllers/auth.controller.js';

const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/reset-password', resetPassword);
authRouter.post('/send-verification-email', verifyToken, sendVerificationEmail);
authRouter.get('/verify-email', verifyEmail);
authRouter.get('/perfil', verifyToken, getPerfil);
authRouter.patch('/perfil', verifyToken, updatePerfil);
authRouter.patch('/cambiar-contrasena', verifyToken, changePassword);

export default authRouter;
