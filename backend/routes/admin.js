const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Booking = require('../models/Booking');
const Technician = require('../models/Technician');
const adminProtect = require('../middleware/adminMiddleware');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, role: 'admin' });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get stats
router.get('/stats', adminProtect, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });
    const totalHomeowners = await User.countDocuments({ role: 'homeowner' });
    const totalTechnicians = await User.countDocuments({ role: 'technician' });
    const totalBookings = await Booking.countDocuments();
    const completedBookings = await Booking.countDocuments({ status: 'Completed' });
    const pendingBookings = await Booking.countDocuments({ status: 'Pending' });
    const cancelledBookings = await Booking.countDocuments({ status: 'Cancelled' });
    const revenueData = await Booking.aggregate([
      { $match: { paymentStatus: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueData[0]?.total || 0;
    res.json({ totalUsers, totalHomeowners, totalTechnicians, totalBookings, completedBookings, pendingBookings, cancelledBookings, totalRevenue });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get all users
router.get('/users', adminProtect, async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } }).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Delete user
router.delete('/users/:id', adminProtect, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    await Technician.findOneAndDelete({ userId: req.params.id });
    res.json({ msg: 'User deleted' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get all bookings
router.get('/bookings', adminProtect, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('homeownerId', 'name email')
      .populate('technicianId', 'name skill')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Delete booking
router.delete('/bookings/:id', adminProtect, async (req, res) => {
  try {
    await Booking.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Booking deleted' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get all technicians
router.get('/technicians', adminProtect, async (req, res) => {
  try {
    const technicians = await Technician.find().sort({ createdAt: -1 });
    res.json(technicians);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;