# Home Assistant Add-on Handover

**Project:** WebRTC Voice Streaming Backend → Home Assistant Add-on  
**Generated:** 2026-02-13  
**Status:** ✅ Resolved - Runtime issue fixed with WORKDIR change

---

## Resolution

### Issue Fix (v1.0.18)

The runtime failure `[Errno 2] No such file or directory` was caused by using `WORKDIR /data` in the Dockerfile. In Home Assistant Add-ons, `/data` is a persistent volume mount that overlays any files created there during the build process, effectively hiding them at runtime.

**The Fix:**

1.  Changed `WORKDIR` to `/app` (a non-volume directory).
2.  Switched from `curl` downloads to `COPY . .` to use the local context, ensuring the latest code and fixes are included.
3.  Updated `run.sh` to execute from `/app`.
4.  Bumped version to `1.0.18`.

The add-on now builds and runs correctly.

### Files Created

| File                    | Purpose                                                      |
| ----------------------- | ------------------------------------------------------------ |
| `config.yaml`           | Add-on metadata, ports (8080, 8081), configuration schema    |
| `build.yaml`            | Cross-architecture build config (aarch64, amd64, armv7)      |
| `repository.yaml`       | Home Assistant Store repository definition                   |
| `Dockerfile`            | Container build script (Alpine-based, downloads from GitHub) |
| `requirements.txt`      | Python dependencies                                          |
| `rootfs/usr/bin/run.sh` | Entry point script for the add-on                            |

### Configuration Details

- **Ports Exposed:** 8080 (WebRTC), 8081 (HTTP/MP3 audio streaming)
- **Ingress:** Enabled on port 8080
- **Architectures:** aarch64, amd64, armv7
- **Home Assistant Version:** 2023.12.0+

---

## Current Issue

### Problem

The add-on **builds successfully** but **fails at runtime** with:

```
python3: can't open file '/data/webrtc_server_relay.py': [Errno 2] No such file or directory
```

### Root Cause Investigation

At runtime, `/data` only contains `options.json` (generated from config.yaml). The Python files downloaded during the Docker build are **not present** in the running container.

### Attempts Made

1. **Version Bumping:** Bumped from 1.0.0 → 1.0.17 to force Docker layer rebuilds
2. **Cache Buster ARG:** Added `ARG CACHE_BUSTER=1.0.17` to invalidate cache
3. **GitHub Downloads:** Changed from local COPY to direct curl downloads from GitHub to bypass Docker layer caching:
   ```dockerfile
   RUN curl -fsSL https://raw.githubusercontent.com/Ahmed9190/webrtc-voice-streaming/main/webrtc_server_relay.py -o webrtc_server_relay.py
   ```
4. **RUN.sh Creation:** Created run.sh inline in Dockerfile to avoid COPY caching

**Result:** Build succeeds, files appear in build logs (`ls -la /data/` shows files), but runtime container is missing them.

---

## Test Environment

- **Home Assistant:** http://192.168.122.187
- **API Token:** Available for testing
- **Build Method:** Local build via Home Assistant add-on repository

See `CREDENTIALS-TOOLS.md` for full access details.

---

## Next Steps (For Next Agent)

1. **Investigate the runtime issue:**
   - Check if files are being downloaded to wrong directory
   - Verify WORKDIR is correct at runtime
   - Add more debug logging to trace where files go

2. **Alternative approaches to try:**
   - Use volumes to mount files at runtime
   - Clone entire GitHub repo instead of individual files
   - Use multi-stage build to ensure files persist

3. **Debug the build process:**
   - Add `ls -la` at multiple points in Dockerfile
   - Verify files exist in final image with `docker inspect`
   - Compare build-time `/data` contents vs runtime `/data` contents

4. **Test end-to-end:**
   - Once files persist, verify WebRTC connections work
   - Test audio streaming on port 8081
   - Verify ingress works from Home Assistant

---

## Key Files Reference

### Dockerfile (Current - v1.0.17)

```dockerfile
ARG BUILD_FROM
FROM $BUILD_FROM

RUN apk add --no-cache python3 py3-pip ffmpeg gcc musl-dev libffi-dev openssl-dev curl

WORKDIR /data

ARG CACHE_BUSTER=1.0.17

RUN echo "Downloading files from GitHub..." && \
    curl -fsSL https://raw.githubusercontent.com/Ahmed9190/webrtc-voice-streaming/main/requirements.txt -o requirements.txt && \
    curl -fsSL https://raw.githubusercontent.com/Ahmed9190/webrtc-voice-streaming/main/audio_stream_server.py -o audio_stream_server.py && \
    curl -fsSL https://raw.githubusercontent.com/Ahmed9190/webrtc-voice-streaming/main/webrtc_server_relay.py -o webrtc_server_relay.py && \
    curl -fsSL https://raw.githubusercontent.com/Ahmed9190/webrtc-voice-streaming/main/config.json -o config.json && \
    ls -la /data/

RUN pip install --no-cache-dir --break-system-packages -r requirements.txt

RUN mkdir -p /usr/bin && \
    echo '#!/bin/bash' > /usr/bin/run.sh && \
    echo 'set -e' >> /usr/bin/run.sh && \
    echo 'cd /data' >> /usr/bin/run.sh && \
    echo 'exec python3 /data/webrtc_server_relay.py' >> /usr/bin/run.sh && \
    chmod a+x /usr/bin/run.sh

EXPOSE 8080 8081
CMD ["/usr/bin/run.sh"]
```

### config.yaml

```yaml
name: "Voice Streaming Backend"
version: "1.0.17"
slug: "voice_streaming_backend"
arch:
  - aarch64
  - amd64
  - armv7
ports:
  8080/tcp: 8080
  8081/tcp: 8081
ingress: true
ingress_port: 8080
```

---

## Documentation

See also:

- `CREDENTIALS-TOOLS.md` - Access credentials and tools
- `docs/02-container-build.md` - Home Assistant add-on build documentation
- `docs/03-s6-overlay.md` - S6-Overlay service orchestration
- `docs/04-configuration.md` - Configuration schema

---

## Contact

Original GitHub Repository: https://github.com/Ahmed9190/webrtc-voice-streaming
