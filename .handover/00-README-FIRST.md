# Voice Streaming Backend - Quick Reference

## What This Is

A Home Assistant Add-on that provides **real-time voice streaming** over WebRTC with a fallback MP3 stream. Built for low-latency audio between microphones and speakers in Home Assistant dashboards.

## At a Glance

| Aspect | Details |
|--------|---------|
| **Language** | Python 3 (async aiohttp + aiortc) |
| **Frontend** | Lit web components (TypeScript) |
| **Container** | Alpine Linux + Docker |
| **Target** | Home Assistant Add-on |
| **Version** | 1.1.5 |

## Key Capabilities

- **WebRTC** for peer-to-peer audio with < 100ms latency
- **MP3 fallback** stream for non-WebRTC clients (Sonos, dumb speakers)
- **Auto-SSL**: Detects HA certs, generates local CA, or uses Ingress
- **Host networking** for robust P2P media flow

## The Two Servers

1. **webrtc_server_relay.py** — Handles WebSocket signaling + WebRTC peer connections (port 8443 or 8099)
2. **audio_stream_server.py** — Serves MP3 streams on configurable port (default 8081)

## Common Tasks

- **Run locally**: `python3 webrtc_server_relay.py`
- **Build add-on**: `docker build -t webrtc-voice-streaming .`
- **Develop frontend**: `cd frontend && npm run dev`

## Entry Points

- `run.sh` — Add-on startup orchestration
- `webrtc_server_relay.py` — Main server (aiohttp + aiortc)
- `Dockerfile` — Multi-stage build (frontend → Python app)

## Read Next

- [Setup Guide](01-SETUP-GUIDE.md) — How to run and configure
- [Architecture](02-ARCHITECTURE.md) — Deep dive into the design
- [Gotchas](04-GOTCHAS.md) — Known issues and workarounds
