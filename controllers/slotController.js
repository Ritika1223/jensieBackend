import { getAvailableSlots, generateSlots } from '../services/slotService.js';
import TimeSlot from '../models/TimeSlot.js';
import DoctorUnavailability from '../models/DoctorUnavailability.js';

// Get available slots for a doctor
export const getDoctorSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date, period } = req.query;
    
    if (!doctorId) {
      return res.status(400).json({ error: 'Doctor ID is required' });
    }
    
    // Default to today if no date provided
    const queryDate = date || new Date().toISOString().split('T')[0];
    
    // Note: bookingType parameter removed - slots don't have bookingType until booked
    const result = await getAvailableSlots(doctorId, queryDate, period);
    
    res.json(result);
  } catch (error) {
    console.error('Get doctor slots error:', error);
    res.status(500).json({ error: 'Server error while fetching slots' });
  }
};

// Generate slots for a doctor (Admin/Cron Job)
export const generateDoctorSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { startDate, endDate, periods } = req.body;
    
    if (!doctorId || !startDate || !endDate) {
      return res.status(400).json({
        error: 'Doctor ID, start date, and end date are required',
      });
    }
    
    const result = await generateSlots(doctorId, startDate, endDate);
    
    res.json(result);
  } catch (error) {
    console.error('Generate slots error:', error);
    res.status(500).json({ error: 'Server error while generating slots' });
  }
};

// Mark doctor as unavailable
export const markDoctorUnavailable = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { startDate, endDate, reason, type, isRecurring } = req.body;
    
    if (!doctorId || !startDate || !endDate) {
      return res.status(400).json({
        error: 'Doctor ID, start date, and end date are required',
      });
    }
    
    // Create unavailability entry
    const unavailability = new DoctorUnavailability({
      doctorId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason: reason || '',
      type: type || 'other',
      isRecurring: isRecurring || false,
    });
    
    await unavailability.save();
    
    // Cancel any existing slots in this date range
    await TimeSlot.updateMany(
      {
        doctorId,
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
        status: 'available',
      },
      {
        status: 'cancelled',
      }
    );
    
    res.json({
      success: true,
      message: 'Doctor marked as unavailable',
      data: unavailability,
    });
  } catch (error) {
    console.error('Mark doctor unavailable error:', error);
    res.status(500).json({ error: 'Server error while marking doctor unavailable' });
  }
};

// Get doctor unavailability
export const getDoctorUnavailability = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { startDate, endDate } = req.query;
    
    const query = { doctorId };
    
    if (startDate && endDate) {
      query.$or = [
        {
          startDate: { $lte: new Date(endDate) },
          endDate: { $gte: new Date(startDate) },
        },
      ];
    }
    
    const unavailability = await DoctorUnavailability.find(query).sort({ startDate: 1 });
    
    res.json({
      success: true,
      data: unavailability,
    });
  } catch (error) {
    console.error('Get doctor unavailability error:', error);
    res.status(500).json({ error: 'Server error while fetching unavailability' });
  }
};

