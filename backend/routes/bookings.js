const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Technician = require('../models/Technician');
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');
const sendPush = require('../utils/sendPush');
const Groq = require('groq-sdk');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ── Multer for fault image upload ─────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `fault_${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ── AI Smart Lead Generator ───────────────────────────────────────────────────
const generateSmartLead = async (imageBuffer, mimeType, issue, technicianSkill) => {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const base64Image = imageBuffer.toString('base64');

    const response = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `You are an expert home maintenance AI assistant. A homeowner has booked a ${technicianSkill} for this issue: "${issue}".

Analyze this image and generate a Smart Lead brief for the technician.

Respond ONLY in this exact JSON format, no extra text:
{
  "faultType": "specific fault name (e.g. Burst PVC Joint, Burnt Electrical Socket)",
  "description": "2-3 sentence technical description of what you see",
  "severity": "Low or Medium or High",
  "recommendation": "What the technician should do when they arrive",
  "toolsNeeded": ["tool/part 1", "tool/part 2", "tool/part 3"],
  "estimatedCost": "Rs. X - Rs. Y (estimated range)"
}`
          },
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64Image}` }
          }
        ]
      }],
      max_tokens: 600,
      temperature: 0.2,
    });

    const text = response.choices[0]?.message?.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('Smart Lead AI error:', err.message);
    return null;
  }
};

// ── Get my bookings (homeowner) ───────────────────────────────────────────────
router.get('/my', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ homeownerId: req.user.id })
      .populate('technicianId')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Get bookings for technician ───────────────────────────────────────────────
router.get('/technician', auth, async (req, res) => {
  try {
    const technician = await Technician.findOne({ userId: req.user.id });
    if (!technician) return res.status(404).json({ msg: 'Technician profile not found' });
    const bookings = await Booking.find({ technicianId: technician._id })
      .populate('homeownerId', 'name email phone')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Create booking (with optional fault image for Smart Lead) ─────────────────
router.post('/', auth, upload.single('faultImage'), async (req, res) => {
  try {
    const { technicianId, issue, address } = req.body;
    const technician = await Technician.findById(technicianId);
    if (!technician) return res.status(404).json({ msg: 'Technician not found' });

    const booking = new Booking({
      homeownerId: req.user.id,
      technicianId,
      issue,
      address,
      totalAmount: technician.price,
    });

    // ── Generate Smart Lead if image uploaded ─────────────────────────────────
    if (req.file) {
      const imageBuffer = fs.readFileSync(req.file.path);
      const mimeType = req.file.mimetype;
      booking.faultImageURL = `/uploads/${req.file.filename}`;

      const smartLead = await generateSmartLead(imageBuffer, mimeType, issue, technician.skill);
      if (smartLead) {
        booking.smartLead = smartLead;
        // Update totalAmount with AI estimate if available
        console.log(`✅ Smart Lead generated for booking: ${smartLead.faultType}`);
      }
    }

    await booking.save();

    // Socket notification
    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');
    if (technician.userId) {
      const socketId = connectedUsers[technician.userId.toString()];
      if (socketId) {
        io.to(socketId).emit('newBooking', {
          message: `New booking from a customer for ${issue}`,
          hasSmartLead: !!booking.smartLead?.faultType,
        });
      }
    }

    // Push notification to technician
    if (technician.userId) {
      const techUser = await User.findById(technician.userId);
      if (techUser?.pushToken) {
        const homeowner = await User.findById(req.user.id);
        const hasLead = !!booking.smartLead?.faultType;
        await sendPush(
          techUser.pushToken,
          hasLead ? '🔔 New Booking + AI Smart Lead!' : '🔔 New Booking Request!',
          hasLead
            ? `${homeowner?.name || 'A customer'} booked you. AI detected: ${booking.smartLead.faultType}`
            : `${homeowner?.name || 'A customer'} booked you for: ${issue}`,
{ bookingId: booking._id.toString(), type: 'booking', userId: technician.userId.toString() }        );
      }
    }

    res.json({ msg: 'Booking created', booking });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Cancel booking ────────────────────────────────────────────────────────────
router.patch('/:id/cancel', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('technicianId');
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });
    booking.status = 'Cancelled';
    await booking.save();

    const homeowner = await User.findById(booking.homeownerId);
    if (homeowner?.pushToken) {
      await sendPush(
        homeowner.pushToken,
        '❌ Booking Cancelled',
        `Your booking for ${booking.issue} has been cancelled.`,
{ bookingId: booking._id.toString(), type: 'booking', userId: booking.homeownerId.toString() }      );
    }

    res.json({ msg: 'Booking cancelled', booking });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Mark booking as completed ─────────────────────────────────────────────────
router.patch('/:id/complete', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('technicianId');
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });
    booking.status = 'Completed';
    await booking.save();

    const homeowner = await User.findById(booking.homeownerId);
    if (homeowner?.pushToken) {
      await sendPush(
        homeowner.pushToken,
        '✅ Booking Completed!',
        `Your booking for ${booking.issue} has been completed.`,
{ bookingId: booking._id.toString(), type: 'booking', userId: booking.homeownerId.toString() }      );
    }

    res.json({ msg: 'Booking completed', booking });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Technician update booking status ─────────────────────────────────────────
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id).populate('technicianId');
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });
    booking.status = status;
    await booking.save();

    const homeowner = await User.findById(booking.homeownerId);
    if (homeowner?.pushToken) {
      const messages = {
        Confirmed: { title: '✅ Booking Confirmed!', body: `Your booking for ${booking.issue} has been confirmed by the technician.` },
        'In Progress': { title: '🔧 Work Started!', body: `The technician has started working on: ${booking.issue}` },
        Completed: { title: '🏠 Job Completed!', body: `Your booking for ${booking.issue} is now complete.` },
        Cancelled: { title: '❌ Booking Rejected', body: `Your booking for ${booking.issue} was rejected.` },
      };
      const msg = messages[status];
      if (msg) await sendPush(homeowner.pushToken, msg.title, msg.body, { bookingId: booking._id });
    }

    res.json({ msg: 'Status updated', booking });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Mark payment as paid ──────────────────────────────────────────────────────
router.patch('/:id/pay', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });
    booking.paymentStatus = 'Paid';
    booking.paidAt = new Date();
    await booking.save();
    res.json({ msg: 'Payment marked as received', booking });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Delete booking ────────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });
    await Booking.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Booking deleted' });
  } catch (err) {
    console.log('Delete error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});
// ── Technician set price (AI or custom) ───────────────────────────────────────
router.patch('/:id/set-price', auth, async (req, res) => {
  try {
    const { totalAmount, priceSetBy, priceNote } = req.body;

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ msg: 'Invalid price amount' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });

    booking.totalAmount = totalAmount;
    booking.priceSetBy = priceSetBy || 'technician';
    booking.priceNote = priceNote || null;
    await booking.save();

    // notify homeowner about price update
    const homeowner = await User.findById(booking.homeownerId);
    if (homeowner?.pushToken) {
      const label = priceSetBy === 'ai' ? 'AI Estimated' : 'Technician Set';
      await sendPush(
        homeowner.pushToken,
        '💰 Price Updated!',
        `Your booking price has been set to Rs. ${totalAmount} (${label})`,
{ bookingId: booking._id.toString(), type: 'booking', userId: booking.homeownerId.toString() }      );
    }

    res.json({ msg: 'Price updated successfully', booking });
  } catch (err) {
    console.error('Set price error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Multer for completion photo ───────────────────────────────────────────────
const completionStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `completion_${Date.now()}${path.extname(file.originalname)}`);
  },
});
const uploadCompletion = multer({ storage: completionStorage, limits: { fileSize: 5 * 1024 * 1024 } });

// ── Upload completion photo + mark complete ───────────────────────────────────
router.patch('/:id/complete-with-photo', auth, uploadCompletion.single('completionPhoto'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });

    booking.status = 'Completed';
    booking.completedAt = new Date();

    if (req.file) {
      booking.completionPhotoURL = `/uploads/${req.file.filename}`;
    }

    await booking.save();

    // notify homeowner
    const homeowner = await User.findById(booking.homeownerId);
    if (homeowner?.pushToken) {
      await sendPush(
        homeowner.pushToken,
        '🏠 Job Completed!',
        req.file
          ? `Your booking for ${booking.issue} is complete. Photo proof uploaded.`
          : `Your booking for ${booking.issue} has been completed.`,
{ bookingId: booking._id.toString(), type: 'booking', userId: booking.homeownerId.toString() }      );
    }

    res.json({ msg: 'Booking completed with photo', booking });
  } catch (err) {
    console.error('Complete with photo error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Voice transcription using Groq Whisper ────────────────────────────────────
const uploadAudio = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/transcribe', auth, uploadAudio.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: 'No audio file' });

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const fileStream = fs.createReadStream(req.file.path);

    const transcription = await groq.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-large-v3',
      language: 'en',
      response_format: 'json',
    });

    // clean up temp file
    fs.unlinkSync(req.file.path);

    res.json({ text: transcription.text });
  } catch (err) {
    console.error('Transcription error:', err.message);
    // clean up if file exists
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ msg: 'Transcription failed', text: '' });
  }
});

// ── Create Group Booking ──────────────────────────────────────────────────────
router.post('/group', auth, async (req, res) => {
  try {
    const { technicianId, issue, societyName, address, units } = req.body;
    // units = [{ unitNumber: 'Flat 1A', address: '...' }, ...]

    if (!units || units.length < 2) {
      return res.status(400).json({ msg: 'Group booking requires at least 2 units' });
    }

    const technician = await Technician.findById(technicianId);
    if (!technician) return res.status(404).json({ msg: 'Technician not found' });

    // calculate discount
    let discountPercent = 0;
    if (units.length >= 10) discountPercent = 20;
    else if (units.length >= 5) discountPercent = 15;
    else if (units.length >= 3) discountPercent = 10;

    const originalAmount = technician.price;
    const discountedAmount = Math.round(originalAmount * (1 - discountPercent / 100));

    // shared groupId for all bookings
    const groupId = `GRP_${Date.now()}_${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    // create one booking per unit
   // ONLY CHANGE: (unit: any) → (unit)

const bookings = await Promise.all(
  units.map((unit) =>
    Booking.create({
      homeownerId: req.user.id,
      technicianId,
      issue,
      address: unit.address || address,
      totalAmount: discountedAmount,
      originalAmount,
      discountPercent,
      isGroupBooking: true,
      groupId,
      societyName,
      totalUnits: units.length,
      unitNumber: null,
    })
  )
);

    // notify technician
    const techUser = await User.findById(technician.userId);
    if (techUser?.pushToken) {
      const homeowner = await User.findById(req.user.id);
      await sendPush(
        techUser.pushToken,
        '📦 New Group Booking!',
        `${homeowner?.name || 'A customer'} booked you for ${units.length} units at ${societyName}`,
{ bookingId: bookings[0]._id.toString(), type: 'booking', userId: technician.userId.toString() }      );
    }

    // socket notification
    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');
    if (technician.userId) {
      const socketId = connectedUsers[technician.userId.toString()];
      if (socketId) {
        io.to(socketId).emit('newBooking', {
          message: `New group booking for ${units.length} units at ${societyName}`,
          isGroup: true,
        });
      }
    }

    res.json({
      msg: 'Group booking created successfully',
      groupId,
      totalBookings: bookings.length,
      discountPercent,
      discountedAmount,
      bookings,
    });
  } catch (err) {
    console.error('Group booking error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;