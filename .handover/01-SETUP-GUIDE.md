# Setup Guide - WebRTC Voice Streaming

**Purpose:** Zero-to-hero installation and configuration guide  
**Target Audience:** End users installing the add-on, developers testing locally  
**Prerequisites:** Home Assistant OS (for add-on installation) or Docker (for development)

---

## Part 1: Home Assistant Add-on Installation

### Step 1: Add Repository

1. Navigate to **Settings** → **Add-ons**
2. Click the **three dots** (⋮) in the top-right corner
3. Select **Repositories**
4. Add: `https://github.com/Ahmed9190/webrtc-voice-streaming`
5. Click **Add**

### Step 2: Install Add-on

1. Find **"Voice Streaming Backend"** in the Add-on Store
2. Click **Install**
3. Wait for installation to complete (~2-3 minutes)

### Step 3: Configure Add-on

Navigate to the add-on configuration and set:

```yaml
log_level: info
audio_port: 8081
license_server_url: "https://license.yourdomain.com"  # Required
license_email: "your@email.com"                        # Required
purchase_code: "XXXX-YYYY-ZZZZ"                        # Required
```

⚠️ **Critical:** The add-on will **NOT start** without valid license credentials.

### Step 4: Start Add-on

1. Click **Start**
2. Wait for startup logs to show "License validated successfully"
3. Check **Info** tab for connection details

### Step 5: Install Frontend Dashboard Cards

The add-on automatically copies frontend files to `/config/www/voice_streaming_backend/`.

**Manual Resource Registration:**

1. Navigate to **Settings** → **Dashboards**
2. Click **three dots** (⋮) → **Resources**
3. Click **Add Resource**
4. Enter:
   - **URL:** `/local/voice_streaming_backend/dist/voice-streaming-card-dashboard.js`
   - **Type:** JavaScript Module
5. Click **Create**

### Step 6: SSL Certificate Setup (If Using Direct Access)

If accessing via `https://<ip>:8443` (not through Home Assistant Ingress):

1. Visit `https://<your-ha-ip>:8443` in a browser
2. You'll see a certificate warning (expected)
3. Click through the warning
4. Download the CA certificate from the setup page
5. Install the CA certificate on your device:

| Platform | Installation Steps |
|----------|-------------------|
| **iOS/iPadOS** | Open downloaded file → Settings → Profile Downloaded → Install → Settings → General → About → Certificate Trust Settings → Enable Full Trust |
| **Android** | Open downloaded file → Name it "HA WebRTC" → OK → Settings → Security → Encryption & Credentials → Install from Storage |
| **Windows** | Double-click certificate → Install Certificate → Local Machine → Place in "Trusted Root Certification Authorities" |
| **macOS** | Double-click → Keychain Access → Right-click certificate → Get Info → Trust → "Always Trust" |
| **Linux** | `sudo cp ha-webrtc-ca.crt /usr/local/share/ca-certificates/ && sudo update-ca-certificates` |

---

## Part 2: Local Development Setup

### Prerequisites

```bash
# Verify installed tools
python3 --version    # Must be 3.11+
docker --version     # Must be 20.10+
node --version       # Must be 20+
```

### Step 1: Clone Repository

```bash
git clone https://github.com/Ahmed9190/webrtc-voice-streaming.git
cd webrtc-voice-streaming
```

### Step 2: Build Frontend (If Modified)

```bash
cd frontend
npm install
npm run build
cd ..
```

### Step 3: Build Docker Image

```bash
docker-compose build
```

### Step 4: Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
SECRET_KEY=<generate-secure-random-string-min-32-chars>
ALLOWED_ORIGINS=http://localhost,https://localhost
DATABASE_URL=postgresql://license_user:license_pass@db:5432/webrtc_licenses
```

### Step 5: Start Services

```bash
# Start all services (license server + add-on)
docker-compose up -d

# View logs
docker-compose logs -f

# Check health
curl http://localhost:8000/health
```

### Step 6: Access Services

| Service | URL | Purpose |
|---------|-----|---------|
| WebRTC Server | `https://localhost:8443` | Main WebRTC signaling |
| MP3 Stream | `http://localhost:8081/stream/latest.mp3` | Audio playback |
| Health Check | `http://localhost:8443/health` | Server status |
| Metrics | `http://localhost:8443/metrics` | Prometheus-compatible metrics |

---

## Part 3: Verification & Testing

### Test 1: Health Check

```bash
curl -k https://localhost:8443/health
```

Expected response:

```json
{
  "status": "healthy",
  "webrtc_available": true,
  "audio_server_running": true,
  "active_streams": 0,
  "connected_clients": 0,
  "uptime_seconds": 123,
  "license": {
    "licensed": true,
    "pending_activation": false
  }
}
```

### Test 2: WebSocket Connection

```javascript
const ws = new WebSocket('wss://localhost:8443/ws');
ws.onopen = () => console.log('Connected!');
ws.onmessage = (e) => console.log('Message:', e.data);
```

### Test 3: MP3 Stream Access

Visit in browser: `http://localhost:8081/stream/latest.mp3`

Should show "Waiting for Audio Stream..." with auto-refresh when stream starts.

### Test 4: Metrics Endpoint

```bash
curl -k https://localhost:8443/metrics | python3 -m json.tool
```

---

## Part 4: Troubleshooting

### Problem: "License activation/validation failed"

**Symptoms:**
- Add-on won't start
- Logs show "License validation failed"

**Solutions:**
1. Verify `license_server_url` is reachable from Home Assistant
2. Check `license_email` and `purchase_code` for typos
3. Ensure license server is running and accessible
4. Check license server logs for activation errors

### Problem: "Port 8443 is busy"

**Symptoms:**
- Startup logs show "Port 8443 is busy, trying 8444..."

**Solutions:**
1. Smart port hunting will automatically find available port
2. Check `server_state.json` at `/config/www/voice_streaming_backend/server_state.json`
3. Update frontend to use correct port from `active_port` field

### Problem: "Certificate Warning" in Browser

**Symptoms:**
- Browser shows "Your connection is not private"

**Solutions:**
1. This is expected for self-signed certificates
2. Install CA certificate as described in Step 6
3. Or use Home Assistant Ingress (no certificate needed)

### Problem: "No audio stream available"

**Symptoms:**
- Receiver card shows "No audio stream available"

**Solutions:**
1. Ensure a sender is connected and transmitting
2. Check sender has granted microphone permissions
3. Verify WebRTC connection established (check browser DevTools WebRTC internals)

### Problem: Frontend Resource Not Loading

**Symptoms:**
- Dashboard cards not appearing
- 404 errors in browser console

**Solutions:**
1. Manually register resource (Step 5 above)
2. Clear browser cache
3. Restart Home Assistant
4. Check files exist at `/config/www/voice_streaming_backend/dist/`

---

## Part 5: Production Deployment Checklist

- [ ] License credentials configured and validated
- [ ] SSL certificates installed (or Ingress enabled)
- [ ] Host networking mode enabled in add-on config
- [ ] Firewall rules allow ports 8443/tcp and 8555/udp
- [ ] CA certificate installed on all client devices
- [ ] Frontend dashboard resource registered
- [ ] Backup of license data directory (`/data/license/`)
- [ ] Monitoring configured for `/health` endpoint
- [ ] Log level set to `info` or `warning` (not `debug`)

---

**Next:** [Architecture Documentation](02-ARCHITECTURE.md)  
**Previous:** [README](00-README-FIRST.md)
