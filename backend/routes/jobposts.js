const express = require('express');
const router = express.Router();
const JobPost = require('../models/JobPost');
const Technician = require('../models/Technician');
const Booking = require('../models/Booking');
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');
const sendPush = require('../utils/sendPush');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// multer for job post images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `jobpost_${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ── Create job post ───────────────────────────────────────────────────────────
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { title, description, address, skillRequired, budgetMin, budgetMax } = req.body;

    if (!title || !description || !address || !skillRequired) {
      return res.status(400).json({ msg: 'Please fill all required fields' });
    }

    const jobPost = await JobPost.create({
      homeownerId: req.user.id,
      title,
      description,
      address,
      skillRequired,
      budgetMin: parseInt(budgetMin) || 0,
      budgetMax: parseInt(budgetMax) || 0,
      imageURL: req.file ? `/uploads/${req.file.filename}` : null,
    });

    // notify all technicians with matching skill
    const technicians = await Technician.find({
      skill: skillRequired,
      available: true,
    });

    const homeowner = await User.findById(req.user.id);

  for (const tech of technicians) {
  const techUser = await User.findById(tech.userId);
  if (techUser?.pushToken) {
    await sendPush(
  techUser?.pushToken || null,
  hasLead ? '🔔 New Booking + AI Smart Lead!' : '🔔 New Booking Request!',
  hasLead
    ? `${homeowner?.name || 'A customer'} booked you. AI detected: ${booking.smartLead.faultType}`
    : `${homeowner?.name || 'A customer'} booked you for: ${issue}`,
  { bookingId: booking._id.toString(), type: 'booking', userId: technician.userId.toString() }
);
  } else {
    // 👇 no push token but still save notification to DB
    await sendPush(
      null,
      '🔨 New Job Available!',
      `${homeowner?.name || 'A homeowner'} posted a job: ${title}`,
      { jobPostId: jobPost._id.toString(), type: 'booking', userId: tech.userId.toString() }
    );
  }
}

    res.json({ msg: 'Job post created', jobPost });
  } catch (err) {
    console.error('Job post error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Get all open job posts (for technicians) ──────────────────────────────────
router.get('/open', auth, async (req, res) => {
  try {
    const { skill } = req.query;
const filter = { status: 'open' };
    if (skill) filter.skillRequired = skill;

    const jobPosts = await JobPost.find(filter)
      .populate('homeownerId', 'name phone')
      .sort({ createdAt: -1 });

    res.json(jobPosts);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Get my job posts (homeowner) ──────────────────────────────────────────────
router.get('/my', auth, async (req, res) => {
  try {
    const jobPosts = await JobPost.find({ homeownerId: req.user.id })
      .sort({ createdAt: -1 });
    res.json(jobPosts);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Get single job post ───────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const jobPost = await JobPost.findById(req.params.id)
      .populate('homeownerId', 'name phone email');
    if (!jobPost) return res.status(404).json({ msg: 'Job post not found' });
    res.json(jobPost);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Submit a bid ──────────────────────────────────────────────────────────────
router.post('/:id/bid', auth, async (req, res) => {
  try {
    const { bidAmount, estimatedTime, message } = req.body;

    if (!bidAmount || bidAmount <= 0) {
      return res.status(400).json({ msg: 'Please enter a valid bid amount' });
    }

    const jobPost = await JobPost.findById(req.params.id);
    if (!jobPost) return res.status(404).json({ msg: 'Job post not found' });
    if (jobPost.status !== 'open') {
      return res.status(400).json({ msg: 'This job is no longer accepting bids' });
    }

    // get technician profile
    const technician = await Technician.findOne({ userId: req.user.id });
    if (!technician) return res.status(404).json({ msg: 'Technician profile not found' });

    // check if already bid
    const alreadyBid = jobPost.bids.find(
      b => b.technicianId.toString() === technician._id.toString()
    );
    if (alreadyBid) {
      return res.status(400).json({ msg: 'You have already submitted a bid for this job' });
    }

    // add bid
    jobPost.bids.push({
      technicianId: technician._id,
      technicianName: technician.name,
      technicianSkill: technician.skill,
      technicianRating: technician.rating,
      technicianJobsDone: technician.jobsDone,
      technicianAvatar: technician.avatar,
      bidAmount: parseInt(bidAmount),
      estimatedTime,
      message,
    });

    await jobPost.save();

    // notify homeowner
    // notify homeowner
const homeowner = await User.findById(jobPost.homeownerId);
if (homeowner) {
  await sendPush(
    homeowner.pushToken || null,
    '💰 New Bid Received!',
    `${technician.name} bid Rs. ${bidAmount} for your job: ${jobPost.title}`,
    {
      jobPostId: jobPost._id.toString(),
      type: 'booking',
      userId: jobPost.homeownerId.toString(), // 👈 homeowner userId
    }
  );
}

    res.json({ msg: 'Bid submitted successfully', jobPost });
  } catch (err) {
    console.error('Bid error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Accept a bid ──────────────────────────────────────────────────────────────
router.patch('/:id/accept-bid/:bidId', auth, async (req, res) => {
  try {
    const jobPost = await JobPost.findById(req.params.id);
    if (!jobPost) return res.status(404).json({ msg: 'Job post not found' });

    if (jobPost.homeownerId.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const bid = jobPost.bids.id(req.params.bidId);
    if (!bid) return res.status(404).json({ msg: 'Bid not found' });

    // mark accepted bid
    bid.status = 'accepted';
    jobPost.status = 'assigned';
    jobPost.acceptedBid = bid._id;
    jobPost.acceptedTechnicianId = bid.technicianId;

    // reject all other bids
    jobPost.bids.forEach(b => {
      if (b._id.toString() !== req.params.bidId) {
        b.status = 'rejected';
      }
    });

    // create a booking automatically
    const booking = await Booking.create({
      homeownerId: req.user.id,
      technicianId: bid.technicianId,
      issue: jobPost.description,
      address: jobPost.address,
      totalAmount: bid.bidAmount,
      priceSetBy: 'technician',
      priceNote: `Bid accepted from job post: ${jobPost.title}`,
    });

    jobPost.bookingId = booking._id;
    await jobPost.save();

    // notify accepted technician
    const technician = await Technician.findById(bid.technicianId);
   const techUser = await User.findById(technician?.userId);
await sendPush(
  techUser?.pushToken || null,
  '🎉 Your Bid Was Accepted!',
  `Your bid of Rs. ${bid.bidAmount} for "${jobPost.title}" was accepted!`,
  {
    bookingId: booking._id.toString(),
    type: 'booking',
    userId: technician?.userId?.toString(), // 👈 technician userId
  }
);

    // notify rejected technicians
   for (const b of jobPost.bids) {
  if (b.status === 'rejected') {
    const rejectedTech = await Technician.findById(b.technicianId);
    const rejectedUser = await User.findById(rejectedTech?.userId);
    await sendPush(
      rejectedUser?.pushToken || null,
      '📋 Bid Update',
      `Another technician was selected for "${jobPost.title}"`,
      {
        type: 'general',
        userId: rejectedTech?.userId?.toString(), // 👈 technician userId
      }
    );
  }
}

    res.json({ msg: 'Bid accepted', booking, jobPost });
  } catch (err) {
    console.error('Accept bid error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Cancel job post ───────────────────────────────────────────────────────────
router.patch('/:id/cancel', auth, async (req, res) => {
  try {
    const jobPost = await JobPost.findById(req.params.id);
    if (!jobPost) return res.status(404).json({ msg: 'Job post not found' });
    if (jobPost.homeownerId.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }
    jobPost.status = 'cancelled';
    await jobPost.save();
    res.json({ msg: 'Job post cancelled' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;