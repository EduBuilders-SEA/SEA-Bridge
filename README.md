# SEA Bridge – Run Guide

This app runs on Next.js (port 9002) and uses Firebase Auth (Phone/OTP) with an external URL via ngrok.

## Prerequisites

- Node.js and npm
- Firebase project with a Web App configured
- ngrok installed (`brew install ngrok` or from `https://ngrok.com/download`)

Environment variables: see the "Environment Variables Required" section in `CLAUDE.md` and create `.env.local` accordingly (Firebase config, Supabase, Genkit key).

## Start the app

1. Install dependencies

   ```bash
   npm install
   ```

2. Run the Next.js dev server (port 9002)

   ```bash
   npm run dev
   ```

3. Expose the local server via ngrok and copy the HTTPS forwarding URL

   ```bash
   npm run dev:tunnel
   ```

   or

   ```bash
   ngrok http http://localhost:9002
   ```

4. In the Firebase Console, go to Authentication → Settings → Authorized domains and add the ngrok domain (e.g., `abcd-123-45-67-89.ngrok-free.app`).

## Important: OTP (Phone Auth)

- OTP verification only works when accessed through the ngrok HTTPS domain and that exact domain is added to Firebase Authentication authorized domains.
- Using `localhost` will typically fail reCAPTCHA/phone verification.

## Helpful scripts

- `npm run dev` – Start dev server (Turbopack) on port 9002
- `npm run genkit:dev` – Start Genkit AI dev environment
- `npm run build` / `npm run start` – Production build/run
