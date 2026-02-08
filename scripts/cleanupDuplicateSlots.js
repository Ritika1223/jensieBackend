import dotenv from 'dotenv';
import mongoose from 'mongoose';
import TimeSlot from '../models/TimeSlot.js';
import { connectDB } from '../config/database.js';

// Load environment variables
dotenv.config();

/**
 * Clean up duplicate time slots
 * Removes duplicate slots keeping only the first one (by createdAt)
 */
const cleanupDuplicateSlots = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('Connected to MongoDB');

    console.log('\n🔍 Finding duplicate slots...\n');

    // Find duplicates using aggregation
    const duplicates = await TimeSlot.aggregate([
      {
        $group: {
          _id: {
            doctorId: '$doctorId',
            date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            startTime: '$startTime'
          },
          count: { $sum: 1 },
          ids: { $push: '$_id' },
          docs: { $push: '$$ROOT' }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    if (duplicates.length === 0) {
      console.log('✅ No duplicate slots found!');
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log(`Found ${duplicates.length} groups of duplicate slots\n`);

    let totalRemoved = 0;

    for (const group of duplicates) {
      // Sort by createdAt to keep the oldest one
      const sortedDocs = group.docs.sort((a, b) => 
        new Date(a.createdAt) - new Date(b.createdAt)
      );

      // Keep the first one, remove the rest
      const toKeep = sortedDocs[0];
      const toRemove = sortedDocs.slice(1);

      console.log(`📅 ${group._id.date} ${group._id.startTime} - Doctor: ${group._id.doctorId}`);
      console.log(`   Keeping: ${toKeep._id} (created: ${toKeep.createdAt})`);
      console.log(`   Removing ${toRemove.length} duplicate(s):`);

      for (const doc of toRemove) {
        console.log(`     - ${doc._id} (created: ${doc.createdAt})`);
        await TimeSlot.findByIdAndDelete(doc._id);
        totalRemoved++;
      }
      console.log('');
    }

    console.log(`\n✅ Cleanup complete!`);
    console.log(`   Removed ${totalRemoved} duplicate slots`);
    console.log(`   Kept ${duplicates.length} original slots`);

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning up duplicates:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the cleanup
cleanupDuplicateSlots();

