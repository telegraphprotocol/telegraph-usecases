import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import * as userController from '../controllers/user.controller';
import * as walletController from '../controllers/wallet.controller';
import * as polymarketController from '../controllers/polymarket.controller';
import * as subscriptionController from '../controllers/subscription.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireActiveSubscription } from '../middlewares/subscription.middleware';

const router = Router();

// Public routes
router.get('/health', (req, res) => res.json({ status: 'active', network: 'Polygon', protocol: 'Telegraph' }));
router.get('/auth/message', authController.getMessage);
router.post('/auth/verify', authController.verify);
router.get('/polymarket/search', polymarketController.searchMarkets);
router.post('/pipeline/test-run', polymarketController.runDecisionPipeline);

// Protected routes
router.get('/auth/status', authenticate, authController.getStatus);
router.get('/user/status', authenticate, userController.getStatus);
router.post('/wallet/create', authenticate, walletController.createWallet);
router.post('/subscription/activate', authenticate, subscriptionController.activate);
router.get('/subscription/status', authenticate, subscriptionController.status);
router.get('/pipeline/history', authenticate, polymarketController.getDecisionHistory);
router.post('/bot/toggle', authenticate, (req, res, next) => {
  if (req.body?.enabled === true) {
    return requireActiveSubscription(req, res, next);
  }
  return next();
}, userController.setBotStatus);

export default router;
