# Analysis Context: webrtc-voice-streaming

## Project Overview

**Type**: Home Assistant Add-on for WebRTC-based real-time voice streaming
**Version**: 1.1.6 (config.yaml), 1.2.0 (frontend)
**Architecture**: Event-driven WebRTC signaling server with MP3 streaming capability

## Discovery Log

- **Initial Scan**: Identified Python backend (aiohttp + aiortc) with TypeScript/Lit frontend
- **Entry Point**: `run.sh` → sources `ssl-setup.sh` → launches `webrtc_server_relay.py`
- **Network Model**: Host networking enabled for direct P2P WebRTC data flow
- **SSL Strategy**: Autonomous cascade (HA certs → Ingress → Self-signed CA)
- **Frontend**: Custom Lovelace cards (voice-sending-card, voice-receiving-card)

## Architecture Patterns Identified

1. **WebRTC Signaling over WebSocket**: Bidirectional communication for SDP offer/answer
2. **MediaRelay Pattern**: aiortc's MediaRelay used for multi-receiver stream distribution
3. **Smart Port Hunting**: Automatic port discovery if 8443/8080 occupied
4. **State Persistence**: Server writes active port to `/config/www/voice_streaming_backend/server_state.json`

## Key Components

| Component | File | Responsibility |
|-----------|------|----------------|
| VoiceStreamingServer | webrtc_server_relay.py | Main signaling server, WebSocket handler, WebRTC peer connections |
| AudioStreamServer | audio_stream_server.py | MP3 HTTP streaming for legacy clients |
| UDPAudioStreamer | udp_streamer.py | Raw PCM over UDP for ESPHome speakers |
| WebRTCManager | frontend/src/webrtc-manager.ts | Client-side WebRTC state machine |
| SSL Setup | ssl-setup.sh | Autonomous certificate management |

## "Aha!" Moments (The "Why")

- **Host Network Mode**: Required for reliable P2P WebRTC; avoids NAT traversal issues in containerized environments
- **MediaRelay Subscription**: The track is subscribed immediately upon receipt to keep the media flowing even before receivers connect
- **Standalone Audio Server**: MP3 streaming runs on separate port (8081) to allow non-WebRTC clients (e.g., VLC, media_player entities)
- **ICE Configuration**: Empty iceServers array forces LAN-only connections (no STUN/TURN needed for local network)

## Technical Debt & Gotchas

- **Critical**: Visualization task runs continuously while stream exists - could be optimized
- **Warning**: No unit tests for core WebRTC signaling logic
- **Warning**: Cleanup of stale streams runs every 5 minutes - may leave orphaned streams temporarily
- **Observation**: `stop_media()` keeps WebSocket open but closes peer connection - intentional for reconnection scenarios

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 8080 | Base port for HTTP server |
| SSL_CERT_FILE | - | Path to SSL certificate |
| SSL_KEY_FILE | - | Path to SSL private key |
| LOG_LEVEL | INFO | Python logging level |
| AUDIO_PORT | 8081 | Port for MP3 streaming server |
| SUPERVISOR_TOKEN | - | Home Assistant Supervisor API token |

## Data Flow Summary

```
Sender Client → WebSocket (/ws) → WebRTC Offer → Server creates MediaRelay track
                                                      ↓
Receiver Client ← WebRTC Offer ← Server ← MediaRelay.subscribe()
```
