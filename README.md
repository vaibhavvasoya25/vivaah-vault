# VivahVault 🪷

Private wedding management app for the Vasoya Family · Surat.

---

## Quick Start

```bash
# 1. Copy the env template
cp .env.local.example .env.local

# 2. Fill in all values in .env.local (see Setup below)

# 3. Install dependencies
npm install @tailwindcss/postcss   # needed for Tailwind v4

# 4. Run dev server
npm run dev
```

Visit `http://localhost:3000` and enter your passphrase.

---

## .env.local Values Needed

```env
# From Firebase Console → Project Settings → Your Apps → Web App
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# From Google Cloud Console → APIs → Credentials → API Key (Drive only)
GOOGLE_DRIVE_API_KEY=

# Auth
APP_PASSPHRASE=VasoyaFamily@402
SESSION_SECRET=generate-32-random-chars-here
```

Generate a SESSION_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## PostCSS Fix (Tailwind v4)

If you see: *"The PostCSS plugin has moved to a separate package"*

```bash
npm install @tailwindcss/postcss
```

Your `postcss.config.mjs` must use:
```js
const config = {
  plugins: { "@tailwindcss/postcss": {}, autoprefixer: {} }
};
export default config;
```

---

## Firestore Setup

After filling Firebase env vars, go to:  
**Firebase Console → Firestore → Rules** and paste the contents of `firestore.rules`.

---

## Features

- 🔐 Single shared passphrase auth
- 📅 Ceremony planner (Haldi, Mehendi, Sangeet, Baraat, Pheras, Reception)
- 👥 Guest management with RSVP, dietary, seating, plus-ones
- 💸 Expense tracker with live budget vs paid vs pending
- 🪑 Seating planner — define tables and assign guests
- 🥤 Logistics — refreshments status + dinner menu planning
- 📸 Gallery — Google Drive folder integration with lightbox + download
- ⚡ Real-time sync across all devices via Firestore onSnapshot# vivaah-vault
