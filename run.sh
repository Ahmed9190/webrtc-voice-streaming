#!/bin/bash
set -euo pipefail

echo "════════════════════════════════════════"
echo "  WebRTC Camera Add-on Starting"
echo "════════════════════════════════════════"

# ── Step 0: Install Frontend Cards ──
if [ -d "/config" ]; then
    echo "[INFO] Installing frontend cards to /config/www/voice_streaming_backend..."
    mkdir -p /config/www/voice_streaming_backend/dist
    cp -rf /app/frontend/dist/* /config/www/voice_streaming_backend/dist/ || echo "[WARN] Failed to copy frontend files"
else
    echo "[WARN] /config directory not found. skipping frontend install."
fi

# ── Step 0.5: Register Frontend Resource ──
echo "[INFO] Attempting to register Lovelace resource..."
python3 /app/register_frontend.py || echo "[WARN] Failed to register frontend resource"

# ── Helper: Minimal CA cert download server ──
start_ca_download_server() {
    local CA_PORT=8080
    local LOCAL_IP
    LOCAL_IP=$(detect_local_ip)

    echo "[CA-SERVER] Serving CA certificate on port $CA_PORT"

    while true; do
        {
            read -r request_line
            case "$request_line" in
                *"/ca.crt"*)
                    local size
                    size=$(wc -c < "$CA_DOWNLOAD")
                    printf "HTTP/1.1 200 OK\r\n"
                    printf "Content-Type: application/x-x509-ca-cert\r\n"
                    printf "Content-Disposition: attachment; filename=ha-webrtc-ca.crt\r\n"
                    printf "Content-Length: %d\r\n" "$size"
                    printf "\r\n"
                    cat "$CA_DOWNLOAD"
                    ;;
                *)
                    local html
                    html=$(cat <<HTMLEOF
<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width">
<title>WebRTC SSL Setup</title>
<style>
  body{font-family:system-ui;max-width:600px;margin:40px auto;padding:0 20px;background:#1c1c1c;color:#e0e0e0}
  .card{background:#2a2a2a;border-radius:12px;padding:24px;margin:16px 0}
  a.btn{display:inline-block;padding:14px 28px;background:#03a9f4;color:#fff;
        text-decoration:none;border-radius:8px;font-size:18px;margin:12px 0}
  code{background:#333;padding:2px 8px;border-radius:4px}
  .step{margin:12px 0;padding-left:20px;border-left:3px solid #03a9f4}
</style></head><body>
<h1>🔐 WebRTC Certificate Setup</h1>
<div class="card">
  <h2>One-Time Setup (30 seconds)</h2>
  <p><a class="btn" href="/ca.crt">📥 Download CA Certificate</a></p>
  <h3>Then install it:</h3>
  <div class="step">
    <strong>iPhone/iPad:</strong> Open downloaded file → Settings → Profile Downloaded → Install → Settings → General → About → Certificate Trust Settings → Enable
  </div>
  <div class="step">
    <strong>Android:</strong> Open downloaded file → Name it "HA WebRTC" → OK
  </div>
  <div class="step">
    <strong>Windows:</strong> Double-click → Install Certificate → Local Machine → Trusted Root Certification Authorities
  </div>
  <div class="step">
    <strong>Mac:</strong> Double-click → Keychain Access → Always Trust
  </div>
  <div class="step">
    <strong>Linux:</strong><br>
    <code>sudo cp ha-webrtc-ca.crt /usr/local/share/ca-certificates/ && sudo update-ca-certificates</code>
  </div>
</div>
<div class="card">
  <p>After installing, access your WebRTC stream at:<br>
  <strong>https://${LOCAL_IP}:8443</strong></p>
  <p>⚡ You only need to do this once per device.</p>
</div>
</body></html>
HTMLEOF
                    )
                    printf "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: %d\r\n\r\n%s" \
                        "${#html}" "$html"
                    ;;
            esac
        } | nc -l -p "$CA_PORT" -q 1 2>/dev/null || true
    done
}

# ── Step 1: Autonomous SSL setup ──
source /ssl-setup.sh
setup_ssl

# ── Step 2: Start the server based on SSL mode ──
case "$SSL_MODE" in

    homeassistant|self-signed)
        echo "[SERVER] Starting HTTPS on port 8443"

        # Start CA download server (if self-signed)
        if [ "$SSL_MODE" = "self-signed" ] && [ -f "$CA_DOWNLOAD" ]; then
            start_ca_download_server &
        fi

        # Start your WebRTC server with TLS
        # Passing env vars for python script
        export PORT=8443
        export SSL_CERT_FILE="$CERT_FILE"
        export SSL_KEY_FILE="$KEY_FILE"
        export LOG_LEVEL=$(jq -r '.log_level // "info"' /data/options.json)
        
        exec python3 /app/webrtc_server_relay.py
        ;;

    ingress)
        echo "[SERVER] Starting HTTP on port 8099 (behind Ingress)"

        # Start your WebRTC server WITHOUT TLS (Ingress handles it)
        export PORT=8099
        export LOG_LEVEL=$(jq -r '.log_level // "info"' /data/options.json)
        # No SSL env vars
        
        exec python3 /app/webrtc_server_relay.py
        ;;

esac


