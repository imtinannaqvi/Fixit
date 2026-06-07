# 🔧 FixItNow — Mobile App

Pakistan's smartest home maintenance app. AI-powered diagnosis meets verified technicians.

Built with **React Native + Expo Router**, this is the mobile client for the FixItNow platform.

---

## 📱 Screenshots

> Add screenshots here once available

---

## ✨ Features

- 🤖 **AI Diagnosis** — Upload a photo and AI instantly identifies your home issue
- 🔍 **Find Technicians** — Browse verified professionals by skill, location, and rating
- 📅 **Easy Booking** — Book a technician in minutes with real-time confirmation
- 💬 **Real-time Chat** — In-app chat between homeowners and technicians via Socket.io
- 🔔 **Live Notifications** — Instant updates on booking status
- 🛡️ **Verified Experts** — All technicians are background checked
- ⭐ **Reviews & Ratings** — Genuine reviews from verified customers

---

## 🗂️ Project Structure

```
app/
├── chat/               # Real-time chat screens
├── tabs/               # Bottom tab navigation (homeowner dashboard)
├── technician/         # Technician-specific screens
├── index.tsx           # Landing/welcome screen
├── login.tsx           # Login screen
├── signup.tsx          # Registration screen
├── verify-email.tsx    # Email verification screen
├── forgot-password.tsx # Forgot password screen
├── reset-password.tsx  # Reset password screen
└── _layout.tsx         # Root navigation layout
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| React Native + Expo | Mobile framework |
| Expo Router | File-based navigation |
| TypeScript | Type safety |
| Socket.io Client | Real-time chat |
| Axios | API requests |
| React Native Toast Message | In-app notifications |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI
- Expo Go app on your phone (for development)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/imtinannaqvi/app.git
cd app

# 2. Install dependencies
npm install

# 3. Create your environment config
# Update config.ts with your backend URL
```

### Running the App

```bash
# Start development server
npx expo start

# Scan QR code with Expo Go app on your phone
```

---

## ⚙️ Configuration

Update `config.ts` with your backend URLs:

```ts
export const API_URL = 'http://your-backend-url/api';
export const BASE_URL = 'http://your-backend-url';
```

---

## 🔗 Related Repositories

| Repo | Description |
|---|---|
| [FixItNow Server](https://github.com/imtinannaqvi) | Node.js + Express + MongoDB backend |

---

## 👤 Author

**Imtinan Naqvi**
- GitHub: [@imtinannaqvi](https://github.com/imtinannaqvi)

---

## 📄 License

This project is for educational/portfolio purposes.