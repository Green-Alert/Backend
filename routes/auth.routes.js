import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import {
	register,
	login,
	getPerfil,
	updatePerfil,
	changePassword,
} from '../src/controllers/auth.controller.js';

const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.get('/perfil', verifyToken, getPerfil);
authRouter.patch('/perfil', verifyToken, updatePerfil);
authRouter.patch('/cambiar-contrasena', verifyToken, changePassword);

export default authRouter;
