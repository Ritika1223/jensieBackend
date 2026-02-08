import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Filter from '../models/Filter.js';
import { connectDB } from '../config/database.js';

// Load environment variables
dotenv.config();

// Filter values from frontend (FilterBar.jsx)
const filterData = [
  {
    filterType: 'specialist',
    values: ['Cardiologist', 'Dermatologist', 'Neurologist', 'Pediatrician', 'Orthopedic'],
  },
  {
    filterType: 'location',
    values: ['Noida', 'Delhi', 'Gurgaon'],
  },
  {
    filterType: 'experience',
    values: ['1-3 years', '3-5 years', '5-10 years', '10+ years', '15+ years'],
  },
  {
    filterType: 'gender',
    values: ['Male', 'Female', 'Any'],
  },
];

const seedFilters = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('Connected to MongoDB');

    // Clear existing filters (optional - comment out if you want to keep existing data)
    const deleteResult = await Filter.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} existing filters`);

    // Insert filters
    const filters = await Filter.insertMany(filterData);
    console.log(`✅ Successfully seeded ${filters.length} filter types`);

    // Display summary
    console.log('\n📊 Filter Summary:');
    filters.forEach(filter => {
      console.log(`\n${filter.filterType}:`);
      filter.values.forEach(value => {
        console.log(`  - ${value}`);
      });
    });

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding filters:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the seed function
seedFilters();

