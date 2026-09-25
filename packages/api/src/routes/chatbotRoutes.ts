import { Router } from 'express';
import { initChatSession, handleChatMessage, calculateDevis } from '../controllers/chatbotController';

const router = Router();

router.post('/init', initChatSession);
router.post('/message', handleChatMessage);
router.post('/calculate', calculateDevis);

export default router;
