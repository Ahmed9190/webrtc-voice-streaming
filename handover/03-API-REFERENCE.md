# 📡 API Reference - WebRTC Voice Streaming Backend

**Document Version:** 1.0  
**Last Updated:** 2026-01-18

---

## Table of Contents

1. [WebSocket API](#websocket-api)
2. [HTTP REST API](#http-rest-api)
3. [WebRTC Signaling Protocol](#webrtc-signaling-protocol)
4. [Message Reference](#message-reference)
5. [Client Implementation Examples](#client-implementation-examples)
6. [Error Codes](#error-codes)

---

## WebSocket API

### Connection

**Endpoint:** `ws://[host]:8080/ws`

**Protocol:** WebSocket (RFC 6455)

**Connection Flow:**

```
Client → Server: WebSocket Upgrade Request
Server → Client: 101 Switching Protocols
Server → Client: {"type": "available_streams", "streams": [...]}
```

### Message Format

All messages are JSON-encoded strings:

```json
{
  "type": "message_type",
  "...": "additional fields"
}
```

---

## Message Reference

### Client → Server Messages

#### 1. Start Sending

**Purpose:** Register as an audio sender

```json
{
  "type": "start_sending"
}
```

**Server Response:**

```json
{
  "type": "sender_ready",
  "connection_id": "uuid-string"
}
```

**Next Steps:**

1. Client creates WebRTC offer
2. Client sends `webrtc_offer` message

---

#### 2. Start Receiving

**Purpose:** Register as an audio receiver and subscribe to a stream

```json
{
  "type": "start_receiving",
  "stream_id": "stream_uuid" // Optional: omit to get latest stream
}
```

**Server Response:**

```json
{
  "type": "webrtc_offer",
  "offer": {
    "sdp": "v=0\r\no=- ...",
    "type": "offer"
  }
}
```

**Next Steps:**

1. Client sets remote description (offer)
2. Client creates answer
3. Client sends `webrtc_answer` message

---

#### 3. WebRTC Offer (from Sender)

**Purpose:** Send WebRTC offer SDP to server

```json
{
  "type": "webrtc_offer",
  "offer": {
    "sdp": "v=0\r\no=- 123456789 2 IN IP4 127.0.0.1\r\n...",
    "type": "offer"
  }
}
```

**Server Response:**

```json
{
  "type": "webrtc_answer",
  "answer": {
    "sdp": "v=0\r\no=- ...",
    "type": "answer"
  }
}
```

---

#### 4. WebRTC Answer (from Receiver)

**Purpose:** Send WebRTC answer SDP to server

```json
{
  "type": "webrtc_answer",
  "answer": {
    "sdp": "v=0\r\no=- 987654321 2 IN IP4 127.0.0.1\r\n...",
    "type": "answer"
  }
}
```

**Server Response:** None (connection established)

---

#### 5. ICE Candidate

**Purpose:** Exchange ICE candidates (currently unused, SDP includes candidates)

```json
{
  "type": "ice_candidate",
  "candidate": {
    "candidate": "candidate:1 1 UDP 2130706431 192.168.1.100 54321 typ host",
    "sdpMid": "0",
    "sdpMLineIndex": 0
  }
}
```

**Note:** Current implementation uses Trickle ICE disabled (candidates in SDP).

---

#### 6. Get Available Streams

**Purpose:** Request list of active streams

```json
{
  "type": "get_available_streams"
}
```

**Server Response:**

```json
{
  "type": "available_streams",
  "streams": ["stream_uuid1", "stream_uuid2"]
}
```

---

#### 7. Stop Stream

**Purpose:** Stop media streaming but keep WebSocket open

```json
{
  "type": "stop_stream"
}
```

**Server Action:**

- Closes RTCPeerConnection
- Keeps WebSocket connection alive
- Removes from stream receivers list

---

#### 8. Local IP (Informational)

**Purpose:** Client sends its local IP (currently unused)

```json
{
  "type": "local_ip",
  "ip": "192.168.1.100"
}
```

---

### Server → Client Messages

#### 1. Sender Ready

**Purpose:** Confirm sender registration

```json
{
  "type": "sender_ready",
  "connection_id": "uuid-string"
}
```

---

#### 2. Available Streams

**Purpose:** List of active streams (sent on connect and on request)

```json
{
  "type": "available_streams",
  "streams": ["stream_connection_id_1", "stream_connection_id_2"]
}
```

**Stream ID Format:** `stream_{connection_id}`

---

#### 3. Stream Available

**Purpose:** Broadcast when new stream becomes available

```json
{
  "type": "stream_available",
  "stream_id": "stream_uuid"
}
```

**Broadcast:** Sent to ALL connected clients

---

#### 4. Stream Ended

**Purpose:** Broadcast when stream ends

```json
{
  "type": "stream_ended",
  "stream_id": "stream_uuid"
}
```

**Broadcast:** Sent to ALL connected clients

---

#### 5. Error

**Purpose:** Notify client of error condition

```json
{
  "type": "error",
  "message": "No audio stream available"
}
```

**Common Error Messages:**

- `"No audio stream available"` - No active streams when requesting to receive
- `"Stream ended"` - Requested stream has ended
- `"Server error: <details>"` - Internal server error

---

## HTTP REST API

### Health Check

**Endpoint:** `GET /health`

**Response:**

```json
{
  "status": "healthy",
  "webrtc_available": true,
  "audio_server_running": true,
  "active_streams": 2,
  "connected_clients": 5,
  "uptime_seconds": 3600
}
```

**Status Codes:**

- `200 OK` - Server is healthy
- `500 Internal Server Error` - Server is unhealthy

---

### Metrics

**Endpoint:** `GET /metrics`

**Response:**

```json
{
  "uptime_seconds": 3600,
  "active_connections": 5,
  "active_streams": 2,
  "total_audio_bytes": 1048576,
  "webrtc_available": true
}
```

**Use Case:** Prometheus scraping, monitoring dashboards

---

### Audio Stream Status

**Endpoint:** `GET /stream/status`  
**Port:** 8081

**Response:**

```json
{
  "active_streams": ["stream_uuid1", "stream_uuid2"]
}
```

---

### Latest Audio Stream (MP3)

**Endpoint:** `GET /stream/latest.mp3`  
**Port:** 8081

**Response:**

- **If stream available:** HTTP 200, `Content-Type: audio/mpeg`, streaming MP3 data
- **If no stream:** HTTP 200, `Content-Type: text/html`, waiting page with auto-refresh

**Waiting Page Features:**

- JavaScript polling of `/stream/status`
- Exponential backoff (1s → 10s)
- Auto-reload when stream detected

---

### Specific Audio Stream (MP3)

**Endpoint:** `GET /stream/{stream_id}.mp3`  
**Port:** 8081

**Response:**

- **If stream exists:** HTTP 200, `Content-Type: audio/mpeg`, streaming MP3 data
- **If stream not found:** HTTP 404, `Stream not found`

**Audio Format:**

- Codec: MP3
- Bitrate: 128kbps
- Sample Rate: 44.1kHz
- Channels: Stereo

---

## WebRTC Signaling Protocol

### Sender Flow (Detailed)

```
┌────────┐                                    ┌────────┐
│ Sender │                                    │ Server │
└───┬────┘                                    └───┬────┘
    │                                             │
    │ 1. WebSocket Connect                        │
    ├────────────────────────────────────────────►│
    │                                             │
    │ 2. {"type": "available_streams", ...}       │
    │◄────────────────────────────────────────────┤
    │                                             │
    │ 3. {"type": "start_sending"}                │
    ├────────────────────────────────────────────►│
    │                                             │
    │ 4. {"type": "sender_ready", ...}            │
    │◄────────────────────────────────────────────┤
    │                                             │
    │ 5. Create RTCPeerConnection                 │
    │    Add audio track                          │
    │    Create offer                             │
    │                                             │
    │ 6. {"type": "webrtc_offer", "offer": {...}} │
    ├────────────────────────────────────────────►│
    │                                             │
    │                                             │ 7. setRemoteDescription(offer)
    │                                             │    createAnswer()
    │                                             │    setLocalDescription(answer)
    │                                             │
    │ 8. {"type": "webrtc_answer", "answer": {...}}│
    │◄────────────────────────────────────────────┤
    │                                             │
    │ 9. setRemoteDescription(answer)             │
    │                                             │
    │ 10. ICE negotiation (automatic)             │
    │◄───────────────────────────────────────────►│
    │                                             │
    │ 11. Audio streaming starts                  │
    │════════════════════════════════════════════►│
    │                                             │
    │                                             │ 12. @pc.on("track") fires
    │                                             │     Store track in active_streams
    │                                             │     Broadcast stream_available
    │                                             │
```

---

### Receiver Flow (Detailed)

```
┌──────────┐                                  ┌────────┐
│ Receiver │                                  │ Server │
└────┬─────┘                                  └───┬────┘
     │                                            │
     │ 1. WebSocket Connect                       │
     ├───────────────────────────────────────────►│
     │                                            │
     │ 2. {"type": "available_streams", ...}      │
     │◄───────────────────────────────────────────┤
     │                                            │
     │ 3. {"type": "start_receiving", ...}        │
     ├───────────────────────────────────────────►│
     │                                            │
     │                                            │ 4. Get stream track
     │                                            │    relay.subscribe(track)
     │                                            │    Create RTCPeerConnection
     │                                            │    addTrack(relayed_track)
     │                                            │    createOffer()
     │                                            │
     │ 5. {"type": "webrtc_offer", "offer": {...}}│
     │◄───────────────────────────────────────────┤
     │                                            │
     │ 6. setRemoteDescription(offer)             │
     │    createAnswer()                          │
     │                                            │
     │ 7. {"type": "webrtc_answer", "answer": {...}}│
     ├───────────────────────────────────────────►│
     │                                            │
     │                                            │ 8. setRemoteDescription(answer)
     │                                            │
     │ 9. ICE negotiation (automatic)             │
     │◄──────────────────────────────────────────►│
     │                                            │
     │ 10. Audio streaming starts                 │
     │◄═══════════════════════════════════════════│
     │                                            │
```

---

## Client Implementation Examples

### JavaScript (Browser) - Sender

```javascript
// 1. Connect WebSocket
const ws = new WebSocket("ws://192.168.1.100:8080/ws");

ws.onopen = async () => {
  console.log("WebSocket connected");

  // 2. Request to start sending
  ws.send(JSON.stringify({ type: "start_sending" }));
};

ws.onmessage = async (event) => {
  const msg = JSON.parse(event.data);

  if (msg.type === "sender_ready") {
    // 3. Create RTCPeerConnection
    const pc = new RTCPeerConnection({ iceServers: [] });

    // 4. Get microphone audio
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    // 5. Add audio track to peer connection
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    // 6. Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    ws.send(
      JSON.stringify({
        type: "webrtc_offer",
        offer: {
          sdp: pc.localDescription.sdp,
          type: pc.localDescription.type,
        },
      }),
    );

    // Store pc for later use
    window.senderPC = pc;
  }

  if (msg.type === "webrtc_answer") {
    // 7. Set remote description
    await window.senderPC.setRemoteDescription(new RTCSessionDescription(msg.answer));
    console.log("Sender connected! Audio streaming...");
  }
};
```

---

### JavaScript (Browser) - Receiver

```javascript
// 1. Connect WebSocket
const ws = new WebSocket("ws://192.168.1.100:8080/ws");

ws.onopen = () => {
  console.log("WebSocket connected");
};

ws.onmessage = async (event) => {
  const msg = JSON.parse(event.data);

  if (msg.type === "available_streams") {
    console.log("Available streams:", msg.streams);

    // 2. Request to receive latest stream
    ws.send(
      JSON.stringify({
        type: "start_receiving",
        // Omit stream_id to get latest
      }),
    );
  }

  if (msg.type === "webrtc_offer") {
    // 3. Create RTCPeerConnection
    const pc = new RTCPeerConnection({ iceServers: [] });

    // 4. Handle incoming audio track
    pc.ontrack = (event) => {
      console.log("Received audio track!");
      const audio = new Audio();
      audio.srcObject = event.streams[0];
      audio.play();
    };

    // 5. Set remote description (offer)
    await pc.setRemoteDescription(new RTCSessionDescription(msg.offer));

    // 6. Create and send answer
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    ws.send(
      JSON.dumps({
        type: "webrtc_answer",
        answer: {
          sdp: pc.localDescription.sdp,
          type: pc.localDescription.type,
        },
      }),
    );

    console.log("Receiver connected! Listening...");
  }

  if (msg.type === "stream_ended") {
    console.log("Stream ended:", msg.stream_id);
    // Handle stream end (e.g., show UI notification)
  }
};
```

---

### Python - WebSocket Client

```python
import asyncio
import json
import aiohttp

async def test_websocket():
    async with aiohttp.ClientSession() as session:
        async with session.ws_connect('http://localhost:8080/ws') as ws:
            print('Connected to WebSocket')

            # Listen for messages
            async for msg in ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    data = json.loads(msg.data)
                    print(f'Received: {data}')

                    if data['type'] == 'available_streams':
                        print(f'Available streams: {data["streams"]}')

                elif msg.type == aiohttp.WSMsgType.ERROR:
                    print(f'WebSocket error: {ws.exception()}')
                    break

asyncio.run(test_websocket())
```

---

### curl - HTTP Endpoints

```bash
# Health check
curl http://localhost:8080/health

# Metrics
curl http://localhost:8080/metrics

# Stream status
curl http://localhost:8081/stream/status

# Download MP3 stream (will wait if no stream)
curl http://localhost:8081/stream/latest.mp3 -o audio.mp3

# Stream to audio player
curl http://localhost:8081/stream/latest.mp3 | mpg123 -
```

---

## Error Codes

### WebSocket Errors

| Error Message                 | Cause                                    | Solution                                          |
| ----------------------------- | ---------------------------------------- | ------------------------------------------------- |
| `"No audio stream available"` | No active senders when receiver connects | Wait for sender or start a sender                 |
| `"Stream ended"`              | Requested stream has ended               | Request a different stream or wait for new stream |
| `"Server error: <details>"`   | Internal server error                    | Check server logs, report bug                     |

### HTTP Status Codes

| Code                        | Endpoint           | Meaning                  |
| --------------------------- | ------------------ | ------------------------ |
| `200 OK`                    | All                | Request successful       |
| `404 Not Found`             | `/stream/{id}.mp3` | Stream ID does not exist |
| `500 Internal Server Error` | `/health`          | Server is unhealthy      |

### WebRTC Errors

| Error                 | Cause                      | Solution                                |
| --------------------- | -------------------------- | --------------------------------------- |
| ICE connection failed | Network connectivity issue | Check firewall, verify LAN connectivity |
| Invalid SDP           | Malformed offer/answer     | Check WebRTC client implementation      |
| Track ended           | Sender disconnected        | Reconnect to new stream                 |

---

## Rate Limits

**Current Implementation:** No rate limiting

**Recommendations for Production:**

- Limit WebSocket connections per IP: 5 concurrent
- Limit stream creation rate: 1 per 5 seconds per IP
- Limit HTTP requests: 100 per minute per IP

**Implementation:** Use nginx or middleware (not currently implemented)

---

## Authentication

**Current Implementation:** None

**Security Model:** Network-level security (firewall, VPN, Home Assistant ingress)

**Future Enhancement:** JWT tokens, Home Assistant user integration

---

## Versioning

**Current Version:** 1.0 (implied, no version in protocol)

**Future Consideration:** Add version field to messages:

```json
{
  "version": "1.0",
  "type": "start_sending"
}
```

---

## Best Practices

### Client Implementation

1. **Always handle `stream_ended` events** - Reconnect or notify user
2. **Implement exponential backoff** for reconnections
3. **Check `available_streams` before requesting to receive**
4. **Close RTCPeerConnection when done** to free resources
5. **Handle network errors gracefully** (WebSocket disconnect, ICE failure)

### Server Integration

1. **Monitor `/health` endpoint** for uptime
2. **Use `/metrics` for observability** (Prometheus, Grafana)
3. **Set up alerts** for `active_streams: 0` if senders expected
4. **Log all WebSocket errors** for debugging

---

## Troubleshooting API Issues

### WebSocket Won't Connect

```bash
# Test with curl
curl -i -N -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Version: 13" \
     -H "Sec-WebSocket-Key: test" \
     http://localhost:8080/ws
```

### No Audio Received

1. Check stream exists:

   ```bash
   curl http://localhost:8081/stream/status
   ```

2. Verify sender is connected:

   ```bash
   curl http://localhost:8080/metrics
   # Check "active_streams" > 0
   ```

3. Check browser console for WebRTC errors

### SDP Negotiation Fails

- Verify `iceServers: []` in client RTCPeerConnection config
- Check that offer/answer SDP is not truncated
- Ensure `setRemoteDescription` is called before `createAnswer`

---

## Next Steps

- **For troubleshooting:** See `04-TROUBLESHOOTING.md`
- **For development:** See `05-DEVELOPMENT-GUIDE.md`
- **For deployment:** See `06-DEPLOYMENT.md`

---

**API Reference Complete!** Use this as your integration guide.
