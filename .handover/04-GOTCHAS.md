# Gotchas & Known Issues - WebRTC Voice Streaming

**Purpose:** Document hidden behaviors, workarounds, and "where the bodies are buried"  
**Target Audience:** Developers troubleshooting issues, new maintainers

---

## ⚠️ Critical Gotchas

### 1. License Validation Blocks Startup

**Problem:** The add-on will **NOT start** without valid license credentials.

**Location:** `run.sh` lines 23-35

```bash
python3 /app/license_client.py activate \
    --server "$LICENSE_SERVER_URL" \
    --email "$LICENSE_EMAIL" \
    --purchase-code "$PURCHASE_CODE"

if [ $? -ne 0 ]; then
    echo "[ERROR] License activation/validation failed."
    exit 1  # <-- Exit code 1 prevents add-on from starting
fi
```

**Impact:**
- Cannot test locally without license server access
- Network outage at startup = add-on won't start

**Workarounds:**
1. **Development:** Comment out license check in `run.sh` (temporary only)
2. **Offline:** Cached token provides 24-hour grace period after successful activation
3. **Testing:** Mock license server for local development

**Fix:** Ensure license credentials are configured before first start.

---

### 2. Host Networking Required

**Problem:** Add-on uses `host_network: true` - cannot use bridge mode.

**Location:** `config.yaml`

```yaml
host_network: true
# ports:
#   8443/tcp: 8443   # Commented out - not used in host mode
#   8555/udp: 8555
#   8080/tcp: 8080
```

**Impact:**
- Add-on can see all host network traffic (security consideration)
- Port conflicts possible with other host services
- Firewall rules must allow ports directly on host

**Symptoms of Wrong Configuration:**
- WebRTC connections fail (ICE connection timeout)
- Clients can't connect to signaling server
- "No route to host" errors

**Fix:** Keep `host_network: true`. Do not enable port mapping.

---

### 3. CA Certificate Installation Required for Direct Access

**Problem:** Self-signed SSL certificates trigger browser warnings.

**Location:** `ssl-setup.sh` generates CA at `/data/ssl/ca.crt`

**Impact:**
- Browsers show "Your connection is not private"
- WebRTC microphone access denied (requires secure context)
- iOS/Android require manual CA installation

**Symptoms:**
- Browser console: `navigator.mediaDevices.getUserMedia is undefined`
- Error: "Permission denied for microphone access"

**Fix:**
1. Visit `https://<ip>:8443` (click through warning)
2. Download CA certificate from setup page
3. Install CA on each client device (see [Setup Guide](01-SETUP-GUIDE.md#step-6-ssl-certificate-setup))

**Alternative:** Use Home Assistant Ingress mode (no CA needed).

---

### 4. Lovelace YAML Mode Blocks Auto-Registration

**Problem:** Frontend resource auto-registration only works in UI mode.

**Location:** `register_frontend.py`

```python
is_yaml = await check_yaml_mode(session, headers)
if is_yaml:
    logger.warning("Lovelace is in YAML mode. Resources must be added manually.")
    return  # <-- Exits without registering
```

**Impact:**
- Dashboard cards don't appear automatically
- Users must manually edit `configuration.yaml`

**Symptoms:**
- Logs show: "Lovelace is in YAML mode. Resources must be added manually."
- Dashboard editor doesn't show custom cards

**Fix:** Manually add to `configuration.yaml`:

```yaml
lovelace:
  resources:
    - url: /local/voice_streaming_backend/dist/voice-streaming-card-dashboard.js
      type: module
```

Then restart Home Assistant.

---

### 5. Smart Port Hunting Can Break Frontend Discovery

**Problem:** If port 8443 is busy, server finds alternative port but frontend may not discover it.

**Location:** `webrtc_server_relay.py` lines 540-560

**Symptoms:**
- Server logs: "Port 8443 is busy, trying 8444..."
- Frontend can't connect
- `server_state.json` shows different port than expected

**Fix:**
1. Check `/config/www/voice_streaming_backend/server_state.json`
2. Note the `active_port` value
3. Access server at `https://<ip>:<active_port>`
4. Update frontend configuration to use correct port

**Prevention:** Ensure no other service uses ports 8443-8453.

---

## ⚠️ Common Issues

### 6. "No Audio Stream Available" on Receiver

**Problem:** Receiver card shows this error even when sender is connected.

**Root Causes:**

1. **Track Already Ended:**
   ```python
   if source_track.readyState == "ended":
       logger.warning(f"Stream {stream_id} track is ended")
       del self.active_streams[stream_id]  # Stream removed
   ```

2. **Sender Disconnected:** Sender's WebSocket closed, stream cleaned up.

3. **Race Condition:** Receiver requested stream before sender finished setup.

**Symptoms:**
- Sender shows "connected" but receiver gets error
- Logs show: "No audio stream available for receiver"

**Fix:**
1. Refresh receiver page (re-request stream)
2. Ensure sender is actively transmitting
3. Check sender browser console for WebRTC errors

---

### 7. MP3 Stream Shows "Waiting for Audio Stream..." Indefinitely

**Problem:** `http://<ip>:8081/stream/latest.mp3` shows waiting page forever.

**Root Causes:**

1. **No Active Streams:** `active_streams` dict is empty
2. **Polling Timeout:** JavaScript polling has exponential backoff (max 10 seconds)
3. **Track Subscription Failed:** MediaRelay subscription threw exception

**Location:** `audio_stream_server.py` lines 30-70 (waiting page logic)

**Debugging:**
```bash
# Check active streams
curl -k https://<ip>:8443/health | python3 -m json.tool

# Check stream status
curl http://<ip>:8081/stream/status
```

**Fix:**
1. Ensure sender is connected and transmitting
2. Check server logs for "Received audio track" message
3. Verify `active_streams` dict is not empty

---

### 8. WebSocket Disconnects After Few Minutes

**Problem:** Clients randomly disconnect after 5-10 minutes.

**Root Causes:**

1. **Stale Stream Cleanup:** Server cleans up streams every 5 minutes
   ```python
   async def cleanup_stale_streams(self):
       while True:
           await asyncio.sleep(300)  # 5 minutes
           # Remove streams with no receivers or ended tracks
   ```

2. **ICE Connection Timeout:** LAN-only ICE may timeout without keepalive

3. **Browser Background Tab:** Chrome throttles background tabs, WebSocket times out

**Symptoms:**
- Disconnect happens at regular intervals (5 minutes)
- Logs show: "Cleaning up stale stream: stream_xxx"

**Fix:**
1. Reconnect when disconnected (frontend should auto-retry)
2. Keep browser tab active (don't background it)
3. Implement WebSocket ping/pong in frontend

---

### 9. Hardware Fingerprint Changes Break License

**Problem:** License validation fails after hardware changes.

**Location:** `hw_fingerprint.py`

**Fingerprint Components:**
- `/etc/machine-id` (Linux machine ID)
- MAC address
- CPU serial (Raspberry Pi only)
- Disk UUID
- Hostname

**Impact:**
- Changing network interface = new MAC = different fingerprint
- Reinstalling Home Assistant = new machine-id
- Cloning SD card = same fingerprint (collision)

**Symptoms:**
- Logs: "Hardware ID mismatch"
- License validation fails after hardware change

**Fix:**
1. Re-activate license with new hardware ID
2. Contact support to reset hardware binding
3. Use cached token (24-hour grace period) while resolving

---

### 10. FFmpeg/PyAV Build Failures

**Problem:** Docker build fails with FFmpeg or PyAV compilation errors.

**Location:** `Dockerfile` lines 13-28

**Common Errors:**
```
error: ffmpeg/avcodec.h: No such file or directory
error: failed to run custom build command for `libav-sys`
```

**Root Causes:**
1. Missing build dependencies (`ffmpeg-dev`, `libavcodec-dev`)
2. Architecture mismatch (ARM vs AMD64)
3. Version incompatibility (PyAV version vs FFmpeg version)

**Fix:**
1. Ensure all build dependencies are installed:
   ```dockerfile
   apk add --no-cache --virtual .build-deps \
       build-base python3-dev libffi-dev openssl-dev \
       ffmpeg-dev pkgconfig rust cargo musl-dev
   ```
2. Use multi-stage build (already implemented)
3. Pin PyAV version in `requirements.txt`

---

## ⚠️ Subtle Behaviors

### 11. ICE Connection State Changes Are Logged But Not Handled

**Problem:** ICE failures are logged but don't trigger reconnection.

**Location:** `webrtc_server_relay.py`

```python
@pc.on("iceconnectionstatechange")
async def on_iceconnectionstatechange():
    logger.info(f"ICE connection state: {pc.iceConnectionState}")
    if pc.iceConnectionState == "failed":
        await pc.close()  # Just closes, no retry
```

**Impact:**
- Failed connections stay dead
- No automatic reconnection logic

**Workaround:** Client must reconnect manually.

---

### 12. Empty `iceServers` Array Prevents External Connections

**Problem:** WebRTC is configured for LAN-only.

**Location:** `webrtc_server_relay.py`

```python
config = RTCConfiguration(iceServers=[])  # No STUN/TURN
```

**Impact:**
- Clients outside LAN can't connect
- No NAT traversal
- Mobile data won't work (WiFi only)

**By Design:** This is intentional for privacy and simplicity.

**Fix (If Needed):** Add STUN server:
```python
config = RTCConfiguration(iceServers=[
    {"urls": "stun:stun.l.google.com:19302"}
])
```

---

### 13. Visualization Task Runs Forever for Active Streams

**Problem:** `process_visualization` task never stops until stream ends.

**Location:** `webrtc_server_relay.py`

```python
async def process_visualization(self, stream_id: str, track):
    while stream_id in self.active_streams:  # Infinite loop
        frame = await asyncio.wait_for(track.recv(), timeout=2.0)
        # Process frame...
```

**Impact:**
- CPU usage even with no receivers
- Memory for frame buffers

**Mitigation:** Stale stream cleanup removes inactive streams after 10 minutes.

---

### 14. Certificate Validity Check Uses 7-Day Threshold

**Problem:** Certificates expiring within 7 days are rejected.

**Location:** `ssl-setup.sh`

```bash
check_cert_valid() {
    local cert="$1"
    local days="${2:-7}"  # Must be valid for at least 7 days
    [ -f "$cert" ] && openssl x509 -checkend $((days * 86400)) -noout -in "$cert"
}
```

**Impact:**
- Certificates valid for 6 more days are rejected
- Triggers regeneration unnecessarily

**Fix:** Adjust threshold if needed:
```bash
check_cert_valid "$cert" 30  # Require 30 days instead
```

---

### 15. License Client Uses UTC for Grace Period

**Problem:** Grace period calculation uses `datetime.utcnow()` (deprecated).

**Location:** `license_client.py`

```python
def _is_within_grace_period(self) -> bool:
    last = datetime.fromisoformat(state["last_success"])
    return datetime.utcnow() - last < timedelta(hours=GRACE_PERIOD_HOURS)
```

**Impact:**
- Deprecation warnings in logs
- Potential timezone issues on some systems

**Fix:** Update to `datetime.now(timezone.utc)` (future maintenance).

---

## 🔍 Debugging Tips

### Enable Trace Logging

```yaml
# Add-on configuration
log_level: trace
```

### Check Active Connections

```bash
curl -k https://<ip>:8443/health | python3 -m json.tool
```

### Monitor WebSocket Messages

Browser DevTools → Network → WS → Messages tab

### Test MP3 Stream

```bash
# Should return HTTP 200 with audio/mpeg content-type
curl -I http://<ip>:8081/stream/latest.mp3
```

### Check Server State

```bash
cat /config/www/voice_streaming_backend/server_state.json
```

### View License Status

```bash
curl -k https://<ip>:8443/metrics | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('license', 'N/A'))"
```

---

## 📝 Technical Debt

### Known Issues Not Yet Fixed

1. **No Unit Tests:** Core logic (WebRTC signaling, MediaRelay) has no automated tests
2. **Tight Coupling:** `VoiceStreamingServer` knows about `AudioStreamServer` internals
3. **Global State:** Module-level `logger` instances make testing harder
4. **No Rate Limiting:** WebSocket messages are not rate-limited (DoS vulnerability)
5. **Hardcoded Paths:** `/config/www/`, `/ssl/`, `/data/` are hardcoded throughout

### Future Refactoring Candidates

1. Extract license validation to separate service
2. Add dependency injection for testability
3. Implement WebSocket message schema validation
4. Add structured logging (JSON format)
5. Create abstract base class for stream providers

---

**Next:** [Onboarding Checklist](ONBOARDING-CHECKLIST.md)  
**Previous:** [Decision Log](03-DECISION-LOG.md)
