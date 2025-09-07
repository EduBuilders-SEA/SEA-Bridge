# Document Translation Service (Python Backend)

This repository contains the backend service for the Sea-Bridge project, engineered in Python using FastAPI. It is designed as a highly scalable, resilient, and efficient asynchronous document processing pipeline, deeply integrated with the AWS ecosystem to handle complex text extraction and translation tasks.

## Key Features

-   **Secure S3 Pre-signed URL Uploads:** The system generates secure, short-lived URLs for clients to upload files directly to an S3 bucket. This decouples the client from the server during the upload process, improves security, and removes the file size limitation of the API server itself.

-   **Asynchronous Job Processing:** Built on a robust queue-based architecture using AWS API Gateway, SQS, and Lambda. This allows the API to provide an immediate response (`job_id`) to the client, while long-running tasks are reliably processed in the background, preventing HTTP timeouts and ensuring high availability.

-   **Advanced Text Extraction Engine:** A multi-layered approach to extract text from various document formats:
    -   **Digital PDFs:** Utilizes `PyMuPDF` for fast and accurate text extraction from standard PDF files.
    -   **Scanned PDFs & Images:** Employs **AWS Textract** as a powerful OCR fallback, ensuring high-quality text extraction from scanned documents, preserving layout and table structures.
    -   **Microsoft Word:** Natively handles `.docx` files using the `python-docx` library.

-   **Intelligent Translation Core:**
    -   Primarily uses **Amazon Translate** for fast, accurate, and cost-effective machine translation.
    -   The architecture is extensible to incorporate **Amazon Bedrock** for more complex, context-aware translation or summarization tasks driven by large language models (LLMs).

-   **High-Performance Caching:** Integrates with **Redis (Amazon ElastiCache)** to cache translation results. A hash of the file content and target language serves as the cache key, dramatically reducing latency and cost for repeated requests.

-   **Job Status Tracking:** Provides a dedicated API endpoint for clients to poll the status of a processing job (`QUEUED`, `PROCESSING`, `SUCCESS`, `FAILED`) using its unique `job_id`.

## System Architecture & Data Flow

The architecture is designed to be event-driven and serverless, ensuring scalability and fault tolerance.

1.  **Client-Side Upload:**
    -   The client (Next.js App) requests a pre-signed URL from a dedicated endpoint on its own backend.
    -   The client uploads the document file directly to the **S3 Bucket** using this URL.

2.  **Job Initiation:**
    -   Upon successful upload, the client sends a `POST` request to the `/process-documents` endpoint on **API Gateway**. The payload contains the S3 URI of the uploaded file and the target language.
    -   The API Gateway triggers a lightweight Lambda function (`api_handler`) which validates the request, generates a unique `job_id`, and pushes a message containing the job details into an **SQS Queue**.
    -   The API immediately returns the `job_id` to the client with a `202 Accepted` status.

3.  **Backend Processing:**
    -   The message in the **SQS Queue** triggers the main **Lambda Processor Function**.
    -   This function executes the core operational logic (detailed below).
    -   Job status is tracked in a **DynamoDB Table**, indexed by `job_id`.

4.  **Result Retrieval:**
    -   The client periodically polls the `GET /jobs/{job_id}/status` endpoint.
    -   This endpoint queries the **DynamoDB Table** to fetch the current status.
    -   If the job is `SUCCESS`, the response includes a pre-signed URL to download the translated document from the S3 bucket.

## Core Operational Logic (Lambda Processor)

The `document_processor` Lambda function follows a precise sequence of steps for each job:

1.  **Receive & Parse:** The function is triggered by a message from SQS, which it parses to get the `job_id`, source file location, and target language.

2.  **Cache Check:** It first calculates a hash of the source file's content and the target language. This hash is used as a key to query the **Redis Cache**.
    -   **Cache Hit:** If the key exists, the S3 location of the pre-translated file is retrieved. The job status in DynamoDB is updated to `SUCCESS`, and the process terminates early.
    -   **Cache Miss:** If the key does not exist, the process continues.

3.  **File Download:** The source document is downloaded from the S3 bucket to the Lambda's temporary storage.

4.  **Text Extraction:** The service attempts to extract text using `PyMuPDF`. If the returned text is empty or below a certain threshold (indicating a scanned document), it automatically falls back to **AWS Textract** for OCR processing.

5.  **Translation:** The extracted text is passed to the **Amazon Translate** service, specifying the source (optional, can be auto-detected) and target languages.

6.  **Store Result:** The translated text is saved into a new document file, which is then uploaded to a designated `results/` prefix in the S3 bucket.

7.  **Update Cache & State:**
    -   The S3 URI of the newly created translated file is stored in the **Redis Cache** with the hash key generated in step 2, with a TTL (e.g., 30 days).
    -   The job's entry in the **DynamoDB Table** is updated to `SUCCESS`, and the result file's URI is added.

8.  **Error Handling:** The entire process is wrapped in error handling. If any step fails, the job's status in DynamoDB is updated to `FAILED` with a descriptive error message, and the triggering SQS message is moved to a Dead-Letter Queue (DLQ) for later inspection.

## Technology Stack

-   **Framework:** FastAPI
-   **ASGI Server:** Uvicorn
-   **Package/Environment Manager:** uv
-   **Cloud Services:**
    -   **Compute:** AWS Lambda
    -   **Storage:** AWS S3
    -   **API:** AWS API Gateway
    -   **Database:** AWS DynamoDB
    -   **Messaging:** AWS SQS
    -   **Caching:** AWS ElastiCache for Redis
    -   **AI/ML:** AWS Textract, AWS Translate
-   **Infrastructure as Code (IaC) (Recommended):** AWS SAM or Serverless Framework
-   **Core Libraries:** Boto3, Pydantic, PyMuPDF, python-docx

## Local Development Setup

### Prerequisites

1.  **AWS CLI:** Installed and configured with credentials (`aws configure`).
2.  **uv:** The Python package installer. [Installation Guide](https://github.com/astral-sh/uv).

### Instructions

1.  **Clone the repository and navigate to the service directory:**
    ```bash
    git clone <your-repo-url>
    cd my-project-root/python-service
    ```

2.  **Configure Environment Variables:**
    Copy the example `.env` file and populate it with your specific settings.
    ```bash
    cp .env.example .env
    ```
    *Edit `.env` with your AWS Region, S3 bucket name, etc.*

3.  **Setup Virtual Environment and Install Dependencies:**
    Use `uv` to create a virtual environment and install dependencies from `requirements.txt`.
    ```bash
    # Create the virtual environment
    uv venv

    # Sync dependencies
    uv pip sync requirements.txt
    ```

4.  **Run the Development Server:**
    Use `uv run` to execute the `uvicorn` server within the managed environment.
    ```bash
    uv run uvicorn src.main:app --reload
    ```
    The API will be available at `http://127.0.0.1:8000`. The interactive API documentation (Swagger UI) can be accessed at `http://127.0.0.1:8000/docs`.