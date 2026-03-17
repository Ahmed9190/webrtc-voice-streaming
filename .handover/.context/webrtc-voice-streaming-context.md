# Analysis Context: webrtc-voice-streaming

## Discovery Log

- **Initial Scan**: Home Assistant Add-on for WebRTC-based real-time voice streaming
- **Entry Point Identified**: `run.sh` - Main orchestration script called by Docker CMD
- **Core Components Mapped**:
  - `webrtc_server_relay.py` - Main WebRTC signaling server (668 lines)
  - `audio_stream_server.py` - MP3 streaming server for audio playback
  - `license_client.py` - External license validation client
  - `hw_fingerprint.py` - Hardware fingerprinting utility
  - `ssl-setup.sh` - Autonomous SSL certificate setup
  - `register_frontend.py` - Lovelace dashboard resource registration

## Architecture Insights

- **Pattern**: Event-driven WebRTC signaling with MediaRelay for pub/sub distribution
- **Network**: Host networking mode required for reliable P2P connections
- **SSL Strategy**: Three-tier cascade (HA certs → Ingress → Auto-generated CA)
- **Frontend**: Node.js-built dashboard cards deployed to `/config/www/`

## Key Technical Decisions

1. **aiortc over alternatives**: Pure Python WebRTC implementation avoids GStreamer complexity
2. **MediaRelay subscription model**: Single sender can broadcast to multiple receivers efficiently
3. **Smart port hunting**: Automatically finds available port if 8443/8080 occupied
4. **State persistence**: Server state written to `/config/www/voice_streaming_backend/server_state.json` for frontend discovery

## Potential Concerns

- **License validation**: Blocking check at startup - server won't start without valid license
- **Hardware fingerprinting**: May cause issues on systems with unstable hardware IDs
- **ICE configuration**: Empty iceServers array limits connections to LAN-only (intentional for privacy)

## "Aha!" Moments

- The `/stream/latest.mp3` endpoint provides standard MP3 playback for non-WebRTC clients
- CA certificate download served via raw socket (`nc`) - minimal dependency approach
- Visualization task keeps MediaRelay subscription active even without receivers

## Final Analysis Summary

**Modules Analyzed:** 5 Python modules, 2 shell scripts, 1 Dockerfile, 1 Node.js frontend
**Documentation Generated:** 6 comprehensive handover documents
**Critical Findings:** 3 (license blocking, host networking, CA installation)
**Technical Debt Items:** 5 (no unit tests, tight coupling, global state, no rate limiting, hardcoded paths)

**Analysis Completed:** 2026-03-17
**Handover Status:** Complete - Ready for review
