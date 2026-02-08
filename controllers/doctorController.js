import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Doctor from '../models/Doctor.js';
import TimeSlot from '../models/TimeSlot.js';

/* Load raw doctor profile page data for DoctorsProfile component */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let DOCTOR_PROFILE_PAGE_RAW = { default: {} };
try {
  const rawPath = path.join(__dirname, '../data/doctorProfilePageRaw.json');
  const rawContent = fs.readFileSync(rawPath, 'utf-8');
  DOCTOR_PROFILE_PAGE_RAW = JSON.parse(rawContent);
} catch (e) {
  console.warn('doctorProfilePageRaw.json not found or invalid:', e?.message);
}

// Helper function to parse pagination parameters
const getPaginationParams = (req) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 8, 50); // Default 8, max 50
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

// Helper function to calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

// Get affordable doctors (filtered by max fee)
export const getAffordableDoctors = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const maxFee = parseFloat(req.query.maxFee) || 1000; // Default max fee: 1000

    const query = { fee: { $lte: maxFee } };
    const doctors = await Doctor.find(query)
      .sort({ fee: 1, rating: -1 }) // Sort by fee (ascending) then rating
      .skip(skip)
      .limit(limit);

    const total = await Doctor.countDocuments(query);

    res.json({
      success: true,
      data: doctors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get affordable doctors error:', error);
    res.status(500).json({ error: 'Server error while fetching affordable doctors' });
  }
};

// Get nearby doctors (based on user's geolocation)
export const getNearbyDoctors = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const latitude = parseFloat(req.query.latitude);
    const longitude = parseFloat(req.query.longitude);
    const maxDistance = parseFloat(req.query.maxDistance) || 25; // Default: 25km

    // If coordinates are not provided, return error or all doctors sorted by rating
    if (!latitude || !longitude) {
      // Fallback: return all doctors sorted by rating
      const doctors = await Doctor.find()
        .sort({ rating: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Doctor.countDocuments();

      return res.json({
        success: true,
        data: doctors,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        message: 'Location not provided. Showing all doctors.',
      });
    }

    // Use MongoDB aggregation with $geoNear to find nearby doctors
    // $geoNear allows additional sorting after distance calculation
    const doctors = await Doctor.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [longitude, latitude], // MongoDB uses [longitude, latitude]
          },
          distanceField: 'distance', // Add distance field to results (in meters)
          maxDistance: maxDistance * 1000, // Convert km to meters
          spherical: true, // Use spherical geometry for accurate calculations
        },
      },
      {
        $sort: { rating: -1, distance: 1 }, // Sort by rating first, then distance
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ]);

    // Calculate total count for nearby doctors using $geoWithin
    const total = await Doctor.countDocuments({
      coordinates: {
        $geoWithin: {
          $centerSphere: [
            [longitude, latitude],
            maxDistance / 6378.1, // Convert km to radians (Earth's radius in km)
          ],
        },
      },
    });

    res.json({
      success: true,
      data: doctors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get nearby doctors error:', error);
    res.status(500).json({ error: 'Server error while fetching nearby doctors' });
  }
};

// Helper function to parse experience filter
const parseExperienceFilter = (experienceFilter) => {
  if (!experienceFilter) return null;

  // Handle different experience formats
  if (experienceFilter === '1-3 years') {
    return { min: 1, max: 3 };
  } else if (experienceFilter === '3-5 years') {
    return { min: 3, max: 5 };
  } else if (experienceFilter === '5-10 years') {
    return { min: 5, max: 10 };
  } else if (experienceFilter === '10+ years') {
    return { min: 10, max: null };
  } else if (experienceFilter === '15+ years') {
    return { min: 15, max: null };
  }
  return null;
};

// Helper function to map gender filter
const mapGenderFilter = (genderFilter) => {
  if (!genderFilter) return null;
  
  const genderMap = {
    'Male': 'male',
    'Female': 'female',
    'Prefer not to say': 'others',
    'Any': null, // Return null to skip gender filtering
  };
  
  return genderMap[genderFilter] || genderFilter.toLowerCase();
};

// Get doctor by ID (merged with raw profile data for DoctorProfile page)
export const getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Doctor ID is required' });
    }

    let doctor = await Doctor.findById(id);
    const idStr = String(id);
    const rawProfile = DOCTOR_PROFILE_PAGE_RAW[idStr] || DOCTOR_PROFILE_PAGE_RAW.default || {};

    if (!doctor) {
      // Fallback: return raw default data for demo when doctor not in DB
      if (Object.keys(rawProfile).length > 0) {
        return res.json({
          success: true,
          data: { _id: id, ...rawProfile },
        });
      }
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const data = doctor.toObject();
    const merged = { ...data, ...rawProfile };

    res.json({
      success: true,
      data: merged,
    });
  } catch (error) {
    console.error('Get doctor by ID error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid doctor ID format' });
    }
    res.status(500).json({ error: 'Server error while fetching doctor' });
  }
};

// Get all doctors with filtering
export const getAllDoctors = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    
    // Extract filter parameters from query
    const { specialist, location, experience, gender } = req.query;
    
    // Build query object
    const query = {};
    
    // Filter by specialist (specialty)
    if (specialist) {
      query.specialty = specialist;
    }
    
    // Filter by location
    if (location) {
      // Use case-insensitive regex for partial matching
      query.location = { $regex: location, $options: 'i' };
    }
    
    // Filter by experience
    if (experience) {
      const expRange = parseExperienceFilter(experience);
      if (expRange) {
        if (expRange.max !== null) {
          query.experience = { $gte: expRange.min, $lte: expRange.max };
        } else {
          query.experience = { $gte: expRange.min };
        }
      }
    }
    
    // Filter by gender
    if (gender) {
      const mappedGender = mapGenderFilter(gender);
      if (mappedGender) {
        query.gender = mappedGender;
      }
    }

    // Execute query with filters
    const doctors = await Doctor.find(query)
      .sort({ rating: -1, createdAt: -1 }) // Sort by rating then newest
      .skip(skip)
      .limit(limit);

    const total = await Doctor.countDocuments(query);

    res.json({
      success: true,
      data: doctors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        specialist: specialist || null,
        location: location || null,
        experience: experience || null,
        gender: gender || null,
      },
    });
  } catch (error) {
    console.error('Get all doctors error:', error);
    res.status(500).json({ error: 'Server error while fetching doctors' });
  }
};

// Create a new doctor
export const createDoctor = async (req, res) => {
  try {
    const {
      name,
      email,
      specialty,
      gender,
      experience,
      patientStories,
      rating,
      location,
      latitude,
      longitude,
      image,
      badge,
      fee,
      biography,
      specialization,
      qualifications,
      totalConsultations,
      officeAddress,
      phoneNumber,
      officePhoneNumber,
    } = req.body;

    // Validate required fields
    if (!name || !specialty || !gender || experience === undefined || !rating || !location || !image || fee === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, specialty, gender, experience, rating, location, image, and fee are required' 
      });
    }

    // Validate coordinates if provided
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ 
        error: 'Latitude and longitude are required for doctor location' 
      });
    }

    // Validate gender enum
    if (!['male', 'female', 'others'].includes(gender)) {
      return res.status(400).json({ 
        error: 'Gender must be one of: male, female, others' 
      });
    }

    // Validate rating range
    if (rating < 0 || rating > 5) {
      return res.status(400).json({ 
        error: 'Rating must be between 0 and 5' 
      });
    }

    // Validate experience
    if (experience < 0) {
      return res.status(400).json({ 
        error: 'Experience cannot be negative' 
      });
    }

    // Create doctor object
    const doctorData = {
      name: name.trim(),
      email: email ? email.toLowerCase().trim() : undefined,
      specialty: specialty.trim(),
      gender,
      experience: Number(experience),
      patientStories: patientStories ? Number(patientStories) : 0,
      rating: Number(rating),
      location: location.trim(),
      coordinates: {
        type: 'Point',
        coordinates: [Number(longitude), Number(latitude)], // MongoDB uses [longitude, latitude]
      },
      image: image.trim(), // S3 URL
      badge: badge && ['Recommended', 'Top Rated'].includes(badge) ? badge : null,
      fee: Number(fee),
      biography: biography || '',
      specialization: Array.isArray(specialization) ? specialization : [],
      qualifications: qualifications || '',
      totalConsultations: totalConsultations ? Number(totalConsultations) : 0,
      officeAddress: officeAddress || '',
      phoneNumber: phoneNumber || '',
      officePhoneNumber: officePhoneNumber || '',
    };

    // Create doctor
    const doctor = new Doctor(doctorData);
    await doctor.save();

    res.status(201).json({
      success: true,
      message: 'Doctor created successfully',
      data: doctor,
    });
  } catch (error) {
    console.error('Create doctor error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Validation error', 
        details: errors 
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({ 
        error: 'Doctor with this email already exists' 
      });
    }

    res.status(500).json({ error: 'Server error while creating doctor' });
  }
};

// Get doctor by email
export const getDoctorByEmail = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const doctor = await Doctor.findOne({ email: normalizedEmail });

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found with this email' });
    }

    res.json({
      success: true,
      data: doctor,
    });
  } catch (error) {
    console.error('Get doctor by email error:', error);
    res.status(500).json({ error: 'Server error while fetching doctor' });
  }
};

// Update doctor by ID
export const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      specialty,
      gender,
      experience,
      patientStories,
      rating,
      location,
      latitude,
      longitude,
      image,
      badge,
      fee,
      biography,
      specialization,
      qualifications,
      totalConsultations,
      officeAddress,
      phoneNumber,
      officePhoneNumber,
    } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Doctor ID is required' });
    }

    // Find doctor
    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    // Build update object with only provided fields
    const updateData = {};

    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.toLowerCase().trim();
    if (specialty !== undefined) updateData.specialty = specialty.trim();
    if (gender !== undefined) {
      if (!['male', 'female', 'others'].includes(gender)) {
        return res.status(400).json({ error: 'Gender must be one of: male, female, others' });
      }
      updateData.gender = gender;
    }
    if (experience !== undefined) {
      if (experience < 0) {
        return res.status(400).json({ error: 'Experience cannot be negative' });
      }
      updateData.experience = Number(experience);
    }
    if (patientStories !== undefined) updateData.patientStories = Number(patientStories);
    if (rating !== undefined) {
      if (rating < 0 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 0 and 5' });
      }
      updateData.rating = Number(rating);
    }
    if (location !== undefined) updateData.location = location.trim();
    if (latitude !== undefined && longitude !== undefined) {
      updateData.coordinates = {
        type: 'Point',
        coordinates: [Number(longitude), Number(latitude)],
      };
    }
    if (image !== undefined) updateData.image = image.trim();
    if (badge !== undefined) {
      updateData.badge = badge && ['Recommended', 'Top Rated'].includes(badge) ? badge : null;
    }
    if (fee !== undefined) updateData.fee = Number(fee);
    if (biography !== undefined) updateData.biography = biography;
    if (specialization !== undefined) {
      updateData.specialization = Array.isArray(specialization) ? specialization : [];
    }
    if (qualifications !== undefined) updateData.qualifications = qualifications;
    if (totalConsultations !== undefined) updateData.totalConsultations = Number(totalConsultations);
    if (officeAddress !== undefined) updateData.officeAddress = officeAddress;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (officePhoneNumber !== undefined) updateData.officePhoneNumber = officePhoneNumber;

    // Update doctor
    const updatedDoctor = await Doctor.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Doctor updated successfully',
      data: updatedDoctor,
    });
  } catch (error) {
    console.error('Update doctor error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Validation error', 
        details: errors 
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid doctor ID format' });
    }

    res.status(500).json({ error: 'Server error while updating doctor' });
  }
};

// Delete doctor by ID
export const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Doctor ID is required' });
    }

    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    // Delete all time slots for this doctor
    const timeSlotsDeleted = await TimeSlot.deleteMany({ doctorId: id });
    console.log(`Deleted ${timeSlotsDeleted.deletedCount} time slots for doctor ${id}`);

    // Delete the doctor
    await Doctor.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Doctor and time slots deleted successfully',
      data: {
        id: doctor._id,
        name: doctor.name,
        deletedTimeSlots: timeSlotsDeleted.deletedCount,
      },
    });
  } catch (error) {
    console.error('Delete doctor error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid doctor ID format' });
    }

    res.status(500).json({ error: 'Server error while deleting doctor' });
  }
};


