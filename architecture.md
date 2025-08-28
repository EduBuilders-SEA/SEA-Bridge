# LinguaLearn Bridge - Python-Centric AWS Architecture

This document outlines the final, pragmatic technical architecture for the LinguaLearn Bridge application. This plan is designed for a team that prefers **Python** for backend development and needs to leverage the **AWS ecosystem** for a hackathon.

**Core Philosophy:** Decouple the frontend and backend to allow the team to work in parallel using their preferred technologies. The frontend team will focus on Next.js for the UI, while the backend team will build with Python on AWS Lambda.

```mermaid
graph TD
    subgraph User Layer
        A[User's Browser]
    end

    subgraph Vercel
        B[Next.js Frontend @ Vercel]
        B -- Renders & Serves --> A
    end

    subgraph AWS Cloud
        subgraph API
            C[Amazon API Gateway]
        end

        subgraph Compute
            D[AWS Lambda Functions (Python)]
        end

        subgraph AI/ML
            E[Amazon Bedrock]
            F[SEA-Lion Custom Model]
        end

        subgraph Database
            G[Amazon RDS - PostgreSQL]
        end

        subgraph Real-time Messaging
            H[AWS AppSync - WebSockets]
        end

        subgraph Storage
            I[Amazon S3]
        end

        subgraph Authentication
            J[Amazon Cognito]
        end

        A -- API Calls --> C
        C -- Triggers --> D
        D -- Authenticates via --> J
        D -- Invokes AI Model via --> E
        E -- Uses --> F
        D -- Queries/Mutates --> G
        D -- Publishes Messages to --> H
        A -- Subscribes for Live Chat via --> H
        D -- Generates Signed URLs for --> I
        A -- Uploads/Downloads Directly --> I
    end

    %% Flow Descriptions
    classDef user fill:#E3F2FD,stroke:#64B5F6,stroke-width:2px;
    classDef vercel fill:#f0f0f0,stroke:#000,stroke-width:2px;
    classDef aws fill:#fff5e6,stroke:#FF9900,stroke-width:2px;

    class A user;
    class B vercel;
    class C,D,E,F,G,H,I,J aws;

```

### Component Breakdown:

1.  **Frontend (Vercel):**
    *   **Framework:** **Next.js**. Used *only* for its UI rendering capabilities.
    *   **Responsibilities:** Building and rendering React components, managing UI state, and making authenticated API calls to the AWS backend via API Gateway.
    *   **UI Library:** shadcn/ui and Tailwind CSS.

2.  **Backend API (AWS Lambda + API Gateway):**
    *   **Language:** **Python**.
    *   **Services:**
        *   **AWS Lambda:** All backend logic (sending messages, translating text, etc.) will be written as small, independent Python functions.
        *   **Amazon API Gateway:** Provides RESTful HTTPS endpoints that trigger the corresponding Lambda functions. This is the secure front door to our backend.

3.  **Authentication (AWS):**
    *   **Service:** **Amazon Cognito.**
    *   **Flow:** The Next.js frontend will use a library like AWS Amplify to handle user sign-up/sign-in. This will provide JWTs (tokens) that are sent with every API call. API Gateway and Lambda will validate these tokens to secure the backend.

4.  **Database (AWS):**
    *   **Service:** **Amazon RDS for PostgreSQL.**
    *   **Access:** The Python Lambda functions will connect to the RDS instance to store and retrieve data for users, messages, and contacts.

5.  **AI/ML (AWS):**
    *   **Service:** **Amazon Bedrock.**
    *   **Model:** The **SEA-Lion model** will be imported and hosted in Bedrock.
    *   **Usage:** Python Lambda functions will use the `boto3` (AWS SDK for Python) to call the Bedrock API, sending text for translation or summarization.

6.  **Real-time Chat (AWS):**
    *   **Service:** **AWS AppSync.**
    *   **Usage:** AppSync is a managed GraphQL service that can also handle real-time data over WebSockets. When a new message is saved to the database, a Lambda function can publish a mutation to AppSync, which will then push the new message to all subscribed chat clients.

7.  **File Storage (AWS):**
    *   **Service:** **Amazon S3.**
    *   **Flow:** To upload a file, the frontend will first ask the Python backend for a secure, temporary upload link (an S3 pre-signed URL). The frontend then uses this URL to upload the file directly to S3. This is secure and efficient.

This architecture is robust, fully leverages the AWS ecosystem, and most importantly, is tailored to your team's existing Python skills.