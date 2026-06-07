const mongoose = require('mongoose');

const technicianSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  skill: String,
  location: { type: String, default: 'Lahore' },
  lat: { type: Number, default: 31.5204 },
  lng: { type: Number, default: 74.3587 },
  price: { type: Number, default: 500 },
  rating: { type: Number, default: 0 },
  reviews: { type: Number, default: 0 },
  experience: { type: Number, default: 1 },
  jobsDone: { type: Number, default: 0 },
  available: { type: Boolean, default: true },
  description: { type: String, default: 'Professional technician with years of experience.' },
avatar: { type: String, default: null },});

module.exports = mongoose.model('Technician', technicianSchema);