#!/bin/bash
set -u

# Configuration
IMAGE_NAME="webrtc-voice-streaming"
START_HTTPS_PORT=8443
START_HTTP_PORT=8080
UDP_PORT=8555

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RESET='\033[0m'

echo -e "${GREEN}🔍 Starting Smart Port Hunt...${RESET}"

# Function to find a free port
find_free_port() {
    local port=$1
    while nc -z localhost $port >/dev/null 2>&1; do
        echo -e "${YELLOW}   Port $port is busy, trying next...${RESET}" >&2
        port=$((port + 1))
    done
    echo $port
}

# 1. Hunt for HTTPS Port
echo "Checking HTTPS port (starts at $START_HTTPS_PORT)..."
HOST_HTTPS_PORT=$(find_free_port $START_HTTPS_PORT)
echo -e "${GREEN}✅ Selected HTTPS Port: $HOST_HTTPS_PORT${RESET}"

# 2. Hunt for HTTP Port (CA Download)
echo "Checking HTTP port (starts at $START_HTTP_PORT)..."
HOST_HTTP_PORT=$(find_free_port $START_HTTP_PORT)
echo -e "${GREEN}✅ Selected HTTP Port:  $HOST_HTTP_PORT${RESET}"

# 3. Hunt for UDP Port (WebRTC)
# Note: UDP checking with netstat requires different flags or just simple increment
echo "Checking UDP port (starts at $UDP_PORT)..."
HOST_UDP_PORT=$UDP_PORT 
# Simple check logic for UDP usually omitted or complex, assuming default for now or strict increment
if netstat -uln | grep -q ":$UDP_PORT "; then
     echo -e "${YELLOW}   UDP $UDP_PORT busy, shifting...${RESET}"
     HOST_UDP_PORT=$((UDP_PORT + 1))
fi
echo -e "${GREEN}✅ Selected UDP Port:   $HOST_UDP_PORT${RESET}"

# 4. Run Docker
echo -e "\n${GREEN}🚀 Launching Container...${RESET}"
echo "   Mapping $HOST_HTTPS_PORT:8443"
echo "   Mapping $HOST_HTTP_PORT:8080"
echo "   Mapping $HOST_UDP_PORT:8555"

# Ensure config directory exists for mapping
mkdir -p $(pwd)/config
mkdir -p $(pwd)/ssl

# Check if image exists, build if not
if [[ "$(docker images -q $IMAGE_NAME 2> /dev/null)" == "" ]]; then
    echo "Image not found. Building..."
    docker build -t $IMAGE_NAME .
fi

# Run detached
CONTAINER_ID=$(docker run -d \
    --name webrtc_backend_$(date +%s) \
    --restart unless-stopped \
    -p $HOST_HTTPS_PORT:8443 \
    -p $HOST_HTTP_PORT:8080 \
    -p $HOST_UDP_PORT:8555/udp \
    -v $(pwd)/config:/config \
    -v $(pwd)/ssl:/ssl \
    -e SSL_DIR="/ssl" \
    $IMAGE_NAME)

echo -e "\n${GREEN}🎉 Container Started!${RESET}"
echo "ID: $CONTAINER_ID"
echo "-----------------------------------------------------"
echo "🔐 Secure Management: https://$(ip route get 1 | awk '{print $7; exit}'):$HOST_HTTPS_PORT"
echo "📥 CA Download:       http://$(ip route get 1 | awk '{print $7; exit}'):$HOST_HTTP_PORT/ca.crt"
echo "-----------------------------------------------------"
