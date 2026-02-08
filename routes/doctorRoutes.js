import express from 'express';
import {
  getAffordableDoctors,
  getNearbyDoctors,
  getAllDoctors,
  getDoctorById,
  createDoctor,
  getDoctorByEmail,
  updateDoctor,
  deleteDoctor,
} from '../controllers/doctorController.js';
import { authenticate } from '../middleware/auth.js';
import { checkAllowedEmails } from '../middleware/checkAllowedEmails.js';

const router = express.Router();

// Public routes - no authentication required
router.get('/affordable', getAffordableDoctors);
router.get('/nearby', getNearbyDoctors);
router.get('/all', getAllDoctors);
// Protected route - must come before /:id route
router.get('/by-email', authenticate, checkAllowedEmails, getDoctorByEmail);
// Public route - get by ID
router.get('/:id', getDoctorById);

// Protected routes - requires authentication and allowed email
router.post('/', authenticate, checkAllowedEmails, createDoctor);
router.put('/:id', authenticate, checkAllowedEmails, updateDoctor);
router.delete('/:id', authenticate, checkAllowedEmails, deleteDoctor);

export default router;

