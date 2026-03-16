# Decision Log

## Why This Architecture?

### Why WebRTC Instead of Plain WebSocket Audio?

**Decision**: Use WebRTC for audio transport.

**Rationale**:
- WebRTC includes **NAT traversal** (ICE/STUN/TURN) built-in
- Provides **codec negotiation** (Opus is optimal for voice)
- Built-in **buffering and jitter handling**
- Browser-native support (no plugins)

**Alternative Considered**: Raw WebSocket with PCM — Rejected because browsers can't play raw PCM directly, and you'd need to implement all the things WebRTC handles.

### Why Two Separate Servers?

**Decision**: WebRTC relay server + MP3 streaming server.

**Rationale**:
- **WebRTC is unreliable** over long durations; connections can drop
- **MP3 is universally supported** — Sonos, dumb speakers, curl
- Different clients have different needs

**Trade-off**: More complex setup, but better compatibility.

### Why aiortc?

**Decision**: Use aiortc library for WebRTC.

**Rationale**:
- Pure Python implementation
- Works well with aiohttp
- Active maintenance

**Alternatives**: pywebrtc (bindings) — More complex, less portable.

### Why Host Network Mode?

**Decision**: Require host networking in Docker.

**Rationale**:
- WebRTC media (UDP) must traverse NAT-free
- Bridge networking adds complexity for P2P
- Home Assistant add-ons typically run privileged anyway

### Why Autonomous SSL?

**Decision**: Auto-detect SSL mode instead of requiring configuration.

**Rationale**:
- Target users range from beginners to experts
- DuckDNS, Nabu Casa, self-signed, Ingress — many valid setups
- Reduce support burden

### Why Lit for Frontend?

**Decision**: Use Lit web components.

**Rationale**:
- Native web components (framework-agnostic)
- Works in Home Assistant Lovelace
- Lightweight compared to React/Vue

### Why Not Store Audio?

**Decision**: Stream-only, no recording.

**Rationale**:
- Simpler architecture
- Privacy-conscious by default
- Voice assistants (Assist) handle transcription

## Design Patterns

### MediaRelay Pattern

Used to fan out a single source track to multiple receivers:

```python
source_track → relay.subscribe() → receiver1_track
source_track → relay.subscribe() → receiver2_track
```

This allows one sender to feed multiple receivers without re-encoding.

### WebSocket State Machine

Connections persist after media stops, allowing:
- Quick reconnection
- Stream switching without full handshake

### Lazy Stream Selection

If no stream_id specified, receiver gets the most recent stream (last inserted).

## Future Considerations

- **TURN server**: Not currently included; could be added for connectivity through restrictive NATs
- **Recording**: Could add optional recording to disk
- **Multiple rooms**: Currently all streams are global; room-based isolation would be an enhancement
