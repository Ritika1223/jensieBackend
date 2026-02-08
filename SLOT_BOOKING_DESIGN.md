# Slot Booking System - Database Design & Implementation Plan

## Overview
This document outlines the database models and implementation plan for the slot booking functionality where users can book appointments with doctors.

## Database Models

### 1. TimeSlot Model
Stores available time slots for each doctor. Slots are pre-generated for future dates.

```javascript
{
  doctorId: ObjectId (ref: Doctor),
  date: Date,                    // e.g., 2024-01-15
  startTime: String,             // e.g., "09:00" (24-hour format)
  endTime: String,               // e.g., "09:30" (30 minutes after start)
  period: String,                 // enum: ['Morning', 'Afternoon', 'Evening', 'Night']
  status: String,                 // enum: ['available', 'booked', 'cancelled']
  appointmentId: ObjectId (ref: Appointment, optional),
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ doctorId: 1, date: 1, startTime: 1 }` - For querying available slots
- `{ status: 1, date: 1 }` - For filtering available slots
- `{ appointmentId: 1 }` - For finding slot by appointment

**Period Definitions:**
- Morning: 06:00 - 12:00
- Afternoon: 12:00 - 17:00
- Evening: 17:00 - 21:00
- Night: 21:00 - 06:00 (next day)

### 2. Appointment Model
Stores booked appointments between users and doctors.

```javascript
{
  userId: ObjectId (ref: User),
  doctorId: ObjectId (ref: Doctor),
  timeSlotId: ObjectId (ref: TimeSlot),
  appointmentType: String,       // enum: ['video', 'in-person', 'phone']
  status: String,                // enum: ['confirmed', 'cancelled', 'completed', 'no-show']
  notes: String,                 // Optional notes from user
  doctorNotes: String,           // Optional notes from doctor
  consultationFee: Number,       // Fee at time of booking
  paymentStatus: String,         // enum: ['pending', 'paid', 'refunded']
  paymentId: String,            // Payment transaction ID (optional)
  cancelledAt: Date,            // When appointment was cancelled
  cancelledBy: String,          // enum: ['user', 'doctor', 'system']
  cancellationReason: String,   // Reason for cancellation
  reminderSent: Boolean,        // Whether reminder email was sent
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ userId: 1, status: 1 }` - For user's appointments
- `{ doctorId: 1, status: 1, date: 1 }` - For doctor's appointments
- `{ timeSlotId: 1 }` - Unique constraint (one appointment per slot)
- `{ createdAt: -1 }` - For sorting appointments

### 3. DoctorSchedule Model (Optional - for managing recurring schedules)
Stores doctor's recurring availability schedule.

```javascript
{
  doctorId: ObjectId (ref: Doctor),
  dayOfWeek: Number,            // 0-6 (Sunday-Saturday)
  isAvailable: Boolean,         // Whether doctor works on this day
  periods: [String],            // ['Morning', 'Afternoon', 'Evening', 'Night']
  startTime: String,            // e.g., "09:00"
  endTime: String,             // e.g., "17:00"
  breakStartTime: String,      // Optional lunch break start
  breakEndTime: String,        // Optional lunch break end
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ doctorId: 1, dayOfWeek: 1 }` - For querying doctor's schedule

### 4. DoctorUnavailability Model
Stores dates when a doctor is unavailable (holidays, leave, etc.).

```javascript
{
  doctorId: ObjectId (ref: Doctor),
  startDate: Date,             // Start date of unavailability
  endDate: Date,               // End date of unavailability (same as startDate for single day)
  reason: String,             // e.g., "Holiday", "Sick Leave", "Personal Leave"
  type: String,                // enum: ['holiday', 'sick_leave', 'personal_leave', 'emergency', 'other']
  isRecurring: Boolean,        // Whether this repeats yearly (e.g., annual holidays)
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ doctorId: 1, startDate: 1, endDate: 1 }` - For querying unavailability
- `{ startDate: 1, endDate: 1 }` - For date range queries

## Database Schema (MongoDB/Mongoose)

### TimeSlot Schema
```javascript
const timeSlotSchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  startTime: {
    type: String,
    required: true,
    match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/ // HH:MM format
  },
  endTime: {
    type: String,
    required: true,
    match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
  },
  period: {
    type: String,
    enum: ['Morning', 'Afternoon', 'Evening', 'Night'],
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'booked', 'cancelled'],
    default: 'available',
    index: true
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    default: null
  }
}, { timestamps: true });

// Compound indexes
timeSlotSchema.index({ doctorId: 1, date: 1, startTime: 1 });
timeSlotSchema.index({ status: 1, date: 1 });
```

### Appointment Schema
```javascript
const appointmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true,
    index: true
  },
  timeSlotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TimeSlot',
    required: true,
    unique: true // One appointment per slot
  },
  appointmentType: {
    type: String,
    enum: ['video', 'in-person', 'phone'],
    default: 'video'
  },
  status: {
    type: String,
    enum: ['confirmed', 'cancelled', 'completed', 'no-show'],
    default: 'confirmed',
    index: true
  },
  notes: {
    type: String,
    default: ''
  },
  doctorNotes: {
    type: String,
    default: ''
  },
  consultationFee: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending'
  },
  paymentId: {
    type: String,
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  cancelledBy: {
    type: String,
    enum: ['user', 'doctor', 'system'],
    default: null
  },
  cancellationReason: {
    type: String,
    default: ''
  },
  reminderSent: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Compound indexes
appointmentSchema.index({ userId: 1, status: 1 });
appointmentSchema.index({ doctorId: 1, status: 1, createdAt: -1 });
```

### DoctorSchedule Schema (Optional)
```javascript
const doctorScheduleSchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true,
    index: true
  },
  dayOfWeek: {
    type: Number,
    required: true,
    min: 0,
    max: 6
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  periods: [{
    type: String,
    enum: ['Morning', 'Afternoon', 'Evening', 'Night']
  }],
  startTime: {
    type: String,
    match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
  },
  endTime: {
    type: String,
    match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
  },
  breakStartTime: {
    type: String,
    default: null
  },
  breakEndTime: {
    type: String,
    default: null
  }
}, { timestamps: true });

doctorScheduleSchema.index({ doctorId: 1, dayOfWeek: 1 });
```

### DoctorUnavailability Schema
```javascript
const doctorUnavailabilitySchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true,
    index: true
  },
  startDate: {
    type: Date,
    required: true,
    index: true
  },
  endDate: {
    type: Date,
    required: true,
    index: true
  },
  reason: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['holiday', 'sick_leave', 'personal_leave', 'emergency', 'other'],
    default: 'other'
  },
  isRecurring: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

doctorUnavailabilitySchema.index({ doctorId: 1, startDate: 1, endDate: 1 });
```

## API Endpoints

### 1. Get Available Slots for a Doctor
```
GET /api/doctors/:doctorId/slots
Query params:
  - date: YYYY-MM-DD (optional, defaults to today)
  - period: Morning|Afternoon|Evening|Night (optional)
  - limit: number (optional, default: 50)

Response includes:
  - availableSlots: Array of available time slots
  - isDoctorAvailable: Boolean - indicates if doctor is available on requested date
  - unavailabilityReason: String (if doctor is unavailable)
```

### 2. Book an Appointment
```
POST /api/appointments
Body: {
  doctorId: string,
  timeSlotId: string,
  appointmentType: 'video' | 'in-person' | 'phone',
  notes: string (optional)
}
```

### 3. Get User's Appointments
```
GET /api/appointments
Query params:
  - status: confirmed|cancelled|completed (optional)
  - page: number (optional)
  - limit: number (optional)
```

### 4. Get Doctor's Appointments
```
GET /api/doctors/:doctorId/appointments
Query params:
  - status: confirmed|cancelled|completed (optional)
  - date: YYYY-MM-DD (optional)
  - page: number (optional)
  - limit: number (optional)
```

### 5. Cancel Appointment
```
PATCH /api/appointments/:appointmentId/cancel
Body: {
  reason: string (optional),
  cancelledBy: 'user' | 'doctor' | 'system'
}
```

### 6. Generate Slots for Doctor (Admin/Cron Job)
```
POST /api/doctors/:doctorId/generate-slots
Body: {
  startDate: YYYY-MM-DD,
  endDate: YYYY-MM-DD,
  periods: ['Morning', 'Afternoon', 'Evening', 'Night'] (optional)
}
```

### 7. Mark Doctor as Unavailable
```
POST /api/doctors/:doctorId/unavailable
Body: {
  startDate: YYYY-MM-DD,
  endDate: YYYY-MM-DD,
  reason: string,
  type: 'holiday' | 'sick_leave' | 'personal_leave' | 'emergency' | 'other',
  isRecurring: boolean (optional)
}
```

### 8. Get Doctor Unavailability
```
GET /api/doctors/:doctorId/unavailable
Query params:
  - startDate: YYYY-MM-DD (optional)
  - endDate: YYYY-MM-DD (optional)
```

## Implementation Flow

### Slot Generation
1. **Initial Setup**: Create DoctorSchedule entries for each doctor
2. **Daily Cron Job**: Generate slots for next N days (e.g., 30 days ahead)
3. **Slot Generation Logic**:
   - For each day in range
   - **Check DoctorUnavailability**: Skip if doctor is unavailable on that date
   - Check doctor's schedule for that day of week
   - Generate 30-minute slots for each available period
   - Skip break times if defined
   - Create TimeSlot documents with status='available'
   
**Unavailability Check:**
- Query DoctorUnavailability for dates that overlap with the generation date
- If unavailability exists, skip slot generation for that date entirely
- This prevents creating slots that would never be available

### Booking Flow
1. **User selects slot** → Frontend calls `GET /api/doctors/:id/slots`
2. **User clicks "Book"** → Frontend calls `POST /api/appointments`
3. **Backend validates**:
   - Slot exists and is available
   - Slot is not in the past
   - User is authenticated
4. **Create Appointment**:
   - Create Appointment document
   - Update TimeSlot status to 'booked'
   - Link appointmentId to TimeSlot
5. **Send Emails**:
   - Send confirmation to user
   - Send notification to doctor
6. **Return success response**

### Cancellation Flow
1. **User/Doctor cancels** → `PATCH /api/appointments/:id/cancel`
2. **Backend updates**:
   - Appointment status to 'cancelled'
   - TimeSlot status back to 'available'
   - Remove appointmentId from TimeSlot
3. **Send cancellation emails**

## Email Templates

### User Confirmation Email
- Subject: "Appointment Confirmed with Dr. [Name]"
- Content: Date, time, doctor details, appointment type, meeting link (if video)

### Doctor Notification Email
- Subject: "New Appointment Booking"
- Content: Patient name, date, time, appointment type, patient notes

### Cancellation Email
- Subject: "Appointment Cancelled"
- Content: Original appointment details, cancellation reason

## Frontend Integration Points

1. **DoctorsProfile Component**:
   - Fetch available slots: `GET /api/doctors/:id/slots?date=YYYY-MM-DD`
   - Group slots by period (Morning, Afternoon, Evening, Night)
   - Display slots in time period tabs
   - Handle slot selection and booking

2. **Booking Flow**:
   - Show slot selection UI
   - On selection, show booking confirmation modal
   - Call booking API
   - Show success message
   - Redirect or update UI

## Database Relationships

```
Doctor (1) ──< (Many) TimeSlot
User (1) ──< (Many) Appointment
Doctor (1) ──< (Many) Appointment
TimeSlot (1) ──< (1) Appointment (one-to-one)
```

## Time Slot Generation Example

For a doctor available:
- Monday-Friday: 09:00-17:00
- Periods: Morning, Afternoon, Evening

**Generated slots for Monday, 2024-01-15:**
- Morning: 09:00-09:30, 09:30-10:00, 10:00-10:30, 10:30-11:00, 11:00-11:30, 11:30-12:00
- Afternoon: 12:00-12:30, 12:30-13:00, 13:00-13:30, 13:30-14:00, 14:00-14:30, 14:30-15:00, 15:00-15:30, 15:30-16:00, 16:00-16:30, 16:30-17:00
- Evening: None (if not in schedule)
- Night: None

## Handling Doctor Unavailability

### Approach: Separate Unavailability Model

Instead of marking slots as "occupied", we use a **DoctorUnavailability** model to track when doctors are out. This approach is better because:

1. **Prevents Slot Generation**: Slots are never created for unavailable dates
2. **Cleaner Data**: No need to mark hundreds of slots as unavailable
3. **Better UX**: Frontend can show "Doctor unavailable on this date" message
4. **Flexible**: Supports single days, date ranges, and recurring unavailability

### How It Works:

**Scenario 1: Doctor is out on a single day (e.g., Jan 15, 2024)**
```javascript
// Create unavailability entry
{
  doctorId: "doctor123",
  startDate: "2024-01-15",
  endDate: "2024-01-15",  // Same as startDate for single day
  reason: "Holiday",
  type: "holiday"
}
```

**Result:**
- No slots are generated for Jan 15, 2024
- When user queries slots for Jan 15, API returns:
  ```json
  {
    "availableSlots": [],
    "isDoctorAvailable": false,
    "unavailabilityReason": "Holiday"
  }
  ```
- Frontend shows: "Doctor is unavailable on this date (Holiday)"

**Scenario 2: Doctor is out for a date range (e.g., Jan 20-25, 2024)**
```javascript
{
  doctorId: "doctor123",
  startDate: "2024-01-20",
  endDate: "2024-01-25",
  reason: "Personal Leave",
  type: "personal_leave"
}
```

**Result:**
- No slots generated for Jan 20-25
- All dates in range show as unavailable

**Scenario 3: Recurring unavailability (e.g., Annual holiday)**
```javascript
{
  doctorId: "doctor123",
  startDate: "2024-12-25",  // Christmas
  endDate: "2024-12-25",
  reason: "Christmas Holiday",
  type: "holiday",
  isRecurring: true  // Repeats every year
}
```

**Result:**
- Slot generation service checks `isRecurring` flag
- For each year, automatically skips Dec 25 when generating slots

### Slot Generation Logic with Unavailability:

```javascript
// Pseudo-code for slot generation
for (date in dateRange) {
  // Check if doctor is unavailable on this date
  const unavailability = await DoctorUnavailability.findOne({
    doctorId: doctorId,
    startDate: { $lte: date },
    endDate: { $gte: date }
  });
  
  if (unavailability) {
    // Skip this date - don't generate any slots
    continue;
  }
  
  // Check recurring unavailability
  const recurringUnavailability = await DoctorUnavailability.findOne({
    doctorId: doctorId,
    isRecurring: true,
    $expr: {
      $and: [
        { $eq: [{ $dayOfMonth: "$startDate" }, date.getDate()] },
        { $eq: [{ $month: "$startDate" }, date.getMonth() + 1] }
      ]
    }
  });
  
  if (recurringUnavailability) {
    continue; // Skip this date
  }
  
  // Generate slots normally...
}
```

### Frontend Display:

When fetching slots for a date where doctor is unavailable:
```javascript
GET /api/doctors/:id/slots?date=2024-01-15

Response:
{
  "success": true,
  "data": {
    "availableSlots": [],
    "isDoctorAvailable": false,
    "unavailabilityReason": "Holiday",
    "unavailabilityType": "holiday",
    "message": "Doctor is unavailable on this date"
  }
}
```

Frontend can then display:
- "Doctor is unavailable on this date (Holiday)"
- Disable date selection in calendar
- Show different UI state (grayed out, message, etc.)

### Benefits of This Approach:

1. ✅ **No slot pollution**: Don't create unnecessary slot documents
2. ✅ **Clear semantics**: "Doctor unavailable" vs "Slot booked"
3. ✅ **Easy queries**: Simple check if date falls in unavailability range
4. ✅ **Flexible**: Supports single days, ranges, and recurring events
5. ✅ **Better UX**: Clear messaging to users about why slots aren't available

## Considerations

1. **Timezone**: Store all times in UTC, convert on frontend based on user's timezone
2. **Slot Duration**: Fixed at 30 minutes (configurable per doctor in future)
3. **Buffer Time**: Consider adding buffer between appointments (e.g., 15 minutes)
4. **Recurring Slots**: Generate slots in advance (e.g., 30 days ahead)
5. **Past Slots**: Automatically mark past slots as unavailable
6. **Concurrency**: Use MongoDB transactions to prevent double-booking
7. **Reminders**: Send reminder emails 24 hours before appointment
8. **Unavailability Check**: Always check DoctorUnavailability before generating/displaying slots

## Next Steps

1. Create Mongoose models (TimeSlot, Appointment, DoctorSchedule)
2. Implement slot generation service/cron job
3. Create API endpoints for slots and appointments
4. Implement booking logic with email notifications
5. Update frontend to fetch and display slots
6. Implement booking UI and flow

