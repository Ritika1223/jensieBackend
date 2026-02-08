import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import DoctorAuth from '../models/DoctorAuth.js';
import DoctorOTP from '../models/DoctorOTP.js';
import sendOtp from '../services/sendOtp.js';
import { generateToken } from '../utils/jwtt.js';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from "google-auth-library";

/* Generate 6-digit OTP */
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

/* Load raw doctor profile data for frontend DoctorProfileMain */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let DOCTOR_PROFILE_RAW = { default: {} };
try {
  const rawPath = path.join(__dirname, '../data/doctorProfileRaw.json');
  const rawContent = fs.readFileSync(rawPath, 'utf-8');
  DOCTOR_PROFILE_RAW = JSON.parse(rawContent);
} catch (e) {
  console.warn('doctorProfileRaw.json not found or invalid, using empty profile data:', e?.message);
}

/* Load raw doctor appointments from JSON (dates: today, tomorrow, day_after_tomorrow) */
let DOCTOR_APPOINTMENTS_RAW = [];
try {
  const aptPath = path.join(__dirname, '../data/doctorAppointmentsRaw.json');
  const aptContent = fs.readFileSync(aptPath, 'utf-8');
  const aptJson = JSON.parse(aptContent);
  DOCTOR_APPOINTMENTS_RAW = Array.isArray(aptJson.appointments) ? aptJson.appointments : [];
} catch (e) {
  console.warn('doctorAppointmentsRaw.json not found or invalid:', e?.message);
}

/* Load raw doctor dashboard (revenue, analytics) */
let DOCTOR_DASHBOARD_RAW = { revenue: {}, analytics: {} };
try {
  const dashPath = path.join(__dirname, '../data/doctorDashboardRaw.json');
  const dashContent = fs.readFileSync(dashPath, 'utf-8');
  DOCTOR_DASHBOARD_RAW = JSON.parse(dashContent);
} catch (e) {
  console.warn('doctorDashboardRaw.json not found or invalid:', e?.message);
}

function resolveAppointmentDates(appointments) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);
  const dateMap = {
    today: today.toISOString().split('T')[0],
    tomorrow: tomorrow.toISOString().split('T')[0],
    day_after_tomorrow: dayAfter.toISOString().split('T')[0],
  };
  return appointments.map((apt) => {
    const label = apt.dateLabel || 'today';
    const dateStr = dateMap[label] || dateMap.today;
    const { dateLabel, ...rest } = apt;
    return { ...rest, date: dateStr };
  });
}

const getGoogleClient = () => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth env vars missing");
  }

  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI ||
      "http://localhost:3000/api/doctor/google/callback"
  );
};
/**
 * SEND OTP
 */
export const doctorSignup = async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;

    if (!firstName || !lastName || !phone) {
      return res.status(400).json({ error: 'First name, last name & phone are required' });
    }

    const existingDoctor = await DoctorAuth.findOne({ phone });
    if (existingDoctor) {
      return res.status(400).json({ error: 'Doctor already registered' });
    }

    const otp = generateOTP();

    await DoctorOTP.findOneAndUpdate(
      { phone },
      {
        phone,
        otp,
        verified: false,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        attempts: 0,
      },
      { upsert: true, new: true }
    );

    const sent = await sendOtp(phone, otp);
    if (!sent) {
      return res.status(500).json({ error: 'Failed to send OTP' });
    }

    res.json({
      success: true,
      message: 'OTP sent successfully',
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * VERIFY OTP & CREATE DOCTOR
 */
export const verifyDoctorOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP are required' });
    }

    const otpRecord = await DoctorOTP.findOne({ phone });
    if (!otpRecord) {
      return res.status(400).json({ error: 'OTP not found' });
    }

    if (new Date() > otpRecord.expiresAt) {
      await DoctorOTP.deleteOne({ phone });
      return res.status(400).json({ error: 'OTP expired' });
    }

    if (otpRecord.otp !== otp) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    otpRecord.verified = true;
    await otpRecord.save();

    res.json({
      success: true,
      message: 'OTP verified successfully',
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const completeDoctorSignup = async (req, res) => {
  try {
    const { firstName, lastName, phone, email, password } = req.body;

    if (!firstName || !lastName || !phone || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }


    const existingDoctor = await DoctorAuth.findOne({ phone });
    if (existingDoctor) {
      return res.status(400).json({ error: 'Doctor already exists' });
    }

    const doctor = await DoctorAuth.create({
      firstName,
      lastName,
      phone,
      email,
      password, // 🔐 hashed by schema
      role: 'doctor',
    });

    await DoctorOTP.deleteOne({ phone });

    const token = generateToken(doctor._id, phone, 'doctor');

    res.status(201).json({
      success: true,
      message: 'Signup completed successfully',
      token,
      doctorId: doctor._id,
    });
  } catch (error) {
    console.error('Complete signup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const doctorLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // 🔑 IMPORTANT: select password
    const doctor = await DoctorAuth.findOne({ email }).select("+password");

    if (!doctor) {
      return res.status(400).json({ error: "Account does not exist" });
    }

    if (!doctor.password) {
      return res.status(400).json({
        error: "Account created via OTP. Please reset password.",
      });
    }

    const isMatch = await bcrypt.compare(password, doctor.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = generateToken(doctor._id, doctor.phone, "doctor");

    res.json({
      success: true,
      message: "Login successful",
      token,
      doctorId: doctor._id,
    });
  } catch (error) {
    console.error("Doctor login error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const doctorLogout = (req, res) => {
  // This assumes token is in the client, or possibly in an httpOnly cookie
  // If the token is in a cookie, clear it, else tell the client to remove it
  // You may tailor this to your auth method (JWT usually has no server-side session/state)
  try {
    // If using cookies for JWT
    if (req.cookies && req.cookies.token) {
      res.clearCookie('token', {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production', // adjust as desired
      });
    }
    return res.json({ success: true, message: 'Logout successful' });
  } catch (err) {
    console.error('Doctor logout error:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
};

export const doctorGoogleLogin = (req, res) => {
  try {
    const client = getGoogleClient();

    const url = client.generateAuthUrl({
      access_type: "offline",
      scope: ["profile", "email"],
      prompt: "consent",
    });

    res.redirect(url);
  } catch (err) {
    console.error("Doctor Google login error:", err);
    res.redirect(
      `${process.env.FRONTEND_URL}/doctor-login?error=google_login_failed`
    );
  }
};

/**
 * 🔹 GOOGLE CALLBACK → LOGIN ONLY
 */
export const doctorGoogleCallback = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) throw new Error("No code");

    const client = getGoogleClient();

    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) throw new Error("Email not found");

    const { sub: googleId, email, given_name, family_name } = payload;

    // 🔎 FIND DOCTOR (LOGIN ONLY)
    const doctor = await DoctorAuth.findOne({
      email: email.toLowerCase(),
    });

    if (!doctor) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/doctor-login?error=doctor_not_registered`
      );
    }

    // 🔗 Link googleId if missing
    if (!doctor.googleId) {
      doctor.googleId = googleId;
      await doctor.save();
    }

    const token = generateToken(doctor._id, doctor.phone, "doctor");
    const doctorId = String(doctor._id);

    res.redirect(
      `${process.env.FRONTEND_URL}/doctor-login?token=${token}&doctorId=${doctorId}`
    );
  } catch (error) {
    console.error("Doctor Google callback error:", error);
    res.redirect(
      `${process.env.FRONTEND_URL}/doctor-login?error=google_login_failed`
    );
  }
};

/**
 * Get raw default doctor profile (no auth required) – for DoctorsProfilePage fallback
 */
export const getRawDoctorProfile = (req, res) => {
  try {
    const raw = DOCTOR_PROFILE_RAW.default || {};
    res.json({ success: true, doctor: raw, data: raw });
  } catch (error) {
    console.error('Get raw doctor profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Get doctor dashboard data (revenue, analytics) from JSON
 */
export const getDoctorDashboard = (req, res) => {
  try {
    res.json({ success: true, data: DOCTOR_DASHBOARD_RAW });
  } catch (error) {
    console.error('Get doctor dashboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Fetch doctor data from DoctorAuth model merged with raw profile data
 * Expects doctorId in req.params.doctorId or req.body.doctorId
 */
export const fetchDoctorData = async (req, res) => {
  try {
    const doctorId = req.doctorId || req.params.doctorId || req.body?.doctorId || req.query?.doctorId;
    if (!doctorId) {
      return res.status(400).json({ error: 'Doctor ID is required' });
    }

    const doctor = await DoctorAuth.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const data = doctor.toObject();
    const idStr = String(doctorId);

    /* Merge raw profile: real doctor identity from DB, rest from JSON */
    const rawProfile = DOCTOR_PROFILE_RAW[idStr] || DOCTOR_PROFILE_RAW.default || {};
    const { name: _rawName, firstName: _rawFirst, lastName: _rawLast, ...rawRest } = rawProfile;
    const merged = {
      ...rawRest,
      _id: data._id,
      doctorId: data._id,
      firstName: data.firstName,
      lastName: data.lastName,
      name: `${(data.firstName || '').trim()} ${(data.lastName || '').trim()}`.trim() || _rawName,
      phone: data.phone,
      email: data.email,
      role: data.role,
      googleId: data.googleId,
      createdAt: data.createdAt,
    };

    res.json({
      success: true,
      doctor: merged,
      data: merged,
    });
  } catch (error) {
    console.error('Fetch doctor data error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Get doctor appointments (raw mock data – today, tomorrow, day after tomorrow)
 * Query: ?date=YYYY-MM-DD to filter by date (default: all)
 */
export const getDoctorAppointmentsMock = async (req, res) => {
  try {
    const resolved = resolveAppointmentDates(DOCTOR_APPOINTMENTS_RAW);
    const dateFilter = req.query.date;
    let data = resolved;
    if (dateFilter) {
      data = resolved.filter((apt) => apt.date === dateFilter);
    }
    res.json({
      success: true,
      data,
      pagination: { page: 1, limit: 50, total: data.length, totalPages: 1 },
    });
  } catch (error) {
    console.error('Get doctor appointments mock error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Get appointments for a particular doctor by ID
 * Returns raw appointments (doctorId "*" matches any doctor, or exact doctorId match)
 */
export const getDoctorAppointmentsByDoctorId = async (req, res) => {
  try {
    const { doctorId } = req.params;
    if (!doctorId) {
      return res.status(400).json({ error: 'Doctor ID is required' });
    }

    const resolved = resolveAppointmentDates(DOCTOR_APPOINTMENTS_RAW);
    const appointments = resolved.filter(
      (apt) => apt.doctorId === '*' || apt.doctorId === doctorId || apt.doctorId === doctorId.toString()
    );

    res.json({
      success: true,
      doctorId,
      data: appointments,
      pagination: { page: 1, limit: 50, total: appointments.length, totalPages: Math.ceil(appointments.length / 50) || 1 },
    });
  } catch (error) {
    console.error('Get doctor appointments by ID error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};