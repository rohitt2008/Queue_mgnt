import { Router } from 'express';
import { getQueueAnalytics } from '../controllers/analyticsController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.get('/:queueId?', authenticate, getQueueAnalytics);

export default router;
