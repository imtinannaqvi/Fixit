const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const User = require('./models/User');
  const password = await bcrypt.hash('admin123', 10);
  await User.findOneAndUpdate(
    { email: 'admin@fixitnow.com' },
    { name: 'Admin', email: 'admin@fixitnow.com', password, role: 'admin' },
    { upsert: true, new: true }
  );
  console.log('✅ Admin created!');
  console.log('Email: admin@fixitnow.com');
  console.log('Password: admin123');
  process.exit();
});