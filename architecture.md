# LinguaLearn Bridge - Pragmatic Hackathon Architecture

This document outlines a pragmatic technical architecture for the LinguaLearn Bridge application, designed for rapid development within a hackathon timeline. The primary goal is to maximize developer velocity to focus on the core user experience and the innovative use of the SEA-LION LLM.

**Core Philosophy:** Use a hybrid approach. A tightly integrated Next.js + Genkit stack for the frontend and UI-centric AI features, and a dedicated Python (FastAPI) backend for core backend services like SMS integration, which leverages the team's Python expertise.

```mermaid
graph TD
    subgraph User Layer
        A[User's Browser]
    end

    subgraph Vercel
        B[Next.js Frontend]
        C[Genkit AI Flows (as Server Actions)]
        B -- Renders & Serves --> A
        A -- Calls UI AI Flows --> C
        B -- Calls Backend API --> I
    end

    subgraph External Services
        subgraph Supabase
            D[Supabase Auth]
            E[Supabase Realtime]
            F[Supabase Postgres DB]
            G[Supabase Storage]
        end

        subgraph AI & Comms
            H[SEA-LION Model Endpoint]
            I[FastAPI Backend Service]
            J[SMS Gateway (e.g., Twilio)]
        end

        C -- Invokes AI Model via HTTPS --> H

        I -- Authenticates via --> D
        I -- 1. Writes message to --> F
        F -- 2. Triggers event --> E
        E -- 3. Pushes update to --> A
        A -- Subscribes for Live Chat --> E
        I -- Generates Signed URLs for --> G
        A -- Uploads/Downloads Files --> G

        I -- Sends/Receives SMS via --> J
        I -- Invokes SEA-LION for Translation --> H
    end

    %% Flow Descriptions
    classDef user fill:#E3F2FD,stroke:#64B5F6,stroke-width:2px;
    classDef vercel fill:#f0f0f0,stroke:#000,stroke-width:2px;
    classDef services fill:#E8F5E9,stroke:#4CAF50,stroke-width:2px;

    class A user;
    class B,C vercel;
    class D,E,F,G,H,I,J services;

```

### Component Breakdown:

1.  **Unified Frontend & Backend (Next.js + Genkit):**
    *   **Framework:** **Next.js with App Router**. This will handle both the frontend UI and the backend logic for UI-centric features (document summarization, voice note transcription).
    *   **AI Logic:** **Genkit Flows** written in TypeScript will continue to power features directly initiated by the user in the UI.
    *   **UI:** Built with **shadcn/ui** and **Tailwind CSS**.

2.  **SMS & Core Backend (FastAPI - Python):**
    *   **Framework:** **FastAPI**. This Python service will be the integration point for core communication logic. This is the primary area for the Python team.
    *   **SMS Gateway Integration:** The FastAPI service will handle all interactions with a third-party SMS provider (e.g., Twilio). It will have an endpoint for sending messages and a webhook for receiving inbound replies.
    *   **Inbound Message Translation (SEA-LION INNOVATION HOTSPOT):** When an SMS is received from a parent, the FastAPI service will call the **SEA-LION model** to translate the message into English before storing it. This is a key point of innovation.

3.  **Authentication (Supabase):**
    *   **Service:** **Supabase Auth.**
    *   **Usage:** The FastAPI service will validate JWTs passed from the Next.js frontend to secure its endpoints.

4.  **Database (Supabase):**
    *   **Service:** **Supabase Postgres.**
    *   **Client:** The **FastAPI backend** will be primarily responsible for all database operations using the `supabase-py` client.

5.  **Real-time Chat (Supabase):**
    *   **Service:** **Supabase Realtime.**
    *   **Usage:** The FastAPI backend will write messages to the database. The Next.js frontend will subscribe directly to database changes via Supabase Realtime to update the chat UI instantly.

This hybrid architecture allows the team to leverage the speed of Next.js/Genkit for the frontend while enabling the Python team to build the core backend infrastructure and integrate the SEA-Lion model in a meaningful way.
