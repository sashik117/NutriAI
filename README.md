# NutriAI

![React](https://img.shields.io/badge/React-18-111827?style=for-the-badge&logo=react)
![Vite](https://img.shields.io/badge/Vite-6-111827?style=for-the-badge&logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-111827?style=for-the-badge&logo=tailwindcss)
![Node.js](https://img.shields.io/badge/Node.js-Express-111827?style=for-the-badge&logo=nodedotjs)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-111827?style=for-the-badge&logo=postgresql)
![Gemini](https://img.shields.io/badge/Gemini-AI-111827?style=for-the-badge&logo=googlegemini)

AI-powered nutrition tracker built as a fullstack portfolio project with food logging, smart calorie goals, Gemini-powered meal analysis, weekly meal planning, and PostgreSQL persistence.

NutriAI is currently a web application with a mobile-first interface. The next product step is a native mobile app version, so the UI is already designed around phone screens, bottom navigation, touch-friendly controls, and PWA-style behavior.

<p align="center">
  <img src="screenshots/mobile-dashboard.png" alt="NutriAI mobile dashboard" width="280" />
</p>

## ✨ Features

- 🔐 Authentication flow with user-based data storage
- 🤖 Gemini AI food analysis from text, voice, images, and plate scanning
- 🍽️ Food diary with calories, protein, fats, carbs, weight, and editable entries
- 🧠 Smart goals using user profile data, target weight, activity level, and macro formulas
- 📅 Interactive daily dashboard with calorie rings, macro progress, and calendar indicators
- 🥗 AI meal plan generator with structured meals, ingredients, and saved plans
- 🛒 Shopping list generated from selected meal ingredients, with grouping and checklist logic
- 💧 Water tracking with daily goal logic and reminder UI
- 🏆 Gamification, streaks, profile stats, and progress-oriented UI
- 📱 Mobile-first web UI, prepared for a future phone app
- 🗄️ PostgreSQL backend for persistent user data

## 🧩 Problem Solved

Most calorie trackers are either too manual or too generic. NutriAI combines AI assistance with editable structured data, so users can scan, search, or describe food naturally while still keeping control over the final numbers.

The main goal is to make nutrition tracking feel faster, softer, and more personal: the app remembers the user, calculates their goals, keeps meal history, and helps turn meal plans into a practical shopping list.

## 🛠️ Tech Stack

**Frontend**

- React
- Vite
- Tailwind CSS
- Framer Motion
- Radix UI
- TanStack Query
- Recharts
- Lucide React
- Sonner

**Backend**

- Node.js
- Express
- Multer
- REST API

**Database & AI**

- PostgreSQL
- Gemini API
- OpenAI fallback support

## 📱 Mobile Screenshots

### Dashboard

<img src="screenshots/mobile-dashboard.png" alt="Mobile dashboard" width="260" />

### Add Food

<img src="screenshots/mobile-add-food.png" alt="Mobile add food" width="260" />

### Water Tracker

<img src="screenshots/mobile-water.png" alt="Mobile water tracker" width="260" />

### Rewards

<img src="screenshots/mobile-rewards.png" alt="Mobile rewards" width="260" />

### Profile

<img src="screenshots/mobile-profile.png" alt="Mobile profile" width="260" />

### AI Meal Plan

<img src="screenshots/mobile-meal-plan.png" alt="Mobile AI meal plan" width="260" />

## 🏗️ Project Structure

```text
NutriAI/
|-- public/
|   |-- manifest.json
|   `-- sw.js
|-- screenshots/
|   |-- mobile-dashboard.png
|   |-- mobile-add-food.png
|   |-- mobile-water.png
|   |-- mobile-rewards.png
|   |-- mobile-profile.png
|   `-- mobile-meal-plan.png
|-- server/
|   |-- index.js
|   |-- migrate.js
|   `-- db/
|-- src/
|   |-- components/
|   |-- contexts/
|   |-- lib/
|   |-- pages/
|   `-- services/
|-- .env.example
|-- README.md
|-- package.json
`-- vite.config.js
```

## 🚀 Installation

Clone the repository:

```bash
git clone https://github.com/sashik117/NutriAI.git
cd NutriAI
```

Install dependencies:

```bash
npm install
```

Create your environment file:

```bash
cp .env.example .env
```

Set the required variables:

```env
DATABASE_URL=postgres://postgres:password@localhost:5432/nutriai
DATABASE_SCHEMA=public
DATABASE_SSL=false
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=optional_openai_fallback_key
PORT=4001
```

Run database migrations:

```bash
npm run db:migrate
```

Start the fullstack app:

```bash
npm run dev
```

Frontend: `http://localhost:5176`  
Backend: `http://localhost:4001`

## Mobile App

NutriAI includes Capacitor projects for Android and iOS. The mobile app uses the same optimized React/Vite build as the web app.

```bash
npm run mobile:build
npm run android:open
npm run ios:open
```

For real phones, the app points to the deployed backend at `https://nutriai-rt1k.onrender.com` by default. You can still override `VITE_API_BASE_URL` in `.env.mobile` for emulator or local backend testing. See [MOBILE.md](MOBILE.md) for Android/iOS build notes.

## 📜 Available Scripts

```bash
npm run dev          # start frontend and backend together
npm run client       # start Vite frontend only
npm run server       # start Express backend only
npm run db:migrate   # apply PostgreSQL schema
npm run build        # create production frontend build
npm run mobile:build # build and sync Android/iOS Capacitor apps
npm run android:open # open Android project
npm run ios:open     # open iOS project
npm run lint         # run ESLint
npm run typecheck    # run TypeScript/JS project checks
```

## 🔐 Environment Notes

- `.env` is ignored by Git and should never be committed.
- `DATABASE_SCHEMA` can isolate NutriAI tables inside an existing PostgreSQL database.
- Gemini is the preferred AI provider for image-heavy nutrition features.
- If AI keys are missing, the app can still return fallback data for local testing.

## 🌐 Live Demo

[https://nutriai-rt1k.onrender.com](https://nutriai-rt1k.onrender.com)

Current version: deployed web app + Capacitor mobile project. Store release coming soon.

## 🧭 Roadmap

- Production deployment
- Native mobile app version
- More accurate barcode fallback with AI label reading
- Native mobile health integrations
- Advanced progress analytics
- More polished onboarding and profile personalization

## 👩‍💻 Contact

Created by [@sashik117](https://github.com/sashik117)

- GitHub: [github.com/sashik117](https://github.com/sashik117)
- Email: add-your-email@example.com
- Telegram: @your_telegram
