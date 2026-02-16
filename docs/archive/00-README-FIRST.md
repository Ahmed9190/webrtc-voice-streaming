# 🎙️ WebRTC Voice Streaming Backend - Project Handover

**Last Updated:** 2026-01-18  
**Project Status:** Production-Ready  
**Complexity Level:** Advanced (Real-time Audio Streaming with WebRTC)

---

## 📋 Executive Summary

This is a **real-time voice streaming backend** built for Home Assistant add-ons. It enables **bidirectional audio streaming** over WebRTC with minimal latency, designed specifically for local network (LAN) deployments. The system supports multiple concurrent senders and receivers with intelligent stream relay capabilities.

### What This System Does

1. **Accepts audio streams** from senders (e.g., microphones via WebRTC)
2. **Relays streams** to multiple receivers simultaneously using MediaRelay
3. **Provides HTTP/MP3 streaming** endpoints for browser-based playback
4. **Manages WebSocket connections** for signaling and control
5. **Monitors health** and provides metrics for observability

### Key Characteristics

- **Zero external dependencies** for ICE (LAN-only, no STUN/TURN servers)
- **Low latency** design (<100ms typical)
- **Scalable** relay architecture (one sender → many receivers)
- **Containerized** with Docker for easy deployment
- **Production-tested** with extensive error handling and logging

---

## 🎯 Quick Start (5 Minutes)

### Prerequisites

- Docker & Docker Compose installed
- Local network access
- Port 8080 and 8081 available

### Start the Server

```bash
# From the webrtc_backend directory
docker build -t webrtc-voice-backend .
docker run -p 8080:8080 -p 8081:8081 webrtc-voice-backend
```

### Verify It's Running

```bash
# Health check
curl http://localhost:8080/health

# Expected response:
# {
#   "status": "healthy",
#   "webrtc_available": true,
#   "audio_server_running": true,
#   "active_streams": 0,
#   "connected_clients": 0,
#   "uptime_seconds": 42
# }
```

### Test WebSocket Connection

```bash
python test_ws.py
```

---

## 📁 Project Structure Overview

```
webrtc_backend/
├── webrtc_server_relay.py      # ⭐ MAIN SERVER (Production)
├── audio_stream_server.py      # HTTP/MP3 streaming endpoint
├── webrtc_server.py            # Legacy server (deprecated)
├── config.json                 # Server configuration
├── Dockerfile                  # Container definition
├── requirements.txt            # Python dependencies
├── test_server.py              # Health check test
├── test_ws.py                  # WebSocket test
├── performance_test.py         # Latency benchmarking
└── .handover/                  # 📚 YOU ARE HERE
    ├── 00-README-FIRST.md
    ├── 01-ARCHITECTURE.md
    ├── 02-SETUP-GUIDE.md
    ├── 03-API-REFERENCE.md
    ├── 04-TROUBLESHOOTING.md
    ├── 05-DEVELOPMENT-GUIDE.md
    └── 06-DEPLOYMENT.md
```

---

## 🚨 Critical Information

### The "Sender First" Bug (FIXED)

**Historical Context:** There was a critical bug where receivers joining an existing stream would not receive audio. This was caused by improper MediaRelay subscription handling in `setup_receiver()`.

**Fix Applied:** The relay now correctly subscribes new receivers to active tracks and creates offers robustly. See `webrtc_server_relay.py` lines 254-300.

**Lesson:** Always test the scenario where receivers join AFTER a sender has already started streaming.

### Port Configuration

- **8080**: WebSocket signaling + WebRTC negotiation
- **8081**: HTTP audio streaming (MP3 endpoint)

Both ports MUST be exposed in Docker and firewall configurations.

### LAN-Only Operation

This server is designed for **local network use only**. It does NOT use STUN/TURN servers. ICE candidates are local network addresses only. This is intentional for:

- Security (no external signaling)
- Performance (no relay overhead)
- Simplicity (no NAT traversal complexity)

---

## 📖 Documentation Index

| Document                    | Purpose                                          | Read If You Need To...                     |
| --------------------------- | ------------------------------------------------ | ------------------------------------------ |
| **01-ARCHITECTURE.md**      | System design, data flow, component interaction  | Understand how the system works internally |
| **02-SETUP-GUIDE.md**       | Step-by-step installation and configuration      | Set up the server from scratch             |
| **03-API-REFERENCE.md**     | WebSocket protocol, endpoints, message formats   | Integrate with the server or build clients |
| **04-TROUBLESHOOTING.md**   | Common issues, debugging, error codes            | Fix problems or investigate bugs           |
| **05-DEVELOPMENT-GUIDE.md** | Code structure, testing, contribution guidelines | Modify or extend the codebase              |
| **06-DEPLOYMENT.md**        | Production deployment, scaling, monitoring       | Deploy to production environments          |

---

## 🎓 Learning Path

### For New Developers (Day 1)

1. Read this file (you're here!)
2. Read `01-ARCHITECTURE.md` to understand the system
3. Run the Quick Start above
4. Read `03-API-REFERENCE.md` to see the WebSocket protocol
5. Try `test_ws.py` and `test_server.py`

### For Integration Engineers (Day 1-2)

1. Read `03-API-REFERENCE.md` thoroughly
2. Study the WebSocket message flow diagrams
3. Review the frontend integration examples
4. Test with real WebRTC clients

### For DevOps/SRE (Day 1)

1. Read `02-SETUP-GUIDE.md`
2. Read `06-DEPLOYMENT.md`
3. Review Docker configuration
4. Set up monitoring and health checks

---

## 🔑 Key Technologies

| Technology    | Version | Purpose                                   |
| ------------- | ------- | ----------------------------------------- |
| **Python**    | 3.11    | Runtime environment                       |
| **aiohttp**   | 3.8.6   | Async HTTP server & WebSocket             |
| **aiortc**    | 1.9.0   | WebRTC implementation (Python)            |
| **numpy**     | 1.24.3  | Audio data processing                     |
| **av (PyAV)** | Latest  | Audio encoding/decoding (FFmpeg bindings) |
| **Docker**    | Latest  | Containerization                          |

---

## ⚠️ Known Limitations

1. **LAN-only**: Does not work across the internet without VPN
2. **No authentication**: WebSocket connections are unauthenticated (relies on network security)
3. **No encryption**: WebRTC uses DTLS, but signaling is plain WebSocket
4. **Single server instance**: Not designed for horizontal scaling (use load balancer carefully)
5. **Memory usage**: Each stream relay consumes ~50-100MB RAM

---

## 🆘 Getting Help

### Immediate Issues

- Check `04-TROUBLESHOOTING.md` first
- Review server logs: `docker logs <container_id>`
- Test health endpoint: `curl http://localhost:8080/health`

### Development Questions

- See `05-DEVELOPMENT-GUIDE.md`
- Check code comments in `webrtc_server_relay.py`
- Review test files for usage examples

### Deployment Issues

- See `06-DEPLOYMENT.md`
- Check Docker logs and health checks
- Verify network connectivity and firewall rules

---

## 📝 Next Steps

**Choose your path:**

- **I need to understand the architecture** → Read `01-ARCHITECTURE.md`
- **I need to deploy this** → Read `02-SETUP-GUIDE.md`
- **I need to integrate with this** → Read `03-API-REFERENCE.md`
- **Something is broken** → Read `04-TROUBLESHOOTING.md`
- **I need to modify the code** → Read `05-DEVELOPMENT-GUIDE.md`

---

## 🏆 Success Criteria

You'll know you've successfully onboarded when you can:

✅ Start the server and verify health  
✅ Explain the difference between sender and receiver roles  
✅ Describe the MediaRelay pattern and why it's used  
✅ Connect a WebSocket client and send/receive messages  
✅ Troubleshoot a "no audio" issue  
✅ Deploy the server in a Docker container

---

**Welcome to the WebRTC Voice Streaming Backend!** 🎉

This documentation was generated as part of the Elite Staff Engineer Handover Protocol. If you find gaps or errors, please update this documentation for the next engineer.
