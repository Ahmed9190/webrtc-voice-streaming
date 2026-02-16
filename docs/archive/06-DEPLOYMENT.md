# 🚀 Deployment Guide - WebRTC Voice Streaming Backend

**Document Version:** 1.0  
**Last Updated:** 2026-01-18

---

## Table of Contents

1. [Production Deployment](#production-deployment)
2. [Docker Deployment](#docker-deployment)
3. [Home Assistant Add-on Deployment](#home-assistant-add-on-deployment)
4. [Monitoring and Observability](#monitoring-and-observability)
5. [Scaling Considerations](#scaling-considerations)
6. [Security Hardening](#security-hardening)
7. [Backup and Recovery](#backup-and-recovery)
8. [Maintenance](#maintenance)

---

## Production Deployment

### Pre-Deployment Checklist

- ✅ Server meets minimum requirements (2GB RAM, 2 CPU cores)
- ✅ Ports 8080 and 8081 are available
- ✅ Firewall rules configured
- ✅ Network connectivity verified
- ✅ Docker installed and running
- ✅ Configuration file reviewed
- ✅ Health check endpoint tested
- ✅ Monitoring setup (optional but recommended)

---

## Docker Deployment

### Basic Production Deployment

```bash
# 1. Build production image
docker build -t webrtc-voice-backend:1.0 .

# 2. Run container with production settings
docker run -d \
  --name voice-streaming \
  --restart unless-stopped \
  -p 8080:8080 \
  -p 8081:8081 \
  -v $(pwd)/config.json:/app/config.json:ro \
  --memory="2g" \
  --cpus="2.0" \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  --health-cmd='python -c "import urllib.request; urllib.request.urlopen(\"http://localhost:8080/health\")"' \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  webrtc-voice-backend:1.0

# 3. Verify deployment
docker ps | grep voice-streaming
docker logs voice-streaming
curl http://localhost:8080/health
```

### Docker Compose Deployment

Create `docker-compose.prod.yml`:

```yaml
version: "3.8"

services:
  voice-streaming:
    build:
      context: .
      dockerfile: Dockerfile
    image: webrtc-voice-backend:1.0
    container_name: voice-streaming
    restart: unless-stopped

    ports:
      - "8080:8080"
      - "8081:8081"

    volumes:
      - ./config.json:/app/config.json:ro
      - voice-logs:/var/log/voice-streaming

    environment:
      - PYTHONUNBUFFERED=1
      - TZ=UTC

    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 2G
        reservations:
          cpus: "1.0"
          memory: 1G

    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

    networks:
      - voice-network

volumes:
  voice-logs:

networks:
  voice-network:
    driver: bridge
```

Deploy:

```bash
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml logs -f
```

---

### Multi-Stage Docker Build (Optimized)

Create `Dockerfile.prod`:

```dockerfile
# Stage 1: Build dependencies
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    musl-dev \
    libffi-dev \
    libssl-dev && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Production image
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Copy Python packages from builder
COPY --from=builder /root/.local /root/.local

# Copy application files
COPY webrtc_server_relay.py .
COPY audio_stream_server.py .
COPY config.json .

# Make sure scripts in .local are usable
ENV PATH=/root/.local/bin:$PATH

# Expose ports
EXPOSE 8080 8081

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')" || exit 1

# Run server
CMD ["python", "webrtc_server_relay.py"]
```

Build:

```bash
docker build -f Dockerfile.prod -t webrtc-voice-backend:1.0-prod .
```

**Benefits:**

- Smaller image size (~300MB vs ~500MB)
- Faster startup
- No build tools in production image

---

## Home Assistant Add-on Deployment

### Add-on Configuration

Create `config.yaml` (Home Assistant add-on format):

```yaml
name: "WebRTC Voice Streaming"
description: "Real-time voice streaming over WebRTC"
version: "1.0.0"
slug: "webrtc_voice_streaming"
init: false
arch:
  - aarch64
  - amd64
  - armhf
  - armv7
  - i386

ports:
  8080/tcp: 8080
  8081/tcp: 8081

ports_description:
  8080/tcp: "WebSocket signaling and WebRTC"
  8081/tcp: "HTTP audio streaming (MP3)"

options:
  max_connections: 50
  sample_rate: 16000
  channels: 1

schema:
  max_connections: int(1,100)
  sample_rate: list(8000|16000|44100|48000)
  channels: list(1|2)

image: "ghcr.io/your-username/webrtc-voice-backend"
```

### Add-on Dockerfile

Create `Dockerfile.addon`:

```dockerfile
ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:latest
FROM ${BUILD_FROM}

# Install dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    gcc \
    musl-dev \
    python3-dev \
    libffi-dev \
    openssl-dev

# Install Python packages
COPY requirements.txt /tmp/
RUN pip3 install --no-cache-dir -r /tmp/requirements.txt

# Copy application
COPY webrtc_server_relay.py /app/
COPY audio_stream_server.py /app/
COPY run.sh /app/

WORKDIR /app

# Make run script executable
RUN chmod a+x /app/run.sh

CMD ["/app/run.sh"]
```

### Add-on Run Script

Create `run.sh`:

```bash
#!/usr/bin/with-contenv bashio

# Get options from Home Assistant
MAX_CONNECTIONS=$(bashio::config 'max_connections')
SAMPLE_RATE=$(bashio::config 'sample_rate')
CHANNELS=$(bashio::config 'channels')

# Generate config.json from options
cat > /app/config.json <<EOF
{
  "webrtc": {
    "ice_servers": [],
    "rtc_config": {
      "bundlePolicy": "max-bundle",
      "rtcpMuxPolicy": "require",
      "sdpSemantics": "unified-plan"
    },
    "audio_constraints": {
      "sample_rate": ${SAMPLE_RATE},
      "channels": ${CHANNELS},
      "echo_cancellation": true,
      "noise_suppression": true,
      "auto_gain_control": true
    }
  },
  "server": {
    "port": 8080,
    "host": "0.0.0.0",
    "max_connections": ${MAX_CONNECTIONS}
  }
}
EOF

bashio::log.info "Starting WebRTC Voice Streaming Server..."
bashio::log.info "Max connections: ${MAX_CONNECTIONS}"
bashio::log.info "Sample rate: ${SAMPLE_RATE}Hz"
bashio::log.info "Channels: ${CHANNELS}"

# Run server
exec python3 /app/webrtc_server_relay.py
```

---

## Monitoring and Observability

### Prometheus Metrics

**Endpoint:** `GET /metrics`

**Metrics Exposed:**

```
# HELP voice_streaming_uptime_seconds Server uptime in seconds
# TYPE voice_streaming_uptime_seconds gauge
voice_streaming_uptime_seconds 3600

# HELP voice_streaming_active_connections Number of active connections
# TYPE voice_streaming_active_connections gauge
voice_streaming_active_connections 5

# HELP voice_streaming_active_streams Number of active streams
# TYPE voice_streaming_active_streams gauge
voice_streaming_active_streams 2

# HELP voice_streaming_total_audio_bytes Total audio bytes processed
# TYPE voice_streaming_total_audio_bytes counter
voice_streaming_total_audio_bytes 1048576
```

### Prometheus Configuration

Add to `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: "voice-streaming"
    static_configs:
      - targets: ["localhost:8080"]
    metrics_path: "/metrics"
    scrape_interval: 15s
```

### Grafana Dashboard

Create dashboard with panels:

1. **Active Connections** (Gauge)

   ```promql
   voice_streaming_active_connections
   ```

2. **Active Streams** (Gauge)

   ```promql
   voice_streaming_active_streams
   ```

3. **Uptime** (Stat)

   ```promql
   voice_streaming_uptime_seconds
   ```

4. **Audio Throughput** (Graph)
   ```promql
   rate(voice_streaming_total_audio_bytes[5m])
   ```

### Health Check Monitoring

**Script:** `monitor_health.sh`

```bash
#!/bin/bash

HEALTH_URL="http://localhost:8080/health"
ALERT_EMAIL="admin@example.com"

while true; do
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

  if [ "$RESPONSE" != "200" ]; then
    echo "ALERT: Health check failed with status $RESPONSE"
    # Send alert (example with mail)
    echo "Voice streaming server is unhealthy" | mail -s "Server Alert" $ALERT_EMAIL
  fi

  sleep 60
done
```

Run as systemd service:

```ini
# /etc/systemd/system/voice-streaming-monitor.service
[Unit]
Description=Voice Streaming Health Monitor
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/monitor_health.sh
Restart=always

[Install]
WantedBy=multi-user.target
```

---

## Scaling Considerations

### Vertical Scaling

**Increase Resources:**

```bash
docker update \
  --cpus="4.0" \
  --memory="4g" \
  voice-streaming
```

**Recommended Specs by Load:**

| Concurrent Users | CPU      | RAM  | Network |
| ---------------- | -------- | ---- | ------- |
| 1-10             | 1 core   | 1GB  | 100Mbps |
| 10-25            | 2 cores  | 2GB  | 500Mbps |
| 25-50            | 4 cores  | 4GB  | 1Gbps   |
| 50+              | 8+ cores | 8GB+ | 1Gbps+  |

### Horizontal Scaling (Advanced)

**Not Currently Supported** - Server maintains in-memory state

**To Enable Horizontal Scaling:**

1. **Shared State (Redis):**

   ```python
   # Replace in-memory dicts with Redis
   import redis
   self.redis = redis.Redis(host='redis', port=6379)

   # Store connections in Redis
   self.redis.hset('connections', connection_id, json.dumps(connection_data))
   ```

2. **Load Balancer (nginx):**

   ```nginx
   upstream voice_backend {
       least_conn;
       server backend1:8080;
       server backend2:8080;
       server backend3:8080;
   }

   server {
       listen 8080;

       location /ws {
           proxy_pass http://voice_backend;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";

           # Sticky sessions required
           ip_hash;
       }
   }
   ```

3. **Sticky Sessions:**
   Required because WebSocket connections are stateful

---

## Security Hardening

### Network Security

**1. Firewall Rules (iptables):**

```bash
# Allow only specific IPs
iptables -A INPUT -p tcp --dport 8080 -s 192.168.1.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 8080 -j DROP

iptables -A INPUT -p tcp --dport 8081 -s 192.168.1.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 8081 -j DROP
```

**2. Reverse Proxy (nginx):**

```nginx
server {
    listen 443 ssl;
    server_name voice.example.com;

    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;

    location /ws {
        proxy_pass http://localhost:8080/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /stream/ {
        proxy_pass http://localhost:8081/stream/;
    }
}
```

### Application Security

**1. Rate Limiting (nginx):**

```nginx
limit_req_zone $binary_remote_addr zone=voice_limit:10m rate=10r/s;

location /ws {
    limit_req zone=voice_limit burst=20;
    # ...
}
```

**2. Authentication (Future Enhancement):**

```python
# Add to websocket_handler
async def websocket_handler(self, request):
    # Verify token
    token = request.headers.get('Authorization')
    if not self.verify_token(token):
        return web.Response(status=401, text="Unauthorized")

    # Continue with WebSocket setup
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    # ...
```

### Container Security

**1. Run as Non-Root:**

```dockerfile
# Add to Dockerfile
RUN adduser -D -u 1000 voiceuser
USER voiceuser
```

**2. Read-Only Filesystem:**

```bash
docker run -d \
  --read-only \
  --tmpfs /tmp \
  --name voice-streaming \
  webrtc-voice-backend
```

**3. Security Scanning:**

```bash
# Scan image for vulnerabilities
docker scan webrtc-voice-backend:1.0

# Or use Trivy
trivy image webrtc-voice-backend:1.0
```

---

## Backup and Recovery

### Configuration Backup

```bash
# Backup configuration
cp config.json config.json.backup.$(date +%Y%m%d)

# Backup Docker volumes
docker run --rm \
  -v voice-logs:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/voice-logs-backup.tar.gz /data
```

### Disaster Recovery

**1. Export Container:**

```bash
docker export voice-streaming > voice-streaming-backup.tar
```

**2. Restore:**

```bash
docker import voice-streaming-backup.tar webrtc-voice-backend:restored
docker run -d -p 8080:8080 -p 8081:8081 webrtc-voice-backend:restored
```

**3. Database/State (if using Redis):**

```bash
# Backup Redis
redis-cli --rdb /backup/dump.rdb

# Restore Redis
cp /backup/dump.rdb /var/lib/redis/dump.rdb
systemctl restart redis
```

---

## Maintenance

### Regular Maintenance Tasks

**Daily:**

- ✅ Check health endpoint
- ✅ Review logs for errors
- ✅ Monitor resource usage

**Weekly:**

- ✅ Rotate logs
- ✅ Review metrics
- ✅ Check for updates

**Monthly:**

- ✅ Update dependencies
- ✅ Security scan
- ✅ Performance review
- ✅ Backup configuration

### Log Rotation

**Docker Logs:**

```bash
# Already configured in docker run command
--log-opt max-size=10m
--log-opt max-file=3
```

**Manual Rotation:**

```bash
# Rotate logs
docker logs voice-streaming > voice-streaming-$(date +%Y%m%d).log
docker restart voice-streaming
```

### Updates

**Update Procedure:**

```bash
# 1. Backup current state
docker export voice-streaming > backup-$(date +%Y%m%d).tar

# 2. Pull/build new image
docker build -t webrtc-voice-backend:1.1 .

# 3. Stop old container
docker stop voice-streaming

# 4. Start new container
docker run -d \
  --name voice-streaming-new \
  -p 8080:8080 -p 8081:8081 \
  webrtc-voice-backend:1.1

# 5. Verify new container
curl http://localhost:8080/health

# 6. Remove old container
docker rm voice-streaming
docker rename voice-streaming-new voice-streaming
```

### Rollback Procedure

```bash
# If update fails, rollback:
docker stop voice-streaming-new
docker rm voice-streaming-new
docker start voice-streaming
```

---

## Production Checklist

Before going live:

- ✅ Configuration reviewed and tested
- ✅ Firewall rules configured
- ✅ SSL/TLS certificates installed (if using HTTPS)
- ✅ Monitoring setup (Prometheus/Grafana)
- ✅ Health checks configured
- ✅ Log rotation configured
- ✅ Backup strategy in place
- ✅ Disaster recovery plan documented
- ✅ Security hardening applied
- ✅ Load testing completed
- ✅ Documentation updated
- ✅ Team trained on operations

---

## Next Steps

- **For troubleshooting:** See `04-TROUBLESHOOTING.md`
- **For development:** See `05-DEVELOPMENT-GUIDE.md`
- **For API details:** See `03-API-REFERENCE.md`

---

**Deployment Complete!** Your WebRTC Voice Streaming Backend is production-ready. 🎉
