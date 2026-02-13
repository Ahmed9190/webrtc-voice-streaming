#!/bin/bash
set -e

# Setup SSL for Home Assistant (Self-Signed)

# Directory for certificates
CERT_DIR="./ssl"
mkdir -p $CERT_DIR

# Generate Self-Signed Certificate
echo "Generating self-signed certificate in $CERT_DIR..."
openssl req -x509 -newkey rsa:4096 -keyout $CERT_DIR/privkey.pem -out $CERT_DIR/fullchain.pem -sha256 -days 3650 -nodes -subj "/CN=homeassistant.local"

echo "Certificates generated:"
ls -l $CERT_DIR

# Instructions
echo ""
echo "========================================================"
echo "SSL SETUP COMPLETE (Certificates Generated)"
echo "========================================================"
echo "To enable HTTPS in Home Assistant:"
echo "1. Copy the 'ssl' folder to your Home Assistant configuration directory (e.g., /config/ssl)."
echo "2. Add the following to your Home Assistant 'configuration.yaml':"
echo ""
echo "http:"
echo "  ssl_certificate: /config/ssl/fullchain.pem"
echo "  ssl_key: /config/ssl/privkey.pem"
echo ""
echo "3. Restart Home Assistant."
echo "4. Access Home Assistant via https://<IP>:8123"
echo "========================================================"
