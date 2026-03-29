import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { testConnection } from './config/database.js';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await testConnection();

  app.listen(PORT, () => {
    console.log(`servidor corriendo en http://localhost:${PORT}`);
  });
};

startServer();
