import { verifyToken } from '../utils/jwt.js';
import DoctorAuth from '../models/DoctorAuth.js';

/** Middleware to authenticate doctor from JWT token */
export const authenticateDoctor = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyToken(token);
    if (decoded.role !== 'doctor') {
      return res.status(403).json({ error: 'Doctor access required' });
    }

    const doctorId = decoded.id || decoded.userId;
    const doctor = await DoctorAuth.findById(doctorId);
    if (!doctor) {
      return res.status(401).json({ error: 'Doctor not found' });
    }

    req.doctorId = doctorId;
    req.doctor = doctor;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
