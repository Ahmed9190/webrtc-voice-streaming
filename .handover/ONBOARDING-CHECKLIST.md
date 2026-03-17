# Onboarding Checklist - WebRTC Voice Streaming

**Purpose:** Structured learning path for new developers  
**Target Audience:** New team members, contributors, maintainers  
**Estimated Completion:** 3-5 days (depending on familiarity)

---

## Day 1: Environment Setup & First Run

### ☐ 1.1 Development Environment Setup

**Goal:** Get local development environment running

**Steps:**
1. Clone repository
   ```bash
   git clone <repository-url>
   cd webrtc_backend
   ```

2. Verify prerequisites
   ```bash
   python3 --version    # Must be 3.11+
   docker --version     # Must be 20.10+
   node --version       # Must be 20+
   ```

3. Build frontend (if modified)
   ```bash
   cd frontend && npm install && npm run build
   cd ..
   ```

4. Build Docker image
   ```bash
   docker-compose build
   ```

**Verification:**
- [ ] Docker image builds without errors
- [ ] Frontend builds successfully

**Troubleshooting:** See [Gotchas #10](04-GOTCHAS.md#10-ffmpegpyav-build-failures)

---

### ☐ 1.2 Run Locally

**Goal:** Start the add-on and verify health endpoints

**Steps:**
1. Configure environment
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. Start services
   ```bash
   docker-compose up -d
   ```

3. View logs
   ```bash
   docker-compose logs -f
   ```

4. Test health endpoint
   ```bash
   curl -k https://localhost:8443/health
   ```

**Verification:**
- [ ] Server starts without errors
- [ ] Health endpoint returns `{"status": "healthy"}`
- [ ] License validation passes (or mocked for development)

**Troubleshooting:** See [Gotchas #1](04-GOTCHAS.md#1-license-validation-blocks-startup)

---

### ☐ 1.3 Read Core Documentation

**Goal:** Understand architecture and design decisions

**Reading List:**
- [ ] [README](00-README-FIRST.md) - 15 minutes
- [ ] [Architecture](02-ARCHITECTURE.md) - 45 minutes
- [ ] [Decision Log](03-DECISION-LOG.md) - 30 minutes

**Key Concepts to Understand:**
- WebRTC signaling flow (offer/answer)
- MediaRelay pub/sub pattern
- SSL certificate cascade
- Host networking rationale

**Verification:**
- [ ] Can explain WebRTC signaling flow in your own words
- [ ] Understand why host networking is required
- [ ] Know what MediaRelay does and why it's used

---

## Day 2: Code Deep Dive

### ☐ 2.1 Trace Request Flow

**Goal:** Follow a WebSocket message from client to WebRTC connection

**Exercise:**
1. Start server with debug logging
   ```bash
   # Set log_level: debug in config
   docker-compose up -d
   ```

2. Open browser console and connect to WebSocket
   ```javascript
   const ws = new WebSocket('wss://localhost:8443/ws');
   ws.onmessage = (e) => console.log('Received:', e.data);
   ```

3. Send `start_sending` message
   ```javascript
   ws.send(JSON.stringify({type: "start_sending"}));
   ```

4. Trace through code:
   - `webrtc_server_relay.py` → `websocket_handler()`
   - → `handle_message()` → `setup_sender()`
   - → `on_track()` callback

**Verification:**
- [ ] Can trace message flow through code
- [ ] Understand when `active_streams` is populated
- [ ] Know how WebRTC offer/answer is exchanged

---

### ☐ 2.2 MediaRelay Experimentation

**Goal:** Understand how MediaRelay enables pub/sub streaming

**Exercise:**
1. Add logging to MediaRelay subscription
   ```python
   # In webrtc_server_relay.py, setup_receiver()
   relayed_track = self.relay.subscribe(source_track)
   logger.info(f"Subscribed receiver {connection_id} to stream {stream_id}")
   ```

2. Connect one sender
3. Connect multiple receivers
4. Observe logs showing multiple subscriptions to same source

**Questions to Answer:**
- How many `relayed_track` instances are created for 5 receivers?
- What happens when a receiver disconnects?
- Why doesn't the sender need to know about receivers?

**Verification:**
- [ ] Can explain MediaRelay subscription model
- [ ] Understand difference between source track and consumer track
- [ ] Know how to debug MediaRelay issues

---

### ☐ 2.3 Audio Stream Server Analysis

**Goal:** Understand MP3 encoding pipeline

**Exercise:**
1. Read `audio_stream_server.py` completely
2. Trace encoding flow:
   - Frame reception (`track.recv()`)
   - Resampling (`AudioResampler`)
   - MP3 encoding (`av.CodecContext`)
   - HTTP chunked response

3. Test MP3 endpoint
   ```bash
   # Start a sender first, then:
   curl http://localhost:8081/stream/latest.mp3 > test.mp3
   ```

**Verification:**
- [ ] Can explain PyAV encoding pipeline
- [ ] Understand why resampling is needed
- [ ] Know how HTTP chunked streaming works

---

## Day 3: Advanced Topics

### ☐ 3.1 SSL Certificate Cascade

**Goal:** Understand autonomous SSL setup

**Exercise:**
1. Read `ssl-setup.sh` completely
2. Test each cascade level:
   - **HA Mode:** Copy test certs to `/ssl/fullchain.pem`
   - **Ingress Mode:** Set `SUPERVISOR_TOKEN` and test
   - **Self-Signed:** Let it auto-generate

3. Verify certificate properties
   ```bash
   openssl x509 -in /data/ssl/server.crt -text -noout | grep -A2 "Subject Alternative Name"
   ```

**Verification:**
- [ ] Can explain three-tier cascade
- [ ] Know where certificates are stored
- [ ] Understand SAN configuration

**Troubleshooting:** See [Gotchas #3](04-GOTCHAS.md#3-ca-certificate-installation-required)

---

### ☐ 3.2 License Client Integration

**Goal:** Understand license validation flow (without exposing internal details)

**Exercise:**
1. Read `license_client.py` (skip internal server details)
2. Trace activation flow:
   - `ensure_licensed()` → `_activate()` → `_validate()`
3. Understand grace period logic
4. Test cached token behavior

**Key Understanding:**
- License check is blocking at startup
- 24-hour grace period for network outages
- Hardware fingerprint binding

**Verification:**
- [ ] Can explain license validation sequence
- [ ] Understand grace period behavior
- [ ] Know where license state is stored

---

### ☐ 3.3 Smart Port Hunting

**Goal:** Understand port conflict resolution

**Exercise:**
1. Occupy port 8443
   ```bash
   python3 -m http.server 8443
   ```

2. Start WebRTC server
   ```bash
   docker-compose up -d
   ```

3. Observe logs
   ```bash
   docker-compose logs | grep "Port.*is busy"
   ```

4. Check server state
   ```bash
   cat /config/www/voice_streaming_backend/server_state.json
   ```

**Verification:**
- [ ] Can explain port hunting algorithm
- [ ] Know where active port is stored
- [ ] Understand frontend discovery mechanism

**Troubleshooting:** See [Gotchas #5](04-GOTCHAS.md#5-smart-port-hunting-can-break-frontend-discovery)

---

## Day 4: Testing & Debugging

### ☐ 4.1 Write Unit Test

**Goal:** Add first unit test to the codebase

**Exercise:**
1. Create test file `tests/test_webrtc_server.py`

2. Write test for health endpoint
   ```python
   import pytest
   from aiohttp import web
   from webrtc_server_relay import VoiceStreamingServer

   async def test_health_endpoint():
       server = VoiceStreamingServer()
       request = # ... create mock request
       response = await server.health_check(request)
       assert response.status == 200
   ```

3. Run tests
   ```bash
   pytest tests/
   ```

**Verification:**
- [ ] Test runs successfully
- [ ] Health endpoint test passes
- [ ] Understand testing patterns used

---

### ☐ 4.2 Debug Common Issues

**Goal:** Practice troubleshooting common problems

**Scenarios:**

1. **"No audio stream available"**
   - Setup: Start receiver without sender
   - Debug: Check `active_streams` dict
   - Fix: Start sender first

2. **WebSocket disconnects**
   - Setup: Connect client, wait 5 minutes
   - Debug: Check cleanup logs
   - Fix: Understand stale stream cleanup

3. **Certificate warnings**
   - Setup: Access via HTTPS without installing CA
   - Debug: Check browser console
   - Fix: Install CA certificate

**Verification:**
- [ ] Can diagnose each scenario
- [ ] Know which logs to check
- [ ] Can apply appropriate fix

---

### ☐ 4.3 Performance Profiling

**Goal:** Identify performance bottlenecks

**Exercise:**
1. Connect 1 sender + 5 receivers
2. Monitor resource usage
   ```bash
   docker stats webrtc_backend
   ```

3. Check metrics endpoint
   ```bash
   curl -k https://localhost:8443/metrics | python3 -m json.tool
   ```

4. Profile Python process
   ```bash
   # Inside container
   python3 -m cProfile -o profile.stats /app/webrtc_server_relay.py
   ```

**Questions to Answer:**
- How does CPU scale with number of receivers?
- What's the memory footprint per connection?
- Where are the bottlenecks?

**Verification:**
- [ ] Can interpret metrics output
- [ ] Understand performance characteristics
- [ ] Know how to profile Python async code

---

## Day 5: Contribution Prep

### ☐ 5.1 Identify Improvement Area

**Goal:** Find a small improvement to contribute

**Suggestions:**
- Add missing unit tests
- Improve error messages
- Add metrics/monitoring
- Fix technical debt from [Gotchas](04-GOTCHAS.md#technical-debt)
- Update documentation

**Verification:**
- [ ] Identified improvement area
- [ ] Discussed with team
- [ ] Created GitHub issue

---

### ☐ 5.2 Submit First PR

**Goal:** Complete contribution workflow

**Steps:**
1. Create feature branch
   ```bash
   git checkout -b feature/your-improvement
   ```

2. Make changes
3. Run tests
   ```bash
   pytest tests/
   ```

4. Build and test locally
   ```bash
   docker-compose build
   docker-compose up -d
   ```

5. Commit with conventional commit message
   ```bash
   git commit -m "feat: add health check metrics"
   ```

6. Push and create PR
   ```bash
   git push origin feature/your-improvement
   ```

**Verification:**
- [ ] PR created
- [ ] Tests pass
- [ ] Documentation updated

---

## Reference: Key Files to Know

| File | Purpose | Lines |
|------|---------|-------|
| `run.sh` | Main orchestration script | ~150 |
| `webrtc_server_relay.py` | Core WebRTC server | ~668 |
| `audio_stream_server.py` | MP3 streaming | ~200 |
| `ssl-setup.sh` | SSL certificate cascade | ~200 |
| `register_frontend.py` | Lovelace registration | ~100 |
| `license_client.py` | License validation | ~300 |
| `hw_fingerprint.py` | Hardware fingerprinting | ~80 |
| `config.yaml` | Home Assistant add-on manifest | ~40 |
| `Dockerfile` | Multi-stage build | ~50 |

---

## Reference: Common Commands

```bash
# Build
docker-compose build
docker-compose up -d

# Logs
docker-compose logs -f
docker-compose logs -f webrtc_backend

# Testing
pytest tests/
curl -k https://localhost:8443/health

# Debugging
docker-compose exec webrtc_backend /bin/bash
cat /config/www/voice_streaming_backend/server_state.json

# Cleanup
docker-compose down -v
docker system prune
```

---

## Mentorship & Support

**When Stuck:**
1. Check [Gotchas](04-GOTCHAS.md) first
2. Review [Architecture](02-ARCHITECTURE.md) diagrams
3. Search logs for error messages
4. Ask team with specific error output

**Escalation Path:**
1. Try troubleshooting steps in Gotchas
2. Document what you've tried
3. Share logs and error messages
4. Pair debug with experienced developer

---

**Completion:** When all checkboxes are checked, you're ready to contribute!  
**Next Steps:** Pick a feature from the roadmap or fix a known issue.
