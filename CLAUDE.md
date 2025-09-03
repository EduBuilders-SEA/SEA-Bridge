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
- **AI Integration**: Google Genkit with Gemini 2.5 Flash model
- **Database & Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
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

1. **Phone Authentication**: Uses Supabase Auth with phone verification
2. **Profile Creation**: Users complete onboarding with role selection (teacher/parent)
3. **Session Management**: Supabase handles JWT tokens and session persistence
4. **Role-Based Access**: App routes users to appropriate dashboards based on profile.role

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

- `src/lib/supabase/client.ts` - Browser client for client-side operations
- `src/lib/supabase/server.ts` - Server client for Server Actions and SSR

#### Real-time Features

- Messages use Supabase Realtime subscriptions via `contact_link_id`
- Optimistic UI updates for instant message display
- File uploads through Supabase Storage with RLS policies

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

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `GOOGLE_GENAI_API_KEY` - Google AI API key for Genkit

## Development Patterns

### Server Actions

All backend operations should use Next.js Server Actions pattern rather than API routes. AI flows are implemented as server-side functions for security and performance.

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

## Memory conventions for Claude Code

- Be specific and structured with headings and bullets; review periodically.
- Use `@` imports (above) to include related docs; avoid placing imports in code blocks.
- Quickly add new memories by starting a message with `#`; use `/memory` to edit.

Reference: [Claude Code memory best practices](https://docs.anthropic.com/en/docs/claude-code/memory)
