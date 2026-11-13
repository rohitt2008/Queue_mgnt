import { Router } from 'express';
import {
  addToken,
  getQueueTokens,
  moveToken,
  serveTopToken,
  completeToken,
  cancelToken,
  reorderTokens,
} from '../controllers/tokenController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// Tokens in a queue
router.get('/queue/:queueId', getQueueTokens); // Public / Display or Manager
router.post('/queue/:queueId', addToken); // Manager adds token or Kiosk customer adds
router.post('/queue/:queueId/serve-top', authenticate, serveTopToken); // Req 6: Assign token at top for service
router.post('/queue/:queueId/reorder', authenticate, reorderTokens);

// Single token operations
router.patch('/:id/move', authenticate, moveToken); // Req 5: Move tokens up and down
router.post('/:id/complete', authenticate, completeToken);
router.post('/:id/cancel', authenticate, cancelToken); // Req 7: Cancel a token

export default router;
