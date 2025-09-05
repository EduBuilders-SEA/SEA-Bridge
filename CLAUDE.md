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
- **AI Integration**: Google Genkit with Gemini 2.5 Flash model
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
4. **Route Protection**: Next.js middleware (`middleware.ts`) handles authentication checks and redirects
5. **Role-Based Access**: App routes users to appropriate dashboards based on profile.role
6. **State Management**: TanStack Query manages auth state and profile data with automatic caching

### Database Schema (Supabase)

The application uses a simplified 4-table structure:

- `profiles` - User profiles with role (teacher/parent), language preferences
- `contacts` - Connection between teachers and parents via contact_link_id
- `messages` - All communications linked via contact_link_id, with variants JSONB for translations/AI processing
- `attendance` - Student attendance records with teacher write access, parent read access

### AI Integration (Genkit Flows)

All AI functionality is implemented as **Server Actions** using Genkit flows:

Key AI flows in `/src/ai/flows/`:

- `translate-message.ts` - Message translation with entity preservation
- `simplify-message.ts` - Content simplification for accessibility
- `transcribe-and-translate.ts` - Voice note processing
- `summarize-conversation.ts` - Progress summaries from message history
- `chunk-message-for-sms.ts` - SMS chunking for international delivery

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
const { data: profile, isLoading } = useProfile();

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

- **Authentication**: Use `useAuth()` and `useProfile()` hooks instead of useEffect
- **Data Fetching**: Use TanStack Query hooks instead of useEffect + useState patterns
- **Realtime**: Use `useRealtimeMessages()` for real-time subscriptions
- **Hook Order**: Always call all hooks before any early returns to avoid conditional hook errors

#### Component Structure

```typescript
// ✅ CORRECT: Hooks first, then early returns
function MyComponent() {
  const { user, loading } = useAuth();
  const { data: profile } = useProfile();
  
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

- **Route Protection**: Use Next.js middleware (`middleware.ts`) for authentication checks
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
