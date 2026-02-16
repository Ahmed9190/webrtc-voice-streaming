# 🏗️ System Architecture - WebRTC Voice Streaming Backend

**Document Version:** 1.0  
**Last Updated:** 2026-01-18

---

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Component Breakdown](#component-breakdown)
3. [Data Flow Diagrams](#data-flow-diagrams)
4. [WebRTC Architecture](#webrtc-architecture)
5. [MediaRelay Pattern](#mediarelay-pattern)
6. [State Management](#state-management)
7. [Concurrency Model](#concurrency-model)
8. [Design Decisions](#design-decisions)

---

## High-Level Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    WebRTC Voice Streaming Backend                │
│                                                                   │
│  ┌──────────────┐         ┌──────────────┐                      │
│  │   WebSocket  │◄────────┤   aiohttp    │                      │
│  │   Signaling  │         │  Web Server  │                      │
│  └──────┬───────┘         └──────────────┘                      │
│         │                                                         │
│         ▼                                                         │
│  ┌──────────────────────────────────────┐                       │
│  │   VoiceStreamingServer (Main)        │                       │
│  │                                       │                       │
│  │  ├─ Connection Manager                │                       │
│  │  ├─ Stream Registry                   │                       │
│  │  ├─ MediaRelay (aiortc)               │                       │
│  │  └─ Cleanup Tasks                     │                       │
│  └──────┬───────────────────────┬────────┘                       │
│         │                       │                                 │
│         ▼                       ▼                                 │
│  ┌─────────────┐        ┌─────────────────┐                     │
│  │   WebRTC    │        │ AudioStreamServer│                     │
│  │ Peer Conns  │        │  (HTTP/MP3)      │                     │
│  └─────────────┘        └─────────────────┘                     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
         │                                  │
         ▼                                  ▼
   [Sender Clients]                  [Receiver Clients]
   (WebRTC Audio)                    (WebRTC + HTTP/MP3)
```

### Architectural Pattern

**Pattern:** **Event-Driven Relay Architecture**

- **Event-Driven:** All operations are asynchronous (asyncio)
- **Relay:** One sender → Many receivers via MediaRelay
- **Stateful:** Maintains connection and stream registries
- **Decoupled:** WebRTC signaling separate from media transport

---

## Component Breakdown

### 1. VoiceStreamingServer (`webrtc_server_relay.py`)

**Role:** Core orchestrator and main entry point

**Responsibilities:**

- WebSocket connection lifecycle management
- WebRTC peer connection setup (sender/receiver)
- Stream registry (active_streams dict)
- Connection registry (connections dict)
- Message routing and protocol handling
- Cleanup and garbage collection

**Key Data Structures:**

```python
# Connection Registry
self.connections: Dict[str, dict] = {
    "connection_id_uuid": {
        "ws": WebSocketResponse,      # WebSocket connection
        "pc": RTCPeerConnection,       # WebRTC peer connection
        "role": "sender" | "receiver", # Client role
        "stream_id": str               # Associated stream ID
    }
}

# Stream Registry
self.active_streams: Dict[str, Dict] = {
    "stream_id": {
        "track": MediaStreamTrack,     # Source audio track
        "receivers": [connection_ids], # List of receiver IDs
        "sender_id": str,              # Sender connection ID
        "last_activity": float         # Timestamp for cleanup
    }
}
```

**Lifecycle:**

1. **Startup:** Initialize aiohttp app, setup routes, start servers
2. **Runtime:** Handle WebSocket connections, manage streams
3. **Shutdown:** Cleanup connections, close peer connections

---

### 2. AudioStreamServer (`audio_stream_server.py`)

**Role:** HTTP streaming endpoint for browser-based playback

**Responsibilities:**

- Serve audio streams as HTTP/MP3
- Provide `/stream/latest.mp3` endpoint
- Provide `/stream/{stream_id}.mp3` endpoint
- Real-time MP3 encoding using PyAV
- Waiting page when no streams available

**Architecture:**

```
HTTP Request → AudioStreamServer → MediaRelay.subscribe()
                                         ↓
                                   Audio Track
                                         ↓
                                   Resampler (44.1kHz stereo)
                                         ↓
                                   MP3 Encoder (128kbps)
                                         ↓
                                   HTTP Streaming Response
```

**Key Features:**

- **Lazy loading page:** Shows spinner while waiting for streams
- **Auto-refresh:** JavaScript polls `/stream/status` endpoint
- **Real-time encoding:** Converts WebRTC audio to MP3 on-the-fly
- **Separate port:** Runs on 8081 to avoid conflicts

---

### 3. MediaRelay (aiortc)

**Role:** Efficient one-to-many audio distribution

**Why MediaRelay?**

Without MediaRelay, each receiver would need the sender to create a separate track, which doesn't scale. MediaRelay creates a **publish-subscribe pattern**:

```
Sender Track (Original)
        │
        ▼
   MediaRelay
        │
        ├──► Receiver 1 (subscribed track)
        ├──► Receiver 2 (subscribed track)
        ├──► Receiver 3 (subscribed track)
        └──► Visualization Task (subscribed track)
```

**How It Works:**

1. Sender's track is stored in `active_streams[stream_id]["track"]`
2. Each receiver calls `self.relay.subscribe(source_track)`
3. MediaRelay internally manages frame distribution
4. Each subscriber gets independent frames (no shared state)

**Code Location:** `webrtc_server_relay.py` line 23, 198, 266

---

## Data Flow Diagrams

### Sender Flow (Audio Transmission)

```
┌─────────────┐
│   Sender    │
│   Client    │
└──────┬──────┘
       │ 1. WebSocket connect
       ▼
┌─────────────────────┐
│  WebSocket Handler  │
│  (connection_id)    │
└──────┬──────────────┘
       │ 2. Send {"type": "start_sending"}
       ▼
┌─────────────────────┐
│  setup_sender()     │
│  - Create RTCPeer  │
│  - Register @track │
└──────┬──────────────┘
       │ 3. Send {"type": "sender_ready"}
       ▼
┌─────────────────────┐
│   Sender Client     │
│   Creates Offer     │
└──────┬──────────────┘
       │ 4. Send {"type": "webrtc_offer", "offer": {...}}
       ▼
┌─────────────────────┐
│ handle_webrtc_offer │
│ - setRemoteDesc     │
│ - createAnswer      │
└──────┬──────────────┘
       │ 5. Send {"type": "webrtc_answer", "answer": {...}}
       ▼
┌─────────────────────┐
│   ICE Negotiation   │
│   (automatic)       │
└──────┬──────────────┘
       │ 6. Connection established
       ▼
┌─────────────────────┐
│   @pc.on("track")   │
│   - Store track     │
│   - Broadcast avail │
│   - Start viz task  │
└─────────────────────┘
```

### Receiver Flow (Audio Reception)

```
┌─────────────┐
│  Receiver   │
│   Client    │
└──────┬──────┘
       │ 1. WebSocket connect
       ▼
┌─────────────────────┐
│  WebSocket Handler  │
│  - Send available   │
│    streams list     │
└──────┬──────────────┘
       │ 2. Send {"type": "start_receiving", "stream_id": "..."}
       ▼
┌─────────────────────┐
│  setup_receiver()   │
│  - Get stream track │
│  - relay.subscribe()│
│  - Create RTCPeer   │
│  - addTrack()       │
└──────┬──────────────┘
       │ 3. Server creates offer
       ▼
┌─────────────────────┐
│   Server sends      │
│   webrtc_offer      │
└──────┬──────────────┘
       │ 4. Client creates answer
       ▼
┌─────────────────────┐
│ handle_webrtc_answer│
│ - setRemoteDesc     │
└──────┬──────────────┘
       │ 5. ICE negotiation
       ▼
┌─────────────────────┐
│  Audio Streaming    │
│  (MediaRelay → PC)  │
└─────────────────────┘
```

---

## WebRTC Architecture

### ICE Configuration

```json
{
  "iceServers": [] // Empty = LAN-only
}
```

**Why empty?**

- No STUN servers = no external IP discovery
- No TURN servers = no relay through external servers
- Result: Only local network candidates are generated

**ICE Candidate Types Generated:**

- `host` candidates only (local IP addresses)
- No `srflx` (server reflexive) candidates
- No `relay` candidates

### SDP Negotiation

**Sender → Server:**

```
Sender creates offer → Server receives → Server creates answer
```

**Server → Receiver:**

```
Server creates offer → Receiver receives → Receiver creates answer
```

**Key SDP Parameters:**

- `sdpSemantics: "unified-plan"` (modern WebRTC standard)
- `bundlePolicy: "max-bundle"` (all media on one connection)
- `rtcpMuxPolicy: "require"` (RTP and RTCP on same port)

---

## MediaRelay Pattern

### Problem Statement

**Naive Approach:**

```
Sender → Track → Receiver 1
Sender → Track → Receiver 2  ❌ Not possible with single track
Sender → Track → Receiver 3
```

**MediaRelay Solution:**

```
Sender → Original Track → MediaRelay
                              ├→ Subscribed Track → Receiver 1
                              ├→ Subscribed Track → Receiver 2
                              └→ Subscribed Track → Receiver 3
```

### Implementation Details

**Subscription:**

```python
source_track = stream_info["track"]
relayed_track = self.relay.subscribe(source_track)
pc.addTrack(relayed_track)
```

**Frame Distribution:**

- MediaRelay reads frames from source track
- Distributes copies to all subscribers
- Each subscriber gets independent frame queue
- No blocking between subscribers

**Memory Implications:**

- Each subscription creates a new frame buffer
- Frames are copied (not shared references)
- Typical memory: ~50-100MB per active receiver

---

## State Management

### Connection Lifecycle States

```
┌──────────┐
│  Created │ (WebSocket connected)
└────┬─────┘
     │
     ▼
┌──────────┐
│  Ready   │ (Role assigned: sender/receiver)
└────┬─────┘
     │
     ▼
┌──────────┐
│ Connected│ (WebRTC peer connection established)
└────┬─────┘
     │
     ▼
┌──────────┐
│ Streaming│ (Audio flowing)
└────┬─────┘
     │
     ▼
┌──────────┐
│  Closed  │ (Cleanup complete)
└──────────┘
```

### Stream Lifecycle States

```
┌──────────┐
│  Created │ (Sender track received)
└────┬─────┘
     │
     ▼
┌──────────┐
│  Active  │ (Receivers can subscribe)
└────┬─────┘
     │
     ▼
┌──────────┐
│  Ended   │ (Track ended or sender disconnected)
└────┬─────┘
     │
     ▼
┌──────────┐
│  Removed │ (Cleaned up from registry)
└──────────┘
```

### Cleanup Mechanisms

**1. Connection Cleanup (Immediate):**

- Triggered on WebSocket disconnect
- Closes RTCPeerConnection
- Removes from connection registry
- Removes from stream receiver list

**2. Stream Cleanup (Deferred):**

- Triggered when track ends
- Broadcasts `stream_ended` message
- Removes from active_streams registry

**3. Stale Stream Cleanup (Periodic):**

- Runs every 5 minutes (`cleanup_stale_streams()`)
- Removes streams with no receivers for >10 minutes
- Removes streams with ended tracks

---

## Concurrency Model

### Asyncio Event Loop

**Single-threaded async:**

- All operations run on one event loop
- No threading, no multiprocessing
- Cooperative multitasking via `async/await`

**Async Tasks:**

| Task                      | Type           | Lifecycle         |
| ------------------------- | -------------- | ----------------- |
| `run_server()`            | Main           | Runs forever      |
| `websocket_handler()`     | Per-connection | Until disconnect  |
| `process_visualization()` | Per-stream     | Until stream ends |
| `cleanup_stale_streams()` | Background     | Runs every 5 min  |
| `audio_server.start()`    | Server         | Runs forever      |

**Concurrency Safety:**

- No locks needed (single-threaded)
- Dictionaries are safe to modify (no concurrent access)
- `asyncio.create_task()` for fire-and-forget tasks

---

## Design Decisions

### Why Python + aiortc?

**Alternatives Considered:**

- Node.js + node-webrtc
- Go + pion/webrtc
- Rust + webrtc-rs

**Chosen: Python + aiortc**

**Rationale:**

- ✅ Excellent Home Assistant integration (Python ecosystem)
- ✅ Mature aiortc library with good MediaRelay support
- ✅ Easy audio processing with numpy/PyAV
- ✅ Simple async model with asyncio
- ❌ Lower performance than Go/Rust (acceptable for LAN use)

---

### Why LAN-Only (No STUN/TURN)?

**Rationale:**

- ✅ Simplicity: No external service dependencies
- ✅ Security: No data leaves local network
- ✅ Performance: Direct peer-to-peer, no relay overhead
- ✅ Privacy: No external signaling servers
- ❌ Limitation: Doesn't work across internet

**Use Case Fit:**
Home Assistant deployments are typically LAN-only, so this trade-off is acceptable.

---

### Why Two Servers (WebRTC + HTTP)?

**Rationale:**

- WebRTC for low-latency bidirectional audio
- HTTP/MP3 for browser compatibility (no WebRTC client needed)
- Separate ports to avoid routing conflicts
- Different use cases: control vs. playback

---

### Why MediaRelay Instead of SFU?

**SFU (Selective Forwarding Unit):**

- Complex routing logic
- Per-receiver bandwidth adaptation
- Overkill for LAN use case

**MediaRelay:**

- Simple publish-subscribe
- No bandwidth adaptation (LAN has plenty)
- Built into aiortc
- Perfect for our use case

---

## Performance Characteristics

### Latency Breakdown

| Stage                      | Typical Latency |
| -------------------------- | --------------- |
| Microphone capture         | 10-20ms         |
| WebRTC encoding            | 20-40ms         |
| Network transmission (LAN) | 1-5ms           |
| Server relay               | 5-10ms          |
| WebRTC decoding            | 20-40ms         |
| Audio playback             | 10-20ms         |
| **Total (end-to-end)**     | **66-135ms**    |

### Scalability Limits

| Metric               | Limit | Notes                             |
| -------------------- | ----- | --------------------------------- |
| Concurrent senders   | ~10   | Limited by CPU (encoding)         |
| Concurrent receivers | ~50   | Limited by memory (relay buffers) |
| Streams per sender   | 1     | Design constraint                 |
| Receivers per stream | ~20   | Tested limit                      |

### Resource Usage

| Resource      | Per Connection | Per Stream           |
| ------------- | -------------- | -------------------- |
| Memory        | ~10MB          | ~50-100MB            |
| CPU           | ~2-5%          | ~10-20%              |
| Network (LAN) | ~128kbps       | ~128kbps × receivers |

---

## Security Considerations

### Threat Model

**In Scope:**

- Local network attacks
- Malicious WebSocket clients
- Resource exhaustion (DoS)

**Out of Scope:**

- Internet-based attacks (LAN-only)
- Man-in-the-middle (assumes trusted LAN)

### Mitigations

| Threat                  | Mitigation                          |
| ----------------------- | ----------------------------------- |
| DoS (connection flood)  | Max connections limit (config.json) |
| DoS (memory exhaustion) | Cleanup tasks, connection limits    |
| Unauthorized access     | Network-level security (firewall)   |
| Data exfiltration       | LAN-only operation                  |

**Note:** No authentication/authorization is implemented. This relies on network-level security (e.g., Home Assistant ingress, firewall rules).

---

## Future Architecture Considerations

### Potential Enhancements

1. **Authentication Layer:**
   - JWT tokens for WebSocket connections
   - Home Assistant user integration

2. **Encryption:**
   - WSS (WebSocket Secure) instead of WS
   - Certificate management

3. **Horizontal Scaling:**
   - Redis for shared state
   - Load balancer with sticky sessions

4. **Advanced Features:**
   - Recording streams to disk
   - Transcription integration
   - Voice activity detection (VAD)

---

## Conclusion

This architecture prioritizes **simplicity, reliability, and low latency** for local network voice streaming. The MediaRelay pattern enables efficient one-to-many distribution, while the event-driven async model ensures responsive handling of concurrent connections.

**Key Takeaways:**

- Understand the sender/receiver roles
- MediaRelay is the core scaling mechanism
- LAN-only design is intentional
- Cleanup tasks prevent resource leaks
- Two servers serve different use cases (WebRTC + HTTP)

---

**Next Steps:**

- For setup instructions: See `02-SETUP-GUIDE.md`
- For API details: See `03-API-REFERENCE.md`
- For development: See `05-DEVELOPMENT-GUIDE.md`
