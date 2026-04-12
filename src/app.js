import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { notFoundHandler, errorHandler } from '../middlewares/errorHandler.js';
import healthRouter from '../routes/health.routes.js';
import authRouter from '../routes/auth.routes.js';
import reporteRouter from '../routes/reporte.routes.js';
import categoriaRouter from '../routes/categoria-riesgo.routes.js';
import adminRouter from '../routes/admin.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos subidos por los usuarios
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// rutas
app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/reportes', reporteRouter);
app.use('/categorias', categoriaRouter);
app.use('/admin', adminRouter);

 
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
