# 💻 Development Guide - WebRTC Voice Streaming Backend

**Document Version:** 1.0  
**Last Updated:** 2026-01-18

---

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Code Structure](#code-structure)
3. [Key Components Deep Dive](#key-components-deep-dive)
4. [Testing](#testing)
5. [Code Style and Standards](#code-style-and-standards)
6. [Common Development Tasks](#common-development-tasks)
7. [Debugging Techniques](#debugging-techniques)
8. [Contributing Guidelines](#contributing-guidelines)

---

## Development Environment Setup

### IDE Recommendations

**VS Code (Recommended):**

```bash
# Install VS Code
# Install Python extension
# Install Docker extension

# Recommended extensions:
# - Python (ms-python.python)
# - Pylance (ms-python.vscode-pylance)
# - Docker (ms-azuretools.vscode-docker)
# - GitLens (eamodio.gitlens)
```

**VS Code Settings (`.vscode/settings.json`):**

```json
{
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": true,
  "python.formatting.provider": "black",
  "python.analysis.typeCheckingMode": "basic",
  "editor.formatOnSave": true,
  "files.exclude": {
    "**/__pycache__": true,
    "**/*.pyc": true
  }
}
```

### Virtual Environment

```bash
# Create virtual environment
python3.11 -m venv venv

# Activate
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Install development dependencies
pip install black pylint pytest pytest-asyncio
```

### Development Dependencies

Create `requirements-dev.txt`:

```
# Testing
pytest==7.4.0
pytest-asyncio==0.21.0
pytest-cov==4.1.0

# Code quality
black==23.7.0
pylint==2.17.5
mypy==1.4.1

# Debugging
ipdb==0.13.13
```

Install:

```bash
pip install -r requirements-dev.txt
```

---

## Code Structure

### File Organization

```
webrtc_backend/
├── webrtc_server_relay.py      # ⭐ MAIN SERVER (Production)
│   ├── VoiceStreamingServer    # Main class
│   ├── setup_routes()          # HTTP/WS route setup
│   ├── websocket_handler()     # WebSocket connection handler
│   ├── setup_sender()          # Sender peer connection setup
│   ├── setup_receiver()        # Receiver peer connection setup
│   ├── handle_message()        # Message routing
│   └── cleanup_*()             # Cleanup tasks
│
├── audio_stream_server.py      # HTTP/MP3 streaming
│   ├── AudioStreamServer       # HTTP server class
│   ├── latest_stream_handler() # /stream/latest.mp3
│   ├── stream_handler()        # /stream/{id}.mp3
│   └── status_handler()        # /stream/status
│
├── webrtc_server.py            # ⚠️ LEGACY (Deprecated)
│   └── (Old implementation, kept for reference)
│
├── config.json                 # Configuration
├── Dockerfile                  # Container definition
├── requirements.txt            # Python dependencies
│
└── tests/                      # Test files
    ├── test_server.py          # Health check test
    ├── test_ws.py              # WebSocket test
    └── performance_test.py     # Performance benchmarks
```

### Class Hierarchy

```
VoiceStreamingServer
├── __init__()
│   ├── self.connections: Dict[str, dict]
│   ├── self.active_streams: Dict[str, Dict]
│   ├── self.relay: MediaRelay
│   └── self.audio_server: AudioStreamServer
│
├── setup_routes()
├── websocket_handler(request) → WebSocketResponse
├── handle_message(connection_id, data)
│   ├── setup_sender(connection_id)
│   ├── setup_receiver(connection_id, stream_id)
│   ├── handle_webrtc_offer(connection_id, data)
│   ├── handle_webrtc_answer(connection_id, data)
│   └── stop_media(connection_id)
│
├── cleanup_connection(connection_id)
├── cleanup_stale_streams()
└── run_server()

AudioStreamServer
├── __init__(relay_server)
├── latest_stream_handler(request) → Response
├── stream_handler(request) → StreamResponse
├── status_handler(request) → JSONResponse
└── start(host, port)
```

---

## Key Components Deep Dive

### 1. Connection Management

**Data Structure:**

```python
self.connections: Dict[str, dict] = {
    "connection_id_uuid": {
        "ws": WebSocketResponse,      # aiohttp WebSocket
        "pc": RTCPeerConnection,       # aiortc peer connection
        "role": "sender" | "receiver", # Client role
        "stream_id": str               # Associated stream ID
    }
}
```

**Lifecycle:**

```python
# 1. Create (websocket_handler)
connection_id = str(uuid.uuid4())
self.connections[connection_id] = {
    "ws": ws,
    "pc": None,
    "role": None,
    "stream_id": None
}

# 2. Setup (setup_sender or setup_receiver)
connection["role"] = "sender"
connection["pc"] = RTCPeerConnection(...)

# 3. Cleanup (cleanup_connection)
if connection.get("pc"):
    await connection["pc"].close()
del self.connections[connection_id]
```

---

### 2. Stream Management

**Data Structure:**

```python
self.active_streams: Dict[str, Dict] = {
    "stream_id": {
        "track": MediaStreamTrack,     # Source audio track
        "receivers": [connection_ids], # List of receiver IDs
        "sender_id": str,              # Sender connection ID
        "last_activity": float         # Timestamp for cleanup
    }
}
```

**Lifecycle:**

```python
# 1. Create (on_track callback in setup_sender)
stream_id = f"stream_{connection_id}"
self.active_streams[stream_id] = {
    "track": track,
    "receivers": [],
    "sender_id": connection_id
}

# 2. Add Receiver (setup_receiver)
stream_info["receivers"].append(connection_id)

# 3. Remove (cleanup or track ended)
del self.active_streams[stream_id]
await self.broadcast_stream_ended(stream_id)
```

---

### 3. MediaRelay Pattern

**Purpose:** Distribute one source track to multiple consumers

**Implementation:**

```python
# Initialize (in __init__)
self.relay = MediaRelay()

# Subscribe (in setup_receiver)
source_track = stream_info["track"]
relayed_track = self.relay.subscribe(source_track)
pc.addTrack(relayed_track)

# Visualization (in on_track callback)
viz_track = self.relay.subscribe(track)
asyncio.create_task(self.process_visualization(stream_id, viz_track))
```

**How It Works:**

- `MediaRelay` maintains a registry of source tracks
- Each `subscribe()` creates a new consumer track
- Frames are read from source and distributed to consumers
- Each consumer has independent frame queue

**Memory Implications:**

- Each subscription creates ~50-100MB buffer
- Frames are copied (not shared)
- Cleanup happens when consumer stops iterating

---

### 4. WebRTC Peer Connection Setup

**Sender Setup:**

```python
async def setup_sender(self, connection_id: str):
    # 1. Create peer connection (LAN-only)
    config = RTCConfiguration(iceServers=[])
    pc = RTCPeerConnection(configuration=config)
    connection["pc"] = pc

    # 2. Register track handler
    @pc.on("track")
    async def on_track(track):
        # Store track in active_streams
        stream_id = f"stream_{connection_id}"
        self.active_streams[stream_id] = {
            "track": track,
            "receivers": [],
            "sender_id": connection_id
        }

        # Broadcast availability
        await self.broadcast_stream_available(stream_id)

        # Start visualization
        viz_track = self.relay.subscribe(track)
        asyncio.create_task(self.process_visualization(stream_id, viz_track))

    # 3. Send ready signal
    await connection["ws"].send_str(
        json.dumps({"type": "sender_ready", "connection_id": connection_id})
    )
```

**Receiver Setup:**

```python
async def setup_receiver(self, connection_id: str, stream_id: str = None):
    # 1. Get stream (or latest)
    if not stream_id:
        stream_id = list(self.active_streams.keys())[-1]

    stream_info = self.active_streams[stream_id]
    source_track = stream_info["track"]

    # 2. Create peer connection
    config = RTCConfiguration(iceServers=[])
    pc = RTCPeerConnection(configuration=config)
    connection["pc"] = pc

    # 3. Subscribe to track via MediaRelay
    relayed_track = self.relay.subscribe(source_track)
    pc.addTrack(relayed_track)

    # 4. Create offer (server-initiated)
    offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    # 5. Wait for ICE gathering
    await asyncio.sleep(1.0)

    # 6. Send offer to client
    await connection["ws"].send_str(
        json.dumps({
            "type": "webrtc_offer",
            "offer": {
                "sdp": pc.localDescription.sdp,
                "type": pc.localDescription.type
            }
        })
    )
```

---

### 5. Message Routing

**Pattern:** Type-based dispatch

```python
async def handle_message(self, connection_id: str, data: dict):
    message_type = data.get("type")

    # Dispatch table
    handlers = {
        "start_sending": self.setup_sender,
        "start_receiving": lambda: self.setup_receiver(connection_id, data.get("stream_id")),
        "webrtc_offer": lambda: self.handle_webrtc_offer(connection_id, data),
        "webrtc_answer": lambda: self.handle_webrtc_answer(connection_id, data),
        "ice_candidate": lambda: self.handle_ice_candidate(connection_id, data),
        "get_available_streams": lambda: self.send_available_streams(connection_id),
        "stop_stream": lambda: self.stop_media(connection_id),
        "local_ip": lambda: self.handle_local_ip(connection_id, data)
    }

    handler = handlers.get(message_type)
    if handler:
        await handler()
```

---

## Testing

### Unit Tests

Create `tests/test_voice_server.py`:

```python
import pytest
import asyncio
from webrtc_server_relay import VoiceStreamingServer

@pytest.mark.asyncio
async def test_server_initialization():
    server = VoiceStreamingServer()
    assert server.connections == {}
    assert server.active_streams == {}
    assert server.relay is not None

@pytest.mark.asyncio
async def test_health_endpoint():
    server = VoiceStreamingServer()
    # Mock request
    from aiohttp.test_utils import make_mocked_request
    request = make_mocked_request('GET', '/health')

    response = await server.health_check(request)
    assert response.status == 200

    data = await response.json()
    assert data["status"] == "healthy"
    assert data["webrtc_available"] == True
```

Run tests:

```bash
pytest tests/ -v
```

---

### Integration Tests

Create `tests/test_integration.py`:

```python
import pytest
import aiohttp
import asyncio

@pytest.mark.asyncio
async def test_websocket_connection():
    async with aiohttp.ClientSession() as session:
        async with session.ws_connect('http://localhost:8080/ws') as ws:
            # Should receive available_streams on connect
            msg = await ws.receive()
            data = json.loads(msg.data)
            assert data["type"] == "available_streams"

            # Request to start sending
            await ws.send_str(json.dumps({"type": "start_sending"}))

            # Should receive sender_ready
            msg = await ws.receive()
            data = json.loads(msg.data)
            assert data["type"] == "sender_ready"
```

---

### Performance Tests

Enhance `performance_test.py`:

```python
import asyncio
import aiohttp
import time
import statistics

async def test_concurrent_connections():
    """Test server with multiple concurrent connections"""
    async def connect():
        start = time.time()
        async with aiohttp.ClientSession() as session:
            async with session.ws_connect('http://localhost:8080/ws') as ws:
                msg = await ws.receive()
                return time.time() - start

    # Test 10 concurrent connections
    tasks = [connect() for _ in range(10)]
    latencies = await asyncio.gather(*tasks)

    print(f"Average connection time: {statistics.mean(latencies):.3f}s")
    print(f"Max connection time: {max(latencies):.3f}s")

asyncio.run(test_concurrent_connections())
```

---

## Code Style and Standards

### Python Style Guide

**Follow PEP 8:**

```bash
# Format code with black
black webrtc_server_relay.py

# Lint with pylint
pylint webrtc_server_relay.py
```

**Type Hints:**

```python
from typing import Dict, Optional

async def setup_receiver(
    self,
    connection_id: str,
    stream_id: Optional[str] = None
) -> None:
    ...
```

**Docstrings:**

```python
async def setup_sender(self, connection_id: str):
    """Set up a client as an audio sender

    Args:
        connection_id: Unique identifier for the connection

    Side Effects:
        - Creates RTCPeerConnection
        - Registers track handler
        - Sends sender_ready message
    """
    ...
```

---

### Logging Standards

**Use structured logging:**

```python
logger.info(f"Setting up sender for connection {connection_id}")
logger.warning(f"No audio stream available for receiver {connection_id}")
logger.error(f"Error handling message from {connection_id}: {e}", exc_info=True)
```

**Log Levels:**

- `DEBUG`: Detailed diagnostic info (frame counts, state changes)
- `INFO`: Normal operation (connections, streams)
- `WARNING`: Recoverable issues (no stream available)
- `ERROR`: Errors requiring attention (exceptions, failures)

---

## Common Development Tasks

### Adding a New Message Type

**1. Define message handler:**

```python
async def handle_new_message(self, connection_id: str, data: dict):
    """Handle new message type"""
    # Implementation
    pass
```

**2. Add to message routing:**

```python
async def handle_message(self, connection_id: str, data: dict):
    # ...
    elif message_type == "new_message_type":
        await self.handle_new_message(connection_id, data)
```

**3. Update API documentation:**
Edit `03-API-REFERENCE.md` to document new message.

**4. Add tests:**

```python
@pytest.mark.asyncio
async def test_new_message():
    # Test implementation
    pass
```

---

### Adding a New HTTP Endpoint

**1. Define handler:**

```python
async def new_endpoint_handler(self, request):
    """Handle new endpoint"""
    return web.json_response({"status": "ok"})
```

**2. Register route:**

```python
def setup_routes(self):
    # ...
    self.app.router.add_get("/new-endpoint", self.new_endpoint_handler)
```

**3. Test:**

```bash
curl http://localhost:8080/new-endpoint
```

---

### Modifying Audio Processing

**Location:** `audio_stream_server.py`, `stream_handler()` method

**Example: Change MP3 bitrate:**

```python
# Line 171
codec_context.bit_rate = 256000  # Changed from 128000
```

**Example: Change sample rate:**

```python
# Line 172
codec_context.sample_rate = 48000  # Changed from 44100

# Also update resampler (line 184)
resampler = av.AudioResampler(
    format="s16p",
    layout="stereo",
    rate=48000,  # Changed from 44100
)
```

---

## Debugging Techniques

### Enable Debug Logging

```python
# webrtc_server_relay.py, line 468
logging.basicConfig(level=logging.DEBUG)  # Changed from INFO
```

### Add Breakpoints

```python
import pdb

async def setup_receiver(self, connection_id: str, stream_id: str = None):
    pdb.set_trace()  # Debugger will stop here
    # ...
```

### Inspect State

```python
# Add temporary logging
logger.debug(f"Connections: {self.connections}")
logger.debug(f"Active streams: {self.active_streams}")
logger.debug(f"Stream info: {stream_info}")
```

### Monitor WebRTC Stats

```python
@pc.on("iceconnectionstatechange")
async def on_iceconnectionstatechange():
    logger.info(f"ICE state: {pc.iceConnectionState}")

    # Get stats
    stats = await pc.getStats()
    for stat in stats:
        logger.debug(f"Stat: {stat}")
```

---

## Contributing Guidelines

### Git Workflow

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes
# ...

# 3. Format and lint
black .
pylint webrtc_server_relay.py

# 4. Run tests
pytest tests/

# 5. Commit
git add .
git commit -m "feat: Add new feature"

# 6. Push
git push origin feature/new-feature

# 7. Create pull request
```

### Commit Message Format

```
<type>: <subject>

<body>

<footer>
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Example:**

```
feat: Add support for multiple audio codecs

- Added codec selection in config.json
- Updated audio_stream_server.py to support Opus
- Added tests for codec negotiation

Closes #123
```

---

## Next Steps

- **For deployment:** See `06-DEPLOYMENT.md`
- **For troubleshooting:** See `04-TROUBLESHOOTING.md`
- **For API details:** See `03-API-REFERENCE.md`

---

**Happy Coding!** 🚀
