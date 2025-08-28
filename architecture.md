# LinguaLearn Bridge - Final Hackathon Architecture

This architecture is designed for a team new to Next.js, prioritizing a clear separation between frontend and backend concerns to maximize development speed and reduce the learning curve. It leverages the strengths of Vercel for the frontend, AWS for scalable AI and serverless logic, and Supabase for its rapid "backend-as-a-service" features.

```mermaid
graph TD
    subgraph User Layer
        A[User's Browser]
    end

    subgraph Frontend @ Vercel
        B[Next.js React App]
        B -- Renders & Serves --> A
    end

    subgraph Backend @ AWS
        C[Amazon API Gateway]
        D[AWS Lambda Functions (Node.js)]
        E[Amazon Bedrock]
        F[SEA-Lion Custom Model]

        A -- API Calls --> C
        C -- Triggers --> D
        D -- Invokes AI Model via --> E
        E -- Uses --> F
    end

    subgraph Data & Services @ Supabase
        G[Supabase Auth]
        H[Supabase Postgres DB]
        I[Supabase Realtime]
        J[Supabase Storage]
    end

    %% Connections
    A -- Authenticates via --> G
    A -- Subscribes for Live Chat --> I
    A -- Uploads/Downloads Files --> J
    D -- Queries/Mutates DB --> H
    D -- Publishes Messages to --> I


    %% Flow Descriptions
    classDef user fill:#E3F2FD,stroke:#64B5F6,stroke-width:2px;
    classDef vercel fill:#f0f0f0,stroke:#000,stroke-width:2px;
    classDef aws fill:#FF9900,stroke:#232F3E,stroke-width:2px;
    classDef supabase fill:#E8F5E9,stroke:#3ECF8E,stroke-width:2px;

    class A user;
    class B vercel;
    class C,D,E,F aws;
    class G,H,I,J supabase;
```

### Component Breakdown:

1.  **Frontend (Vercel):**
    *   **Framework:** Next.js, used primarily for its powerful React-based UI rendering.
    *   **Responsibilities:** Renders all UI components, manages client-side state, handles user interactions, and makes authenticated API calls to the AWS backend.

2.  **Backend API (AWS Lambda + API Gateway):**
    *   **API Gateway:** Provides simple, scalable HTTPS endpoints for the frontend to call (e.g., `/translate`, `/sendMessage`).
    *   **Lambda Functions:** Contain the backend logic. Each function is a small, independent Node.js script. For example, a `sendMessage` function would receive data from the API Gateway, process it, and save it to the Supabase database.
    *   **Advantage:** This decouples the backend entirely, making it easier for new developers to work on without interfering with the Next.js frontend.

3.  **Authentication (Supabase Auth):**
    *   The Next.js client will use the Supabase JS library to handle user sign-up and sign-in.
    *   When making an API call to AWS, the client will include the Supabase JWT in the `Authorization` header. The Lambda function can validate this token to secure the endpoint.

4.  **Database & Real-time (Supabase):**
    *   **Postgres DB:** Your AWS Lambda functions will use a Postgres client library to connect to the Supabase database to store user data, messages, etc.
    *   **Realtime:** The frontend client will subscribe directly to Supabase Realtime to listen for database changes (e.g., new messages) and update the UI live.

5.  **AI/ML (Amazon Bedrock):**
    *   Your AWS Lambda functions will use the AWS SDK to invoke your custom **SEA-Lion model** hosted in Bedrock for all translation and summarization tasks. This satisfies the core requirement of using the sponsor's AI service.

6.  **Storage (Supabase Storage):**
    *   The frontend client will communicate with Supabase directly to get secure URLs for uploading and downloading files. This is simpler than routing through the AWS backend.

This is our stable plan. It's the best balance of power, scalability, and, most importantly, team productivity for your hackathon.