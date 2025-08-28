# SEA Bridge - Technical Architecture

This document outlines the technical architecture for the SEA Bridge application, designed with a hybrid-cloud approach utilizing Vercel for the frontend and Amazon Web Services (AWS) for the backend.

```mermaid
graph TD
    subgraph "User Devices"
        direction LR
        User_Browser[("User's Browser<br>(Teacher/Parent)")]
    end

    subgraph "Vercel Platform"
        direction TB
        Vercel_Edge[("Vercel Edge Network<br>CDN & Caching")]
        Vercel_Compute[("Vercel Serverless Functions<br>for Next.js Frontend")]
    end

    subgraph "AWS Cloud (Backend)"
        direction TB

        subgraph "API & Backend Logic (Serverless)"
            APIGW[("Amazon API Gateway<br>(REST & WebSocket)")]
            Lambda_Translate[("AWS Lambda<br>Translate Function")]
            Lambda_Summarize[("AWS Lambda<br>Summarize Function")]
            Lambda_Transcribe[("AWS Lambda<br>Transcribe Function")]
            Lambda_SendMessage[("AWS Lambda<br>SendMessage Function")]
        end

        subgraph "AI & ML Services"
            Bedrock[("Amazon Bedrock")]
            SEALion_Model[("Custom Model<br><i>SEA-Lion</i>")]
            Transcribe[("Amazon Transcribe<br>Speech-to-Text")]
            Bedrock -- hosts --> SEALion_Model
        end

        subgraph "Data & Storage Layer"
            S3[("Amazon S3<br>Voice Notes & Docs")]
            DynamoDB[("Amazon DynamoDB<br>Chat History, User Data")]
        end

        subgraph "Messaging & Identity"
            SNS[("Amazon SNS<br>SMS Fallback")]
            Cognito[("Amazon Cognito<br>User Authentication")]
        end
    end

    %% --- Data Flows ---

    %% User to Frontend (Vercel)
    User_Browser -- HTTPS Request --> Vercel_Edge
    Vercel_Edge -- Serves Static Content & Forwards to --> Vercel_Compute

    %% Frontend to Backend (AWS)
    Vercel_Compute -- API Calls --> APIGW

    %% API Gateway to Lambdas
    APIGW -- Triggers --> Lambda_Translate
    APIGW -- Triggers --> Lambda_Summarize
    APIGW -- Triggers --> Lambda_Transcribe
    APIGW -- Triggers --> Lambda_SendMessage

    %% Lambdas to AI Services
    Lambda_Translate -- Calls --> Bedrock
    Lambda_Summarize -- Calls --> Bedrock
    Lambda_Transcribe -- Calls --> Transcribe
    Lambda_SendMessage -- Publishes to --> SNS

    %% Lambdas to Data Stores
    Lambda_SendMessage -- Writes/Reads --> DynamoDB
    Lambda_Transcribe -- Reads from --> S3

    %% Real-time Chat Flow
    APIGW -- WebSocket Connection --> User_Browser
    Lambda_SendMessage -- Triggers update to --> APIGW

    %% Authentication
    User_Browser -- Auth Flow --> Cognito
    Vercel_Compute -- Validates Token with --> Cognito
```

### Architecture Components Breakdown:

1.  **User Layer:**
    *   **User's Browser**: The client-side application running on the user's device.

2.  **Frontend Platform (Vercel):**
    *   **Vercel Edge Network**: Acts as the Content Delivery Network (CDN). It caches static assets (JS, CSS, images) at edge locations closer to the user, reducing latency.
    *   **Vercel Serverless Functions**: Vercel automatically deploys the Next.js frontend application onto its serverless compute infrastructure. This handles server-side rendering and serves the application to the user.

3.  **API & Backend (AWS):**
    *   **Amazon API Gateway**: Manages all API calls from the Vercel frontend. It provides both a REST API for standard requests (like initiating a translation) and a WebSocket API to enable real-time, two-way communication for the chat feature.
    *   **AWS Lambda**: Hosts the backend logic for individual AI tasks (translation, summarization, etc.) as separate, stateless functions, written in Node.js using the AWS SDK.

4.  **AI & ML Services (AWS):**
    *   **Amazon Bedrock**: A fully managed service that offers a choice of high-performing foundation models. It will be used to host and serve the custom **SEA-Lion Model**.
        *   **Custom Model (SEA-Lion)**: An imported model specializing in Southeast Asian languages, used for all translation and summarization tasks to ensure high accuracy and contextual understanding.
    *   **Amazon Transcribe**: Converts speech from voice notes into text.

5.  **Data & Storage (AWS):**
    *   **Amazon S3 (Simple Storage Service)**: Used for object storage. All user-uploaded content like voice notes and documents will be stored here.
    *   **Amazon DynamoDB**: A fully managed NoSQL database for storing structured data like user profiles, contacts, and chat message history.

6.  **Messaging & Identity (AWS):**
    *   **Amazon SNS (Simple Notification Service)**: Handles the sending of transactional SMS messages for the low-connectivity fallback feature.
    *   **Amazon Cognito**: Provides a complete solution for user identity management, including user registration, sign-in, and access control. This replaces the current `localStorage`-based session management.
```