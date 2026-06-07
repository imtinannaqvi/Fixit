const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const multer = require('multer');
const Groq = require('groq-sdk');
const mongoose = require('mongoose');
require('dotenv').config();

const authMiddleware = require('./middleware/authMiddleware');

const authRoutes = require('./routes/auth');
const technicianRoutes = require('./routes/technicians');
const bookingRoutes = require('./routes/bookings');
const reviewRoutes = require('./routes/reviews');
const messageRoutes = require('./routes/messages');
const adminRoutes = require('./routes/admin');
const notificationsRouter = require('./routes/notifications');
const jobPostsRouter = require('./routes/jobposts')

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});
app.use('/api/notifications', notificationsRouter);
app.use('/api/jobposts', jobPostsRouter);

// ── MongoDB ───────────────────────────────────────────────────────────────────
const connectWithRetry = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      family: 4, ssl: true, tls: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Error: ${error.message}`);
    setTimeout(connectWithRetry, 5000);
  }
};
connectWithRetry();

// ── Socket.io ─────────────────────────────────────────────────────────────────
const connectedUsers = {};

io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id);

  socket.on('register', (userId) => {
    if (!userId) return;
    const id = userId.toString().trim();
    connectedUsers[id] = socket.id;
    console.log(`✅ Registered: ${id} → socket ${socket.id}`);
  });

  socket.on('joinRoom', (bookingId) => {
    if (!bookingId) return;
    const roomId = (Array.isArray(bookingId) ? bookingId[0] : bookingId).toString().trim();
    socket.join(roomId);
    const room = io.sockets.adapter.rooms.get(roomId);
    console.log(`💬 Socket ${socket.id} joined room: "${roomId}" | room size: ${room ? room.size : 0}`);
  });

  socket.on('disconnect', () => {
    for (const [userId, socketId] of Object.entries(connectedUsers)) {
      if (socketId === socket.id) {
        delete connectedUsers[userId];
        console.log(`🔌 Disconnected: ${userId}`);
        break;
      }
    }
  });

  socket.on('typing', (data) => {
    if (!data?.bookingId) return;
    const roomId = (Array.isArray(data.bookingId) ? data.bookingId[0] : data.bookingId).toString().trim();
    socket.to(roomId).emit('userTyping', { senderId: data.senderId?.toString() });
  });

  socket.on('sendMessage', async (data) => {
    const Message = require('./models/Message');
    try {
      if (!data?.bookingId || !data?.senderId || !data?.text) {
        console.error('❌ Invalid message data:', data);
        return;
      }
      const roomId = (Array.isArray(data.bookingId) ? data.bookingId[0] : data.bookingId).toString().trim();
      if (!mongoose.Types.ObjectId.isValid(roomId)) {
        console.error('❌ Invalid bookingId format:', roomId);
        return;
      }
      const room = io.sockets.adapter.rooms.get(roomId);
      console.log(`📨 Sending to room "${roomId}" | room size: ${room ? room.size : 0}`);
      const message = await Message.create({
        bookingId: roomId,
        senderId: data.senderId.toString().trim(),
        senderName: data.senderName,
        text: data.text,
      });
      const obj = message.toObject();
      const normalized = {
        _id: obj._id.toString(),
        bookingId: obj.bookingId.toString(),
        senderId: obj.senderId.toString(),
        senderName: obj.senderName,
        text: obj.text,
        createdAt: obj.createdAt.toISOString(),
        updatedAt: obj.updatedAt.toISOString(),
      };
      io.to(roomId).emit('newMessage', normalized);
      console.log(`✅ Emitted newMessage to room "${roomId}"`);
    } catch (err) {
      console.error('❌ Message save error:', err.message);
    }
  });
});

app.set('io', io);
app.set('connectedUsers', connectedUsers);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/technicians', technicianRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);

// ── AI Detection ──────────────────────────────────────────────────────────────
const upload = multer({ storage: multer.memoryStorage() });
app.post('/detect', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const imageBase64 = file.buffer.toString('base64');
    const mimeType = file.mimetype;
    const response = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `You are a home maintenance expert. Analyze this image and identify any fault or issue. Respond in this exact JSON format only, no extra text, no markdown:
{
  "faultType": "one of: Plumbing Leak, Electrical Issue, Carpentry Issue, Painting Issue, AC Issue, or General Issue",
  "description": "A clear 1-2 sentence description of the specific fault you see in the image",
  "severity": "one of: Low, Medium, High",
  "recommendation": "Brief advice on what the technician should bring or do"
}`
          },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } }
        ]
      }],
      max_tokens: 500,
    });
    const text = response.choices[0].message.content;
    const cleaned = text.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(cleaned));
  } catch (err) {
    console.error('Groq error:', err.message);
    const fallback = [
      { faultType: 'Plumbing Leak', description: 'A water leak detected in pipe area.', severity: 'High', recommendation: 'Bring pipe sealant and replacement joints.' },
      { faultType: 'Electrical Issue', description: 'Electrical fault detected.', severity: 'High', recommendation: 'Bring wire connectors and insulation tape.' },
      { faultType: 'Carpentry Issue', description: 'Structural damage to wooden fixtures.', severity: 'Medium', recommendation: 'Bring wood glue and screws.' },
      { faultType: 'General Issue', description: 'General maintenance issue detected.', severity: 'Low', recommendation: 'Bring general toolkit.' },
    ];
    res.json(fallback[Math.floor(Math.random() * fallback.length)]);
  }
});

// ── FixBot AI Chat ────────────────────────────────────────────────────────────
app.post('/api/fixbot', async (req, res) => {
  const { message } = req.body;
  try {
    const response = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{
        role: 'system',
        content: `You are FixBot, a helpful home maintenance assistant for FixItNow app in Pakistan.
        Analyze the user's home issue and:
        1. Briefly explain what the problem might be (1-2 sentences)
        2. Recommend which type of technician they need
        3. Give one quick tip
        Always respond in this exact JSON format:
        {
          "reply": "your friendly response here",
          "skill": "one of: Plumber, Electrician, Carpenter, Painter, AC Technician, or null if not clear"
        }
        Keep replies short, friendly and in simple English.`
      }, {
        role: 'user',
        content: message
      }],
      max_tokens: 300,
    });
    const text = response.choices[0].message.content;
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    res.json(parsed);
  } catch (err) {
    console.error('FixBot error:', err.message);
    res.json({ reply: "I'm having trouble understanding. Could you describe your issue in more detail? 🤔", skill: null });
  }
});

// ── AI Price Estimator ────────────────────────────────────────────────────────
app.post('/api/price-estimate', async (req, res) => {
  const { faultType, severity, skill } = req.body;
  try {
    const response = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{
        role: 'system',
        content: `You are a home maintenance cost estimator for Pakistan.
        Given a fault type, severity, and technician skill, provide a realistic price estimate in Pakistani Rupees.
        Always respond in this exact JSON format only, no extra text:
        {
          "minPrice": <number>,
          "maxPrice": <number>,
          "currency": "Rs.",
          "breakdown": "brief 1 sentence explanation of what affects the cost",
          "timeEstimate": "e.g. 1-2 hours",
          "note": "one short tip to save cost"
        }`
      }, {
        role: 'user',
        content: `Fault: ${faultType}, Severity: ${severity}, Technician needed: ${skill}. Give realistic Pakistan market price estimate.`
      }],
      max_tokens: 200,
    });
    const text = response.choices[0].message.content;
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    res.json(parsed);
  } catch (err) {
    console.error('Price estimate error:', err.message);
    const fallbacks = {
      Low: { minPrice: 500, maxPrice: 1500, currency: 'Rs.', breakdown: 'Minor repair, basic parts needed.', timeEstimate: '1 hour', note: 'Get a second opinion before paying.' },
      Medium: { minPrice: 1500, maxPrice: 4000, currency: 'Rs.', breakdown: 'Moderate repair with some parts replacement.', timeEstimate: '2-3 hours', note: 'Ask for parts receipt from technician.' },
      High: { minPrice: 4000, maxPrice: 12000, currency: 'Rs.', breakdown: 'Major repair requiring significant parts and labor.', timeEstimate: '4-6 hours', note: 'Get written estimate before work starts.' },
    };
    res.json(fallbacks[severity] || fallbacks.Medium);
  }
});

// ── Voice Transcription (Groq Whisper) ───────────────────────────────────────
const multerAudio = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.post('/api/transcribe', authMiddleware, multerAudio.single('audio'), async (req, res) => {
  let renamedPath = null;
  try {
    console.log('📥 Transcribe request received');

    if (!req.file) {
      console.log('❌ No file received');
      return res.status(400).json({ msg: 'No audio file', text: '' });
    }

    console.log('✅ File received — size:', req.file.size, 'bytes');

    // rename with correct extension
    const originalName = req.file.originalname || 'recording.m4a';
    const ext = originalName.endsWith('.mp4') ? '.mp4' : '.m4a';
    renamedPath = req.file.path + ext;
    fs.renameSync(req.file.path, renamedPath);
    console.log('✅ File renamed to:', renamedPath);

    // transcribe with Whisper
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(renamedPath),
      model: 'whisper-large-v3',
      response_format: 'json',
      prompt: 'Home maintenance issue described in English or Urdu or both mixed. Words like leakage, bijli, paani, pipe, short circuit may appear.',
    });

    const rawText = transcription.text?.trim() || '';
    console.log('✅ Raw transcription:', rawText);

    // filter empty or garbage
    if (!rawText || rawText.length < 3) {
      if (fs.existsSync(renamedPath)) fs.unlinkSync(renamedPath);
      return res.json({ text: '', msg: 'Could not detect clear speech' });
    }

    // translate Urdu/Roman Urdu to English
    let finalText = rawText;
    try {
      const translateResponse = await groq.chat.completions.create({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [{
          role: 'system',
          content: `You are a strict English translator for a home repair app in Pakistan.
RULES — follow exactly:
1. ALWAYS output in English only — never output Urdu script or Roman Urdu
2. If input is Urdu script (e.g. میرے گھر میں پانی کا پائپ لیک ہو رہا ہے) — translate to English
3. If input is Roman Urdu (e.g. "mere ghar mein paani ka pipe leak ho raha hai") — translate to English
4. If input is already English — clean up any errors and return it
5. If input is mixed Urdu+English — translate the Urdu parts and merge into one English sentence
6. Output ONLY the English translation — no explanation, no quotes, no extra words
7. Keep it short — one sentence describing the home issue
8. If the text has nothing to do with home maintenance — return exactly: INVALID

Examples:
Input: "mere ghar mein paani ka pipe leak ho raha hai" → Output: Water pipe is leaking in my house
Input: "bijli ka short circuit ho gaya hai" → Output: Electrical short circuit has occurred
Input: "AC theek nahi chal raha" → Output: AC is not working properly
Input: "میرے گھر کی چھت سے پانی آ رہا ہے" → Output: Water is leaking from my roof
Input: "I want to repair my kitchen sink" → Output: Kitchen sink needs repair`
        }, {
          role: 'user',
          content: rawText
        }],
        max_tokens: 80,
      });

      const translated = translateResponse.choices[0].message.content.trim();
      console.log('✅ Translated:', translated);

      if (translated && translated !== 'INVALID' && translated.length >= 3) {
        finalText = translated;
      } else if (translated === 'INVALID') {
        if (fs.existsSync(renamedPath)) fs.unlinkSync(renamedPath);
        return res.json({ text: '', msg: 'Could not detect clear speech' });
      }

    } catch (err) {
      console.log('Translation failed, using raw:', err.message);
      finalText = rawText;
    }

    // cleanup
    if (fs.existsSync(renamedPath)) fs.unlinkSync(renamedPath);

console.log('📤 Sending response:', { text: finalText, original: rawText });
res.json({ text: finalText || rawText, original: rawText });

  } catch (err) {
    console.error('❌ Transcription error:', err.message);
    try {
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      if (renamedPath && fs.existsSync(renamedPath)) fs.unlinkSync(renamedPath);
    } catch {}
    res.status(500).json({ msg: 'Transcription failed', text: '', error: err.message });
  }
});

server.listen(5000, () => console.log('🚀 Server running on port 5000'));