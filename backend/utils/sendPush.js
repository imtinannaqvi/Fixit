const axios = require('axios');
const Notification = require('../models/Notification');

const sendPush = async (pushToken, title, body, data = {}) => {

  // 👇 save to DB
  try {
    let userId = data.userId || null;

    // fallback — try bookingId if no userId passed
    if (!userId && data.bookingId) {
      try {
        const Booking = require('../models/Booking');
        const booking = await Booking.findById(data.bookingId);
        if (booking) userId = booking.homeownerId;
      } catch (e) {
        console.log('Could not find booking for notification:', e.message);
      }
    }

    // fallback — try jobPostId if still no userId
    if (!userId && data.jobPostId) {
      try {
        const JobPost = require('../models/JobPost');
        const jobPost = await JobPost.findById(data.jobPostId);
        if (jobPost) userId = jobPost.homeownerId;
      } catch (e) {
        console.log('Could not find jobpost for notification:', e.message);
      }
    }

    if (userId) {
      // detect type from title
      let type = 'general';
      if (title.includes('Booking') || title.includes('booking')) type = 'booking';
      if (title.includes('Payment') || title.includes('💰') || title.includes('💵')) type = 'payment';
      if (title.includes('Chat') || title.includes('💬')) type = 'chat';
      if (title.includes('Verified') || title.includes('🪪')) type = 'verification';
      if (title.includes('Price') || title.includes('price')) type = 'price';
      if (title.includes('Completed') || title.includes('🏠')) type = 'completion';
      if (title.includes('Bid') || title.includes('bid') || title.includes('Job')) type = 'booking';

      await Notification.create({
        userId,
        title,
        body,
        type,
        bookingId: data.bookingId || null,
        isRead: false,
      });
      console.log(`🔔 Notification saved to DB for user ${userId}`);
    } else {
      console.log('⚠️ No userId found for notification — not saved. data:', data);
    }
  } catch (err) {
    console.log('Notification DB save error:', err.message);
  }

  // send push if token valid
  if (!pushToken || !pushToken.startsWith('ExponentPushToken')) return;

  try {
    await axios.post('https://exp.host/--/api/v2/push/send', {
      to: pushToken,
      title,
      body,
      data,
      sound: 'default',
      priority: 'high',
    });
    console.log(`📲 Push sent to ${pushToken}`);
  } catch (err) {
    console.error('Push error:', err.message);
  }
};

module.exports = sendPush;