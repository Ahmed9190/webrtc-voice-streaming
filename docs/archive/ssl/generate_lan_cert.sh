#!/bin/bash
#
# SSL Certificate Generator for LAN Access
# Generates self-signed certificates with Subject Alternative Names for LAN IPs
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SSL_DIR="${SCRIPT_DIR}"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     SSL Certificate Generator for LAN Production           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to detect LAN IP
detect_lan_ip() {
    local ip=""
    
    # Method 1: ip route (most reliable on Linux)
    if command -v ip &> /dev/null; then
        ip=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+' || true)
    fi
    
    # Method 2: hostname -I (fallback)
    if [ -z "$ip" ] && command -v hostname &> /dev/null; then
        ip=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
    fi
    
    # Method 3: ifconfig (older systems)
    if [ -z "$ip" ] && command -v ifconfig &> /dev/null; then
        ip=$(ifconfig 2>/dev/null | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | awk '{print $2}' | head -1 || true)
    fi
    
    echo "$ip"
}

# Function to get hostname
get_hostname() {
    hostname 2>/dev/null || echo "homeassistant"
}

# Parse arguments for silent/non-interactive mode
SILENT=false
for arg in "$@"; do
    if [ "$arg" == "--silent" ] || [ "$arg" == "-y" ]; then
        SILENT=true
    fi
done

# Detect LAN IP
echo -e "${YELLOW}🔍 Detecting network configuration...${NC}"
LAN_IP=$(detect_lan_ip)
HOSTNAME=$(get_hostname)

if [ -z "$LAN_IP" ]; then
    if [ "$SILENT" = true ]; then
        echo -e "${RED}❌ Could not detect LAN IP automatically and running in silent mode.${NC}"
        exit 1
    fi
    echo -e "${RED}❌ Could not detect LAN IP address automatically.${NC}"
    read -p "Please enter your server's LAN IP address: " LAN_IP
fi

echo -e "${GREEN}✓ Detected LAN IP: ${LAN_IP}${NC}"
echo -e "${GREEN}✓ Hostname: ${HOSTNAME}${NC}"
echo ""

# Ask for additional IPs (optional)
ADDITIONAL_IPS=""
if [ "$SILENT" = false ]; then
    echo -e "${YELLOW}Do you want to add additional IP addresses? (comma-separated, or press Enter to skip)${NC}"
    read -p "Additional IPs: " ADDITIONAL_IPS
else
    echo -e "${YELLOW}Silent mode: Skipping additional IPs prompt.${NC}"
fi

# Build the SAN list
SAN_IPS="IP.1 = 127.0.0.1\nIP.2 = ${LAN_IP}"
IP_INDEX=3

if [ -n "$ADDITIONAL_IPS" ]; then
    IFS=',' read -ra ADDR <<< "$ADDITIONAL_IPS"
    for i in "${ADDR[@]}"; do
        IP=$(echo "$i" | xargs)  # Trim whitespace
        if [ -n "$IP" ]; then
            SAN_IPS="${SAN_IPS}\nIP.${IP_INDEX} = ${IP}"
            ((IP_INDEX++))
        fi
    done
fi

# Create OpenSSL config file
echo -e "${YELLOW}📝 Generating OpenSSL configuration...${NC}"

OPENSSL_CONFIG="${SSL_DIR}/openssl_lan.cnf"

cat > "$OPENSSL_CONFIG" << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req
x509_extensions = v3_ca

[dn]
C = US
ST = Local
L = Local
O = Home Assistant
OU = Voice Streaming
CN = ${LAN_IP}

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[v3_ca]
basicConstraints = critical, CA:TRUE
keyUsage = critical, keyCertSign, cRLSign, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = homeassistant.local
DNS.3 = ${HOSTNAME}
DNS.4 = ${HOSTNAME}.local
$(echo -e "$SAN_IPS")
EOF

echo -e "${GREEN}✓ OpenSSL config created: ${OPENSSL_CONFIG}${NC}"

# Backup old certificates
if [ -f "${SSL_DIR}/homeassistant.crt" ]; then
    BACKUP_SUFFIX=$(date +%Y%m%d_%H%M%S)
    echo -e "${YELLOW}📦 Backing up existing certificates...${NC}"
    cp "${SSL_DIR}/homeassistant.crt" "${SSL_DIR}/homeassistant.crt.backup_${BACKUP_SUFFIX}"
    cp "${SSL_DIR}/homeassistant.key" "${SSL_DIR}/homeassistant.key.backup_${BACKUP_SUFFIX}"
    echo -e "${GREEN}✓ Backups created with suffix: ${BACKUP_SUFFIX}${NC}"
fi

# Generate new certificate
echo -e "${YELLOW}🔐 Generating new SSL certificate...${NC}"

openssl req -x509 \
    -nodes \
    -days 365 \
    -newkey rsa:2048 \
    -keyout "${SSL_DIR}/homeassistant.key" \
    -out "${SSL_DIR}/homeassistant.crt" \
    -config "$OPENSSL_CONFIG" \
    -extensions v3_ca \
    2>/dev/null

echo -e "${GREEN}✓ Certificate generated successfully!${NC}"
echo ""

# Verify certificate
echo -e "${YELLOW}🔍 Verifying certificate...${NC}"
echo ""
echo -e "${BLUE}Certificate Subject:${NC}"
openssl x509 -in "${SSL_DIR}/homeassistant.crt" -noout -subject

echo ""
echo -e "${BLUE}Subject Alternative Names:${NC}"
openssl x509 -in "${SSL_DIR}/homeassistant.crt" -noout -text | grep -A1 "Subject Alternative Name" | tail -1

echo ""
echo -e "${BLUE}Valid Until:${NC}"
openssl x509 -in "${SSL_DIR}/homeassistant.crt" -noout -enddate

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Certificate generation complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo ""
echo -e "  1. ${BLUE}Restart nginx to load the new certificate:${NC}"
echo -e "     docker compose restart nginx"
echo ""
echo -e "  2. ${BLUE}Access from your browser:${NC}"
echo -e "     https://${LAN_IP}"
echo ""
echo -e "  3. ${BLUE}For mobile devices, either:${NC}"
echo -e "     a) Accept the browser warning (less secure)"
echo -e "     b) Install the certificate on your device (see MOBILE_TRUST.md)"
echo ""
echo -e "  4. ${BLUE}Certificate file for mobile installation:${NC}"
echo -e "     ${SSL_DIR}/homeassistant.crt"
echo ""
echo -e "${YELLOW}📱 To install on mobile:${NC}"
echo -e "  - iOS: Email/AirDrop the .crt file → Open → Install Profile → Settings → General → About → Certificate Trust Settings"
echo -e "  - Android: Settings → Security → Install certificate from storage"
echo ""
