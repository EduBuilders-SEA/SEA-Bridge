#!/bin/bash
# SEA-LION Hackathon Deployment on g5.4xlarge

echo "🚀 Setting up SEA-LION on g5.4xlarge for hackathon..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install NVIDIA drivers
sudo apt install -y ubuntu-drivers-common
sudo ubuntu-drivers autoinstall

# Install Docker with NVIDIA support
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install NVIDIA Container Runtime
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt-get update && sudo apt-get install -y nvidia-container-runtime

# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Configure Ollama for external access
sudo mkdir -p /etc/systemd/system/ollama.service.d
echo "[Service]" | sudo tee /etc/systemd/system/ollama.service.d/environment.conf
echo "Environment=\"OLLAMA_HOST=0.0.0.0\"" | sudo tee -a /etc/systemd/system/ollama.service.d/environment.conf

# Start Ollama service
sudo systemctl daemon-reload
sudo systemctl enable ollama
sudo systemctl start ollama

# Pull SEA-LION model
ollama pull aisingapore/Llama-SEA-LION-v3.5-8B-R

echo "✅ SEA-LION deployment complete!"
echo "🦁 Model ready at: http://$(curl -s http://checkip.amazonaws.com):11434"