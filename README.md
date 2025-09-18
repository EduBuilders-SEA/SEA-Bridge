# SEA Bridge – Run Guide

## Hackathon Context

Participating in the SEA Developer Challenge: https://seadeveloperchallenge.ai  
Goal: Real-time, multilingual parent–teacher messaging with entity-safe AI translation (SEA languages), fast phone-based onboarding, and role-based dashboards.

## Quick Pitch

SEA Bridge enables teachers and parents across Southeast Asia to communicate instantly in their preferred languages. An AI layer (Ollama SEA-LION primary) provides sub‑second translations while preserving names, dates, and numbers. Firebase Auth (phone) is the identity source; Supabase provides RLS-secured data (profiles, contacts, messages, attendance). React Query + realtime channels keep UIs live without manual refresh.

## Core Architecture Snapshot

- Auth: Firebase Phone → pass ID token to Supabase (RLS via `auth.jwt()->>'sub'`)
- Data model: `profiles`, `contacts`, `messages`, `attendance` (linked by `contact_link_id` / role pairs)
- Realtime: Supabase channel per contact for message streaming + optimistic cache updates
- AI:
  - Primary: Local/edge Ollama SEA-LION (~150 ms translation path)
  - Fallback: Genkit (Gemini) flows via Server Actions in `src/ai/flows/*`
- Frontend: Next.js 15 (App Router), Tailwind v4.1 tokens, shadcn/ui primitives
- Pattern: All server state via TanStack Query (no `useState` for server data)

## Local Development (Recap)

```bash
npm install
npm run dev          # Next.js on :9002
npm run typecheck
```

Expose tunnel (needed for phone auth reCAPTCHA):
```bash
npm run dev:tunnel
# or
ngrok http http://localhost:9002
```
Add the generated `*.ngrok-free.app` domain to Firebase Auth → Authorized Domains.

## Test Phone Numbers (Firebase Auth Emulator / Pre-configured)

Use these for rapid demo logins (E.164). Enter number + code exactly. Do not store production data with them.

| Phone (E.164)    | Verification Code |
| ---------------- | ----------------- |
| +639383201192    | 123456            |
| +639323211691    | 123456            |
| +639323201182    | 123123            |
| +639323800169    | 123456            |
| +639323800179    | 123456            |
| +639123123123    | 123456            |
| +639323800171    | 123456            |

Notes:
- Keep formatting strict; validation uses `^\+[1-9]\d{7,14}$`.
- If a number already has a profile with a role, onboarding will redirect to that role.

## Demo Flow Checklist

1. Phone login via ngrok domain
2. Complete profile (name + role) if first login
3. Create a contact (teacher ↔ parent) via phone
4. Exchange messages; show instant translation toggle
5. Trigger fallback (simulate by stopping Ollama) to show resiliency
6. Show attendance record creation (teacher) and read (parent)

## AI Translation Guarantees

- Entity preservation: Names, dates, numeric values, currencies remain untouched
- Fast path (Ollama) returns: { text, detected_language, latency_ms }
- Fallback path adds: reasoning traces (not stored client-side), safety classification
- Stored variants in `messages.variants` JSONB to avoid recomputation

## Roadmap (Short)

- Voice note transcription + translation (Gemini multimodal flow)
- Conversation summaries per contact (periodic background action)
- Attendance anomaly alerts
- Offline-friendly optimistic queue for messages

## Submission Readiness Checklist

| Item | Status |
| ---- | ------ |
| Auth (Phone) stable via tunnel | ✅ |
| Profile completeness gate | ✅ |
| Realtime messaging + translation | ✅ |
| Entity-safe translation tests | ⏳ (add automated) |
| README pitch + demo script | ✅ |
| Test numbers documented | ✅ |
| Basic monitoring/logging (console) | ⏳ |

## Troubleshooting Quick Reference

| Issue | Fix |
| ----- | --- |
| OTP fails on localhost | Use ngrok HTTPS and add domain to Firebase |
| Translation slow | Confirm Ollama running at $OLLAMA_ENDPOINT |
| RLS denial | Ensure profile.name not null; check JWT sub matches profile id |
| Messages stale | Verify subscription channel `messages:{contact_link_id}` active |

## License / Use

Internal hackathon prototype. Add explicit license before public release.
