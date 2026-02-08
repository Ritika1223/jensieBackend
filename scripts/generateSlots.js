import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Doctor from '../models/Doctor.js';
import { connectDB } from '../config/database.js';
import { generateSlots } from '../services/slotService.js';

// Load environment variables
dotenv.config();

/**
 * Generate slots for all doctors or a specific doctor
 * 
 * Note: Creates one slot per time period (bookingType is set when slot is booked)
 * 
 * Usage:
 *   node scripts/generateSlots.js                    # Generate for all doctors (next 30 days)
 *   node scripts/generateSlots.js <doctorId>        # Generate for specific doctor
 *   node scripts/generateSlots.js <doctorId> 60     # Generate for specific doctor (next 60 days)
 */
const generateSlotsForDoctors = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('Connected to MongoDB');

    // Get command line arguments
    const args = process.argv.slice(2);
    const doctorId = args[0] || null;
    const daysAhead = parseInt(args[1]) || 30; // Default: 30 days ahead

    // Calculate date range
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0); // Start of today

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);
    endDate.setHours(23, 59, 59, 999); // End of target day

    console.log(`\n📅 Generating slots from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    console.log(`   (${daysAhead} days ahead)\n`);

    let doctors = [];

    if (doctorId) {
      // Generate for specific doctor
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        console.error(`❌ Doctor with ID ${doctorId} not found`);
        await mongoose.connection.close();
        process.exit(1);
      }
      doctors = [doctor];
      console.log(`🎯 Generating slots for: Dr. ${doctor.name}\n`);
    } else {
      // Generate for all doctors
      doctors = await Doctor.find({});
      console.log(`🎯 Generating slots for ${doctors.length} doctors\n`);
    }

    if (doctors.length === 0) {
      console.log('⚠️  No doctors found. Please seed doctors first using: npm run seed:doctors');
      await mongoose.connection.close();
      process.exit(0);
    }

    let totalSlotsGenerated = 0;
    let successCount = 0;
    let errorCount = 0;

    // Generate slots for each doctor
    for (const doctor of doctors) {
      try {
        console.log(`⏳ Generating slots for Dr. ${doctor.name}...`);
        const result = await generateSlots(doctor._id, startDate, endDate);
        totalSlotsGenerated += result.slotsGenerated;
        successCount++;
        console.log(`   ✅ Generated ${result.slotsGenerated} slots\n`);
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Error: ${error.message}\n`);
      }
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Doctors processed: ${doctors.length}`);
    console.log(`   Successful: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Total slots generated: ${totalSlotsGenerated}`);
    console.log(`   Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error generating slots:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the script
generateSlotsForDoctors();

