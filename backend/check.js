const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Booking = require('./models/Booking');
  const bookings = await Booking.find({ 
    technicianId: '69ab27f5876223c7ec7b8230' 
  });
  console.log('Alec bookings:', JSON.stringify(bookings, null, 2));
  process.exit();
});