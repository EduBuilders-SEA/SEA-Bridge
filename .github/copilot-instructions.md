# SEA Bridge - AI Coding Agent Instructions

## Project Overview

SEA Bridge is a multilingual parent-teacher communication platform for Southeast Asia using a hybrid AI architecture with Next.js 15, Firebase Auth, Supabase, and dual AI models (Ollama SEA-LION + Google Gemini).

## Development Commands

```bash
npm run dev                 # Start dev server (port 9002, Turbopack)
npm run genkit:dev          # Start Genkit AI development environment
npm run genkit:watch        # Hot reload for AI flows
npm run typecheck           # TypeScript checking (builds ignore TS errors)
```

## Architecture Patterns

### Authentication Flow (Critical)

- **Firebase Auth** is the single source of truth (never use `supabase.auth.getUser()`)
- Use `useAuth()` hook from `src/hooks/use-auth.ts` for client auth state
- Supabase server client receives Firebase tokens via `accessToken` parameter
- RLS policies use `auth.jwt()->>'sub'` for user identification
- Middleware is passive - client hooks handle auth redirects

```typescript
// ✅ CORRECT: Use hooks pattern
const { user, loading } = useAuth();
const { data: profile } = useCurrentProfile();

// ❌ NEVER: Direct supabase auth calls
const {
  data: { user },
} = await supabase.auth.getUser();
```

### Hybrid AI System

- **Primary**: Ollama SEA-LION (`src/lib/ollama/sea-lion-client.ts`) for ~150ms translation
- **Fallback**: Google Genkit/Gemini (`src/ai/flows/*.ts`) for complex operations
- Translation flows MUST preserve entities (dates, names, amounts, locations)
- AI flows use Server Actions pattern, not API routes

### Data Architecture

- **4-table schema**: `profiles`, `contacts`, `messages`, `attendance`
- All communication linked via `contact_link_id`
- **TanStack Query** for all server state (never useState for server data)
- Realtime via Supabase subscriptions with Query cache updates
- Profile completeness gate: `profiles.name` nullable, blocks until set

### Role-Based Routing

```
/onboarding     # Phone auth + profile creation
/teacher        # Teacher dashboard
/parent         # Parent dashboard
/[role]/chat/[id] # Chat interface per role
```

## Critical Patterns

### Hook Usage (React Rules)

```typescript
// ✅ All hooks BEFORE any early returns
function Component() {
  const { user, loading } = useAuth();
  const { data: profile } = useCurrentProfile();
  useEffect(() => {}, []); // All useEffects here

  if (loading) return <Loading />; // Early returns after hooks
  // ...
}
```

### Contacts System

- Use `useContacts()` hook with RPC functions: `create_contact_by_phone`, `delete_contact`
- Phone numbers always stored in E.164 format (`^\+[1-9]\d{7,14}$`)
- Cross-party profile reading via EXISTS check in RLS policies

### Server Actions Pattern

```typescript
// ✅ Server Actions for backend operations
'use server';
export async function createContact(data: ContactCreate) {
  const supabase = await createClient(accessToken);
  // ...
}
```

### Real-time Updates

```typescript
// ✅ Supabase subscriptions update React Query cache
const subscription = supabase
  .channel(`messages:${contactLinkId}`)
  .on('INSERT', (payload) => {
    queryClient.setQueryData(['messages', contactLinkId], (old) => [
      ...old,
      payload.new,
    ]);
  });
```

## Environment Requirements

```bash
# Core Services (Required)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=                     # Google AI for Genkit

# Firebase Auth Integration (Required)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
# ... other Firebase config

# AI Services
OLLAMA_ENDPOINT=http://localhost:11434  # SEA-LION endpoint
USE_SEA_LION_PRIMARY=true               # Enable hybrid AI

# Development
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false # Production Firebase
```

## Code Conventions

- **Quotes**: Single quotes (`'`) for strings
- **Imports**: External packages first, then internal with `@/` prefix
- **TypeScript**: Explicit types over `any`, use Zod schemas for validation
- **Components**: Radix UI primitives with shadcn/ui patterns
- **Styling**: Tailwind v4.1 with CSS variables in `globals.css`

## Common Pitfalls

1. **Auth**: Never check auth in useEffect - use middleware + hooks pattern
2. **Data**: Don't use useState for server data - always TanStack Query
3. **AI**: Preserve critical entities (dates, names) in all translation flows
4. **Phone**: Validate E.164 format before any database operations
5. **Hooks**: All hooks before early returns to avoid conditional hook errors
6. **RLS**: Use explicit `.eq('user_id', uid)` filters even with RLS for performance

## File Structure Priorities

- `src/ai/flows/` - Genkit AI operations (Server Actions)
- `src/lib/ollama/` - Direct Ollama client for fast translation
- `src/hooks/` - React Query hooks for data fetching
- `src/lib/supabase/` - Database clients (browser vs server)
- `src/components/chat/` - Real-time messaging components
