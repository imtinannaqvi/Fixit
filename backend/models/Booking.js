const mongoose = require('mongoose');
const bookingSchema = new mongoose.Schema({
  homeownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  technicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician' },
  issue: { type: String, required: true },
  address: { type: String, required: true },
  totalAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'], default: 'Pending' },
  paymentMethod: { type: String, default: 'Cash on Delivery' },
  paymentStatus: { type: String, enum: ['Unpaid', 'Paid'], default: 'Unpaid' },
  paidAt: { type: Date },
  priceSetBy: { type: String, enum: ['ai', 'technician', 'default'], default: 'default' },
  priceNote: { type: String, default: null },
  completionPhotoURL: { type: String, default: null },
  completedAt: { type: Date, default: null },

  // 👇 Group Booking fields
  isGroupBooking: { type: Boolean, default: false },
  groupId: { type: String, default: null },        // shared ID linking all units in a group
  societyName: { type: String, default: null },    // e.g. "DHA Phase 5 Block C"
  totalUnits: { type: Number, default: 1 },        // total units in the group
  unitNumber: { type: String, default: null },     // e.g. "Flat 3A"
  discountPercent: { type: Number, default: 0 },   // 10, 15, or 20
  originalAmount: { type: Number, default: 0 },    // before discount

  // ── Smart Lead System ──────────────────────────────────────────────────────
  faultImageURL: { type: String, default: null },
  smartLead: {
    faultType:      { type: String, default: null },
    description:    { type: String, default: null },
    severity:       { type: String, default: null },
    recommendation: { type: String, default: null },
    toolsNeeded:    { type: [String], default: [] },
    estimatedCost:  { type: String, default: null },
  },
}, { timestamps: true });
module.exports = mongoose.model('Booking', bookingSchema);