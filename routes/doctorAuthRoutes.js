import express from 'express';
import {
  doctorSignup,
  verifyDoctorOTP,
  completeDoctorSignup,
  doctorLogin,
  doctorLogout,
  doctorGoogleLogin,
  doctorGoogleCallback,
  fetchDoctorData,
  getRawDoctorProfile,
  getDoctorDashboard,
  getDoctorAppointmentsMock,
  getDoctorAppointmentsByDoctorId,
} from '../controllers/doctorAuthController.js';
import { saveDoctorSchedule, getDoctorSchedule, getDoctorSlotsFromJson } from '../controllers/doctorScheduleController.js';
import { authenticateDoctor } from '../middleware/doctorAuth.js';

const router = express.Router();

router.post('/send-otp', doctorSignup);
router.post('/verify-otp', verifyDoctorOTP);
router.post('/signup', completeDoctorSignup);
router.post('/login', doctorLogin);
router.post('/logout', doctorLogout);
router.get("/google", doctorGoogleLogin);
router.get("/google/callback", doctorGoogleCallback);
router.get("/profile", authenticateDoctor, fetchDoctorData);
router.get("/raw-profile", getRawDoctorProfile);
router.get("/schedule", authenticateDoctor, getDoctorSchedule);
router.post("/schedule", authenticateDoctor, saveDoctorSchedule);
router.get("/slots/:doctorId", getDoctorSlotsFromJson);
router.get("/dashboard", getDoctorDashboard);
router.get("/appointments", getDoctorAppointmentsMock);
router.get("/appointments/:doctorId", getDoctorAppointmentsByDoctorId);
router.get("/:doctorId", fetchDoctorData);

export default router;
