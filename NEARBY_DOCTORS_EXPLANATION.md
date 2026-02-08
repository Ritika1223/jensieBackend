# Nearby Doctors Logic - Complete Explanation with Examples

This document explains how the nearby doctors feature works from frontend to backend, including data formats and calculations.

## Table of Contents
1. [Frontend: Getting User Location](#frontend-getting-user-location)
2. [Frontend: Sending Location to Backend](#frontend-sending-location-to-backend)
3. [Backend: Receiving and Processing](#backend-receiving-and-processing)
4. [MongoDB: Geospatial Query](#mongodb-geospatial-query)
5. [Complete Example](#complete-example)
6. [Distance Calculation Details](#distance-calculation-details)

---

## Frontend: Getting User Location

### Step 1: Browser Geolocation API

The frontend uses the browser's built-in `navigator.geolocation` API:

```javascript
// Location: DoctorsListingPage.jsx
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      // latitude: 28.5355 (example: Noida, India)
      // longitude: 77.3910 (example: Noida, India)
    }
  );
}
```

### What the Browser Returns

The `position.coords` object contains:
```javascript
{
  latitude: 28.5355,    // Decimal degrees (North/South)
  longitude: 77.3910,   // Decimal degrees (East/West)
  accuracy: 20,         // Accuracy in meters
  altitude: null,
  altitudeAccuracy: null,
  heading: null,
  speed: null
}
```

**Format**: Decimal degrees (DD)
- **Latitude**: -90 to +90 (negative = South, positive = North)
- **Longitude**: -180 to +180 (negative = West, positive = East)

### Example Coordinates

| Location | Latitude | Longitude |
|----------|----------|-----------|
| Noida, India | 28.5355 | 77.3910 |
| New York, USA | 40.7128 | -74.0060 |
| London, UK | 51.5074 | -0.1278 |
| Sydney, Australia | -33.8688 | 151.2093 |

---

## Frontend: Sending Location to Backend

### Step 2: Building Query Parameters

```javascript
// Frontend code (DoctorsListingPage.jsx)
const { latitude, longitude } = position.coords;
const locationParams = `limit=8&latitude=${latitude}&longitude=${longitude}&maxDistance=50`;
// Result: "limit=8&latitude=28.5355&longitude=77.3910&maxDistance=50"
```

### Step 3: Making API Request

```javascript
const response = await fetch(
  `${API_URL}/api/doctors/nearby?limit=8&latitude=28.5355&longitude=77.3910&maxDistance=50`,
  { credentials: 'include' }
);
```

### Query Parameters Format

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| `latitude` | Number (float) | `28.5355` | User's latitude in decimal degrees |
| `longitude` | Number (float) | `77.3910` | User's longitude in decimal degrees |
| `maxDistance` | Number (float) | `50` | Maximum distance in kilometers (default: 50) |
| `limit` | Number (integer) | `8` | Number of results (default: 8, max: 50) |
| `page` | Number (integer) | `1` | Page number for pagination (default: 1) |

---

## Backend: Receiving and Processing

### Step 4: Backend Receives Request

```javascript
// Backend code (doctorController.js)
export const getNearbyDoctors = async (req, res) => {
  // Extract query parameters
  const latitude = parseFloat(req.query.latitude);   // 28.5355
  const longitude = parseFloat(req.query.longitude); // 77.3910
  const maxDistance = parseFloat(req.query.maxDistance) || 50; // 50 km
}
```

### Step 5: Validation

```javascript
// Check if coordinates are provided
if (!latitude || !longitude) {
  // Fallback: return all doctors sorted by rating
  return res.json({ ... });
}
```

---

## MongoDB: Geospatial Query

### Step 6: MongoDB Geospatial Query

MongoDB uses the `$near` operator with a `2dsphere` index for geospatial queries:

```javascript
// Backend code (doctorController.js)
const doctors = await Doctor.find({
  coordinates: {
    $near: {
      $geometry: {
        type: 'Point',
        coordinates: [longitude, latitude], // Note: [longitude, latitude] order!
      },
      $maxDistance: maxDistance * 1000, // Convert km to meters: 50 * 1000 = 50000
    },
  },
})
.sort({ rating: -1 })
.skip(skip)
.limit(limit);
```

### Important: Coordinate Order

**MongoDB GeoJSON Format**: `[longitude, latitude]` (NOT `[latitude, longitude]`)

```javascript
// ✅ Correct (MongoDB format)
coordinates: [77.3910, 28.5355]  // [longitude, latitude]

// ❌ Wrong
coordinates: [28.5355, 77.3910]  // [latitude, longitude]
```

### Distance Unit

- **Input**: Kilometers (e.g., `maxDistance: 50`)
- **MongoDB**: Meters (e.g., `$maxDistance: 50000`)
- **Conversion**: `maxDistance * 1000`

---

## Complete Example

### Scenario: User in Noida, India wants nearby doctors

#### Step 1: Frontend Gets Location

```javascript
// Browser geolocation API
navigator.geolocation.getCurrentPosition((position) => {
  console.log(position.coords);
  // {
  //   latitude: 28.5355,
  //   longitude: 77.3910,
  //   accuracy: 20
  // }
});
```

#### Step 2: Frontend Sends Request

```javascript
// API Request
GET /api/doctors/nearby?latitude=28.5355&longitude=77.3910&maxDistance=50&limit=8

// Full URL
http://localhost:3000/api/doctors/nearby?latitude=28.5355&longitude=77.3910&maxDistance=50&limit=8
```

#### Step 3: Backend Processes Request

```javascript
// Backend receives:
req.query = {
  latitude: "28.5355",
  longitude: "77.3910",
  maxDistance: "50",
  limit: "8"
}

// Parsed values:
const latitude = 28.5355;      // parseFloat("28.5355")
const longitude = 77.3910;     // parseFloat("77.3910")
const maxDistance = 50;        // parseFloat("50")
const maxDistanceMeters = 50000; // 50 * 1000
```

#### Step 4: MongoDB Query

```javascript
// MongoDB query executed:
Doctor.find({
  coordinates: {
    $near: {
      $geometry: {
        type: 'Point',
        coordinates: [77.3910, 28.5355] // [longitude, latitude]
      },
      $maxDistance: 50000 // 50km in meters
    }
  }
})
```

#### Step 5: Database Example Data

**Doctor Documents in MongoDB:**

```javascript
// Doctor 1 - Within 50km
{
  _id: "doctor1",
  name: "Dr. Sara Ikram",
  coordinates: {
    type: "Point",
    coordinates: [77.3920, 28.5360] // ~1km away from user
  },
  rating: 4.5
}

// Doctor 2 - Within 50km
{
  _id: "doctor2",
  name: "Dr. Joseph",
  coordinates: {
    type: "Point",
    coordinates: [77.4000, 28.5400] // ~10km away from user
  },
  rating: 4.7
}

// Doctor 3 - Outside 50km (NOT returned)
{
  _id: "doctor3",
  name: "Dr. Far Away",
  coordinates: {
    type: "Point",
    coordinates: [77.5000, 28.6000] // ~60km away from user
  },
  rating: 4.8
}
```

#### Step 6: MongoDB Calculates Distances

MongoDB automatically calculates distances using the Haversine formula:

| Doctor | Coordinates | Distance from User (28.5355, 77.3910) | Returned? |
|--------|-------------|----------------------------------------|-----------|
| Dr. Sara Ikram | [77.3920, 28.5360] | ~1.1 km | ✅ Yes |
| Dr. Joseph | [77.4000, 28.5400] | ~9.8 km | ✅ Yes |
| Dr. Far Away | [77.5000, 28.6000] | ~62.3 km | ❌ No (>50km) |

#### Step 7: Results Sorted and Returned

```javascript
// MongoDB returns doctors sorted by distance (closest first)
// Then sorted by rating (highest first)

[
  {
    _id: "doctor1",
    name: "Dr. Sara Ikram",
    coordinates: { type: "Point", coordinates: [77.3920, 28.5360] },
    rating: 4.5,
    // ... other fields
  },
  {
    _id: "doctor2",
    name: "Dr. Joseph",
    coordinates: { type: "Point", coordinates: [77.4000, 28.5400] },
    rating: 4.7,
    // ... other fields
  }
]
```

#### Step 8: Backend Response

```json
{
  "success": true,
  "data": [
    {
      "_id": "doctor1",
      "name": "Dr. Sara Ikram",
      "rating": 4.5,
      "coordinates": {
        "type": "Point",
        "coordinates": [77.3920, 28.5360]
      }
    },
    {
      "_id": "doctor2",
      "name": "Dr. Joseph",
      "rating": 4.7,
      "coordinates": {
        "type": "Point",
        "coordinates": [77.4000, 28.5400]
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 8,
    "total": 2,
    "totalPages": 1
  }
}
```

---

## Distance Calculation Details

### Haversine Formula

MongoDB uses the Haversine formula to calculate distances on a sphere (Earth):

```
a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlon/2)
c = 2 × atan2(√a, √(1−a))
distance = R × c
```

Where:
- `R` = Earth's radius (6,371 km)
- `Δlat` = difference in latitude
- `Δlon` = difference in longitude

### Example Calculation

**User Location**: Noida (28.5355, 77.3910)  
**Doctor Location**: Delhi (28.6139, 77.2090)

```
Distance ≈ 20.5 km
```

### MongoDB 2dsphere Index

The `2dsphere` index enables efficient geospatial queries:

```javascript
// In Doctor model
doctorSchema.index({ coordinates: '2dsphere' });
```

This index:
- Enables `$near` queries
- Calculates distances automatically
- Sorts results by distance
- Optimizes query performance

---

## Fallback Behavior

### If Location Not Provided

```javascript
// Frontend: User denies location permission
// OR: Browser doesn't support geolocation

// Request sent:
GET /api/doctors/nearby?limit=8

// Backend response:
{
  "success": true,
  "data": [...all doctors sorted by rating...],
  "message": "Location not provided. Showing all doctors."
}
```

---

## Testing the API

### Using cURL

```bash
# With location
curl "http://localhost:3000/api/doctors/nearby?latitude=28.5355&longitude=77.3910&maxDistance=50&limit=8"

# Without location (fallback)
curl "http://localhost:3000/api/doctors/nearby?limit=8"
```

### Using Postman

**Request:**
- Method: `GET`
- URL: `http://localhost:3000/api/doctors/nearby`
- Query Params:
  - `latitude`: `28.5355`
  - `longitude`: `77.3910`
  - `maxDistance`: `50`
  - `limit`: `8`

---

## Summary Flow

```
1. User visits doctors page
   ↓
2. Browser requests location permission
   ↓
3. User grants permission
   ↓
4. Browser returns: { latitude: 28.5355, longitude: 77.3910 }
   ↓
5. Frontend sends: GET /api/doctors/nearby?latitude=28.5355&longitude=77.3910&maxDistance=50
   ↓
6. Backend parses: latitude=28.5355, longitude=77.3910, maxDistance=50km
   ↓
7. MongoDB query: Find doctors within 50km of [77.3910, 28.5355]
   ↓
8. MongoDB calculates distances and returns closest doctors
   ↓
9. Backend sorts by rating and returns results
   ↓
10. Frontend displays nearby doctors
```

---

## Key Points to Remember

1. **Coordinate Format**: 
   - Frontend sends: `latitude, longitude` (separate query params)
   - MongoDB stores: `[longitude, latitude]` (array in GeoJSON)

2. **Distance Units**:
   - Frontend sends: Kilometers (e.g., `maxDistance=50`)
   - MongoDB uses: Meters (e.g., `$maxDistance: 50000`)

3. **Index Required**: 
   - `2dsphere` index must exist on `coordinates` field
   - Created automatically by Mongoose schema

4. **Fallback**: 
   - If location not provided, returns all doctors sorted by rating

5. **Sorting**: 
   - MongoDB `$near` automatically sorts by distance (closest first)
   - Additional sorting by rating applied after distance calculation

