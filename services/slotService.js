import mongoose from 'mongoose';
import TimeSlot from '../models/TimeSlot.js';
import DoctorSchedule from '../models/DoctorSchedule.js';
import DoctorUnavailability from '../models/DoctorUnavailability.js';
import Doctor from '../models/Doctor.js';

// Morning: 7 AM–12 PM | Afternoon: 12 PM–4 PM | Evening: 4 PM–7 PM | Night: 7 PM–12 AM
const getPeriodFromTime = (hour) => {
  if (hour >= 7 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 16) return 'Afternoon';
  if (hour >= 16 && hour < 19) return 'Evening';
  return 'Night';
};

// Helper function to check if time is in break period
const isInBreakTime = (time, breakStart, breakEnd) => {
  if (!breakStart || !breakEnd) return false;
  const [timeHour, timeMin] = time.split(':').map(Number);
  const [breakStartHour, breakStartMin] = breakStart.split(':').map(Number);
  const [breakEndHour, breakEndMin] = breakEnd.split(':').map(Number);
  
  const timeMinutes = timeHour * 60 + timeMin;
  const breakStartMinutes = breakStartHour * 60 + breakStartMin;
  const breakEndMinutes = breakEndHour * 60 + breakEndMin;
  
  return timeMinutes >= breakStartMinutes && timeMinutes < breakEndMinutes;
};

// Generate time slots for a single day
const generateSlotsForDay = async (doctorId, date, schedule) => {
  const slots = [];
  const dateStr = date.toISOString().split('T')[0];
  
  // Convert doctorId to ObjectId if it's a string
  const doctorObjectId = mongoose.Types.ObjectId.isValid(doctorId) 
    ? new mongoose.Types.ObjectId(doctorId)
    : doctorId;
  
  // Check if doctor is unavailable on this date
  const unavailability = await DoctorUnavailability.findOne({
    doctorId: doctorObjectId,
    startDate: { $lte: date },
    endDate: { $gte: date },
  });
  
  if (unavailability) {
    return []; // Doctor is unavailable, return empty slots
  }
  
  // Check recurring unavailability
  const dayOfMonth = date.getDate();
  const month = date.getMonth() + 1;
  const recurringUnavailability = await DoctorUnavailability.findOne({
    doctorId: doctorObjectId,
    isRecurring: true,
    $expr: {
      $and: [
        { $eq: [{ $dayOfMonth: '$startDate' }, dayOfMonth] },
        { $eq: [{ $month: '$startDate' }, month] },
      ],
    },
  });
  
  if (recurringUnavailability) {
    return []; // Recurring unavailability (e.g., annual holiday)
  }
  
    if (!schedule || !schedule.isAvailable || !schedule.startTime || !schedule.endTime) {
      return []; // Doctor doesn't work on this day or schedule not properly configured
    }
  
    // Parse start and end times
    const [startHour, startMin] = schedule.startTime.split(':').map(Number);
    const [endHour, endMin] = schedule.endTime.split(':').map(Number);
  
  let currentHour = startHour;
  let currentMin = startMin;
  
  // Generate 30-minute slots
  while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
    const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
    const period = getPeriodFromTime(currentHour);
    
    // Check if this period is available
    if (schedule.periods.includes(period)) {
      // Check if time is in break period
      if (!isInBreakTime(timeStr, schedule.breakStartTime, schedule.breakEndTime)) {
        // Calculate end time (30 minutes later)
        let endHourCalc = currentHour;
        let endMinCalc = currentMin + 30;
        if (endMinCalc >= 60) {
          endHourCalc += 1;
          endMinCalc -= 60;
        }
        const endTimeStr = `${String(endHourCalc).padStart(2, '0')}:${String(endMinCalc).padStart(2, '0')}`;
        
        // Normalize date to start of day (00:00:00) to ensure consistency
        const normalizedDate = new Date(date);
        normalizedDate.setHours(0, 0, 0, 0);
        
        // Create one slot per time period (bookingType will be set when booked)
        slots.push({
          doctorId: doctorObjectId,
          date: normalizedDate,
          startTime: timeStr,
          endTime: endTimeStr,
          period,
          bookingType: null, // Will be set when slot is booked
          status: 'available',
        });
      }
    }
    
    // Move to next 30-minute slot
    currentMin += 30;
    if (currentMin >= 60) {
      currentHour += 1;
      currentMin -= 60;
    }
  }
  
  return slots;
};

// Generate slots for a date range
export const generateSlots = async (doctorId, startDate, endDate) => {
  try {
    // Convert doctorId string to ObjectId if needed
    const doctorObjectId = mongoose.Types.ObjectId.isValid(doctorId) 
      ? new mongoose.Types.ObjectId(doctorId)
      : doctorId;
    
    const doctor = await Doctor.findById(doctorObjectId);
    if (!doctor) {
      throw new Error('Doctor not found');
    }
    
    const slots = [];
    const currentDate = new Date(startDate);
    const end = new Date(endDate);
    
    // Get all schedules for this doctor (one document per day of week)
    const schedules = await DoctorSchedule.find({ doctorId: doctorObjectId });
    const scheduleMap = {};
    schedules.forEach(schedule => {
      scheduleMap[schedule.dayOfWeek] = schedule;
    });
    
    // Generate slots for each day
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      const schedule = scheduleMap[dayOfWeek];
      
      if (schedule && schedule.isAvailable) {
        // Normalize date to start of day for consistency
        const dayDate = new Date(currentDate);
        dayDate.setHours(0, 0, 0, 0);
        
        const daySlots = await generateSlotsForDay(doctorObjectId, dayDate, schedule);
        slots.push(...daySlots);
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Insert slots in bulk (skip duplicates using unique index)
    if (slots.length > 0) {
      try {
        const result = await TimeSlot.insertMany(slots, { 
          ordered: false,
          // Continue inserting even if some documents fail due to duplicates
        });
        console.log(`✅ Successfully inserted ${result.length} slots`);
      } catch (error) {
        // Handle bulk write errors (duplicates are expected)
        if (error.writeErrors) {
          const insertedCount = error.insertedDocs ? error.insertedDocs.length : 0;
          const duplicateCount = error.writeErrors.filter(e => e.code === 11000).length;
          const otherErrors = error.writeErrors.filter(e => e.code !== 11000);
          
          if (duplicateCount > 0) {
            console.log(`⚠️  Skipped ${duplicateCount} duplicate slots (already exist)`);
          }
          if (insertedCount > 0) {
            console.log(`✅ Successfully inserted ${insertedCount} new slots`);
          }
          if (otherErrors.length > 0) {
            throw new Error(`Failed to insert ${otherErrors.length} slots: ${otherErrors[0].errmsg}`);
          }
        } else if (error.code === 11000) {
          // Single duplicate key error
          console.log(`⚠️  Slot already exists (duplicate key)`);
        } else {
          throw error;
        }
      }
    }
    
    return {
      success: true,
      slotsGenerated: slots.length,
      message: `Generated ${slots.length} slots for doctor ${doctorId}`,
    };
  } catch (error) {
    console.error('Error generating slots:', error);
    throw error;
  }
};

// Get available slots for a doctor
export const getAvailableSlots = async (doctorId, date, period = null) => {
  try {
    // Convert doctorId string to ObjectId
    const doctorObjectId = mongoose.Types.ObjectId.isValid(doctorId) 
      ? new mongoose.Types.ObjectId(doctorId)
      : doctorId;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let startDate = new Date(today);
    let endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 7);
    endDate.setHours(23, 59, 59, 999);

    // If specific date provided, query that date only
    if (date) {
      const parsed = new Date(date);
      parsed.setHours(0, 0, 0, 0);
      startDate = parsed;
      endDate = new Date(parsed);
      endDate.setHours(23, 59, 59, 999);
    }
    
    const query = {
      doctorId: doctorObjectId,
      date: { $gte: startDate, $lte: endDate },
      status: 'available',
    };
    if (period) {
      query.period = period;
    }
    
    const unavailability = await DoctorUnavailability.findOne({
      doctorId: doctorObjectId,
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
    });
    
    const slots = await TimeSlot.find(query).sort({ date: 1, startTime: 1 });
    
    return {
      success: true,
      data: {
        availableSlots: slots,
        isDoctorAvailable: !unavailability,
        unavailabilityReason: unavailability ? unavailability.reason : null,
        unavailabilityType: unavailability ? unavailability.type : null,
        message: unavailability ? 'Doctor is unavailable on this date' : null,
      },
    };
  } catch (error) {
    console.error('Error getting available slots:', error);
    throw error;
  }
};

