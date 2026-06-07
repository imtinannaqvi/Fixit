const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const mongoose = require('mongoose');
const protect = require('../middleware/authMiddleware');

// GET messages for a booking
router.get('/:bookingId', protect, async (req, res) => {
  try {
    // 👇 validate bookingId before querying
    if (!mongoose.Types.ObjectId.isValid(req.params.bookingId)) {
      return res.status(400).json({ msg: 'Invalid booking ID' });
    }

    const messages = await Message.find({
      bookingId: new mongoose.Types.ObjectId(req.params.bookingId),
    }).sort({ createdAt: 1 });

    // 👇 normalize all ObjectIds to strings for frontend isMe() check
    const normalized = messages.map((m) => {
      const obj = m.toObject();
      return {
        _id: obj._id.toString(),
        bookingId: obj.bookingId.toString(),
        senderId: obj.senderId.toString(),
        senderName: obj.senderName,
        text: obj.text,
        createdAt: obj.createdAt.toISOString(),
        updatedAt: obj.updatedAt.toISOString(),
      };
    });

    res.json(normalized);
  } catch (err) {
    console.error('Messages fetch error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;