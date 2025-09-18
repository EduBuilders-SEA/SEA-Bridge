# SEA Bridge – Run Guide

## Product Overview (What this is)
SEA Bridge is a multilingual parent–teacher communication platform for Southeast Asia. It bridges language gaps with a hybrid AI translation layer (Ollama SEA-LION primary + Gemini fallback) and real-time messaging over a Firebase Auth + Supabase (RLS) backend.

## Core Value
- Fast, entity-safe message translation (names, dates preserved)
- Role-based dashboards (teacher / parent)
- Unified contact link and message thread model
- Low-latency realtime (Supabase Realtime + optimistic UI)
- Phone (OTP) onboarding with incomplete-profile gating

## Architecture Snapshot
- Frontend: Next.js 15 (App Router), Tailwind v4.1 tokens, shadcn/ui + Radix
- Auth: Firebase Phone Auth is the source of truth; Supabase uses Firebase JWT for RLS
- Data: 4 tables (profiles, contacts, messages, attendance) keyed via contact_link_id
- State: TanStack Query (all server state), Supabase channels for cache updates
- **AI**:
  - Primary: Ollama SEA-LION client (fast local translation)
  - Fallback / higher-level flows: Genkit (Gemini) server actions in src/ai/flows
- Server Operations: Server Actions (no traditional API routes for internal ops)

## Currently Working (Implemented)
- Phone OTP auth via Firebase (ngrok domain requirement)
- Profile fetch + incomplete name gating pattern
- Role-based navigation scaffolding (/onboarding, /teacher, /parent, chat route pattern)
- Supabase client with Firebase access token injection
- TanStack Query integration + basic cache patterns
- Realtime subscription pattern (messages channel structure defined)
- AI client wrapper for SEA-LION (translation primitives)
- Genkit flow structure placeholders (translate / simplify etc.)
- Tailwind v4.1 migration (single import + design token strategy)

## In Progress / Expected Next
- Full chat UI wiring (message input + translation toggles)
- Attendance form + RLS write validation
- Contact RPCs (create_contact_by_phone, delete_contact) integration in hooks
- Conversation summarization & voice note flows activation
- Entity-safe translation regression tests

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

## Troubleshooting Quick Reference
- OTP failing: ensure ngrok domain added to Firebase Auth authorized domains
- Realtime not updating: confirm channel subscription and Query cache key match (['messages', contact_link_id])
- Profile blocked: profiles.name is null → complete profile modal expected
- Invalid phone: must be E.164 (e.g., +6591234567)

## Development Conventions Recap
- No supabase.auth.getUser(); always use useAuth() + Firebase
- All hooks before early returns
- Server mutations = Server Actions (no ad-hoc fetch routes)
- Preserve entities in translation flows

## Environment Checklist (Minimal)
- NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_FIREBASE_* (all required fields)
- GOOGLE_GENAI_API_KEY (Genkit)
- OLLAMA_ENDPOINT (if running local SEA-LION)
- NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false (unless running emulator)

## Status Badge (Manual)
[Status: Core scaffolding stable | Realtime + contacts integration pending]

## Next Recommended Setup Steps
1. Populate .env.local (copy from CLAUDE.md list)
2. Run npm run dev
3. Start Ollama (if using translation locally)
4. Launch Genkit dev (npm run genkit:dev) for flow testing
5. Verify onboarding → profile gate → dashboard redirect
