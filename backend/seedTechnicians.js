const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Technician = require('./models/Technician');

const technicians = [
  // ── Plumbers ──────────────────────────────────────────────────────────────
  {
    name: 'Ali Hassan',
    email: 'ali.plumber@fixitnow.com',
    password: 'test1234',
    role: 'technician',
    phone: '03001234567',
    skill: 'Plumber',
    location: 'Lahore',
    lat: 31.5204, lng: 74.3587,
    price: 800,
    rating: 4.5, reviews: 34, experience: 6, jobsDone: 120,
    description: 'Expert plumber specializing in pipe fitting, leakage repair, and bathroom installation.',
  },
  {
    name: 'Usman Tariq',
    email: 'usman.plumber@fixitnow.com',
    password: 'test1234',
    role: 'technician',
    phone: '03011234567',
    skill: 'Plumber',
    location: 'Lahore',
    lat: 31.5497, lng: 74.3436,
    price: 700,
    rating: 4.2, reviews: 20, experience: 4, jobsDone: 80,
    description: 'Experienced in water tank installation, drainage systems, and emergency plumbing.',
  },
  {
    name: 'Bilal Chaudhry',
    email: 'bilal.plumber@fixitnow.com',
    password: 'test1234',
    role: 'technician',
    phone: '03021234567',
    skill: 'Plumber',
    location: 'Lahore',
    lat: 31.5090, lng: 74.3290,
    price: 600,
    rating: 4.0, reviews: 15, experience: 3, jobsDone: 55,
    description: 'Affordable and reliable plumber for all home plumbing needs.',
  },

  // ── Carpenters ────────────────────────────────────────────────────────────
  {
    name: 'Kamran Malik',
    email: 'kamran.carpenter@fixitnow.com',
    password: 'test1234',
    role: 'technician',
    phone: '03031234567',
    skill: 'Carpenter',
    location: 'Lahore',
    lat: 31.5320, lng: 74.3600,
    price: 900,
    rating: 4.7, reviews: 45, experience: 8, jobsDone: 200,
    description: 'Skilled carpenter for furniture making, door fitting, and wooden flooring.',
  },
  {
    name: 'Shahid Iqbal',
    email: 'shahid.carpenter@fixitnow.com',
    password: 'test1234',
    role: 'technician',
    phone: '03041234567',
    skill: 'Carpenter',
    location: 'Lahore',
    lat: 31.5150, lng: 74.3450,
    price: 750,
    rating: 4.3, reviews: 28, experience: 5, jobsDone: 110,
    description: 'Specializes in custom cabinets, wardrobes, and kitchen woodwork.',
  },
  {
    name: 'Naveed Ahmad',
    email: 'naveed.carpenter@fixitnow.com',
    password: 'test1234',
    role: 'technician',
    phone: '03051234567',
    skill: 'Carpenter',
    location: 'Lahore',
    lat: 31.5400, lng: 74.3700,
    price: 650,
    rating: 4.1, reviews: 18, experience: 3, jobsDone: 70,
    description: 'Affordable carpenter for repairs, door locks, and basic woodwork.',
  },

  // ── Electricians ──────────────────────────────────────────────────────────
  {
    name: 'Faisal Rehman',
    email: 'faisal.electrician@fixitnow.com',
    password: 'test1234',
    role: 'technician',
    phone: '03061234567',
    skill: 'Electrician',
    location: 'Lahore',
    lat: 31.5250, lng: 74.3500,
    price: 1000,
    rating: 4.8, reviews: 60, experience: 10, jobsDone: 300,
    description: 'Certified electrician for wiring, panel upgrades, and electrical fault detection.',
  },

  {
    name: 'Imran Siddiqui',
    email: 'imran.ac@fixitnow.com',
    password: 'test1234',
    role: 'technician',
    phone: '03111234567',
    skill: 'AC Technician',
    location: 'Lahore',
    lat: 31.5260, lng: 74.3410,
    price: 1300,
    rating: 4.5, reviews: 44, experience: 7, jobsDone: 190,
    description: 'Handles all AC brands — Samsung, Haier, Gree, Dawlance. Emergency repair available.',
  },
  {
    name: 'Zubair Khan',
    email: 'zubair.electrician@fixitnow.com',
    password: 'test1234',
    role: 'technician',
    phone: '03071234567',
    skill: 'Electrician',
    location: 'Lahore',
    lat: 31.5350, lng: 74.3650,
    price: 850,
    rating: 4.4, reviews: 32, experience: 6, jobsDone: 150,
    description: 'Expert in inverter installation, UPS systems, and home wiring.',
  },
  {
    name: 'Irfan Butt',
    email: 'irfan.electrician@fixitnow.com',
    password: 'test1234',
    role: 'technician',
    phone: '03081234567',
    skill: 'Electrician',
    location: 'Lahore',
    lat: 31.5180, lng: 74.3380,
    price: 700,
    rating: 4.2, reviews: 22, experience: 4, jobsDone: 90,
    description: 'Handles fan installation, light fitting, switchboard repair, and short circuits.',
  },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { family: 4, ssl: true, tls: true });
    console.log('✅ MongoDB Connected');

    let created = 0;
    let skipped = 0;

    for (const t of technicians) {
      const existingUser = await User.findOne({ email: t.email });
      if (existingUser) {
        console.log(`⏭️  Skipping ${t.name} — already exists`);
        skipped++;
        continue;
      }

      const hashedPassword = await bcrypt.hash(t.password, 10);

      const user = await User.create({
        name: t.name,
        email: t.email,
        password: hashedPassword,
        role: 'technician',
        phone: t.phone,
        isVerified: true,
      });

      await Technician.create({
        userId: user._id,
        name: t.name,
        skill: t.skill,
        location: t.location,
        lat: t.lat,
        lng: t.lng,
        price: t.price,
        rating: t.rating,
        reviews: t.reviews,
        experience: t.experience,
        jobsDone: t.jobsDone,
        available: true,
        description: t.description,
      });

      console.log(`✅ Created ${t.skill}: ${t.name}`);
      created++;
    }

    console.log(`\n🎉 Done! ${created} technicians created, ${skipped} skipped.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
};

seed();