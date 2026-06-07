const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Technician = require('../models/Technician');
const Booking = require('../models/Booking');
const auth = require('../middleware/authMiddleware');

// Add review
router.post('/', auth, async (req, res) => {
  try {
    const { technicianId, bookingId, rating, comment } = req.body;

    // Check if booking exists and is completed
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });
    if (booking.status !== 'Completed') return res.status(400).json({ msg: 'Can only review completed bookings' });

    // Check if already reviewed
    const existing = await Review.findOne({ bookingId });
    if (existing) return res.status(400).json({ msg: 'Already reviewed this booking' });

    // Get user info
    const User = require('../models/User');
    const user = await User.findById(req.user.id);

    const review = new Review({
      technicianId,
      userId: req.user.id,
      bookingId,
      userName: user.name,
      rating,
      comment,
    });
    await review.save();

    // Update technician rating
    const reviews = await Review.find({ technicianId });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await Technician.findByIdAndUpdate(technicianId, {
      rating: Math.round(avgRating * 10) / 10,
      reviews: reviews.length,
    });

    res.json({ msg: 'Review added', review });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get reviews for a technician
router.get('/:technicianId', auth, async (req, res) => {
  try {
    const reviews = await Review.find({ technicianId: req.params.technicianId })
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;