#!/bin/bash
# Local Development Setup for SEA-Bridge
# Test containerization locally before deploying to EC2

set -e

echo "🏠 Setting up SEA-Bridge locally with Docker..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop first:"
    echo "   https://www.docker.com/products/docker-desktop/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create local environment file with default values
echo "📝 Creating local environment file..."
cat > .env << 'EOF'
# Local Development Environment
NODE_ENV=development

# Supabase Configuration (Replace with your actual values)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Google AI (Gemini Fallback) - Replace with your actual key
GOOGLE_GENAI_API_KEY=your_google_ai_key_here

# Ollama Configuration
OLLAMA_ENDPOINT=http://ollama:11434

# AWS Services (Optional - only needed for SMS features)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_SNS_REGION=us-east-1
SNS_DELIVERY_STATUS_ROLE=your_sns_role_arn
SNS_USAGE_REPORT_BUCKET=your_s3_bucket

# Firebase Auth (Optional - only needed if using Firebase auth)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
EOF

echo "✅ Created .env file with default values"
echo ""
echo "⚠️  IMPORTANT: Please update the following values in .env:"
echo "   - NEXT_PUBLIC_SUPABASE_URL"
echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY" 
echo "   - GOOGLE_GENAI_API_KEY"
echo ""
echo "📝 You can edit the file with: nano .env"
echo ""

# Ask user if they want to continue
read -p "Have you updated the .env file with your actual values? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please update .env file and run this script again."
    exit 1
fi

# Build and start services
echo "🏗️  Building and starting local services..."
docker-compose -f docker-compose.dev.yml up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 15

# Check if Ollama is running
echo "🔍 Checking Ollama service..."
if curl -s http://localhost:11434/api/version > /dev/null; then
    echo "✅ Ollama is running"
else
    echo "⚠️  Ollama might still be starting up..."
fi

# Pull SEA-LION model
echo "🦁 Pulling SEA-LION model (this may take a few minutes)..."
docker-compose -f docker-compose.dev.yml exec ollama ollama pull aisingapore/Llama-SEA-LION-v3.5-8B-R

echo ""
echo "✅ Local SEA-Bridge setup complete!"
echo ""
echo "🌐 Services available at:"
echo "   📱 Next.js App: http://localhost:3000"
echo "   🦁 Ollama API: http://localhost:11434"
echo ""
echo "🔧 Management commands:"
echo "   View logs: docker-compose -f docker-compose.dev.yml logs -f"
echo "   Stop services: docker-compose -f docker-compose.dev.yml down"
echo "   Restart: docker-compose -f docker-compose.dev.yml restart"
echo ""
echo "🧪 Test translation:"
echo "   curl -X POST http://localhost:11434/api/generate \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"model\":\"aisingapore/Llama-SEA-LION-v3.5-8B-R\",\"prompt\":\"Translate hello to Vietnamese\",\"stream\":false}'"
echo ""
echo "🎉 Your local SEA-Bridge is ready for testing!"