# Gotchas & Known Issues

## Critical

### 1. stream_info Comparison Bug

**Location**: `webrtc_server_relay.py:78`

```python
if not hasattr(stream_info, "last_activity"):
```

**Problem**: `stream_info` is a dict, not an object. `hasattr()` on a dict always returns `True` for any key because dicts have a `last_activity` method.

**Impact**: Stale stream cleanup never triggers properly.

**Workaround**: Fix by checking:
```python
if "last_activity" not in stream_info:
```

---

## Warnings

### 2. Frontend Auto-Registration Requires Supervisor

**Location**: `register_frontend.py:13`

```python
SUPERVISOR_TOKEN = os.environ.get("SUPERVISOR_TOKEN")
```

**Problem**: The script only works inside Home Assistant with Supervisor access. Running standalone or in Docker without supervisor will silently fail.

**Impact**: Users must manually add Lovelace resources.

**Workaround**: Manual resource addition via HA UI:
```
/local/voice_streaming_backend/dist/voice-streaming-card-dashboard.js
```

---

### 3. MP3 Stream Cleanup May Leak

**Location**: `audio_stream_server.py:218-220`

```python
# track.stop() # aiortc tracks don't have stop()...
# MediaRelay tracks handle cleanup when they are no longer iterated?
pass
```

**Problem**: Track subscriptions may not be properly cleaned up when clients disconnect.

**Impact**: Minor memory leak over time with many connect/disconnect cycles.

---

### 4. Hardcoded Port in CA Download Server

**Location**: `run.sh:23`

```bash
local CA_PORT=8080
```

**Problem**: If port 8080 is taken, the CA download server silently fails.

**Impact**: Self-signed SSL mode may not work if port conflicts.

---

### 5. ICE Gathering Delay

**Location**: `webrtc_server_relay.py:291`

```python
await asyncio.sleep(1.0)  # Wait slightly longer for ICE gathering
```

**Problem**: Arbitrary 1-second sleep for ICE gathering. May be insufficient on slow networks.

**Impact**: Race condition could cause WebRTC setup to fail intermittently.

---

## Informational

### 6. Host Network Required

The add-on requires `host_network: true` in `config.yaml`. This is mandatory for WebRTC P2P media.

**Note**: Cannot run alongside other services on ports 8443, 8555, 8080, 8081.

---

### 7. Browser WebRTC Limitations

- **Chrome**: Requires HTTPS (or localhost)
- **Safari**: Requires user gesture to start audio capture
- **Firefox**: Generally works but may need config tweaks

---

### 8. Audio Format Assumptions

The system assumes:
- 44.1kHz sample rate
- Stereo output
- Opus codec for WebRTC, MP3 128kbps for fallback

**Impact**: Incompatible audio devices may sound wrong.

---

### 9. No Authentication

**Problem**: No authentication on WebSocket or MP3 endpoints.

**Impact**: Anyone on the network can potentially stream audio if they discover the ports.

**Workaround**: Run behind Home Assistant Ingress which provides authentication.

---

### 10. No Encryption in Ingress Mode

**Location**: `run.sh:121-130`

When running in Ingress mode, the add-on serves plain HTTP on port 8099.

**Rationale**: Expected behavior — Ingress handles SSL termination.

---

## Testing Notes

### How to Test Locally

```bash
# Terminal 1: Start server
python3 webrtc_server_relay.py

# Terminal 2: Check health
curl http://localhost:8443/health

# Terminal 3: List streams
curl http://localhost:8081/stream/status
```

### Debug WebRTC

Set environment before running:
```bash
export LOG_LEVEL=debug
python3 webrtc_server_relay.py
```

### Known Test Flaky Points

- WebRTC connection timing (race with ICE gathering)
- Port conflicts on common ports
- Browser permission prompts
