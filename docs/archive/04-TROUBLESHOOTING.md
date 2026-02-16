# 🔍 Troubleshooting Guide - WebRTC Voice Streaming Backend

**Document Version:** 1.0  
**Last Updated:** 2026-01-18

---

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Common Issues](#common-issues)
3. [Audio Problems](#audio-problems)
4. [Connection Issues](#connection-issues)
5. [Performance Problems](#performance-problems)
6. [Docker Issues](#docker-issues)
7. [Debugging Tools](#debugging-tools)
8. [Log Analysis](#log-analysis)

---

## Quick Diagnostics

### 30-Second Health Check

Run these commands to quickly diagnose issues:

```bash
# 1. Is the server running?
curl -s http://localhost:8080/health | jq

# 2. Are there active connections?
curl -s http://localhost:8080/metrics | jq

# 3. Are there active streams?
curl -s http://localhost:8081/stream/status | jq

# 4. Can WebSocket connect?
python test_ws.py

# 5. Check server logs (Docker)
docker logs voice-streaming --tail 50

# 6. Check server logs (local)
# Look at terminal where server is running
```

### Expected Healthy Output

```json
// /health
{
  "status": "healthy",
  "webrtc_available": true,
  "audio_server_running": true,
  "active_streams": 1,
  "connected_clients": 2,
  "uptime_seconds": 3600
}

// /metrics
{
  "uptime_seconds": 3600,
  "active_connections": 2,
  "active_streams": 1,
  "total_audio_bytes": 1048576,
  "webrtc_available": true
}
```

---

## Common Issues

### Issue 1: "No Audio Stream Available"

**Symptom:**
Receiver gets error message: `{"type": "error", "message": "No audio stream available"}`

**Causes:**

1. No sender is currently streaming
2. Sender disconnected before receiver connected
3. Stream ended before receiver subscribed

**Diagnosis:**

```bash
# Check if any streams exist
curl http://localhost:8081/stream/status

# Expected if no streams:
# {"active_streams": []}

# Check metrics
curl http://localhost:8080/metrics | jq '.active_streams'
```

**Solution:**

1. Start a sender first
2. Wait for sender to establish connection
3. Then connect receiver
4. Implement auto-retry in receiver client:
   ```javascript
   ws.onmessage = (event) => {
     const msg = JSON.parse(event.data);
     if (msg.type === "error" && msg.message.includes("No audio stream")) {
       // Retry after 2 seconds
       setTimeout(() => {
         ws.send(JSON.stringify({ type: "start_receiving" }));
       }, 2000);
     }
   };
   ```

---

### Issue 2: "Sender First" Bug (Audio Not Received)

**Symptom:**

- Sender connects and streams audio
- Receiver connects AFTER sender
- Receiver gets no audio (silent)

**Historical Context:**
This was a critical bug fixed in `webrtc_server_relay.py`. The issue was that `setup_receiver()` didn't properly subscribe to existing tracks.

**Verification (Should be fixed):**

```bash
# 1. Start server
python webrtc_server_relay.py

# 2. Connect sender (use WebRTC client)
# 3. Verify stream exists
curl http://localhost:8081/stream/status
# Should show: {"active_streams": ["stream_..."]}

# 4. Connect receiver
# 5. Audio should play immediately
```

**If Still Broken:**
Check `webrtc_server_relay.py` lines 254-300:

```python
# This MUST be present:
relayed_track = self.relay.subscribe(source_track)
pc.addTrack(relayed_track)
```

**Fix Applied:** Commit on 2026-01-18 (see GEMINI.md memory)

---

### Issue 3: WebSocket Connection Refused

**Symptom:**

```
Error: WebSocket connection refused
ConnectionRefusedError: [Errno 111] Connection refused
```

**Diagnosis:**

```bash
# Is server running?
ps aux | grep webrtc_server_relay

# Is port 8080 open?
netstat -tulpn | grep 8080

# Can we reach the server?
telnet localhost 8080

# Check firewall
sudo ufw status | grep 8080
```

**Solutions:**

**A. Server Not Running**

```bash
# Start server
python webrtc_server_relay.py
# OR
docker start voice-streaming
```

**B. Firewall Blocking**

```bash
# Ubuntu/Debian
sudo ufw allow 8080/tcp
sudo ufw allow 8081/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --permanent --add-port=8081/tcp
sudo firewall-cmd --reload
```

**C. Wrong Host/Port**

```bash
# Check server configuration
cat config.json | jq '.server'

# Should show:
# {
#   "port": 8080,
#   "host": "0.0.0.0",
#   ...
# }
```

**D. Docker Port Mapping**

```bash
# Check Docker port mapping
docker port voice-streaming

# Should show:
# 8080/tcp -> 0.0.0.0:8080
# 8081/tcp -> 0.0.0.0:8081

# If not, recreate container with correct ports:
docker rm -f voice-streaming
docker run -d -p 8080:8080 -p 8081:8081 --name voice-streaming webrtc-voice-backend
```

---

### Issue 4: ICE Connection Failed

**Symptom:**

```
INFO:__main__:ICE connection state for sender abc123: failed
```

**Causes:**

1. Network connectivity issue
2. Firewall blocking UDP ports
3. Client and server on different networks (not LAN)
4. NAT/router configuration

**Diagnosis:**

```bash
# 1. Verify client and server are on same LAN
# Client IP: 192.168.1.100
# Server IP: 192.168.1.50
# Same subnet? ✓

# 2. Check if UDP is blocked
# WebRTC uses UDP for media transport

# 3. Test with tcpdump
sudo tcpdump -i any udp port 0-65535 | grep <client_ip>
```

**Solutions:**

**A. Ensure LAN-Only Operation**

```javascript
// Client must use empty iceServers
const pc = new RTCPeerConnection({
  iceServers: [], // ← MUST be empty for LAN-only
});
```

**B. Check Server Configuration**

```json
// config.json
{
  "webrtc": {
    "ice_servers": [],  // ← MUST be empty
    ...
  }
}
```

**C. Firewall Rules (Allow UDP)**

```bash
# Ubuntu/Debian
sudo ufw allow from 192.168.1.0/24

# CentOS/RHEL
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="192.168.1.0/24" accept'
sudo firewall-cmd --reload
```

**D. Verify Network Connectivity**

```bash
# From client machine, ping server
ping 192.168.1.50

# From server machine, ping client
ping 192.168.1.100
```

---

### Issue 5: Server Crashes on Startup

**Symptom:**

```
ModuleNotFoundError: No module named 'aiortc'
```

OR

```
FileNotFoundError: [Errno 2] No such file or directory: 'ffmpeg'
```

**Solutions:**

**A. Missing Python Dependencies**

```bash
# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Verify installation
python -c "import aiortc; print('OK')"
```

**B. Missing System Dependencies**

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y gcc musl-dev libffi-dev libssl-dev ffmpeg python3.11-dev

# Rebuild Python packages
pip install --force-reinstall aiortc
```

**C. Docker Build Issues**

```bash
# Rebuild Docker image from scratch
docker build --no-cache -t webrtc-voice-backend .

# Check build logs for errors
docker build -t webrtc-voice-backend . 2>&1 | tee build.log
```

---

## Audio Problems

### Issue 6: No Audio Received (Receiver Side)

**Symptom:**

- WebRTC connection established (ICE state: connected)
- No audio plays in browser/client

**Diagnosis Checklist:**

```bash
# 1. Is stream active?
curl http://localhost:8081/stream/status
# Should show active streams

# 2. Is sender actually sending audio?
# Check server logs for "Received audio track from sender"

# 3. Is MediaRelay subscribing?
# Check logs for "relay.subscribe" calls

# 4. Browser console errors?
# Open DevTools → Console → Check for errors
```

**Solutions:**

**A. Browser Audio Permissions**

```javascript
// Receiver must have audio playback enabled
const audio = new Audio();
audio.srcObject = event.streams[0];
audio.play().catch((err) => {
  console.error("Audio playback failed:", err);
  // User interaction may be required
});
```

**B. Check Audio Element**

```javascript
// Verify audio element is receiving data
pc.ontrack = (event) => {
  const audio = new Audio();
  audio.srcObject = event.streams[0];

  // Debug: Check if stream has audio tracks
  console.log("Stream tracks:", event.streams[0].getTracks());

  audio.play();
};
```

**C. Verify MediaRelay Subscription**
Check server logs for:

```
INFO:__main__:Starting visualization task for stream_...
```

If missing, MediaRelay is not subscribing. Check code at line 198-199 in `webrtc_server_relay.py`.

---

### Issue 7: Audio Choppy/Stuttering

**Symptom:**
Audio plays but is choppy, stuttering, or has gaps

**Causes:**

1. Network congestion
2. CPU overload
3. Insufficient bandwidth
4. Buffer underruns

**Diagnosis:**

```bash
# 1. Check CPU usage
top -p $(pgrep -f webrtc_server_relay)

# 2. Check network bandwidth
iftop -i eth0

# 3. Check server metrics
curl http://localhost:8080/metrics

# 4. Check for errors in logs
docker logs voice-streaming | grep -i error
```

**Solutions:**

**A. Reduce Audio Quality**

```json
// config.json
{
  "webrtc": {
    "audio_constraints": {
      "sample_rate": 8000,  // Lower from 16000
      "channels": 1,
      ...
    }
  }
}
```

**B. Increase Server Resources**

```bash
# Docker: Increase CPU/memory limits
docker run -d \
  --cpus="2.0" \
  --memory="2g" \
  -p 8080:8080 -p 8081:8081 \
  --name voice-streaming \
  webrtc-voice-backend
```

**C. Reduce Concurrent Receivers**

```json
// config.json
{
  "server": {
    "max_connections": 10 // Lower from 50
  }
}
```

---

### Issue 8: Audio Latency Too High

**Symptom:**
Noticeable delay between sender speaking and receiver hearing

**Expected Latency:** 66-135ms (see Architecture doc)

**Diagnosis:**

```bash
# Use performance test
python performance_test.py

# Measure end-to-end latency with audio loopback test
# (requires physical setup: speaker → microphone)
```

**Solutions:**

**A. Optimize Audio Constraints**

```json
{
  "audio_constraints": {
    "sample_rate": 16000,  // Don't go higher
    "latency": 0,          // Minimum latency
    ...
  }
}
```

**B. Reduce Network Hops**

- Ensure client and server are on same switch
- Avoid WiFi if possible (use Ethernet)
- Check for QoS settings on router

**C. Disable Visualization Task**
If you don't need visualization, comment out lines 198-199 in `webrtc_server_relay.py`:

```python
# viz_track = self.relay.subscribe(track)
# asyncio.create_task(self.process_visualization(stream_id, viz_track))
```

---

## Connection Issues

### Issue 9: WebSocket Disconnects Randomly

**Symptom:**
WebSocket connection drops after a few minutes

**Diagnosis:**

```bash
# Check server logs for disconnect reason
docker logs voice-streaming | grep -i disconnect

# Check for timeout settings
cat config.json | jq '.webrtc.connection_timeout'
```

**Solutions:**

**A. Implement Ping/Pong**

```javascript
// Client-side keepalive
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "ping" }));
  }
}, 30000); // Every 30 seconds
```

**B. Increase Timeout**

```json
// config.json
{
  "webrtc": {
    "connection_timeout": 60 // Increase from 30
  }
}
```

**C. Check Proxy/Load Balancer**
If using nginx or similar:

```nginx
# nginx.conf
location /ws {
    proxy_pass http://backend:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 3600s;  # 1 hour
    proxy_send_timeout 3600s;
}
```

---

### Issue 10: Multiple Receivers, Only First Gets Audio

**Symptom:**

- First receiver connects and gets audio ✓
- Second receiver connects but gets no audio ✗

**Diagnosis:**

```bash
# Check active streams
curl http://localhost:8080/metrics | jq '.active_streams'
# Should be 1

# Check active connections
curl http://localhost:8080/metrics | jq '.active_connections'
# Should be 3 (1 sender + 2 receivers)

# Check server logs
docker logs voice-streaming | grep "relay.subscribe"
# Should see TWO subscribe calls
```

**Solution:**
This should work correctly with MediaRelay. If not:

1. Verify `setup_receiver()` is called for both receivers
2. Check that `relay.subscribe()` is called for each receiver
3. Verify each receiver gets a unique `relayed_track`

**Code Check (webrtc_server_relay.py:266):**

```python
# This MUST be called for EACH receiver
relayed_track = self.relay.subscribe(source_track)
pc.addTrack(relayed_track)
```

---

## Performance Problems

### Issue 11: High Memory Usage

**Symptom:**
Server memory usage grows over time

**Diagnosis:**

```bash
# Check memory usage
docker stats voice-streaming

# Check for memory leaks
# Run for 1 hour, check if memory keeps growing

# Check active streams and connections
curl http://localhost:8080/metrics
```

**Causes:**

1. Streams not being cleaned up
2. Connections not being closed
3. MediaRelay subscriptions not released

**Solutions:**

**A. Verify Cleanup Task is Running**

```bash
# Check logs for cleanup messages
docker logs voice-streaming | grep "Cleaning up stale stream"
```

**B. Manually Trigger Cleanup**
Restart server periodically:

```bash
# Cron job to restart daily
0 3 * * * docker restart voice-streaming
```

**C. Check for Leaked Connections**

```python
# Add to webrtc_server_relay.py for debugging
async def log_stats(self):
    while True:
        await asyncio.sleep(60)
        logger.info(f"Connections: {len(self.connections)}, Streams: {len(self.active_streams)}")
```

---

### Issue 12: High CPU Usage

**Symptom:**
Server CPU usage is consistently high (>80%)

**Diagnosis:**

```bash
# Check CPU usage
top -p $(pgrep -f webrtc_server_relay)

# Check number of active streams
curl http://localhost:8080/metrics | jq '.active_streams'

# Profile Python code
python -m cProfile webrtc_server_relay.py
```

**Solutions:**

**A. Limit Concurrent Streams**

```json
// config.json
{
  "server": {
    "max_connections": 20 // Reduce from 50
  }
}
```

**B. Optimize Visualization Task**

```python
# webrtc_server_relay.py:434
# Increase downsample rate
if frame_count % 10 == 0:  # Changed from 5
    pass  # Process visualization
```

**C. Disable Visualization**
Comment out visualization task if not needed.

---

## Docker Issues

### Issue 13: Container Exits Immediately

**Symptom:**

```bash
docker ps
# voice-streaming not listed

docker ps -a
# voice-streaming shows "Exited (1) 2 seconds ago"
```

**Diagnosis:**

```bash
# Check container logs
docker logs voice-streaming

# Common errors:
# - ModuleNotFoundError
# - Port already in use
# - Configuration error
```

**Solutions:**

**A. Check Logs**

```bash
docker logs voice-streaming 2>&1 | tail -50
```

**B. Run Interactively**

```bash
docker run -it --rm \
  -p 8080:8080 -p 8081:8081 \
  webrtc-voice-backend \
  /bin/bash

# Inside container:
python webrtc_server_relay.py
# See error directly
```

**C. Rebuild Image**

```bash
docker build --no-cache -t webrtc-voice-backend .
```

---

### Issue 14: Health Check Failing

**Symptom:**

```bash
docker ps
# voice-streaming shows "unhealthy"
```

**Diagnosis:**

```bash
# Check health check logs
docker inspect voice-streaming | jq '.[0].State.Health'

# Manual health check
docker exec voice-streaming curl http://localhost:8080/health
```

**Solutions:**

**A. Increase Health Check Timeout**

```dockerfile
# Dockerfile
HEALTHCHECK --interval=30s --timeout=30s --start-period=120s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')" || exit 1
```

**B. Disable Health Check (Temporary)**

```bash
docker run -d \
  --no-healthcheck \
  -p 8080:8080 -p 8081:8081 \
  --name voice-streaming \
  webrtc-voice-backend
```

---

## Debugging Tools

### Enable Debug Logging

**Python (Local):**

```python
# webrtc_server_relay.py
logging.basicConfig(level=logging.DEBUG)  # Change from INFO
```

**Docker:**

```bash
# Run with debug logging
docker run -d \
  -e PYTHONUNBUFFERED=1 \
  -p 8080:8080 -p 8081:8081 \
  --name voice-streaming \
  webrtc-voice-backend

# View logs in real-time
docker logs -f voice-streaming
```

### Network Debugging

**tcpdump (Capture WebRTC Traffic):**

```bash
# Capture UDP traffic (WebRTC media)
sudo tcpdump -i any udp -w webrtc.pcap

# Analyze with Wireshark
wireshark webrtc.pcap
```

**WebSocket Debugging:**

```bash
# Use websocat
websocat ws://localhost:8080/ws

# Type messages manually:
{"type": "get_available_streams"}
```

### Python Debugging

**pdb (Interactive Debugger):**

```python
# Add to webrtc_server_relay.py
import pdb; pdb.set_trace()

# Run server, will drop into debugger
python webrtc_server_relay.py
```

**Logging Enhancements:**

```python
# Add detailed logging
logger.debug(f"Connection state: {self.connections}")
logger.debug(f"Stream state: {self.active_streams}")
```

---

## Log Analysis

### Common Log Patterns

**Successful Sender Connection:**

```
INFO:__main__:Setting up sender for connection abc-123
INFO:__main__:Received audio track from sender abc-123
INFO:__main__:Stored stream stream_abc-123 for sender abc-123
INFO:__main__:Starting visualization task for stream_abc-123
```

**Successful Receiver Connection:**

```
INFO:__main__:Sent offer to receiver def-456 for stream stream_abc-123
INFO:__main__:ICE connection state for receiver def-456: connected
```

**Connection Cleanup:**

```
INFO:__main__:Cleaning up connection abc-123
INFO:__main__:Audio track ended for abc-123
```

### Error Log Patterns

**No Stream Available:**

```
WARNING:__main__:No audio stream available for receiver def-456
```

**Action:** Start a sender first

**Track Ended:**

```
WARNING:__main__:Stream stream_abc-123 track is ended, cannot receive
```

**Action:** Sender disconnected, connect to new stream

**ICE Failed:**

```
INFO:__main__:ICE connection state for sender abc-123: failed
```

**Action:** Check network connectivity, firewall

---

## Getting Help

### Information to Collect

When reporting issues, include:

1. **Server logs:**

   ```bash
   docker logs voice-streaming > server.log
   ```

2. **Health check output:**

   ```bash
   curl http://localhost:8080/health > health.json
   curl http://localhost:8080/metrics > metrics.json
   ```

3. **Configuration:**

   ```bash
   cat config.json
   ```

4. **Environment:**

   ```bash
   docker version
   python --version
   uname -a
   ```

5. **Network info:**
   ```bash
   ip addr
   netstat -tulpn | grep 808
   ```

### Escalation Path

1. Check this troubleshooting guide
2. Check `04-DEVELOPMENT-GUIDE.md` for code insights
3. Review server logs for error patterns
4. Search GitHub issues (if applicable)
5. Create detailed bug report with collected information

---

## Next Steps

- **For development:** See `05-DEVELOPMENT-GUIDE.md`
- **For deployment:** See `06-DEPLOYMENT.md`
- **For API details:** See `03-API-REFERENCE.md`

---

**Troubleshooting Complete!** Most issues can be resolved with these guides.
