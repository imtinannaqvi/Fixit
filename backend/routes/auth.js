const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Technician = require('../models/Technician');
const protect = require('../middleware/authMiddleware');
const sendEmail = require('../utils/sendEmail');
const auth = require('../middleware/authMiddleware');

// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    user = new User({ name, email, password, role, phone, otp, otpExpiry, isVerified: false });
    await user.save();

    if (role === 'technician') {
      const technician = new Technician({
        userId: user._id,
        name,
        skill: 'General',
        location: 'Pakistan',
        lat: 31.5204,
        lng: 74.3587,
        price: 500,
        rating: 0,
        reviews: 0,
        experience: 1,
        jobsDone: 0,
        available: true,
        description: `Hi, I am ${name}. Available for home maintenance services.`,
      });
      await technician.save();
    }

    // Send OTP email
    const previewUrl = await sendEmail(
      email,
      'FixItNow - Verify Your Email',
      `<div style="font-family:sans-serif;max-width:400px;margin:auto;padding:24px;background:#1E293B;border-radius:16px;color:#E5E7EB">
        <h2 style="color:#38BDF8">🔧 FixItNow</h2>
        <p>Hi <strong>${name}</strong>, welcome to FixItNow!</p>
        <p>Your verification code is:</p>
        <div style="background:#0F172A;padding:20px;border-radius:12px;text-align:center;margin:20px 0">
          <span style="font-size:36px;font-weight:bold;color:#38BDF8;letter-spacing:8px">${otp}</span>
        </div>
        <p style="color:#64748B">This code expires in 10 minutes.</p>
      </div>`
    );

    console.log('📧 Verify email preview:', previewUrl);

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // 👇 return both id and _id so frontend works correctly
    res.json({
      token,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        isVerified: false,
      },
      previewUrl,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// VERIFY EMAIL OTP
router.post('/verify-email', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'User not found' });
    if (user.isVerified) return res.status(400).json({ msg: 'Already verified' });
    if (user.otp !== otp) return res.status(400).json({ msg: 'Invalid OTP' });
    if (new Date() > user.otpExpiry) return res.status(400).json({ msg: 'OTP expired' });

    user.isVerified = true;
    user.otp = '';
    await user.save();

    res.json({ msg: 'Email verified successfully!' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// RESEND OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'User not found' });
    if (user.isVerified) return res.status(400).json({ msg: 'Already verified' });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const previewUrl = await sendEmail(
      email,
      'FixItNow - New Verification Code',
      `<div style="font-family:sans-serif;max-width:400px;margin:auto;padding:24px;background:#1E293B;border-radius:16px;color:#E5E7EB">
        <h2 style="color:#38BDF8">🔧 FixItNow</h2>
        <p>Your new verification code is:</p>
        <div style="background:#0F172A;padding:20px;border-radius:12px;text-align:center;margin:20px 0">
          <span style="font-size:36px;font-weight:bold;color:#38BDF8;letter-spacing:8px">${otp}</span>
        </div>
        <p style="color:#64748B">This code expires in 10 minutes.</p>
      </div>`
    );
    console.log('📧 Resend OTP preview:', previewUrl);
    res.json({ msg: 'OTP resent!', previewUrl });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// FORGOT PASSWORD
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'No account with this email' });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const previewUrl = await sendEmail(
      email,
      'FixItNow - Reset Your Password',
      `<div style="font-family:sans-serif;max-width:400px;margin:auto;padding:24px;background:#1E293B;border-radius:16px;color:#E5E7EB">
        <h2 style="color:#38BDF8">🔧 FixItNow</h2>
        <p>You requested a password reset.</p>
        <p>Your reset code is:</p>
        <div style="background:#0F172A;padding:20px;border-radius:12px;text-align:center;margin:20px 0">
          <span style="font-size:36px;font-weight:bold;color:#f97316;letter-spacing:8px">${otp}</span>
        </div>
        <p style="color:#64748B">This code expires in 10 minutes.</p>
      </div>`
    );
    console.log('📧 Reset password preview:', previewUrl);
    res.json({ msg: 'Reset code sent!', previewUrl });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// RESET PASSWORD
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'User not found' });
    if (user.otp !== otp) return res.status(400).json({ msg: 'Invalid OTP' });
    if (new Date() > user.otpExpiry) return res.status(400).json({ msg: 'OTP expired' });

    user.password = newPassword;
    user.otp = '';
    await user.save();

    res.json({ msg: 'Password reset successfully!' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // 👇 return both id and _id so frontend works correctly
    res.json({
      token,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        isVerified: user.isVerified,
      },
    });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// SAVE PUSH TOKEN
router.post('/push-token', protect, async (req, res) => {
  try {
    const { pushToken } = req.body;
    await User.findByIdAndUpdate(req.user.id, { pushToken });
    res.json({ msg: 'Push token saved' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Update homeowner profile
router.put('/update-profile', auth, async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, phone, address },
      { new: true }
    ).select('-password');
    res.json({ msg: 'Profile updated', user });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;