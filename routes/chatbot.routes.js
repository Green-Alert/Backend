import { Router } from 'express';
import {
  enviarMensajeChatbot,
  obtenerFaqsChatbot,
} from '../src/controllers/chatbot.controller.js';
import { optionalAuth } from '../middlewares/auth.middleware.js';

const chatbotRouter = Router();

chatbotRouter.post('/mensaje', optionalAuth, enviarMensajeChatbot);
chatbotRouter.get('/faqs', obtenerFaqsChatbot);

export default chatbotRouter;
