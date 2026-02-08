import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  bookAppointment,
  getUserAppointments,
  getDoctorAppointments,
  cancelAppointment,
  getAppointmentById,
} from '../controllers/appointmentController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Book an appointment
router.post('/', bookAppointment);

// Get user's appointments
router.get('/', getUserAppointments);

// Get single appointment by ID
router.get('/:appointmentId', getAppointmentById);

// Cancel appointment
router.patch('/:appointmentId/cancel', cancelAppointment);

// Get doctor's appointments
router.get('/doctor/:doctorId', getDoctorAppointments);

export default router;

