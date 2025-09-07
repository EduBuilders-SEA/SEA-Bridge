# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server on port 9002 with Turbopack
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm run genkit:dev` - Start Genkit AI development environment
- `npm run genkit:watch` - Start Genkit with hot reload for AI flows

## Architecture Overview

SEA Bridge is a multilingual parent-teacher communication platform designed for Southeast Asia. The application uses a hybrid architecture with modern web technologies.

### Tech Stack

- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- **UI Components**: Radix UI primitives with shadcn/ui patterns  
- **State Management**: TanStack Query (React Query) for server state, minimal client state
- **Authentication**: Firebase Auth for phone verification + reCAPTCHA, integrated as third-party provider
- **Auth Protection**: Next.js middleware for route protection (no useEffect auth checks)
- **AI Integration**: Hybrid model using Google Genkit (Gemini) and **AWS Bedrock (Sea Lion)**
- **Database & Backend**: Supabase (PostgreSQL, Realtime, Storage) with Firebase Auth integration
- **Phone Integration**: React Phone Number Input with international support

### Core Architecture Pattern

The app follows a **role-based routing structure** with separate dashboards for teachers and parents:

```text
/                    # Role selection landing page
/onboarding         # Phone auth and profile setup
/teacher            # Teacher dashboard with contacts
/teacher/chat/[id]  # Teacher chat interface
/parent             # Parent dashboard with contacts  
/parent/chat/[id]   # Parent chat interface
```

### Authentication Flow

1. **Phone Authentication**: Uses Firebase Auth as third-party provider integrated with Supabase (following https://supabase.com/docs/guides/auth/third-party/firebase-auth)
2. **Profile Creation**: Users complete onboarding with role selection (teacher/parent) 
3. **Session Management**: Firebase handles auth tokens, Supabase uses Firebase JWT for RLS policies
4. **Role-Based Access**: App routes users to appropriate dashboards based on profile.role
5. **State Management**: TanStack Query manages auth state and profile data with automatic caching

### Database Schema (Supabase)

The application uses a simplified 4-table structure:

- `profiles` - User profiles with role (teacher/parent), language preferences
- `contacts` - Connection between teachers and parents via contact_link_id
- `messages` - All communications linked via contact_link_id, with variants JSONB for translations/AI processing
- `attendance` - Student attendance records with teacher write access, parent read access

### AI Integration (Hybrid Model)

The project uses a hybrid AI architecture to leverage the best models for specific tasks.

#### Core SMS AI (AWS Bedrock + Sea Lion)

For the critical SMS notification feature, we use AWS Bedrock for its specialized models and direct integration with our notification pipeline.

- **Provider**: AWS Bedrock
- **Model**: Sea Lion (for context-aware SEA language translation and smart chunking)
- **Implementation**: Direct AWS SDK integration within server-side logic (e.g., BullMQ workers). See `src/lib/aws/bedrock-client.ts`.
- **Key Features**:
    - `translateForSMS`: Translates messages for SMS delivery.
    - `smartChunkForSMS`: Splits messages into context-aware chunks for SMS.

#### General In-App AI (Google Genkit + Gemini)

For general in-app AI features, we use Google Genkit for its rapid development and structured flow management.

- **Provider**: Google Genkit
- **Model**: Gemini 2.5 Flash
- **Implementation**: Genkit flows invoked via Server Actions.
- **Key Flows** in `/src/ai/flows/`:
    - `translate-message.ts` - In-app message translation.
    - `simplify-message.ts` - Content simplification.
    - `transcribe-and-translate.ts` - Voice note processing.
    - `summarize-conversation.ts` - Chat summaries.

**Important**: AI flows are designed to preserve critical information (dates, names, amounts, locations) during translation and processing.

### Supabase Integration

#### Client Setup

- `src/lib/supabase/client.ts` - Browser client configured with Firebase Auth token integration
- `src/lib/supabase/server.ts` - Server client for Server Actions and SSR
- `src/lib/firebase/config.ts` - Firebase Auth configuration with conditional emulator connection

#### Real-time Features

- Messages use Supabase Realtime subscriptions via `contact_link_id`
- Optimistic UI updates for instant message display
- File uploads through Supabase Storage with RLS policies

### Data Fetching & State Management

#### TanStack Query Integration

- `src/lib/query-client.ts` - Query client configuration with 5-minute stale time
- All server state managed through React Query hooks
- Automatic background refetching and caching
- Optimistic updates for mutations

#### Custom Data Hooks

- `src/hooks/use-auth.ts` - Firebase Auth state with `react-firebase-hooks`
- `src/hooks/use-profile.ts` - User profile data from Supabase with React Query
- `src/hooks/use-messages.ts` - Message fetching and sending with optimistic updates
- `src/hooks/use-realtime-messages.ts` - Realtime message subscriptions with Query cache updates

#### Authentication Hooks Pattern

```typescript
// ✅ CORRECT: Use custom hooks instead of useEffect
const { user, loading } = useAuth();
const { data: profile, isLoading } = useCurrentProfile();

// ❌ AVOID: Direct useEffect for auth checks
useEffect(() => {
  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    // Don't do this - use middleware instead
  };
}, []);
```

### UI Components Structure

Components follow atomic design principles:

- `src/components/ui/` - Base UI components (shadcn/ui)
- `src/components/chat/` - Chat-specific components
  - `chat-message.tsx` - Message bubbles with translation/simplification toggles
  - `message-input.tsx` - Multi-modal input (text, voice, files)
  - `attendance-form.tsx` - Teacher attendance tracking
  - `progress-summary-card.tsx` - AI-generated progress summaries

### Configuration Notes

#### Next.js Config

- TypeScript and ESLint errors are ignored during builds for rapid development
- Image optimization configured for placeholder images and blob URLs
- Development server runs on port 9002 to avoid conflicts

#### Environment Variables Required

**Core Services**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key  
- `GOOGLE_GENAI_API_KEY` - Google AI API key for Genkit

**AWS Services (Bedrock & SNS)**
- `AWS_ACCESS_KEY_ID` - AWS Access Key for SDK authentication
- `AWS_SECRET_ACCESS_KEY` - AWS Secret Key for SDK authentication
- `AWS_BEDROCK_REGION` - AWS region for Bedrock service
- `SEA_LION_MODEL_ID` - The model identifier for Sea Lion on Bedrock
- `AWS_SNS_REGION` - AWS region for SNS service
- `SNS_DELIVERY_STATUS_ROLE` - IAM role ARN for SNS delivery status logging
- `SNS_USAGE_REPORT_BUCKET` - S3 bucket for SNS usage reports

**Firebase Auth (Third-party Integration)**
- `NEXT_PUBLIC_FIREBASE_API_KEY` - Firebase project API key
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` - Firebase project ID
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `NEXT_PUBLIC_FIREBASE_APP_ID` - Firebase app ID

**Development**
- `NEXT_PUBLIC_USE_FIREBASE_EMULATOR` - Set to 'true' to enable Firebase Auth emulator (defaults to 'false')

#### Required Dependencies

**State Management & Data Fetching**
- `@tanstack/react-query` - Server state management and caching
- `react-firebase-hooks` - Firebase Auth state management hooks
- `zustand` - Minimal client state (optional)

## Development Patterns

### React Patterns

#### Hook Usage Guidelines

- **Authentication**: Use `useAuth()` and `useCurrentProfile()` hooks instead of useEffect
- **Data Fetching**: Use TanStack Query hooks instead of useEffect + useState patterns
- **Realtime**: Use `useRealtimeMessages()` for real-time subscriptions
- **Hook Order**: Always call all hooks before any early returns to avoid conditional hook errors

#### Component Structure

```typescript
// ✅ CORRECT: Hooks first, then early returns
function MyComponent() {
  const { user, loading } = useAuth();
  const { data: profile } = useCurrentProfile();
  
  // All useEffect calls here, before any returns
  useEffect(() => { /* logic */ }, []);
  
  // Now early returns are safe
  if (loading) return <Loading />;
  if (!user) return null;
  
  // Component logic
}
```

### Server Actions

All backend operations should use Next.js Server Actions pattern rather than API routes. AI flows are implemented as server-side functions for security and performance.

### Code Style Standards

- **Quotes**: Use single quotes ('') for strings
- **Semicolons**: Omit semicolons except when required for ASI
- **Imports**: Group and sort imports (external first, then internal)
- **Formatting**: Use Prettier with 2-space indentation
- **TypeScript**: Prefer explicit types over `any`, use interfaces for objects

### Authentication Patterns

- **Client Auth**: Use Firebase Auth state via `useAuth()` hook
- **Server Auth**: Pass Firebase tokens to Supabase server client
- **No useEffect**: Avoid useEffect for authentication logic in components

### Data Fetching Patterns

- **Server State**: Use TanStack Query for all server data (profiles, messages, contacts)
- **Real-time**: Use Supabase subscriptions with Query cache updates
- **Mutations**: Use React Query mutations with optimistic updates
- **Caching**: Rely on Query cache instead of component state for server data

### Internationalization

The app supports multiple Southeast Asian languages. Use the translation flows for all user-facing content, ensuring entity preservation for critical information.

### File Handling

Files are uploaded to Supabase Storage. Always implement proper RLS policies and use signed URLs for secure access.

### Error Handling

The application uses Zod schemas for type validation throughout AI flows and form inputs. Always validate inputs and provide user-friendly error messages.

## Memory Imports

See @README.md for project overview and @package.json for available npm commands.

- Additional architecture notes: @docs/blueprint.md

## Tailwind CSS v4.1 Migration (2025-09)

- Dependencies updated: `tailwindcss@^4.1.12`, `@tailwindcss/postcss@^4.1.12`.
- CSS entry changed to a single `@import "tailwindcss"` in `src/app/globals.css`.
- Design tokens moved to CSS via `@theme`; color variables exposed as `--color-*` mapped to `hsl(var(--...))`.
- Replaced deprecated utilities and applies:
  - `shadow-sm` → `shadow-xs` in UI components.
  - Avoid `@apply bg-background text-foreground`; use direct CSS: `background-color: hsl(var(--background)); color: hsl(var(--foreground));`.
- Keep Tailwind config minimal (theme lives in CSS); ensure `postcss.config.mjs` uses `@tailwindcss/postcss`.

### Tailwind usage guidelines

- Prefer utilities; add component-level CSS only when necessary.
- Reference semantic tokens (e.g., `bg-card`, `text-card-foreground`) backed by `@theme` variables.
- When adding new tokens, define them once under `:root` `@theme` then consume via utilities or direct CSS vars.

## Hot Module Reload (HMR)

- HMR is enabled via Next.js 15 and Turbopack (`npm run dev` uses `next dev --turbopack -p 9002`).
- Tailwind v4 updates and CSS variable changes in `globals.css` hot-reload automatically.
- Genkit flows support watch mode: `npm run genkit:watch`.

## Linting and typecheck follow-ups

- ESLint: run `npm run lint` and select the Next.js plugin preset when prompted (Strict recommended).
- TypeScript: fix Next.js 15 compatibility issues (e.g., async route params, `cookies()` now async). These are independent of Tailwind.

## Troubleshooting

### React Hook Errors

**Issue**: `React Hook "useEffect" is called conditionally`
- **Cause**: useEffect called after early returns or inside conditions
- **Solution**: Move all hooks (including useEffect) to the top of component, before any early returns

**Issue**: `Cannot read property 'user' of undefined`
- **Cause**: Using auth state before hooks are initialized
- **Solution**: Always check loading states from useAuth() before using user data

### Firebase Auth Errors

**Issue**: `Failed to load resource: Could not connect to the server` errors for localhost:9099
- **Cause**: Firebase Auth trying to connect to emulator that isn't running
- **Solution**: Ensure `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false` in .env (default behavior)
- **To use emulator**: Set `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true` and run `firebase emulators:start --only auth`

### TanStack Query Issues

**Issue**: Data not updating after mutations
- **Cause**: Missing query invalidation after successful mutations
- **Solution**: Use `queryClient.invalidateQueries()` in mutation onSuccess callbacks

**Issue**: `Cannot read properties of undefined` with Query data
- **Cause**: Accessing query data before it loads
- **Solution**: Use loading states and optional chaining: `data?.property`

### Middleware Issues

**Issue**: Infinite redirects between middleware and pages
- **Cause**: Middleware redirecting to pages that also check auth
- **Solution**: Remove client-side auth checks, let middleware handle all route protection

### Development Setup Issues

**Authentication Flow**: If experiencing auth issues, verify Firebase project is properly configured in Supabase third-party auth settings.

**Missing Dependencies**: Run `npm install @tanstack/react-query react-firebase-hooks` if data fetching hooks are not working.

## Memory conventions for Claude Code

- Be specific and structured with headings and bullets; review periodically.
- Use `@` imports (above) to include related docs; avoid placing imports in code blocks.
- Quickly add new memories by starting a message with `#`; use `/memory` to edit.

Reference: [Claude Code memory best practices](https://docs.anthropic.com/en/docs/claude-code/memory)


### Auth model (single source of truth)

- Firebase Auth is the authentication source of truth
- Supabase uses the Firebase ID token via `accessToken` on every request
- Do not call `supabase.auth.getUser()`; use `useAuth()` for auth state
- Determine identity in the DB using RLS (`auth.jwt()->>'sub'`)

### Onboarding flow & phone policy

- Flow: Phone → OTP → if profile exists redirect to its role; else create profile (nullable `name`) → block UI until name is set
- Single profile per phone (unique): if phone is registered with a different role, notify and redirect to that role
- Always store phone numbers in E.164; validate before any send
- E.164 validation: use regex `^\+[1-9]\d{7,14}$`
- Do not query Supabase before OTP; perform profile lookups only after user is authenticated

### OTP & reCAPTCHA UX

- Trigger OTP send on explicit transitions (event-driven), not in `useEffect`
- Reinitialize reCAPTCHA for every send; clear existing verifier first
- Provide a Resend action with a cooldown (e.g., 30s) and disable while cooling down
- Show clear toasts for failure states (captcha error, too-many-requests)

### Profile completeness gate

- Make `profiles.name` nullable to streamline OTP-first onboarding
- Block UI with a “Complete your profile” modal if `profile.name` is null; cannot dismiss until saved
- After saving name, invalidate `['profile', uid]` via React Query
- RLS gate writes until name exists using `public.profile_is_complete()` and restrictive policies on `messages`, `contacts`, `attendance`

### React Query & Realtime patterns

- Queries: include stable IDs in cache keys; set reasonable `staleTime` (e.g., 5 min)
- Mutations: use optimistic updates where safe; invalidate specific queries on success
- Realtime: subscribe per entity; update Query cache in the subscription handler; remove channel on unmount

### Middleware note

- Do not perform server-side session checks for Firebase in middleware
- Use client hooks for auth state and RLS for authorization; middleware should not expect Supabase cookies

### SQL policy conventions

- Use “restrictive” policies to AND with existing policies
- Policy syntax order: `create policy ... on <schema.table> as restrictive for <command> ...`
- Keep `profiles.name` as `TEXT` (nullable) and `profiles.phone` unique; enforce one profile per phone

### Error-handling UX

- Use concise toasts with actionable messages; log details to console for debugging
- For invalid phone, show: “Enter a valid phone number with country code”
- For resend cooldown: show seconds remaining and disable the button

### Review reminders

- Revalidate this memory after auth or onboarding changes
- Keep phone/OTP rules and RLS gates in sync with the schema and hooks

## Contacts & RLS (2025-09)

- **Contacts shape**: `contacts(id, parent_id, teacher_id, student_name, relationship, created_at, label?)`.
- **Cross-party profile read**: SELECT policy on `profiles` allows viewing the other party of a linked `contacts` row (exists check via `contacts`).
- **Restrictive gates**: `profile_is_complete()` remains restrictive for INSERT/UPDATE/DELETE on `contacts`, `messages`, `attendance`.
- **RPCs (SECURITY DEFINER)**:
  - `create_contact_by_phone(target_phone TEXT, child_name TEXT DEFAULT NULL)`
    - Teacher caller: requires `child_name`; inserts link `(parent_id=other, teacher_id=me)`.
    - Parent caller: inserts `(parent_id=me, teacher_id=other)`, `student_name='N/A'`.
  - `delete_contact(p_id UUID)` deletes only if caller is `parent_id` or `teacher_id` on the row; raises clear errors when not found/authorized.
- **Client hook API (`useContacts()`)**:
  - `contacts: ContactWithJoins` (joins `parent: parent_id(id,name,phone)` and `teacher: teacher_id(id,name,phone)`; optional `label`).
  - `createContactAsync({ phoneNumber, childName? })` → RPC
  - `updateContactAsync({ id, student_name?, label? })` → `contacts.update`
  - `deleteContactAsync(id)` → RPC
  - All mutations invalidate `['contacts', user.uid]`.
- **UI patterns**:
  - Teacher cards: title `parent.name || parent.phone || 'Pending'`; subtitle `Parent of {student_name}`.
  - Parent cards: title `label || teacher.name || teacher.phone || 'Pending'`; subtitle `label ? (teacher.name || teacher.phone) : 'Teacher'`.
  - Use icon buttons (edit/remove) with tooltips; PhoneInput (E.164) is the source of truth.
- **Performance & RLS notes**:
  - Add explicit `.eq('teacher_id', uid)` / `.eq('parent_id', uid)` filters on reads even with RLS for planner hints.
  - Ensure indexes: `contacts(parent_id)`, `contacts(teacher_id)`, `profiles(phone)`.
  - Prefer security definer functions for cross-table checks where appropriate.
  - After policy/schema changes, reload PostgREST schema; for Next.js dev, disable route caching on affected routes if needed.

### References
- Memory best practices (Anthropic): https://docs.anthropic.com/en/docs/claude-code/memory
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- RLS performance: https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv
- Next.js stale data/RLS note: https://supabase.com/docs/guides/troubleshooting/nextjs-1314-stale-data-when-changing-rls-or-table-data-85b8oQ
