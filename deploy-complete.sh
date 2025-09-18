#!/bin/bash
# Complete SEA-Bridge Deployment Script for g5.4xlarge
# Deploys both Ollama SEA-LION and Next.js app in containers

set -e

echo "🚀 Starting complete SEA-Bridge deployment on g5.12xlarge..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install NVIDIA drivers
echo "🎮 Installing NVIDIA drivers..."
sudo apt install -y ubuntu-drivers-common
sudo ubuntu-drivers autoinstall

# Install Docker with NVIDIA support
echo "🐳 Installing Docker with NVIDIA support..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install NVIDIA Container Runtime
echo "🔧 Installing NVIDIA Container Runtime..."
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt-get update && sudo apt-get install -y nvidia-container-runtime

# Install Docker Compose
echo "🔧 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create environment file template
echo "📝 Creating environment file template..."
cat > .env.example << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google AI (Gemini Fallback)
GOOGLE_GENAI_API_KEY=your_google_ai_key

# AWS Services (SNS & S3)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_SNS_REGION=us-east-1
SNS_DELIVERY_STATUS_ROLE=your_sns_role_arn
SNS_USAGE_REPORT_BUCKET=your_s3_bucket

# Firebase Auth
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
EOF

# Check if .env exists, if not copy from example
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Please copy .env.example to .env and fill in your values:"
    echo "   cp .env.example .env"
    echo "   nano .env"
    exit 1
fi

# Ensure .env is present
if [ ! -f .env ]; then
  echo "❌ .env not found in project root. Create it before deploying."; exit 1
fi

# Export env for local use in this script (MODEL override, etc.)
set -a; source .env; set +a

# Build and start services using .env
echo "🏗️  Building and starting SEA-Bridge services (with .env)..."
docker-compose --env-file .env up --build -d

# Wait for Ollama to be ready
echo "⏳ Waiting for Ollama to be ready..."
sleep 10

# Pull SEA-LION model (override via SEA_LION_OLLAMA_MODEL, default to 27B for prod)
MODEL="${SEA_LION_OLLAMA_MODEL:-aisingapore/Gemma-SEA-LION-v4-27B-IT}"
echo "🦁 Pulling SEA-LION model: $MODEL"
docker-compose exec -T ollama ollama pull "$MODEL"

# Quick health checks
echo "🔍 Health checks..."
if ! curl -sf http://localhost:11434/api/version >/dev/null; then
  echo "❌ Ollama API not responding on :11434"; exit 1
fi
if ! curl -sf http://localhost:3000 >/dev/null; then
  echo "❌ Next.js app not responding on :3000"; exit 1
fi

# Get public IP
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com)

echo ""
echo "✅ SEA-Bridge deployment complete!"
echo ""
echo "🌐 Services available at:"
echo "   📱 Next.js App: http://$PUBLIC_IP:3000"
echo "   🦁 Ollama API: http://$PUBLIC_IP:11434"
echo ""
echo "🔧 Management commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart: docker-compose restart"
echo "   Update: docker-compose pull && docker-compose up -d"
echo ""
echo "🎉 Your SEA-Bridge translation engine is ready!"

