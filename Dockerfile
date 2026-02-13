ARG BUILD_FROM
FROM $BUILD_FROM

RUN apk add --no-cache python3 py3-pip ffmpeg gcc musl-dev libffi-dev openssl-dev curl

WORKDIR /data

# Cache buster - change this to invalidate cache
ARG CACHE_BUSTER=1.0.17

# Download Python files directly from GitHub with error checking
RUN echo "Cache buster: ${CACHE_BUSTER}" && \
    echo "Downloading files from GitHub..." && \
    curl -fsSL https://raw.githubusercontent.com/Ahmed9190/webrtc-voice-streaming/main/requirements.txt -o requirements.txt && \
    curl -fsSL https://raw.githubusercontent.com/Ahmed9190/webrtc-voice-streaming/main/audio_stream_server.py -o audio_stream_server.py && \
    curl -fsSL https://raw.githubusercontent.com/Ahmed9190/webrtc-voice-streaming/main/webrtc_server_relay.py -o webrtc_server_relay.py && \
    curl -fsSL https://raw.githubusercontent.com/Ahmed9190/webrtc-voice-streaming/main/config.json -o config.json && \
    echo "Download complete!" && \
    ls -la /data/

# Install dependencies
RUN pip install --no-cache-dir --break-system-packages -r requirements.txt

# Create run.sh directly to avoid COPY caching issues
RUN mkdir -p /usr/bin && \
    echo '#!/bin/bash' > /usr/bin/run.sh && \
    echo 'set -e' >> /usr/bin/run.sh && \
    echo '' >> /usr/bin/run.sh && \
    echo 'echo "=== Voice Streaming Backend v1.0.17 ==="' >> /usr/bin/run.sh && \
    echo 'echo "Starting server..."' >> /usr/bin/run.sh && \
    echo 'cd /data' >> /usr/bin/run.sh && \
    echo 'ls -la /data/' >> /usr/bin/run.sh && \
    echo 'exec python3 /data/webrtc_server_relay.py' >> /usr/bin/run.sh && \
    chmod a+x /usr/bin/run.sh && \
    cat /usr/bin/run.sh

EXPOSE 8080 8081

CMD ["/usr/bin/run.sh"]
