# Slot Generation Guide

This guide explains how the slot booking system works and how to generate time slots for doctors.

## Overview

The slot booking system works in three main steps:

1. **Doctor Schedules** - Define when doctors are available (days of week, time periods)
2. **Slot Generation** - Create individual 30-minute time slots based on schedules
3. **Booking** - Users book available slots, which creates appointments

## Flow Diagram

```
┌─────────────────┐
│  Doctor Setup   │
│  (One-time)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Doctor Schedule │  ← Define weekly availability
│   (Seeded)      │     (Monday-Friday, 9 AM - 5 PM, etc.)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Slot Generation│  ← Create 30-min slots for next N days
│   (Daily/Cron)  │     (Runs automatically or manually)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Available Slots │  ← Users can view and book
│   (Database)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Booking       │  ← User books → Creates Appointment
│   (API Call)    │     → Sends confirmation emails
└─────────────────┘
```

## Step-by-Step Setup

### Step 1: Seed Doctor Schedules (One-time)

Before generating slots, you need to set up doctor schedules. This defines when each doctor is available.

```bash
npm run seed:schedules
```

This script:
- Creates default schedules for all doctors
- Sets Monday-Friday, 9 AM - 5 PM availability
- Includes lunch break (1 PM - 2 PM)
- Sets Saturday as half-day (10 AM - 2 PM)
- Sets Sunday as unavailable

**Customizing Schedules:**

You can modify `scripts/seedDoctorSchedules.js` to customize schedules per doctor, or use the API:

```bash
# Create/update schedule via API (requires authentication)
POST /api/slots/:doctorId/schedule
```

### Step 2: Generate Slots

Generate time slots for doctors. Slots are created for the next N days (default: 30 days).

#### Option A: Generate for All Doctors

```bash
# Generate slots for next 30 days (default)
npm run generate:slots

# Or directly:
node scripts/generateSlots.js
```

#### Option B: Generate for Specific Doctor

```bash
# Generate for specific doctor (next 30 days)
node scripts/generateSlots.js <doctorId>

# Generate for specific doctor (next 60 days)
node scripts/generateSlots.js <doctorId> 60
```

**Example:**
```bash
node scripts/generateSlots.js 507f1f77bcf86cd799439011 60
```

### Step 3: Automated Slot Generation (Recommended)

For production, set up a **cron job** or **scheduled task** to automatically generate slots daily.

#### Using Node-Cron (Recommended)

Install `node-cron`:
```bash
npm install node-cron
```

Add to `server.js`:
```javascript
import cron from 'node-cron';
import { generateSlots } from './services/slotService.js';
import Doctor from './models/Doctor.js';

// Run daily at 2 AM to generate slots for next 30 days
cron.schedule('0 2 * * *', async () => {
  console.log('🔄 Running daily slot generation...');
  try {
    const doctors = await Doctor.find({});
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    
    for (const doctor of doctors) {
      await generateSlots(doctor._id, startDate, endDate);
    }
    console.log('✅ Slot generation completed');
  } catch (error) {
    console.error('❌ Slot generation error:', error);
  }
});
```

#### Using System Cron (Linux/Mac)

Add to crontab (`crontab -e`):
```bash
# Generate slots daily at 2 AM
0 2 * * * cd /path/to/jensei-backend-node && node scripts/generateSlots.js >> /var/log/slot-generation.log 2>&1
```

#### Using Windows Task Scheduler

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger: Daily at 2:00 AM
4. Action: Start a program
5. Program: `node`
6. Arguments: `scripts/generateSlots.js`
7. Start in: `C:\path\to\jensei-backend-node`

## How Slot Generation Works

### 1. Schedule Check
- Reads doctor's `DoctorSchedule` for the day of week
- Checks if doctor is available on that day
- Verifies which time periods are available (Morning, Afternoon, Evening, Night)

### 2. Unavailability Check
- Checks `DoctorUnavailability` model for holidays/leave
- Skips dates where doctor is unavailable
- Handles recurring unavailability (e.g., annual holidays)

### 3. Slot Creation
- Generates 30-minute slots for each available period
- Creates slots for all three booking types:
  - `video_call`
  - `voice_call`
  - `clinic_visit`
- Skips break times (lunch, etc.)
- Sets initial status as `available`

### Example: Slot Generation for One Day

**Doctor Schedule:**
- Monday, 9 AM - 5 PM
- Periods: Morning, Afternoon, Evening
- Break: 1 PM - 2 PM

**Generated Slots:**
```
09:00 - 09:30 (Morning) - video_call, voice_call, clinic_visit
09:30 - 10:00 (Morning) - video_call, voice_call, clinic_visit
...
12:30 - 13:00 (Afternoon) - video_call, voice_call, clinic_visit
[Break: 13:00 - 14:00 - No slots]
14:00 - 14:30 (Afternoon) - video_call, voice_call, clinic_visit
...
16:30 - 17:00 (Evening) - video_call, voice_call, clinic_visit
```

**Total:** ~16 time slots × 3 booking types = **48 slots per day**

## API Endpoints

### Generate Slots (Manual via API)

```bash
POST /api/slots/:doctorId/generate
Authorization: Bearer <token>

Body:
{
  "startDate": "2024-01-15",
  "endDate": "2024-02-15"
}
```

### Get Available Slots

```bash
GET /api/slots/:doctorId?date=2024-01-15&period=Morning&bookingType=video_call
```

### Mark Doctor Unavailable

```bash
POST /api/slots/:doctorId/unavailable
Authorization: Bearer <token>

Body:
{
  "startDate": "2024-12-25",
  "endDate": "2024-12-25",
  "reason": "Christmas Holiday",
  "type": "holiday",
  "isRecurring": true
}
```

## Common Workflows

### Initial Setup (First Time)

```bash
# 1. Seed doctors (if not already done)
npm run seed:doctors

# 2. Seed doctor schedules
npm run seed:schedules

# 3. Generate slots for next 30 days
npm run generate:slots
```

### Daily Maintenance

```bash
# Option 1: Run manually
npm run generate:slots

# Option 2: Set up cron job (recommended)
# See "Automated Slot Generation" section above
```

### Adding New Doctor

```bash
# 1. Doctor is already in database (from seed or admin panel)

# 2. Create schedule for new doctor
# Via API or update seedDoctorSchedules.js

# 3. Generate slots for new doctor
node scripts/generateSlots.js <newDoctorId>
```

### Handling Doctor Leave

```bash
# Mark doctor unavailable via API
POST /api/slots/:doctorId/unavailable
{
  "startDate": "2024-01-20",
  "endDate": "2024-01-25",
  "reason": "Personal Leave",
  "type": "personal_leave"
}

# Existing slots for those dates will be cancelled
# Future slot generation will skip those dates
```

## Troubleshooting

### No Slots Generated

1. **Check Doctor Schedule:**
   ```bash
   # Verify schedule exists
   db.doctorSchedules.findOne({ doctorId: ObjectId("...") })
   ```

2. **Check Unavailability:**
   ```bash
   # Check if doctor is marked unavailable
   db.doctorUnavailabilities.find({ doctorId: ObjectId("...") })
   ```

3. **Check Schedule Configuration:**
   - Ensure `isAvailable: true` for the day
   - Verify `startTime` and `endTime` are set
   - Check `periods` array includes desired periods

### Slots Not Showing in API

1. **Check Slot Status:**
   ```bash
   # Verify slots exist and are available
   db.timeslots.find({ 
     doctorId: ObjectId("..."), 
     status: "available",
     date: ISODate("2024-01-15")
   })
   ```

2. **Check Date Format:**
   - API expects: `YYYY-MM-DD`
   - Example: `2024-01-15`

### Performance Issues

For large numbers of doctors/days:
- Generate slots in batches
- Use `insertMany` with `ordered: false` (already implemented)
- Consider generating slots for shorter date ranges (e.g., 7 days) more frequently

## Best Practices

1. **Generate Slots Daily:** Run slot generation daily to ensure slots are always available for the next 30 days

2. **Monitor Slot Count:** Check that slots are being generated correctly:
   ```bash
   # Count available slots per doctor
   db.timeslots.aggregate([
     { $match: { status: "available" } },
     { $group: { _id: "$doctorId", count: { $sum: 1 } } }
   ])
   ```

3. **Handle Unavailability Early:** Mark doctors as unavailable before generating slots to avoid creating unnecessary slots

4. **Regular Cleanup:** Consider archiving or deleting past slots:
   ```bash
   # Delete slots older than 30 days
   db.timeslots.deleteMany({ 
     date: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
   })
   ```

## Summary

- **One-time setup:** Run `npm run seed:schedules` to create doctor schedules
- **Daily generation:** Run `npm run generate:slots` or set up cron job
- **Manual generation:** Use API endpoint or script with doctor ID
- **Unavailability:** Use API to mark doctors unavailable for specific dates

The system automatically handles:
- ✅ Creating slots for all booking types
- ✅ Skipping unavailable dates
- ✅ Handling break times
- ✅ Preventing duplicate slots

