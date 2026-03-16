# Analysis Context: webrtc-voice-streaming

## Discovery Log

- **[2026-03-16T16:03:00Z]**: Identified Home Assistant Add-on structure with Dockerfile multi-stage build.
- **[2026-03-16T16:05:00Z]**: Found dual-server architecture: `webrtc_server_relay.py` (signaling + WebRTC) + `audio_stream_server.py` (MP3 streaming on configurable port).
- **[2026-03-16T16:07:00Z]**: Mapped SSL cascade: try HA certs → self-signed CA → ingress mode.
- **[2026-03-16T16:10:00Z]**: Frontend built with Lit web components, bundled via Rollup.
- **[2026-03-16T16:12:00Z]**: Entry point: `run.sh` orchestrates SSL setup then exec's Python server.

## "Aha!" Moments (The Why)

- **Why WebSocket for signaling?** WebRTC requires bidirectional communication for offer/answer exchange; HTTP is request-response only.
- **Why separate MP3 server?** Browser WebRTC can be unreliable for long streams; MP3 provides fallback for dumb clients (Sonos, etc).
- **Why host network mode?** Required for P2P media; container networking adds NAT traversal complexity.
- **Why autonomous SSL?** Home Assistant users range from tech-savvy to beginners; zero-config is critical for adoption.

## Technical Debt & Gotchas

- **Warning**: `webrtc_server_relay.py:78` - stream_info comparison uses `hasattr` incorrectly on dict (always True).
- **Warning**: Audio stream cleanup may not properly unsubscribe from MediaRelay tracks.
- **Info**: Frontend auto-registration requires Supervisor token (won't work in standalone mode).
