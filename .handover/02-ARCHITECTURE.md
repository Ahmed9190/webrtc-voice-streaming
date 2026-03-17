# Architecture Documentation - WebRTC Voice Streaming

**Purpose:** System design, component interactions, and data flow  
**Target Audience:** Developers, system architects, maintainers

---

## 1. System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Home Assistant Ecosystem                          │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │              WebRTC Voice Streaming Add-on                      │ │
│  │                                                                 │ │
│  │  ┌──────────────────┐     ┌──────────────────┐                │ │
│  │  │  run.sh          │────>│  ssl-setup.sh    │                │ │
│  │  │  (Orchestrator)  │     │  (SSL Cascade)   │                │ │
│  │  └────────┬─────────┘     └──────────────────┘                │ │
│  │           │                                                    │ │
│  │           v                                                    │ │
│  │  ┌──────────────────────────────────────────────────────────┐ │ │
│  │  │           webrtc_server_relay.py                          │ │ │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │ │ │
│  │  │  │ WebSocket   │  │ WebRTC      │  │ License         │  │ │ │
│  │  │  │ Handler     │  │ Signaling   │  │ Validator       │  │ │ │
│  │  │  └─────────────┘  └─────────────┘  └─────────────────┘  │ │ │
│  │  │                                                           │ │ │
│  │  │  ┌─────────────────────────────────────────────────────┐ │ │ │
│  │  │  │              MediaRelay (Pub/Sub)                   │ │ │ │
│  │  │  │  [Sender Track] ──> [Multiple Receiver Tracks]      │ │ │ │
│  │  │  └─────────────────────────────────────────────────────┘ │ │ │
│  │  └──────────────────────────────────────────────────────────┘ │ │
│  │                                                                 │ │
│  │  ┌──────────────────┐     ┌──────────────────┐                │ │
│  │  │  audio_stream_   │     │  license_client  │                │ │
│  │  │  server.py       │     │  (External)      │                │ │
│  │  │  (MP3 Streaming) │     │                  │                │ │
│  │  └──────────────────┘     └──────────────────┘                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Ports: 8443/tcp (HTTPS), 8555/udp (WebRTC), 8081/tcp (MP3)         │
└─────────────────────────────────────────────────────────────────────┘
                              ↕ Host Network
┌─────────────────────────────────────────────────────────────────────┐
│                         Clients                                       │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Voice Sender │  │ Voice        │  │ MP3 Player   │              │
│  │ (Browser)    │  │ Receiver     │  │ (Any device) │              │
│  │              │  │ (Browser)    │  │              │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Breakdown

### 2.1 run.sh (Orchestrator)

**Purpose:** Main entry point and process coordinator

**Responsibilities:**
1. Frontend card installation (`/config/www/voice_streaming_backend/`)
2. Lovelace resource registration
3. License validation (blocking check)
4. SSL setup execution
5. Server process execution

**Flow:**
```bash
┌─────────────────────────────────────────────────────────────┐
│ 1. Copy frontend files to /config/www/                      │
│ 2. Run register_frontend.py                                 │
│ 3. Extract license config from /data/options.json           │
│ 4. Run license_client.py activate (blocking)                │
│ 5. Source ssl-setup.sh (sets SSL_MODE, CERT_FILE, KEY_FILE) │
│ 6. Execute webrtc_server_relay.py with env vars             │
└─────────────────────────────────────────────────────────────┘
```

**Key Environment Variables Set:**
- `PORT` - Main server port (8443 or 8099)
- `SSL_CERT_FILE` - Certificate path
- `SSL_KEY_FILE` - Key path
- `AUDIO_PORT` - MP3 streaming port
- `LOG_LEVEL` - Logging verbosity

---

### 2.2 ssl-setup.sh (SSL Certificate Cascade)

**Purpose:** Autonomous SSL configuration with zero user intervention

**Cascade Priority:**

```
┌─────────────────────────────────────────────────────────────┐
│ Priority 1: Home Assistant SSL                              │
│ Check: /ssl/fullchain.pem + /ssl/privkey.pem               │
│ Use existing HA certificates (DuckDNS, Let's Encrypt, etc.) │
└─────────────────────────────────────────────────────────────┘
                          ↓ if not found
┌─────────────────────────────────────────────────────────────┐
│ Priority 2: Ingress Mode                                    │
│ Check: SUPERVISOR_TOKEN + ingress: true in config          │
│ No SSL needed - HA proxies HTTPS                            │
└─────────────────────────────────────────────────────────────┘
                          ↓ if not available
┌─────────────────────────────────────────────────────────────┐
│ Priority 3: Auto-Generated CA + Server Cert                 │
│ Generate: /data/ssl/ca.crt, ca.key, server.crt, server.key │
│ SANs: Local IP, hostname, localhost, homeassistant          │
│ Valid: 825 days                                             │
│ CA Download: https://<ip>:8443/ca.crt                       │
└─────────────────────────────────────────────────────────────┘
```

**Output Variables (exported for run.sh):**
- `SSL_MODE` - `homeassistant` | `ingress` | `self-signed`
- `CERT_FILE` - Path to certificate
- `KEY_FILE` - Path to private key
- `CA_DOWNLOAD` - Path to CA certificate (for self-signed mode)

---

### 2.3 webrtc_server_relay.py (Core Server)

**Purpose:** WebRTC signaling, connection management, media routing

**Class Structure:**

```python
class VoiceStreamingServer:
    # State
    connections: Dict[str, dict]       # WebSocket connections
    active_streams: Dict[str, Dict]    # Active media streams
    relay: MediaRelay                  # Pub/sub media distributor
    audio_server: AudioStreamServer    # MP3 streaming
    
    # Routes
    /health        - Health check
    /metrics       - Prometheus metrics
    /ws            - WebSocket endpoint
    /              - WebSocket endpoint (alias)
    /stream/*      - MP3 streaming (from audio_server)
    /ca.crt        - CA certificate download
    
    # Message Handlers
    start_sending          - Setup sender peer connection
    start_receiving        - Setup receiver peer connection
    webrtc_offer           - Handle WebRTC offer
    webrtc_answer          - Handle WebRTC answer
    stop_stream            - Stop media without closing WS
    get_available_streams  - List active streams
```

**State Machine:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    Connection Lifecycle                          │
│                                                                  │
│  [New WS] ──> connections[uuid] = {ws, pc, role, stream_id}     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Sender Flow:                                              │  │
│  │ 1. {type: "start_sending"}                               │  │
│  │ 2. Create RTCPeerConnection (LAN-only ICE)               │  │
│  │ 3. on("track") → Store in active_streams                 │  │
│  │ 4. Broadcast "stream_available" to all clients           │  │
│  │ 5. Start visualization task (keeps relay active)         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Receiver Flow:                                            │  │
│  │ 1. {type: "start_receiving", stream_id: "xxx"}           │  │
│  │ 2. Subscribe via MediaRelay                              │  │
│  │ 3. Add track to peer connection                          │  │
│  │ 4. Send WebRTC offer to receiver                         │  │
│  │ 5. Add receiver to stream's receivers list               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  [WS Close] ──> cleanup_connection()                            │
│  - If sender: Delete stream, broadcast "stream_ended"          │
│  - If receiver: Remove from receivers list                      │
│  - Close peer connection                                        │
└─────────────────────────────────────────────────────────────────┘
```

**MediaRelay Pub/Sub Pattern:**

```python
# Sender provides track
@pc.on("track")
async def on_track(track):
    stream_id = f"stream_{connection_id}"
    self.active_streams[stream_id] = {
        "track": track,           # Original track
        "receivers": [],          # Receiver connection IDs
        "sender_id": connection_id
    }
    # Subscribe for visualization (keeps stream alive)
    viz_track = self.relay.subscribe(track)
    asyncio.create_task(self.process_visualization(stream_id, viz_track))

# Receiver subscribes
async def setup_receiver(connection_id, stream_id):
    source_track = self.active_streams[stream_id]["track"]
    relayed_track = self.relay.subscribe(source_track)  # New consumer
    pc.addTrack(relayed_track)
    stream_info["receivers"].append(connection_id)
```

**Benefits:**
- Single source track → multiple consumer tracks
- No manual frame copying
- Automatic cleanup when consumers disconnect
- Frame-level synchronization

---

### 2.4 audio_stream_server.py (MP3 Streaming)

**Purpose:** Provide standard MP3 audio stream for non-WebRTC clients

**Key Features:**
- HTTP Live Streaming (HLS-like) via chunked transfer
- Real-time MP3 encoding using PyAV
- Auto-refresh waiting page when no stream active
- Latest stream endpoint (`/stream/latest.mp3`)

**Encoding Pipeline:**

```
┌─────────────────────────────────────────────────────────────────┐
│  WebRTC Frame (Opus/PCM)                                        │
│         ↓                                                       │
│  MediaRelay Subscription                                        │
│         ↓                                                       │
│  AudioResampler (44100Hz, stereo, s16p)                         │
│         ↓                                                       │
│  MP3 Encoder (av.CodecContext, 128kbps)                         │
│         ↓                                                       │
│  HTTP Chunked Response                                          │
│         ↓                                                       │
│  Client MP3 Player                                              │
└─────────────────────────────────────────────────────────────────┘
```

**Endpoints:**
- `GET /stream/latest.mp3` - Latest active stream (with waiting page)
- `GET /stream/{stream_id}.mp3` - Specific stream
- `GET /stream/status` - Active streams list
- `GET /health` - Health check

---

### 2.5 register_frontend.py (Dashboard Registration)

**Purpose:** Auto-register Lovelace dashboard resource

**Logic:**
```python
1. Check SUPERVISOR_TOKEN environment variable
2. Detect Lovelace mode (YAML vs UI)
3. If YAML: Log manual configuration instructions
4. If UI:
   - GET /lovelace/resources
   - Check for duplicate URL
   - POST new resource if not exists
```

**Fallback Instructions:**
If auto-registration fails, logs manual configuration:

```yaml
# For YAML mode
lovelace:
  resources:
    - url: /local/voice_streaming_backend/dist/voice-streaming-card-dashboard.js
      type: module
```

---

## 3. Data Flow

### 3.1 Voice Sending Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ Browser (Sender)                                                  │
│ 1. getUserMedia({audio: true})                                   │
│ 2. Create RTCPeerConnection                                      │
│ 3. Add audio track to connection                                 │
│ 4. Create WebRTC offer                                           │
│ 5. Send via WebSocket: {type: "webrtc_offer", offer: {...}}      │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ Server (webrtc_server_relay.py)                                   │
│ 1. Receive WebSocket message                                     │
│ 2. Handle webrtc_offer                                           │
│ 3. Set remote description (offer)                                │
│ 4. Create answer                                                 │
│ 5. Set local description                                         │
│ 6. on("track") callback fires                                    │
│ 7. Store track in active_streams[stream_id]                      │
│ 8. Subscribe via MediaRelay (visualization)                      │
│ 9. Broadcast "stream_available" to all clients                   │
│ 10. Send answer via WebSocket                                    │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ Browser (Sender)                                                  │
│ 1. Receive answer via WebSocket                                  │
│ 2. Set remote description                                        │
│ 3. ICE connection established                                    │
│ 4. Audio streaming begins                                        │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Voice Receiving Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ Browser (Receiver)                                                │
│ 1. Create RTCPeerConnection                                      │
│ 2. Send via WebSocket: {type: "start_receiving", stream_id: "..."}│
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ Server (webrtc_server_relay.py)                                   │
│ 1. Receive WebSocket message                                     │
│ 2. Look up stream in active_streams                              │
│ 3. Subscribe via MediaRelay (new consumer track)                 │
│ 4. Add track to receiver's peer connection                       │
│ 5. Create offer                                                  │
│ 6. Send via WebSocket: {type: "webrtc_offer", offer: {...}}      │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ Browser (Receiver)                                                │
│ 1. Receive offer via WebSocket                                   │
│ 2. Set remote description                                        │
│ 3. Create answer                                                 │
│ 4. Send via WebSocket: {type: "webrtc_answer", answer: {...}}    │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ Server (webrtc_server_relay.py)                                   │
│ 1. Receive answer                                                │
│ 2. Set remote description                                        │
│ 3. ICE connection established                                    │
│ 4. Add receiver to stream's receivers list                       │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ Media Flow                                                        │
│ Sender Track ──> MediaRelay ──> Receiver Track(s)                │
│ (Original)              (Multiple consumers)                     │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Network Architecture

### Port Usage

| Port | Protocol | Purpose | Required |
|------|----------|---------|----------|
| 8443 | TCP/HTTPS | WebRTC signaling, Web UI | Yes (direct access) |
| 8555 | UDP | WebRTC media streams | Yes (P2P media) |
| 8081 | TCP/HTTP | MP3 streaming | Yes (fallback playback) |
| 8099 | TCP/HTTP | HTTP mode (Ingress only) | Only for Ingress |
| 8080 | TCP/HTTP | CA certificate download | Only for self-signed SSL |

### Host Networking Rationale

**Why Host Network Mode?**

1. **Direct IP Discovery:** Clients need to connect to the actual host IP, not a Docker NAT address
2. **UDP Performance:** WebRTC media uses UDP - bridge mode adds NAT overhead
3. **mDNS/Bonjour:** Local discovery works only with host networking
4. **Port Flexibility:** Smart port hunting requires binding to host ports directly

**Trade-offs:**
- ✅ Better performance, lower latency
- ✅ Simpler firewall rules (no Docker NAT traversal)
- ❌ Add-on can see all host network traffic (security consideration)
- ❌ Port conflicts possible with other host services

---

## 5. State Management

### In-Memory State

```python
self.connections = {
    "uuid-1": {
        "ws": WebSocketResponse,
        "pc": RTCPeerConnection,
        "role": "sender" | "receiver",
        "stream_id": "stream_uuid"
    }
}

self.active_streams = {
    "stream_uuid": {
        "track": MediaStreamTrack,      # Source track
        "receivers": ["uuid-2", ...],   # Receiver connection IDs
        "sender_id": "uuid-1"
    }
}
```

### Persistent State

**Location:** `/config/www/voice_streaming_backend/server_state.json`

```json
{
  "active_port": 8443,
  "ssl": true,
  "started_at": 1234567890.123
}
```

**Purpose:** Frontend discovers the actual port after smart port hunting.

---

## 6. Error Handling

### Connection Errors

| Error | Handling |
|-------|----------|
| WebSocket disconnect | `cleanup_connection()` - remove from dict, close PC |
| ICE connection failed | Close peer connection, log state change |
| Invalid JSON | Log error, continue (don't crash connection) |
| Track ended | Remove stream, broadcast "stream_ended" |

### Media Errors

| Error | Handling |
|-------|----------|
| Frame decode error | Log warning, continue receiving |
| MP3 encode error | Log error, end stream for that client only |
| Client disconnect | Catch `asyncio.CancelledError`, cleanup |

### License Errors

| Error | Handling |
|-------|----------|
| Activation failed | Exit immediately (blocking check in run.sh) |
| Validation failed | Retry with exponential backoff, shutdown after 3 failures |
| Network error | Use cached token (24-hour grace period) |

---

## 7. Observability

### Health Endpoint (`/health`)

```json
{
  "status": "healthy",
  "webrtc_available": true,
  "audio_server_running": true,
  "active_streams": 2,
  "connected_clients": 5,
  "uptime_seconds": 3600,
  "license": {
    "licensed": true,
    "pending_activation": false,
    "consecutive_failures": 0
  }
}
```

### Metrics Endpoint (`/metrics`)

Same structure as health, plus:
- `total_audio_bytes` - Cumulative media throughput
- License validation failure count

### Logging

**Levels:**
- `trace` - Frame-level debugging
- `debug` - Message-level debugging
- `info` - Connection lifecycle events
- `warning` - Recoverable errors
- `error` - Unrecoverable errors

**Key Log Messages:**
- `"License activated successfully"` - Validation passed
- `"Received audio track from sender"` - Stream started
- `"Cleaning up stale stream"` - Auto-cleanup triggered
- `"Port X is busy, trying X+1"` - Smart port hunting active

---

**Next:** [Decision Log](03-DECISION-LOG.md)  
**Previous:** [Setup Guide](01-SETUP-GUIDE.md)
