import { Router } from 'express';
import { verifyToken, requireRoles } from '../middlewares/auth.middleware.js';
import {
  listarUsuarios,
  statsUsuarios,
  obtenerUsuario,
  cambiarRol,
  cambiarEstado,
  eliminarUsuario,
} from '../src/controllers/admin.controller.js';

const adminRouter = Router();

adminRouter.use(verifyToken, requireRoles('admin'));

adminRouter.get('/usuarios/stats', statsUsuarios);
adminRouter.get('/usuarios', listarUsuarios);
adminRouter.get('/usuarios/:id', obtenerUsuario);
adminRouter.patch('/usuarios/:id/rol', cambiarRol);
adminRouter.patch('/usuarios/:id/estado', cambiarEstado);
adminRouter.delete('/usuarios/:id', eliminarUsuario);

export default adminRouter;
