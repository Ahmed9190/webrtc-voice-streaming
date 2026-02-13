# WebRTC Voice Streaming Add-on

A high-performance Home Assistant Add-on that provides **WebRTC-based real-time voice streaming** with minimal latency. It includes a custom Lovelace card for easy sender/receiver integration.

## Features

- **Zero-Latency Streaming**: Uses WebRTC for near-instant audio transmission.
- **Sender & Receiver Cards**: Custom UI components for your dashboards.
- **Secure**: Automatic SSL/HTTPS support (required for microphone access).
- **Audio Processing**: High-quality audio handling via `aiortc`.
- **Health Monitoring**: Built-in status checks.

## Installation

### 1. Add Repository & Install

1.  Navigate to **Settings** > **Add-ons** > **Add-on Store**.
2.  Click the **dots** (top-right) > **Repositories**.
3.  Add this repository URL.
4.  Find **"Voice Streaming Backend"** in the list and click **Install**.
5.  Start the Add-on.

### 2. HTTPS Configuration (Required)

Modern browsers block microphone access on insecure (HTTP) connections. To use the "Sender" card, **you must access Home Assistant via HTTPS**.

**Option A: Official/Nabu Casa**
If you use Nabu Casa Cloud or an official certificate (Let's Encrypt), no extra setup is needed.

**Option B: Local Self-Signed (LAN)**
If you access HA via IP (e.g., `http://192.168.1.5:8123`), you must enable SSL.

1.  **Generate Certificates**:
    Connect to the add-on via terminal (or use the provided script locally):

    ```bash
    ./ssl/generate_lan_cert.sh
    ```

    This creates valid self-signed certificates for your LAN IP.

2.  **Configure Home Assistant**:
    Copy the generated `ssl` folder to your `/config` directory and update `configuration.yaml`:
    ```yaml
    http:
      ssl_certificate: /config/ssl/fullchain.pem
      ssl_key: /config/ssl/privkey.pem
    ```
3.  **Restart Home Assistant** and add-on.

### 3. Frontend Card Configuration

The add-on automatically attempts to register the custom card resource. If the cards do not appear in your dashboard picker:

1.  Go to **Settings** > **Dashboards** > **Resources**.
2.  Click **Add Resource**.
3.  Enter:
    - **URL**: `/local/voice_streaming_backend/dist/voice-streaming-card-dashboard.js`
    - **Resource Type**: JavaScript Module
4.  Click **Create**.

_Note for YAML mode users:_

```yaml
lovelace:
  resources:
    - url: /local/voice_streaming_backend/dist/voice-streaming-card-dashboard.js
      type: module
```

## Usage

### Using the Cards

1.  Edit your Dashboard.
2.  Search for **Voice Sending Card** or **Voice Receiving Card**.
3.  Add them to your view.

### API & Ports

The Add-on exposes the following ports (configurable):

- **8080** (TCP): Signaling & WebSocket API.
- **8081** (TCP): Direct Audio Stream (MP3).

---

## Advanced / Local Development

For developers who want to run this project standalone outside of Home Assistant.

### Prerequisites

- Docker & Docker Compose
- Python 3.11+
- `ffmpeg`

### Running Locally

1.  **Clone & Env**:
    ```bash
    python -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```
2.  **Run Server**:
    ```bash
    python webrtc_server.py
    ```
3.  **Testing**:
    ```bash
    python test_server.py
    ```

### Architecture

- **WebServer**: `aiohttp`
- **WebRTC**: `aiortc`
- **Concurrency**: `asyncio`

## License

MIT
