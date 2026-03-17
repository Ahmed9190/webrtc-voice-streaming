# Decision Log - WebRTC Voice Streaming Backend

## Purpose

This document captures the **architectural decisions** and **design rationale** behind the WebRTC Voice Streaming system. Understanding _why_ the code is the way it is prevents future developers from reintroducing solved problems or breaking delicate trade-offs.

---

## Decision Records

### ADR-001: Use WebRTC Instead of WebSocket Audio

**Date:** 2024-01-15  
**Status:** Accepted  
**Context:** Need sub-second latency for two-way voice communication

**Options Considered:**
1. **WebSocket + Audio Worklets**: Stream raw PCM over WebSocket
2. **WebRTC**: Use browser's native WebRTC implementation
3. **HLS/DASH**: Standard streaming protocols

**Decision:** Use WebRTC

**Rationale:**
- **Latency**: WebRTC provides <500ms round-trip vs 2-10s for HLS
- **Codec Efficiency**: Opus codec (built into WebRTC) provides superior quality at lower bitrates
- **NAT Traversal**: ICE/STUN/TURN handles network complexity (even if we use LAN-only ICE)
- **Browser Support**: Native API, no JavaScript codec libraries needed

**Consequences:**
- ✅ Achieves target latency (<500ms)
- ✅ Lower bandwidth usage (Opus compression)
- ❌ Requires HTTPS (browser security requirement)
- ❌ More complex signaling (SDP offer/answer exchange)

**Reference:** `webrtc_server_relay.py` lines 1-50 (imports aiortc)

---

### ADR-002: Host Network Mode for Add-on

**Date:** 2024-01-20  
**Status:** Accepted  
**Context:** Docker networking causing WebRTC connectivity issues

**Options Considered:**
1. **Bridge Mode**: Standard Docker networking with port mapping
2. **Host Mode**: Share host's network stack
3. **Macvlan**: Separate network interface for container

**Decision:** Use Host Network Mode

**Rationale:**
- **ICE Candidates**: Need real LAN IP addresses, not Docker bridge IPs
- **UDP Performance**: Avoid NAT translation overhead for WebRTC media
- **Simplicity**: No port mapping configuration required
- **Reliability**: Eliminates hairpinning issues with local clients

**Consequences:**
- ✅ WebRTC connections work reliably on first try
- ✅ Lower latency (no NAT translation)
- ❌ Less isolation from host network
- ❌ Port conflicts must be handled gracefully
- ❌ Requires Home Assistant OS/Supervised (not Docker standalone)

**Reference:** `config.yaml` line `host_network: true`

---

### ADR-003: Empty ICE Servers (LAN-Only)

**Date:** 2024-01-20  
**Status:** Accepted  
**Context:** WebRTC connections failing with public STUN servers

**Options Considered:**
1. **Public STUN**: Use Google's STUN server (stun:stun.l.google.com:19302)
2. **Self-Hosted STUN**: Deploy coturn server
3. **LAN-Only**: Empty iceServers array, force direct connections

**Decision:** Use LAN-Only ICE

**Rationale:**
- **Use Case**: System designed for local network only (Home Assistant)
- **Complexity**: No TURN server needed (no internet relay)
- **Privacy**: No external server dependencies
- **Performance**: Direct connections always faster than relayed

**Consequences:**
- ✅ Simpler deployment (no STUN/TURN infrastructure)
- ✅ Better privacy (no external servers)
- ✅ Lower latency (direct P2P connections)
- ❌ Won't work over internet (by design)
- ❌ Clients must be on same LAN

**Reference:** `frontend/src/webrtc-manager.ts` line 100
```typescript
iceServers: []  // LAN only
```

---

### ADR-004: MediaRelay for Multi-Receiver Distribution

**Date:** 2024-02-01  
**Status:** Accepted  
**Context:** Need to support multiple receivers for single sender

**Options Considered:**
1. **Mesh Topology**: Each receiver connects directly to sender
2. **SFU (Selective Forwarding Unit)**: Server relays all media
3. **MediaRelay**: aiortc's built-in track distribution

**Decision:** Use MediaRelay Pattern

**Rationale:**
- **Simplicity**: aiortc provides MediaRelay out-of-the-box
- **Efficiency**: Single track subscription, multiple consumers
- **Scalability**: O(1) sender connections, O(n) receiver connections
- **Code Reuse**: No custom relay logic needed

**Consequences:**
- ✅ Unlimited receivers per sender
- ✅ Sender doesn't need to know about receivers
- ✅ Simple API: `relay.subscribe(track)`
- ❌ Server still processes all media (not true P2P)
- ❌ Single point of failure (if server crashes, all streams break)

**Reference:** `webrtc_server_relay.py` line 17
```python
self.relay = MediaRelay()
```

---

### ADR-005: Separate MP3 Streaming Server

**Date:** 2024-02-05  
**Status:** Accepted  
**Context:** Home Assistant media_player entities can't play WebRTC streams

**Options Considered:**
1. **WebRTC Only**: Require all clients to support WebRTC
2. **HLS Streaming**: Standard HTTP Live Streaming
3. **MP3 over HTTP**: Simple chunked MP3 streaming

**Decision:** Implement Separate MP3 Streaming Server

**Rationale:**
- **Compatibility**: Home Assistant `media_player.play_media` expects HTTP URLs
- **Simplicity**: MP3 universally supported (VLC, browsers, HA entities)
- **Separation**: Keep WebRTC signaling separate from media streaming
- **Flexibility**: Allow non-WebRTC clients to receive audio

**Consequences:**
- ✅ Works with Home Assistant media_player entities
- ✅ Can test streams with VLC or any media player
- ✅ Provides fallback for non-WebRTC clients
- ❌ Additional encoding overhead (PCM → MP3)
- ❌ Higher latency than WebRTC (200-500ms vs <500ms round-trip)
- ❌ Extra port to manage (8081)

**Reference:** `audio_stream_server.py` entire file

---

### ADR-006: Autonomous SSL Certificate Management

**Date:** 2024-02-10  
**Status:** Accepted  
**Context:** Users struggle with HTTPS configuration for WebRTC

**Options Considered:**
1. **Manual SSL**: User provides certificates
2. **Let's Encrypt Integration**: Automatic public certificates
3. **Self-Signed CA**: Generate local CA automatically
4. **Cascade Strategy**: Try multiple methods in priority order

**Decision:** Implement Autonomous SSL Cascade

**Rationale:**
- **User Experience**: Zero-configuration SSL (just works)
- **Flexibility**: Use existing HA certs if available
- **Reliability**: Fallback to self-signed if no HA certs
- **Ingress Support**: Detect and adapt to Ingress mode

**Consequences:**
- ✅ Works out-of-the-box for most users
- ✅ Leverages existing HA SSL setup when present
- ✅ Supports Ingress mode (HA proxies HTTPS)
- ✅ Self-signed CA valid for 10 years (set and forget)
- ❌ More complex SSL setup script (300+ lines)
- ❌ Users must install CA certificate for self-signed mode

**Reference:** `ssl-setup.sh` entire file

---

### ADR-007: Smart Port Hunting

**Date:** 2024-02-15  
**Status:** Accepted  
**Context:** Port conflicts cause add-on startup failures

**Options Considered:**
1. **Fixed Ports**: Fail if port 8443 is busy
2. **User Configuration**: User specifies port in config
3. **Smart Hunting**: Automatically find available port

**Decision:** Implement Smart Port Hunting

**Rationale:**
- **Reliability**: Add-on should never fail due to port conflicts
- **Common Conflicts**: AdGuard, Nextcloud, other add-ons use 8443
- **Discovery**: Frontend can dynamically discover active port
- **User Experience**: No configuration needed

**Consequences:**
- ✅ Never fails due to "Address in use"
- ✅ Coexists with other services
- ✅ Frontend auto-discovers port via server_state.json
- ❌ Port can change between restarts
- ❌ Firewall rules must allow port range

**Reference:** `webrtc_server_relay.py` lines 280-300
```python
for i in range(10):  # Try up to 10 ports
    try:
        test_port = base_port + i
        await site.start()
        active_port = test_port
        break
    except OSError as e:
        if "Address in use" in str(e):
            continue  # Try next port
```

---

### ADR-008: State Persistence for Frontend Discovery

**Date:** 2024-02-15  
**Status:** Accepted  
**Context:** Frontend needs to know server's active port

**Options Considered:**
1. **Fixed Port**: Frontend hardcodes port 8443
2. **API Discovery**: Frontend queries HA API for port
3. **File-Based**: Server writes port to known file location

**Decision:** Write State to `/config/www/voice_streaming_backend/server_state.json`

**Rationale:**
- **Simplicity**: JSON file easy to read from frontend
- **Persistence**: Survives server restarts
- **Discovery**: Frontend can fetch via HTTP (`/local/...`)
- **Extensibility**: Can add more state fields later

**Consequences:**
- ✅ Frontend always knows active port
- ✅ Works with smart port hunting
- ✅ No HA API dependency
- ❌ Requires write access to /config/www
- ❌ State file can become stale if not cleaned up

**Reference:** `webrtc_server_relay.py` lines 305-320
```python
state_dir = "/config/www/voice_streaming_backend"
with open(f"{state_dir}/server_state.json", "w") as f:
    json.dump({
        "active_port": active_port,
        "ssl": ssl_context is not None,
        "started_at": asyncio.get_event_loop().time(),
    }, f)
```

---

### ADR-009: Keep WebSocket Open After Media Stop

**Date:** 2024-02-20  
**Status:** Accepted  
**Context:** Reconnection overhead for frequent stream switching

**Options Considered:**
1. **Close WebSocket**: Clean disconnect when media stops
2. **Keep Alive**: Maintain WebSocket, close only peer connection
3. **Heartbeat**: Send periodic pings to keep connection alive

**Decision:** Keep WebSocket Open After Media Stop

**Rationale:**
- **Reconnection Speed**: No WebSocket handshake delay
- **Stream Switching**: Fast switching between send/receive roles
- **State Preservation**: Connection metadata retained
- **Resource Efficiency**: WebSocket overhead minimal

**Consequences:**
- ✅ Fast reconnection (<100ms vs ~1s)
- ✅ Smooth stream switching experience
- ✅ Connection state preserved
- ❌ Server maintains more open connections
- ❌ Must handle stale connections (cleanup task needed)

**Reference:** `webrtc_server_relay.py` lines 125-130
```python
async def stop_media(self, connection_id: str):
    # Stop media, keep WS open
    await connection["pc"].close()
    connection["pc"] = None
    connection["stream_id"] = None
    # Do NOT remove from self.connections, keep WS open
```

---

### ADR-010: LAN_IP in Certificate SANs

**Date:** 2024-02-25  
**Status:** Accepted  
**Context:** Certificate warnings when accessing via IP address

**Options Considered:**
1. **Domain Only**: Certificate valid for hostname only
2. **IP + Domain**: Include both hostname and LAN IP
3. **Wildcard**: Use wildcard certificate

**Decision:** Include Multiple SANs (Subject Alternative Names)

**Rationale:**
- **Access Patterns**: Users access via IP, hostname, homeassistant.local
- **Certificate Validity**: Must match exact access URL
- **Automation**: Detect LAN IP automatically
- **Future-Proof**: Include common access patterns

**SANs Included:**
- `localhost`
- `<hostname>` (system hostname)
- `<hostname>.local` (mDNS)
- `homeassistant` (common alias)
- `homeassistant.local`
- `<LAN_IP>` (detected automatically)
- `127.0.0.1` (localhost IP)

**Consequences:**
- ✅ No certificate warnings for common access methods
- ✅ Works with mDNS (homeassistant.local)
- ✅ Works with direct IP access
- ❌ Certificate generation more complex
- ❌ Must detect LAN IP correctly (multiple fallback methods)

**Reference:** `ssl-setup.sh` lines 100-120
```bash
[alt_names]
DNS.1 = localhost
DNS.2 = ${HOSTNAME}
DNS.3 = ${HOSTNAME}.local
DNS.4 = homeassistant
DNS.5 = homeassistant.local
IP.1  = ${LOCAL_IP}
IP.2  = 127.0.0.1
```

---

### ADR-011: Visualization Task Runs Continuously

**Date:** 2024-03-01  
**Status:** Accepted  
**Context:** Audio visualization needs continuous frame processing

**Options Considered:**
1. **On-Demand**: Process frames only when frontend requests
2. **Continuous**: Always process frames while stream active
3. **Sampled**: Process every Nth frame

**Decision:** Run Continuous Visualization Task

**Rationale:**
- **Responsiveness**: Immediate visualization updates
- **Simplicity**: No complex frame buffering logic
- **Track Health**: Continuous subscription keeps track alive
- **Downsampling**: Can reduce data sent to frontend (every 5th frame)

**Consequences:**
- ✅ Smooth visualization (60 FPS possible)
- ✅ Track stays active (prevents premature ending)
- ✅ Simple implementation
- ❌ CPU usage even if no one viewing visualization
- ❌ Could optimize with idle detection

**Reference:** `webrtc_server_relay.py` lines 180-210
```python
async def process_visualization(self, stream_id: str, track):
    while stream_id in self.active_streams:
        frame = await asyncio.wait_for(track.recv(), timeout=2.0)
        # Process frame for visualization
```

---

### ADR-012: No Authentication for WebSocket Connections

**Date:** 2024-03-05  
**Status:** Accepted  
**Context:** Need to balance security with simplicity

**Options Considered:**
1. **Token Authentication**: Require HA access token
2. **Session-Based**: Use HA session cookies
3. **No Authentication**: LAN isolation assumed

**Decision:** No Authentication (LAN Isolation)

**Rationale:**
- **Deployment Simplicity**: No token configuration needed
- **LAN Assumption**: Network physically secured
- **HA Integration**: Dashboard access controlled by HA
- **User Experience**: No additional login prompts

**Consequences:**
- ✅ Zero-configuration authentication
- ✅ Seamless integration with HA
- ✅ Lower latency (no auth overhead)
- ❌ Anyone on LAN can connect (mitigated by network security)
- ❌ Can't restrict specific users
- ⚠️ **Not suitable for internet-facing deployments**

**Reference:** `webrtc_server_relay.py` - no auth checks in `websocket_handler`

**Future Consideration:**
If internet exposure needed, add token authentication:
```python
async def websocket_handler(self, request):
    token = request.headers.get("Authorization")
    if not await self.verify_token(token):
        await ws.close()
        return
```

---

### ADR-013: Use PyAV for MP3 Encoding

**Date:** 2024-03-10  
**Status:** Accepted  
**Context:** Need to encode PCM to MP3 for streaming

**Options Considered:**
1. **PyAV**: Python bindings for FFmpeg
2. **pydub**: High-level audio library
3. **lameenc**: Direct LAME encoder bindings
4. **Raw PCM**: Skip encoding, stream PCM

**Decision:** Use PyAV

**Rationale:**
- **Performance**: FFmpeg highly optimized
- **Flexibility**: Easy to change codec/bitrate
- **Integration**: Works with aiortc's av.AudioFrame
- **Quality**: Good MP3 quality at 128kbps

**Consequences:**
- ✅ Fast encoding (real-time possible)
- ✅ Standard MP3 output (universal compatibility)
- ✅ Configurable bitrate/sample rate
- ❌ FFmpeg dependency (larger Docker image)
- ❌ More complex than raw PCM

**Reference:** `audio_stream_server.py` lines 130-160
```python
codec = av.codec.Codec("mp3", "w")
codec_context = av.CodecContext.create(codec)
codec_context.bit_rate = 128000
codec_context.sample_rate = 44100
```

---

### ADR-014: Exponential Backoff for Reconnection

**Date:** 2024-03-15  
**Status:** Accepted  
**Context:** Network interruptions cause connection drops

**Options Considered:**
1. **Immediate Retry**: Reconnect immediately on failure
2. **Fixed Delay**: Wait fixed time (e.g., 5 seconds)
3. **Exponential Backoff**: Increase delay exponentially
4. **No Retry**: Require manual reconnection

**Decision:** Exponential Backoff with Max Limit

**Rationale:**
- **Network Stability**: Avoid overwhelming network during outages
- **Server Load**: Prevent thundering herd on server restart
- **User Experience**: Reasonable retry frequency
- **Maximum Wait**: Cap at 30 seconds to avoid excessive delays

**Implementation:**
```typescript
delay = Math.min(1000 * Math.pow(1.5, retryCount), 30000)
```

**Consequences:**
- ✅ Graceful handling of network outages
- ✅ Server can recover without connection flood
- ✅ User sees progress (increasing delay)
- ❌ Complex state management (retry counter)
- ❌ User might think app is broken during long delays

**Reference:** `frontend/src/webrtc-manager.ts` lines 200-220

---

### ADR-015: ICE Candidates via SDP Only (Not Separate Messages)

**Date:** 2026-03-17  
**Status:** Accepted  
**Context:** Frontend was sending ICE candidates as separate WebSocket messages

**Options Considered:**
1. **Separate Messages**: Send each ICE candidate via WebSocket
2. **SDP Bundle**: Let aiortc bundle candidates in SDP offer/answer
3. **Hybrid**: Send initial via SDP, trickles via messages

**Decision:** SDP Bundle Only

**Rationale:**
- **Simplicity**: aiortc handles ICE automatically via SDP
- **LAN-Only**: No need for trickle ICE (network is stable)
- **Code Reduction**: Remove unused `handle_ice_candidate` method
- **Fewer Messages**: Reduces WebSocket traffic

**Consequences:**
- ✅ Simpler server code (no ICE message handler)
- ✅ Fewer WebSocket round-trips
- ✅ Works reliably for LAN deployments
- ❌ Slightly slower ICE for internet scenarios (not supported anyway)

**Reference:** `frontend/src/webrtc-manager.ts` line 151 (empty handler)

---

## Cross-Cutting Concerns

### Error Handling Philosophy

**Principle:** Fail gracefully, log verbosely, recover automatically

**Examples:**
```python
# Don't crash on cleanup errors
try:
    await connection["pc"].close()
except Exception as e:
    logger.error(f"Error closing peer connection: {e}")
    # Continue with cleanup

# Don't crash on port conflicts
for i in range(10):
    try:
        await site.start()
        break
    except OSError:
        continue  # Try next port
```

### Logging Strategy

**Levels:**
- `ERROR`: Actionable failures (connection failed, file not found)
- `WARNING`: Recoverable issues (port busy, cert expiring)
- `INFO`: State changes (server started, stream created)
- `DEBUG`: Detailed flow (message received, ICE state change)
- `TRACE`: Verbose debugging (every frame, every packet)

**Format:**
```
%(asctime)s - %(name)s - %(levelname)s - %(message)s
```

### Configuration Surfaces

**Environment Variables:**
- `PORT`: Base HTTP port (default: 8080)
- `SSL_CERT_FILE`: SSL certificate path
- `SSL_KEY_FILE`: SSL key path
- `LOG_LEVEL`: Python logging level
- `AUDIO_PORT`: MP3 streaming port (default: 8081)

**Add-on Options:**
- `log_level`: UI-friendly logging level
- `audio_port`: Configurable MP3 port

**Card Configuration:**
- `server_url`: Optional override for auto-discovery
- `auto_start`: Auto-connect on card load
- `noise_suppression`: Enable audio processing
- `echo_cancellation`: Enable echo cancellation
- `auto_gain_control`: Enable automatic gain

---

## Future Decisions Pending

### ADR-P001: TURN Server for Internet Access

**Status:** Proposed  
**Context:** Users want remote access (outside LAN)

**Options:**
1. Self-hosted coturn server
2. Cloud TURN service (Twilio, Xirsys)
3. VPN-based access (WireGuard, Tailscale)

**Recommendation:** VPN-based access (simpler, more secure)

---

### ADR-P002: Authentication via Home Assistant

**Status:** Proposed  
**Context:** Multi-user households, guest access

**Options:**
1. HA access token validation
2. HA session cookie integration
3. Separate user database

**Recommendation:** HA access token (leverages existing auth)

---

### ADR-P003: Stream Access Control

**Status:** Proposed  
**Context:** Privacy concerns (bedroom mics, etc.)

**Options:**
1. Stream-specific tokens
2. Role-based access (admin, user, guest)
3. Physical network segmentation

**Recommendation:** Stream tokens (flexible, auditable)

---

## References

- [WebRTC Specification](https://www.w3.org/TR/webrtc/)
- [aiortc Documentation](https://aiortc.readthedocs.io/)
- [Home Assistant Add-on SDK](https://developers.home-assistant.io/docs/add-ons/)
- [RFC 7160: WebRTC Audio Codec](https://tools.ietf.org/html/rfc7160)
- [PyAV Documentation](https://pyav.org/docs/)
