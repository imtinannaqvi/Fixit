const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
  technicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', required: true },
  technicianName: { type: String },
  technicianSkill: { type: String },
  technicianRating: { type: Number, default: 0 },
  technicianJobsDone: { type: Number, default: 0 },
  technicianAvatar: { type: String, default: null },
  bidAmount: { type: Number, required: true },
  estimatedTime: { type: String },
  message: { type: String },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

const jobPostSchema = new mongoose.Schema({
  homeownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  address: { type: String, required: true },
  skillRequired: { type: String, required: true },
  imageURL: { type: String, default: null },
  status: { type: String, enum: ['open', 'assigned', 'completed', 'cancelled'], default: 'open' },
  bids: [bidSchema],
  acceptedBid: { type: mongoose.Schema.Types.ObjectId, default: null },
  acceptedTechnicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', default: null },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  budgetMin: { type: Number, default: 0 },
  budgetMax: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('JobPost', jobPostSchema);