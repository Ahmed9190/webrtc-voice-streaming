# Setup Guide

## Prerequisites

- **Docker** (for local development/testing)
- **Home Assistant** (for add-on deployment)
- **Python 3.9+** (for local testing without Docker)

## Development Setup (Local)

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/Ahmed9190/webrtc-voice-streaming.git
cd webrtc-voice-streaming

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 3. Build Frontend

```bash
npm run build
```

### 4. Run the Server

```bash
# From project root
export PORT=8443
export AUDIO_PORT=8081
python3 webrtc_server_relay.py
```

The server will start on:
- **WebSocket**: `ws://localhost:8443/ws`
- **Health**: `http://localhost:8443/health`
- **MP3 Stream**: `http://localhost:8081/stream/latest.mp3`

## Docker Build

```bash
docker build -t webrtc-voice-streaming .
```

## Home Assistant Add-on Deployment

### Option 1: From Repository

1. Navigate to **Settings** → **Add-ons** → **Add-on Store**
2. Click the **dots** → **Repositories**
3. Add: `https://github.com/Ahmed9190/webrtc-voice-streaming`
4. Install **"Voice Streaming Backend"**
5. Start the add-on

### Option 2: Local Add-on

```bash
# Copy to HA add-ons directory
cp -r webrtc-voice-streaming /config/addons/local/voice_streaming_backend
```

Create `/config/configuration.yaml`:

```yaml
panel_custom:
  - name: voice_streaming_backend
    url_path: voice_streaming
```

## Configuration

The add-on requires no configuration by default. Optional settings in `config.yaml`:

| Option | Default | Description |
|--------|---------|-------------|
| `log_level` | info | Logging verbosity (trace, debug, info, warning, error) |
| `audio_port` | 8081 | Port for MP3 stream server |

## SSL Modes

The add-on automatically detects SSL mode:

1. **HomeAssistant** — Uses HA certificates from `/ssl/`
2. **Self-signed** — Generates local CA; client must install certificate
3. **Ingress** — Runs behind HA Ingress (no SSL needed in container)

## Network Ports

| Port | Protocol | Purpose |
|------|----------|---------|
| 8443 | TCP | HTTPS WebSocket (direct access) |
| 8555 | UDP | WebRTC media streams |
| 8080 | TCP | CA certificate download (self-signed mode) |
| 8081 | TCP | MP3 audio stream |

## Frontend Card Setup

After add-on installation:

1. Go to **Settings** → **Dashboards**
2. Click **dots** → **Resources**
3. Add: `/local/voice_streaming_backend/dist/voice-streaming-card-dashboard.js`
4. Type: **JavaScript Module**

## Testing

```bash
# Test WebSocket connection
wscat -c ws://localhost:8443/ws

# Test MP3 stream
curl http://localhost:8081/stream/latest.mp3 -o test.mp3

# Health check
curl http://localhost:8443/health
```
