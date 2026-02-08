import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Doctor from '../models/Doctor.js';
import DoctorSchedule from '../models/DoctorSchedule.js';
import { connectDB } from '../config/database.js';

// Load environment variables
dotenv.config();

// Default schedule: Monday to Friday, 9 AM to 5 PM, all periods
const defaultSchedule = [
  {
    dayOfWeek: 0, // Sunday
    isAvailable: false,
    periods: [],
  },
  {
    dayOfWeek: 1, // Monday
    isAvailable: true,
    periods: ['Morning', 'Afternoon', 'Evening'],
    startTime: '09:00',
    endTime: '17:00',
    breakStartTime: '13:00',
    breakEndTime: '14:00',
  },
  {
    dayOfWeek: 2, // Tuesday
    isAvailable: true,
    periods: ['Morning', 'Afternoon', 'Evening'],
    startTime: '09:00',
    endTime: '17:00',
    breakStartTime: '13:00',
    breakEndTime: '14:00',
  },
  {
    dayOfWeek: 3, // Wednesday
    isAvailable: true,
    periods: ['Morning', 'Afternoon', 'Evening'],
    startTime: '09:00',
    endTime: '17:00',
    breakStartTime: '13:00',
    breakEndTime: '14:00',
  },
  {
    dayOfWeek: 4, // Thursday
    isAvailable: true,
    periods: ['Morning', 'Afternoon', 'Evening'],
    startTime: '09:00',
    endTime: '17:00',
    breakStartTime: '13:00',
    breakEndTime: '14:00',
  },
  {
    dayOfWeek: 5, // Friday
    isAvailable: true,
    periods: ['Morning', 'Afternoon', 'Evening'],
    startTime: '09:00',
    endTime: '17:00',
    breakStartTime: '13:00',
    breakEndTime: '14:00',
  },
  {
    dayOfWeek: 6, // Saturday
    isAvailable: true,
    periods: ['Morning', 'Afternoon'],
    startTime: '10:00',
    endTime: '14:00',
  },
];

const seedDoctorSchedules = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('Connected to MongoDB');

    // Get all doctors
    const doctors = await Doctor.find({});
    console.log(`Found ${doctors.length} doctors`);

    if (doctors.length === 0) {
      console.log('⚠️  No doctors found. Please seed doctors first using: npm run seed:doctors');
      await mongoose.connection.close();
      process.exit(0);
    }

    let created = 0;
    let updated = 0;

    // Create or update schedule for each doctor
    // Note: Each day of week is stored as a separate document
    for (const doctor of doctors) {
      for (const daySchedule of defaultSchedule) {
        const existingSchedule = await DoctorSchedule.findOne({
          doctorId: doctor._id,
          dayOfWeek: daySchedule.dayOfWeek,
        });

        if (existingSchedule) {
          // Update existing schedule for this day
          existingSchedule.isAvailable = daySchedule.isAvailable;
          existingSchedule.periods = daySchedule.periods;
          existingSchedule.startTime = daySchedule.startTime;
          existingSchedule.endTime = daySchedule.endTime;
          existingSchedule.breakStartTime = daySchedule.breakStartTime;
          existingSchedule.breakEndTime = daySchedule.breakEndTime;
          await existingSchedule.save();
          updated++;
        } else {
          // Create new schedule for this day
          await DoctorSchedule.create({
            doctorId: doctor._id,
            ...daySchedule,
          });
          created++;
        }
      }
      console.log(`✅ Processed schedule for Dr. ${doctor.name}`);
    }

    console.log('\n📊 Summary:');
    console.log(`Total doctors: ${doctors.length}`);
    console.log(`Schedules created: ${created}`);
    console.log(`Schedules updated: ${updated}`);

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding doctor schedules:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the seed function
seedDoctorSchedules();

