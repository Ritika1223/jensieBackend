import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
} from '../controllers/userController.js';

const router = express.Router();

// All user routes require authentication
/* The line `router.use(authenticate);` is adding the `authenticate` middleware function to the router.
This means that every route defined after this line will first go through the `authenticate`
middleware function before reaching the route handler. In this case, it ensures that all user routes
defined below this line will require authentication before being accessed. */
router.use(authenticate);

router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);
router.delete('/profile/:userId', requireAdmin, deleteUserProfile);

export default router;

