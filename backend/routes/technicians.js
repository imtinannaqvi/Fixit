const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Technician = require('../models/Technician');
const auth = require('../middleware/authMiddleware');

// Multer setup for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `avatar_${req.user.id}${path.extname(file.originalname)}`),
});
const upload = multer({ storage });

// Helper: calculate distance between two coords in km
function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GET /api/technicians
router.get('/', async (req, res) => {
  try {
    const { skill, lat, lng } = req.query;
    const filter = skill && skill !== 'All' ? { skill } : {};
    let technicians = await Technician.find(filter);

    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      technicians = technicians.map((t) => ({
        ...t.toObject(),
        distanceKm: parseFloat(getDistanceKm(userLat, userLng, t.lat, t.lng).toFixed(1)),
      }));
      technicians.sort((a, b) => a.distanceKm - b.distanceKm);
    }

    res.json(technicians);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Upload avatar — must be before /:id route
router.post('/upload-avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    const avatarUrl = `/uploads/${req.file.filename}`;
    await Technician.findOneAndUpdate({ userId: req.user.id }, { avatar: avatarUrl });
    res.json({ avatarUrl });
  } catch (err) {
    console.error('Avatar upload error:', err.message);
    res.status(500).json({ msg: 'Upload failed' });
  }
});

// Get my technician profile — must be before /:id route
router.get('/profile/me', auth, async (req, res) => {
  try {
    const technician = await Technician.findOne({ userId: req.user.id });
    if (!technician) return res.status(404).json({ msg: 'Not found' });
    res.json(technician);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Update technician profile — must be before /:id route
router.put('/profile', auth, async (req, res) => {
  try {
    const { skill, price, location, available, description, experience, avatar } = req.body;
    const technician = await Technician.findOneAndUpdate(
      { userId: req.user.id },
      { skill, price, location, available, description, experience, avatar },
      { new: true }
    );
    if (!technician) return res.status(404).json({ msg: 'Technician profile not found' });
    res.json({ msg: 'Profile updated', technician });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/technicians/:id
router.get('/:id', async (req, res) => {
  try {
    const technician = await Technician.findById(req.params.id);
    if (!technician) return res.status(404).json({ msg: 'Not found' });
    res.json(technician);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;