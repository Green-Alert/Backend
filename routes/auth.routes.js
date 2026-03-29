import { Router } from 'express';
import { register, login } from '../src/controllers/auth.controller.js';

const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);

export default authRouter;
