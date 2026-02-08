import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Doctor from '../models/Doctor.js';
import { connectDB } from '../config/database.js';

// Load environment variables
dotenv.config();

// Sample doctor data with all fields
const doctorsData = [
  {
    name: 'Dr. Sarah Johnson',
    email: 'sarah.johnson@jensei.com',
    specialty: 'Cardiologist',
    gender: 'female',
    experience: 12,
    patientStories: 1250,
    rating: 4.8,
    location: 'Delhi, NCR',
    coordinates: {
      type: 'Point',
      coordinates: [77.2090, 28.6139], // [longitude, latitude]
    },
    image: 'https://jensei-images.s3.ap-south-1.amazonaws.com/doctors-images/doctor-1.png',
    badge: 'Top Rated',
    fee: 1500,
    biography: 'Dr. Sarah Johnson is a renowned cardiologist with over 12 years of experience in treating cardiovascular diseases. She specializes in interventional cardiology and has successfully performed over 2000 cardiac procedures. Her expertise includes heart failure management, cardiac rehabilitation, and preventive cardiology.',
    specialization: ['Interventional Cardiology', 'Heart Failure', 'Cardiac Rehabilitation', 'Preventive Cardiology'],
    qualifications: 'MBBS, MD (Cardiology), DM (Cardiology), FACC',
    totalConsultations: 3500,
    officeAddress: '123 Medical Center, Connaught Place, New Delhi - 110001',
    phoneNumber: '+91 9876543210',
    officePhoneNumber: '+91 22 12345678',
  },
  {
    name: 'Dr. Rajesh Kumar',
    email: 'rajesh.kumar@jensei.com',
    specialty: 'Neurologist',
    gender: 'male',
    experience: 15,
    patientStories: 2100,
    rating: 4.9,
    location: 'Gurugram, Haryana',
    coordinates: {
      type: 'Point',
      coordinates: [77.0266, 28.4089],
    },
    image: 'https://jensei-images.s3.ap-south-1.amazonaws.com/doctors-images/doctor-2.png',
    badge: 'Recommended',
    fee: 2000,
    biography: 'Dr. Rajesh Kumar is a leading neurologist specializing in stroke management, epilepsy, and movement disorders. With 15 years of experience, he has treated thousands of patients with neurological conditions. He is known for his patient-centric approach and innovative treatment methods.',
    specialization: ['Stroke Management', 'Epilepsy', 'Movement Disorders', 'Headache Management'],
    qualifications: 'MBBS, MD (Medicine), DM (Neurology), FIAN',
    totalConsultations: 4200,
    officeAddress: '456 Neurology Clinic, Sector 29, Gurugram - 122001',
    phoneNumber: '+91 9876543211',
    officePhoneNumber: '+91 11 23456789',
  },
  {
    name: 'Dr. Priya Sharma',
    email: 'priya.sharma@jensei.com',
    specialty: 'Pediatrician',
    gender: 'female',
    experience: 8,
    patientStories: 890,
    rating: 4.7,
    location: 'Noida, Uttar Pradesh',
    coordinates: {
      type: 'Point',
      coordinates: [77.3910, 28.5355],
    },
    image: 'https://jensei-images.s3.ap-south-1.amazonaws.com/doctors-images/doctor-1.png',
    badge: null,
    fee: 800,
    biography: 'Dr. Priya Sharma is a dedicated pediatrician with expertise in child development, vaccination, and common childhood illnesses. She is known for her compassionate approach towards children and their families. With 8 years of experience, she has helped thousands of children lead healthy lives.',
    specialization: ['Child Development', 'Vaccination', 'Pediatric Nutrition', 'Newborn Care'],
    qualifications: 'MBBS, MD (Pediatrics), DNB (Pediatrics)',
    totalConsultations: 1800,
    officeAddress: '789 Children\'s Hospital, Sector 62, Noida - 201301',
    phoneNumber: '+91 9876543212',
    officePhoneNumber: '+91 80 34567890',
  },
  {
    name: 'Dr. Amit Patel',
    email: 'amit.patel@jensei.com',
    specialty: 'Orthopedic Surgeon',
    gender: 'male',
    experience: 18,
    patientStories: 3200,
    rating: 4.9,
    location: 'Delhi, NCR',
    coordinates: {
      type: 'Point',
      coordinates: [77.2150, 28.6200],
    },
    image: 'https://jensei-images.s3.ap-south-1.amazonaws.com/doctors-images/doctor-1.png',
    badge: 'Top Rated',
    fee: 2500,
    biography: 'Dr. Amit Patel is a highly experienced orthopedic surgeon specializing in joint replacement, sports medicine, and trauma surgery. He has performed over 5000 successful surgeries and is recognized for his expertise in minimally invasive procedures. His patients appreciate his thorough approach and excellent outcomes.',
    specialization: ['Joint Replacement', 'Sports Medicine', 'Trauma Surgery', 'Arthroscopy'],
    qualifications: 'MBBS, MS (Orthopedics), MCh (Orthopedics), FACS',
    totalConsultations: 5500,
    officeAddress: '321 Orthopedic Center, Greater Kailash, New Delhi - 110048',
    phoneNumber: '+91 9876543213',
    officePhoneNumber: '+91 20 45678901',
  },
  {
    name: 'Dr. Ananya Reddy',
    email: 'ananya.reddy@jensei.com',
    specialty: 'Dermatologist',
    gender: 'female',
    experience: 10,
    patientStories: 1650,
    rating: 4.6,
    location: 'Gurugram, Haryana',
    coordinates: {
      type: 'Point',
      coordinates: [77.0300, 28.4150],
    },
    image: 'https://jensei-images.s3.ap-south-1.amazonaws.com/doctors-images/doctor-2.png',
    badge: 'Recommended',
    fee: 1200,
    biography: 'Dr. Ananya Reddy is a skilled dermatologist specializing in cosmetic dermatology, acne treatment, and skin cancer detection. She combines medical expertise with aesthetic treatments to provide comprehensive skin care. With 10 years of experience, she has helped thousands of patients achieve healthy, glowing skin.',
    specialization: ['Cosmetic Dermatology', 'Acne Treatment', 'Skin Cancer', 'Hair Disorders'],
    qualifications: 'MBBS, MD (Dermatology), DNB (Dermatology), IADVL',
    totalConsultations: 2800,
    officeAddress: '654 Skin Care Clinic, DLF Phase 1, Gurugram - 122002',
    phoneNumber: '+91 9876543214',
    officePhoneNumber: '+91 40 56789012',
  },
  {
    name: 'Dr. Vikram Singh',
    email: 'vikram.singh@jensei.com',
    specialty: 'Cardiologist',
    gender: 'male',
    experience: 14,
    patientStories: 1800,
    rating: 4.8,
    location: 'Noida, Uttar Pradesh',
    coordinates: {
      type: 'Point',
      coordinates: [77.3950, 28.5400],
    },
    image: 'https://jensei-images.s3.ap-south-1.amazonaws.com/doctors-images/doctor-1.png',
    badge: 'Top Rated',
    fee: 1800,
    biography: 'Dr. Vikram Singh is an accomplished cardiologist with 14 years of experience in treating complex cardiac conditions. He specializes in cardiac catheterization, angioplasty, and pacemaker implantation. His dedication to patient care and clinical excellence has earned him recognition in the medical community.',
    specialization: ['Cardiac Catheterization', 'Angioplasty', 'Pacemaker Implantation', 'Heart Disease Prevention'],
    qualifications: 'MBBS, MD (Cardiology), DM (Cardiology), FSCAI',
    totalConsultations: 4500,
    officeAddress: '987 Heart Care Center, Sector 18, Noida - 201301',
    phoneNumber: '+91 9876543215',
    officePhoneNumber: '+91 44 67890123',
  },
  {
    name: 'Dr. Meera Nair',
    email: 'meera.nair@jensei.com',
    specialty: 'Gynecologist',
    gender: 'female',
    experience: 11,
    patientStories: 1950,
    rating: 4.7,
    location: 'Delhi, NCR',
    coordinates: {
      type: 'Point',
      coordinates: [77.2200, 28.6250],
    },
    image: 'https://jensei-images.s3.ap-south-1.amazonaws.com/doctors-images/doctor-2.png',
    badge: 'Recommended',
    fee: 1400,
    biography: 'Dr. Meera Nair is a compassionate gynecologist with 11 years of experience in women\'s health care. She specializes in high-risk pregnancies, infertility treatment, and minimally invasive gynecological surgeries. Her empathetic approach and clinical expertise have made her a trusted healthcare provider.',
    specialization: ['High-Risk Pregnancy', 'Infertility Treatment', 'Laparoscopic Surgery', 'Menopause Management'],
    qualifications: 'MBBS, MD (Obstetrics & Gynecology), DGO, FICOG',
    totalConsultations: 3800,
    officeAddress: '456 Women\'s Health Clinic, Lajpat Nagar, New Delhi - 110024',
    phoneNumber: '+91 9876543216',
    officePhoneNumber: '+91 33 78901234',
  },
  {
    name: 'Dr. Arjun Mehta',
    email: 'arjun.mehta@jensei.com',
    specialty: 'Psychiatrist',
    gender: 'male',
    experience: 13,
    patientStories: 1450,
    rating: 4.6,
    location: 'Gurugram, Haryana',
    coordinates: {
      type: 'Point',
      coordinates: [77.0350, 28.4200],
    },
    image: 'https://jensei-images.s3.ap-south-1.amazonaws.com/doctors-images/doctor-2.png',
    badge: 'Recommended',
    fee: 1600,
    biography: 'Dr. Arjun Mehta is a dedicated psychiatrist with 13 years of experience in mental health care. He specializes in treating depression, anxiety disorders, and addiction. His holistic approach combines medication management with psychotherapy to provide comprehensive mental health treatment.',
    specialization: ['Depression Treatment', 'Anxiety Disorders', 'Addiction Medicine', 'Cognitive Behavioral Therapy'],
    qualifications: 'MBBS, MD (Psychiatry), DPM, MRC Psych',
    totalConsultations: 2900,
    officeAddress: '789 Mental Health Center, Sector 14, Gurugram - 122001',
    phoneNumber: '+91 9876543217',
    officePhoneNumber: '+91 79 89012345',
  },
  {
    name: 'Dr. Kavita Desai',
    email: 'kavita.desai@jensei.com',
    specialty: 'Pediatrician',
    gender: 'female',
    experience: 9,
    patientStories: 1100,
    rating: 4.8,
    location: 'Noida, Uttar Pradesh',
    coordinates: {
      type: 'Point',
      coordinates: [77.4000, 28.5450],
    },
    image: 'https://jensei-images.s3.ap-south-1.amazonaws.com/doctors-images/doctor-2.png',
    badge: 'Top Rated',
    fee: 1000,
    biography: 'Dr. Kavita Desai is an experienced pediatrician with 9 years of practice specializing in pediatric emergency care and developmental pediatrics. She is known for her gentle approach with children and her ability to explain complex medical conditions to parents in simple terms.',
    specialization: ['Pediatric Emergency', 'Developmental Pediatrics', 'Adolescent Medicine', 'Pediatric Allergy'],
    qualifications: 'MBBS, MD (Pediatrics), DCH, MRCPCH',
    totalConsultations: 2200,
    officeAddress: '321 Child Care Hospital, Sector 51, Noida - 201301',
    phoneNumber: '+91 9876543218',
    officePhoneNumber: '+91 141 90123456',
  },
  {
    name: 'Dr. Rohan Kapoor',
    email: 'rohan.kapoor@jensei.com',
    specialty: 'Orthopedic Surgeon',
    gender: 'male',
    experience: 16,
    patientStories: 2800,
    rating: 4.9,
    location: 'Delhi, NCR',
    coordinates: {
      type: 'Point',
      coordinates: [77.2250, 28.6300],
    },
    image: 'https://jensei-images.s3.ap-south-1.amazonaws.com/doctors-images/doctor-2.png',
    badge: 'Top Rated',
    fee: 2200,
    biography: 'Dr. Rohan Kapoor is a renowned orthopedic surgeon with 16 years of experience in joint replacement and spine surgery. He has performed over 4000 successful surgeries and is known for his expertise in robotic-assisted joint replacement. His patients appreciate his attention to detail and excellent surgical outcomes.',
    specialization: ['Robotic Joint Replacement', 'Spine Surgery', 'Sports Injury', 'Arthroscopic Surgery'],
    qualifications: 'MBBS, MS (Orthopedics), MCh (Orthopedics), FRCS',
    totalConsultations: 4800,
    officeAddress: '654 Orthopedic Institute, Vasant Kunj, New Delhi - 110070',
    phoneNumber: '+91 9876543219',
    officePhoneNumber: '+91 172 01234567',
  },
  {
    name: 'Dr. Sneha Iyer',
    email: 'sneha.iyer@jensei.com',
    specialty: 'Dermatologist',
    gender: 'female',
    experience: 7,
    patientStories: 950,
    rating: 4.5,
    location: 'Gurugram, Haryana',
    coordinates: {
      type: 'Point',
      coordinates: [77.0400, 28.4250],
    },
    image: 'https://jensei-images.s3.ap-south-1.amazonaws.com/doctors-images/doctor-2.png',
    badge: null,
    fee: 1100,
    biography: 'Dr. Sneha Iyer is a skilled dermatologist with 7 years of experience in medical and cosmetic dermatology. She specializes in treating skin conditions like psoriasis, eczema, and vitiligo. Her approach combines traditional treatments with modern techniques to achieve the best results for her patients.',
    specialization: ['Medical Dermatology', 'Psoriasis Treatment', 'Eczema Management', 'Vitiligo Treatment'],
    qualifications: 'MBBS, MD (Dermatology), DNB (Dermatology)',
    totalConsultations: 1900,
    officeAddress: '987 Skin & Hair Clinic, Sector 43, Gurugram - 122002',
    phoneNumber: '+91 9876543220',
    officePhoneNumber: '+91 484 12345678',
  },
  {
    name: 'Dr. Manish Tiwari',
    email: 'manish.tiwari@jensei.com',
    specialty: 'Neurologist',
    gender: 'male',
    experience: 12,
    patientStories: 1750,
    rating: 4.7,
    location: 'Noida, Uttar Pradesh',
    coordinates: {
      type: 'Point',
      coordinates: [77.4050, 28.5500],
    },
    image: 'https://jensei-images.s3.ap-south-1.amazonaws.com/doctors-images/doctor-2.png',
    badge: 'Recommended',
    fee: 1900,
    biography: 'Dr. Manish Tiwari is an accomplished neurologist with 12 years of experience in treating neurological disorders. He specializes in epilepsy management, multiple sclerosis, and neurocritical care. His research contributions and clinical expertise have made him a respected figure in the neurology community.',
    specialization: ['Epilepsy Management', 'Multiple Sclerosis', 'Neurocritical Care', 'Neuromuscular Disorders'],
    qualifications: 'MBBS, MD (Neurology), DM (Neurology), FIAN',
    totalConsultations: 3500,
    officeAddress: '123 Neuro Care Center, Sector 63, Noida - 201301',
    phoneNumber: '+91 9876543221',
    officePhoneNumber: '+91 522 23456789',
  },
  {
    name: 'Dr. Nisha Agarwal',
    email: 'nisha.agarwal@jensei.com',
    specialty: 'Gynecologist',
    gender: 'female',
    experience: 10,
    patientStories: 1600,
    rating: 4.6,
    location: 'Delhi, NCR',
    coordinates: {
      type: 'Point',
      coordinates: [77.2300, 28.6350],
    },
    image: 'https://jensei-images.s3.ap-south-1.amazonaws.com/doctors-images/doctor-2.png',
    badge: 'Recommended',
    fee: 1300,
    biography: 'Dr. Nisha Agarwal is a dedicated gynecologist with 10 years of experience in women\'s reproductive health. She specializes in laparoscopic gynecological surgeries, PCOS management, and adolescent gynecology. Her compassionate care and surgical skills have helped thousands of women.',
    specialization: ['Laparoscopic Surgery', 'PCOS Management', 'Adolescent Gynecology', 'Reproductive Endocrinology'],
    qualifications: 'MBBS, MD (Obstetrics & Gynecology), DGO, FMAS',
    totalConsultations: 3200,
    officeAddress: '456 Women\'s Wellness Center, Saket, New Delhi - 110017',
    phoneNumber: '+91 9876543222',
    officePhoneNumber: '+91 731 34567890',
  },
  {
    name: 'Dr. Aditya Khanna',
    email: 'aditya.khanna@jensei.com',
    specialty: 'General Physician',
    gender: 'male',
    experience: 11,
    patientStories: 2200,
    rating: 4.5,
    location: 'Gurugram, Haryana',
    coordinates: {
      type: 'Point',
      coordinates: [77.0450, 28.4300],
    },
    image: 'https://jensei-images.s3.ap-south-1.amazonaws.com/doctors-images/doctor-2.png',
    badge: null,
    fee: 900,
    biography: 'Dr. Aditya Khanna is an experienced general physician with 11 years of practice in primary care and preventive medicine. He specializes in managing chronic diseases like diabetes, hypertension, and thyroid disorders. His holistic approach focuses on preventive care and patient education.',
    specialization: ['Diabetes Management', 'Hypertension Care', 'Thyroid Disorders', 'Preventive Medicine'],
    qualifications: 'MBBS, MD (General Medicine), DNB (General Medicine)',
    totalConsultations: 4400,
    officeAddress: '789 Primary Care Clinic, Sector 56, Gurugram - 122011',
    phoneNumber: '+91 9876543223',
    officePhoneNumber: '+91 712 45678901',
  },
  {
    name: 'Dr. Radhika Sinha',
    email: 'radhika.sinha@jensei.com',
    specialty: 'Psychiatrist',
    gender: 'female',
    experience: 9,
    patientStories: 1200,
    rating: 4.6,
    location: 'Noida, Uttar Pradesh',
    coordinates: {
      type: 'Point',
      coordinates: [77.4100, 28.5550],
    },
    image: 'https://jensei-images.s3.ap-south-1.amazonaws.com/doctors-images/doctor-2.png',
    badge: null,
    fee: 1500,
    biography: 'Dr. Radhika Sinha is a compassionate psychiatrist with 9 years of experience in mental health care. She specializes in child and adolescent psychiatry, mood disorders, and trauma therapy. Her patient-centered approach and expertise in various therapeutic modalities have helped many patients recover.',
    specialization: ['Child Psychiatry', 'Adolescent Mental Health', 'Mood Disorders', 'Trauma Therapy'],
    qualifications: 'MBBS, MD (Psychiatry), DPM, DNB (Psychiatry)',
    totalConsultations: 2400,
    officeAddress: '321 Mental Wellness Center, Sector 104, Noida - 201304',
    phoneNumber: '+91 9876543224',
    officePhoneNumber: '+91 755 56789012',
  },
  {
    name: 'Dr. Varun Malhotra',
    email: 'varun.malhotra@jensei.com',
    specialty: 'Cardiologist',
    gender: 'male',
    experience: 13,
    patientStories: 1950,
    rating: 4.8,
    location: 'Delhi, NCR',
    coordinates: {
      type: 'Point',
      coordinates: [77.2350, 28.6400],
    },
    image: 'https://jensei-images.s3.ap-south-1.amazonaws.com/doctors-images/doctor-2.png',
    badge: 'Top Rated',
    fee: 1700,
    biography: 'Dr. Varun Malhotra is a skilled cardiologist with 13 years of experience in interventional cardiology and cardiac imaging. He has performed numerous successful angioplasties and cardiac procedures. His expertise in advanced cardiac imaging techniques helps in accurate diagnosis and treatment planning.',
    specialization: ['Interventional Cardiology', 'Cardiac Imaging', 'Echocardiography', 'Cardiac Rehabilitation'],
    qualifications: 'MBBS, MD (Cardiology), DM (Cardiology), FSCAI',
    totalConsultations: 3900,
    officeAddress: '654 Heart Institute, Dwarka, New Delhi - 110075',
    phoneNumber: '+91 9876543225',
    officePhoneNumber: '+91 261 67890123',
  },
];

const seedDoctors = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Clear existing doctors (optional - comment out if you want to keep existing data)
    const deleteResult = await Doctor.deleteMany({});
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing doctors`);

    // Insert doctors
    const doctors = await Doctor.insertMany(doctorsData);
    console.log(`✅ Successfully seeded ${doctors.length} doctors`);

    // Display summary
    console.log('\n📊 Summary:');
    console.log(`Total doctors: ${doctors.length}`);
    
    const bySpecialty = doctors.reduce((acc, doc) => {
      acc[doc.specialty] = (acc[doc.specialty] || 0) + 1;
      return acc;
    }, {});
    console.log('\nBy Specialty:');
    Object.entries(bySpecialty).forEach(([specialty, count]) => {
      console.log(`  ${specialty}: ${count}`);
    });

    const byGender = doctors.reduce((acc, doc) => {
      acc[doc.gender] = (acc[doc.gender] || 0) + 1;
      return acc;
    }, {});
    console.log('\nBy Gender:');
    Object.entries(byGender).forEach(([gender, count]) => {
      console.log(`  ${gender}: ${count}`);
    });

    const withBadges = doctors.filter(doc => doc.badge).length;
    console.log(`\nDoctors with badges: ${withBadges}`);

    // Display sample doctor IDs for reference
    console.log('\n📋 Sample Doctor IDs (for testing):');
    doctors.slice(0, 3).forEach((doc, index) => {
      console.log(`  ${index + 1}. ${doc.name} (${doc.specialty}): ${doc._id}`);
    });

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding doctors:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the seed function
seedDoctors();
