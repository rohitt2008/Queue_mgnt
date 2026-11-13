import { Router } from 'express';
import {
  getQueues,
  getQueueById,
  createQueue,
  updateQueue,
  deleteQueue,
} from '../controllers/queueController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// Public / Display endpoints or authenticated manager endpoints
router.get('/', authenticate, getQueues);
router.get('/:id', getQueueById); // Also accessible by public display board / kiosk
router.post('/', authenticate, createQueue);
router.patch('/:id', authenticate, updateQueue);
router.delete('/:id', authenticate, deleteQueue);

export default router;
