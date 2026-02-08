import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import DoctorDailySchedule from '../models/DoctorDailySchedule.js';
import TimeSlot from '../models/TimeSlot.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SLOTS_JSON_PATH = path.join(__dirname, '../data/doctorSlotsRaw.json');

function readSlotsJson() {
  try {
    const raw = fs.readFileSync(SLOTS_JSON_PATH, 'utf-8');
    const data = JSON.parse(raw);
    return data.slots || {};
  } catch {
    return {};
  }
}

function writeSlotsToJson(doctorIdStr, dateStr, slotList) {
  const slots = readSlotsJson();
  if (!slots[doctorIdStr]) slots[doctorIdStr] = {};
  slots[doctorIdStr][dateStr] = slotList;
  fs.writeFileSync(SLOTS_JSON_PATH, JSON.stringify({ slots }, null, 2), 'utf-8');
}

/**
 * Convert frontend time format { h, m, period } to 24h "HH:MM"
 */
function to24h({ h = 9, m = 0, period = 'AM' }) {
  let hour = Number(h) || 9;
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
}

/**
 * Generate time slots from opening/closing/slotDuration (frontend format)
 */
function generateSlotsFromConfig(openingHour, closingHour, slotDuration = 15) {
  const parse = ({ h, m, period }) => {
    let hour = Number(h) || 9;
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    return hour * 60 + (Number(m) || 0);
  };

  let startMin = parse(openingHour);
  let endMin = parse(closingHour);
  if (startMin > endMin) endMin += 24 * 60;

  const slots = [];
  for (let min = startMin; min < endMin; min += slotDuration) {
    const hour = Math.floor(min / 60) % 24;
    const mm = min % 60;
    const period = hour < 12 ? 'AM' : 'PM';
    const showHour = hour % 12 === 0 ? 12 : hour % 12;
    const label = `${showHour}:${String(mm).padStart(2, '0')} ${period}`;
    const timeStr = `${String(hour).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    slots.push({ label, timeStr });
  }
  return slots;
}

// Morning: 7 AM–12 PM | Afternoon: 12 PM–4 PM | Evening: 4 PM–7 PM | Night: 7 PM–12 AM
const getPeriodFromHour = (hour) => {
  if (hour >= 7 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 16) return 'Afternoon';
  if (hour >= 16 && hour < 19) return 'Evening';
  return 'Night';
};

/**
 * Save schedule for a specific date (authenticated doctor)
 * POST /api/doctor/schedule
 * Body: { date, openingHour, closingHour, slotDuration, isDayAvailable, slotAvailability }
 */
export const saveDoctorSchedule = async (req, res) => {
  try {
    const doctorId = req.doctorId || req.user?.id || req.user?._id;
    if (!doctorId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const {
      date,
      openingHour,
      closingHour,
      slotDuration = 15,
      isDayAvailable = true,
      slotAvailability = {},
    } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const docId = mongoose.Types.ObjectId.isValid(doctorId)
      ? new mongoose.Types.ObjectId(doctorId)
      : doctorId;

    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);

    const opening24 = openingHour ? to24h(openingHour) : '09:00';
    const closing24 = closingHour ? to24h(closingHour) : '17:00';

    const slotMap = new Map();
    if (slotAvailability && typeof slotAvailability === 'object') {
      Object.entries(slotAvailability).forEach(([k, v]) => {
        slotMap.set(k, !!v);
      });
    }

    const daily = await DoctorDailySchedule.findOneAndUpdate(
      { doctorId: docId, date: dateObj },
      {
        doctorId: docId,
        date: dateObj,
        isDayAvailable: !!isDayAvailable,
        openingTime: opening24,
        closingTime: closing24,
        slotDuration: Number(slotDuration) === 30 ? 30 : 15,
        slotAvailability: slotMap,
      },
      { upsert: true, new: true }
    );

    // Regenerate TimeSlots for this date
    await TimeSlot.deleteMany({
      doctorId: docId,
      date: { $gte: dateObj, $lt: new Date(dateObj.getTime() + 24 * 60 * 60 * 1000) },
    });

    if (isDayAvailable && opening24 && closing24) {
      const generated = generateSlotsFromConfig(
        openingHour || { h: 9, m: 0, period: 'AM' },
        closingHour || { h: 5, m: 0, period: 'PM' },
        slotDuration
      );

      const toInsert = [];
      for (const { label, timeStr } of generated) {
        const isAvailable = slotMap.size === 0 || slotMap.get(label) !== false;
        if (!isAvailable) continue;

        const [h, m] = timeStr.split(':').map(Number);
        const period = getPeriodFromHour(h);

        const endMin = h * 60 + m + slotDuration;
        const endH = Math.floor(endMin / 60) % 24;
        const endMm = endMin % 60;
        const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endMm).padStart(2, '0')}`;

        toInsert.push({
          doctorId: docId,
          date: dateObj,
          startTime: timeStr,
          endTime: endTimeStr,
          period,
          status: 'available',
        });
      }

      if (toInsert.length > 0) {
        await TimeSlot.insertMany(toInsert);
        const slotList = toInsert.map((s) => {
          const [h, m] = s.startTime.split(':').map(Number);
          const period = h >= 12 ? 'PM' : 'AM';
          const hour12 = h % 12 || 12;
          const label = `${hour12}:${String(m).padStart(2, '0')} ${period}`;
          return { startTime: s.startTime, label, period: s.period };
        });
        writeSlotsToJson(docId.toString(), dateObj.toISOString().split('T')[0], slotList);
      } else {
        writeSlotsToJson(docId.toString(), dateObj.toISOString().split('T')[0], []);
      }
    } else {
      writeSlotsToJson(docId.toString(), dateObj.toISOString().split('T')[0], []);
    }

    res.json({
      success: true,
      message: 'Schedule saved successfully',
      data: {
        date: dateObj.toISOString().split('T')[0],
        isDayAvailable: daily.isDayAvailable,
        openingTime: daily.openingTime,
        closingTime: daily.closingTime,
        slotDuration: daily.slotDuration,
        slotsGenerated: isDayAvailable ? (await TimeSlot.countDocuments({ doctorId: docId, date: dateObj })) : 0,
      },
    });
  } catch (error) {
    console.error('Save doctor schedule error:', error);
    res.status(500).json({ error: 'Server error while saving schedule' });
  }
};

/**
 * Get saved schedule for date range (authenticated doctor)
 * GET /api/doctor/schedule?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
export const getDoctorSchedule = async (req, res) => {
  try {
    const doctorId = req.doctorId || req.user?.id || req.user?._id;
    if (!doctorId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const docId = mongoose.Types.ObjectId.isValid(doctorId)
      ? new mongoose.Types.ObjectId(doctorId)
      : doctorId;

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const schedules = await DoctorDailySchedule.find({
      doctorId: docId,
      date: { $gte: start, $lte: end },
    }).sort({ date: 1 });

    const byDate = {};
    schedules.forEach((s) => {
      const d = s.date.toISOString().split('T')[0];
      const slotObj = {};
      if (s.slotAvailability && s.slotAvailability instanceof Map) {
        s.slotAvailability.forEach((v, k) => {
          slotObj[k] = v;
        });
      } else if (s.slotAvailability && typeof s.slotAvailability === 'object') {
        Object.assign(slotObj, s.slotAvailability);
      }
      byDate[d] = {
        date: d,
        isDayAvailable: s.isDayAvailable,
        openingTime: s.openingTime,
        closingTime: s.closingTime,
        slotDuration: s.slotDuration,
        slotAvailability: slotObj,
      };
    });

    res.json({
      success: true,
      data: byDate,
    });
  } catch (error) {
    console.error('Get doctor schedule error:', error);
    res.status(500).json({ error: 'Server error while fetching schedule' });
  }
};

/**
 * Get doctor slots (JSON first, then TimeSlot fallback for profile page display)
 * GET /api/doctor/slots/:doctorId?date=YYYY-MM-DD
 */
export const getDoctorSlotsFromJson = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    if (!doctorId) {
      return res.status(400).json({ error: 'Doctor ID is required' });
    }

    const dateStr = date || new Date().toISOString().split('T')[0];
    const slots = readSlotsJson();

    // Try JSON first (key may be string or with different casing)
    let doctorSlots = slots[doctorId] || slots[doctorId.toString()];
    if (!doctorSlots && Object.keys(slots).length > 0) {
      const key = Object.keys(slots).find((k) => k.toString() === doctorId.toString());
      doctorSlots = key ? slots[key] : {};
    }
    let daySlots = (doctorSlots && doctorSlots[dateStr]) || [];

    // Fallback: read from TimeSlot if JSON has no slots for this date
    if (daySlots.length === 0) {
      try {
        const docId = mongoose.Types.ObjectId.isValid(doctorId)
          ? new mongoose.Types.ObjectId(doctorId)
          : doctorId;
        const dateObj = new Date(dateStr);
        dateObj.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dateObj);
        endOfDay.setHours(23, 59, 59, 999);
        const dbSlots = await TimeSlot.find({
          doctorId: docId,
          date: { $gte: dateObj, $lte: endOfDay },
          status: 'available',
        }).sort({ startTime: 1 });
        daySlots = dbSlots.map((s) => {
          const [h, m] = (s.startTime || '09:00').split(':').map(Number);
          const period = h >= 12 ? 'PM' : 'AM';
          const hour12 = h % 12 || 12;
          const label = `${hour12}:${String(m || 0).padStart(2, '0')} ${period}`;
          return { startTime: s.startTime, label, period: s.period };
        });
      } catch (_) {}
    }

    res.json({
      success: true,
      data: {
        availableSlots: daySlots,
        isDoctorAvailable: daySlots.length > 0,
      },
    });
  } catch (error) {
    console.error('Get doctor slots error:', error);
    res.status(500).json({ error: 'Server error while fetching slots' });
  }
};
