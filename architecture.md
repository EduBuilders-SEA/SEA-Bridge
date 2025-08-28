# LinguaLearn Bridge - Pragmatic Hackathon Architecture

This document outlines a pragmatic technical architecture for the LinguaLearn Bridge application, designed for rapid development within a hackathon timeline. The primary goal is to maximize developer velocity to focus on the core user experience and the innovative use of the SEA-LION LLM.

**Core Philosophy:** Use a tightly integrated, modern stack that minimizes infrastructure setup and maximizes feature development speed. A unified Next.js + Genkit stack is the fastest path to a winning prototype.

```mermaid
graph TD
    subgraph User Layer
        A[User's Browser]
    end

    subgraph Firebase App Hosting / Vercel
        B[Next.js Frontend]
        C[Genkit AI Flows (as Server Actions)]
        B -- Renders & Serves --> A
        A -- Calls AI Flows --> C
    end

    subgraph External Services
        subgraph Supabase
            D[Supabase Auth]
            E[Supabase Realtime]
            F[Supabase Postgres DB]
            G[Supabase Storage]
        end

        subgraph AI
            H[SEA-LION Model Endpoint]
        end

        C -- Authenticates via --> D
        C -- Queries/Mutates DB --> F
        C -- Publishes to & Listens via --> E
        A -- Subscribes for Live Chat --> E
        C -- Generates Signed URLs for --> G
        A -- Uploads/Downloads Files --> G
        C -- Invokes AI Model via HTTPS --> H
    end

    %% Flow Descriptions
    classDef user fill:#E3F2FD,stroke:#64B5F6,stroke-width:2px;
    classDef vercel fill:#f0f0f0,stroke:#000,stroke-width:2px;
    classDef services fill:#E8F5E9,stroke:#4CAF50,stroke-width:2px;

    class A user;
    class B,C vercel;
    class D,E,F,G,H services;

```

### Component Breakdown:

1.  **Unified Frontend & Backend (Next.js + Genkit):**
    *   **Framework:** **Next.js with App Router**. This will handle both the frontend UI and the backend logic.
    *   **AI Logic:** **Genkit Flows** written in TypeScript. These flows act as our backend, are marked with the `'use server'` directive, and can be called directly and securely from our React components. This eliminates the need for a separate API layer.
    *   **UI:** Built with **shadcn/ui** and **Tailwind CSS**.
    *   **Forms:** **React Hook Form** for managing form state and **Zod** for validation.

2.  **Authentication (Supabase):**
    *   **Service:** **Supabase Auth.**
    *   **Usage:** Manages user sign-up, sign-in, and JWT issuance. The Genkit flows will validate tokens on each call.

3.  **Database (Supabase):**
    *   **Service:** **Supabase Postgres.**
    *   **Client:** The **Supabase.js client** will be used directly in Genkit flows for all database operations. This is simpler and faster than adding a separate ORM like Drizzle for a hackathon.

4.  **Real-time Chat (Supabase):**
    *   **Service:** **Supabase Realtime.**
    *   **Usage:** Provides real-time capabilities out-of-the-box. The frontend will subscribe directly to database changes, and the Genkit flows will write to the database, triggering real-time updates.

5.  **AI/ML (Innovation Hotspot):**
    *   **Primary AI Service:** **SEA-Lion Model Endpoint.**
    *   **Point of Innovation:** The **`transcribe-and-translate` and `translate-message`** flows are the prime candidates for showcasing the SEA-Lion model's unique capabilities. Use it here to demonstrate superior handling of Southeast Asian languages and dialects compared to generic models. Genkit can easily make `fetch` requests to any HTTPS endpoint.

6.  **File Storage (Supabase):**
    *   **Service:** **Supabase Storage.**
    *   **Usage:** Used to store user-uploaded files like voice notes and documents.

This integrated architecture is the most direct path to building a feature-rich, impressive application within the tight constraints of a hackathon.