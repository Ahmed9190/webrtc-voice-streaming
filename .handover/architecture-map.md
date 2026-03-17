# Architecture Map: WebRTC Voice Streaming Backend

## System Boundary

```

┌─────────────────────────────────────────────────────────────────┐
│              Home Assistant Host (Network Stack)                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │        WebRTC Voice Streaming Add-on Container            │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  VoiceStreamingServer (webrtc_server_relay.py)      │  │  │
│  │  │  - WebSocket Signaling (/ws)                        │  │  │
│  │  │  - WebRTC Peer Connections                          │  │  │
│  │  │  - MediaRelay Distribution                          │  │  │
│  │  │  - Health/Metrics Endpoints                         │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                           │                               │  │
│  │                           │                               │  │
│  │                           │                               │  │
│  │               ┌───────────▼──────────┐                    │  │
│  │               │ AudioStreamServer    │                    │  │
│  │               │ (audio_stream_server)│                    │  │
│  │               │ - MP3 HTTP Streaming │                    │  │
│  │               │ - Port 8081          │                    │  │
│  │               └──────────────────────┘                    │  │
│  │                                                           │  │
│  │  ┌──────────────────────────────────────────────────────┐ │  │
│  │  │ Frontend Cards (/config/www/voice_streaming_backend) │ │  │
│  │  │ - voice-sending-card.ts                              │ │  │
│  │  │ - voice-receiving-card.ts                            │ │  │
│  │  │ - webrtc-manager.ts                                  │ │  │
│  │  └──────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                  │
│         Port 8443 (HTTPS)    │    Port 8081 (HTTP/MP3)          │
│         Port 8099 (Ingress)  │                                  │
└──────────────────────────────┼──────────────────────────────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
    ┌───────▼───────┐   ┌──────▼───────┐   ┌──────▼───────┐
    │ Sender Client │   │ Receiver     │   │ Home         │
    │ (Microphone)  │   │ Client       │   │ Assistant    │
    │ Browser/App   │   │ (Speaker)    │   │ Media Player │
    └───────────────┘   └──────────────┘   └──────────────┘
```

## Component Responsibility Matrix

| Component            | Technology     | Port | Protocol  | Responsibility                     |
| -------------------- | -------------- | ---- | --------- | ---------------------------------- |
| VoiceStreamingServer | Python/aiohttp | 8443 | HTTPS/WSS | WebRTC signaling, WebSocket events |
| AudioStreamServer    | Python/aiohttp | 8081 | HTTP      | MP3 streaming for legacy clients   |
| Frontend Cards       | TypeScript/Lit | -    | WSS       | Home Assistant Lovelace UI         |
| SSL Setup            | Bash/OpenSSL   | -    | -         | Certificate generation/management  |

## Data Flow Paths

### Path 1: Voice Sending (Microphone → Server)

```
1. User clicks "Start Sending" in voice-sending-card
2. WebRTCManager.getUserMedia() → requests microphone access
3. Creates RTCPeerConnection with empty ICE servers (LAN-only)
4. Sends {type: "start_sending"} via WebSocket
5. Server creates RTCPeerConnection (sender role)
6. Client sends WebRTC offer via WebSocket
7. Server responds with WebRTC answer
8. Media flows: Client track → Server MediaRelay
9. Server broadcasts {type: "stream_available"} to all clients
```

### Path 2: Voice Receiving (Server → Speaker)

```
1. User clicks "Auto Listen" in voice-receiving-card
2. WebRTCManager.startReceiving() → connects WebSocket
3. Sends {type: "start_receiving", stream_id: "stream_xxx"}
4. Server subscribes to track via MediaRelay
5. Server creates RTCPeerConnection (receiver role)
6. Server sends WebRTC offer to client
7. Client responds with WebRTC answer
8. Media flows: MediaRelay → Client audio element
9. Audio plays automatically (with user interaction fallback)
```

### Path 3: MP3 Streaming (Legacy Integration)

```
1. Home Assistant media_player entity needs audio
2. Calls /stream/latest.mp3 on port 8081
3. AudioStreamServer finds latest active stream
4. Subscribes to track via MediaRelay
5. Encodes PCM → MP3 using PyAV (av codec)
6. Streams MP3 chunks via HTTP chunked transfer
7. media_player.play_media() consumes stream
```

## State Machines

### WebRTCManager State Machine

```
disconnected → connecting → connected
                      ↓         ↓
                   error ←─────┘ (on failure)
```

### Stream Lifecycle

```
created (sender connects)
   ↓
active (MediaRelay subscription running)
   ↓
broadcasted (receivers can join)
   ↓
ended (sender disconnects or track.ended)
   ↓
cleaned up (garbage collection or manual cleanup)
```

## Configuration Surfaces

### Add-on Configuration (config.yaml)

```yaml
options:
  log_level: list(trace|debug|info|warning|error)
  audio_port: port # Default: 8081
```

### Card Configuration (Lovelace YAML)

```yaml
# Voice Sending Card
type: custom:voice-sending-card
title: "Microphone"
auto_start: false
noise_suppression: true
echo_cancellation: true
auto_gain_control: true
target_media_player: media_player.living_room_speaker
stream_url: "http://homeassistant.local:8081/stream/latest.mp3"

# Voice Receiving Card
type: custom:voice-receiving-card
title: "Speaker"
auto_play: true
server_url: "homeassistant.local:8443"  # Optional, auto-discovers
```

## Dependency Graph

```
webrtc_server_relay.py
├── aiohttp (WebSocket, HTTP server)
├── aiortc (WebRTC implementation)
│   └── av/PyAV (Media handling)
└── audio_stream_server.py
    └── av (MP3 encoding)

frontend/
├── lit (Web Components framework)
├── @material/mwc-* (Material Design components)
└── rollup (Build tool)
```

## Critical Paths

### SSL Certificate Cascade (ssl-setup.sh)

```
Priority 1: Check /ssl/fullchain.pem + /ssl/privkey.pem (HA certs)
    ↓ (not found or expiring)
Priority 2: Check SUPERVISOR_TOKEN + Ingress API (HA proxy)
    ↓ (not active)
Priority 3: Generate self-signed CA + server certificate
    - CA: /data/ssl/ca.crt (valid 10 years)
    - Server: /data/ssl/server.crt (valid 825 days)
    - SANs: localhost, hostname, hostname.local, homeassistant, <LAN_IP>, 127.0.0.1
```

### Port Allocation Strategy

```
1. Read base_port from PORT env (default 8080)
2. Try binding to base_port
3. If "Address in use", try base_port+1
4. Repeat up to 10 times
5. Write active_port to /config/www/voice_streaming_backend/server_state.json
6. Frontend reads server_state.json for dynamic discovery
```
