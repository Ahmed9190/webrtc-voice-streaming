# WebRTC Voice Streaming - Handover Documentation

**Project:** WebRTC Voice Streaming Add-on for Home Assistant  
**Version:** 1.3.0  
**Architecture:** Event-driven WebRTC signaling with MediaRelay pub/sub  
**Primary Stack:** Python 3.11, aiohttp, aiortc, PyAV, Node.js 20

---

## 🎯 Elevator Pitch

This is a **Home Assistant Add-on** that provides real-time, low-latency voice streaming using WebRTC. It enables bidirectional audio communication between Home Assistant and clients (browsers/mobile apps) with:

- **Sub-second latency** via direct WebRTC peer connections
- **Multi-receiver broadcasting** - one sender can stream to unlimited receivers
- **Autonomous SSL setup** - zero-configuration HTTPS with certificate cascade
- **Host networking** - bypasses Docker NAT for reliable P2P connections
- **MP3 fallback** - standard audio streaming for non-WebRTC clients

---

## 📁 Repository Structure

```
webrtc_backend/
├── run.sh                      # Main entry point (orchestration)
├── ssl-setup.sh                # Autonomous SSL certificate setup
├── webrtc_server_relay.py      # Core WebRTC signaling server
├── audio_stream_server.py      # MP3 streaming server
├── license_client.py           # License validation client
├── hw_fingerprint.py           # Hardware fingerprinting utility
├── register_frontend.py        # Lovelace dashboard registration
├── frontend/                   # Node.js dashboard cards
│   └── dist/                   # Built assets (copied to /config/www/)
├── tests/                      # Test suite
├── config.yaml                 # Home Assistant add-on manifest
├── Dockerfile                  # Multi-stage build
├── requirements.txt            # Python dependencies
└── .handover/                  # This documentation
    ├── 00-README-FIRST.md      # You are here
    ├── 01-SETUP-GUIDE.md       # Installation & configuration
    ├── 02-ARCHITECTURE.md      # System design & data flow
    ├── 03-DECISION-LOG.md      # Why things are the way they are
    ├── 04-GOTCHAS.md           # Known issues & workarounds
    └── ONBOARDING-CHECKLIST.md # New developer checklist
```

---

## 🚀 Quick Start (For Developers)

### Prerequisites

- Docker & Docker Compose
- Home Assistant instance (for testing)
- Python 3.11+ (for local development)
- Node.js 20+ (for frontend builds)

### Local Development Setup

```bash
# 1. Clone and enter directory
git clone <repository-url>
cd webrtc_backend

# 2. Build frontend (if modified)
cd frontend && npm install && npm run build
cd ..

# 3. Build Docker image
docker-compose build

# 4. Configure environment
cp .env.example .env
# Edit .env with your configuration

# 5. Start services
docker-compose up -d

# 6. View logs
docker-compose logs -f
```

### Testing the Add-on in Home Assistant

1. Add repository to Home Assistant Add-on Store
2. Install "Voice Streaming Backend"
3. Configure license credentials in add-on config
4. Start add-on
5. Access web UI at `https://<your-ha-ip>:8443`

---

## 🔑 Core Concepts

### WebRTC Signaling Flow

```
Sender (Browser)                    Server                    Receiver (Browser)
      |                                |                              |
      |-- WebSocket /ws --------------|                              |
      |-- {type: "start_sending"} ----|                              |
      |-- WebRTC Offer ---------------|                              |
      |                            [Store Track]                      |
      |                                |                              |
      |                                |<-- WebSocket /ws -----------|
      |                                |<-- {type: "start_receiving"}-|
      |                                |-- WebRTC Offer -------------|
      |                                |                              |
      |<-- WebRTC Answer -------------|                                |
      |                                |-- WebRTC Answer -------------|
      |                                |                              |
      |<== MediaRelay Audio Stream ================================>|
```

### MediaRelay Pub/Sub

The `aiortc.contrib.media.MediaRelay` class enables efficient one-to-many streaming:

```python
# Sender connects and provides audio track
self.active_streams[stream_id] = {
    "track": track,           # Original track from sender
    "receivers": [],          # List of receiver connection IDs
    "sender_id": connection_id
}

# Receiver subscribes via MediaRelay
relayed_track = self.relay.subscribe(source_track)
pc.addTrack(relayed_track)
```

**Benefits:**
- Single sender → multiple receivers without duplicating media
- Automatic cleanup when receivers disconnect
- Frame-level subscription (no manual copying)

---

## 📊 Key Metrics

| Metric | Value |
|--------|-------|
| Active Connections | Tracked in `self.connections` dict |
| Active Streams | Tracked in `self.active_streams` dict |
| Audio Throughput | Counted in `self.total_audio_bytes` |
| Uptime | Calculated from `self.start_time` |

Access via `/metrics` or `/health` endpoints.

---

## 🔧 Configuration

### Add-on Options (`config.yaml`)

```yaml
log_level: info              # trace|debug|info|warning|error
audio_port: 8081             # MP3 streaming port
license_server_url: ""       # License server URL (required)
license_email: ""            # License email (required)
purchase_code: ""            # Purchase code (required)
```

### Environment Variables (Runtime)

| Variable | Source | Purpose |
|----------|--------|---------|
| `PORT` | `run.sh` | Main server port (8443 HTTPS / 8099 HTTP) |
| `SSL_CERT_FILE` | `ssl-setup.sh` | SSL certificate path |
| `SSL_KEY_FILE` | `ssl-setup.sh` | SSL key path |
| `AUDIO_PORT` | Add-on config | MP3 streaming port |
| `LICENSE_SERVER_URL` | Add-on config | License validation server |
| `LICENSE_EMAIL` | Add-on config | License account email |
| `PURCHASE_CODE` | Add-on config | License purchase code |

---

## 📚 Next Steps

1. **[Setup Guide](01-SETUP-GUIDE.md)** - Installation and configuration
2. **[Architecture](02-ARCHITECTURE.md)** - Deep dive into system design
3. **[Decision Log](03-DECISION-LOG.md)** - Why architectural choices were made
4. **[Gotchas](04-GOTCHAS.md)** - Known issues and workarounds
5. **[Onboarding Checklist](ONBOARDING-CHECKLIST.md)** - New developer tasks

---

**Generated:** 2026-03-17  
**Handover Protocol:** ESEHP-ASKS-v2.0  
**Status:** Phase 2 - Documentation Synthesis
