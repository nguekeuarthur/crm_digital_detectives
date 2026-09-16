import { Router } from 'express';
import { getSessions, getSessionMessages } from './chat.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';

const router = Router();

// Toutes les routes de chat (côté CRM) nécessitent d'être admin ou enquêteur
router.use(authenticate);
router.use(authorize('ADMIN', 'ENQUETEUR'));

router.get('/sessions', getSessions);
router.get('/sessions/:id', getSessionMessages);

export default router;
