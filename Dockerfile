ARG BUILD_FROM
FROM $BUILD_FROM

RUN apk add --no-cache python3 py3-pip ffmpeg gcc musl-dev libffi-dev openssl-dev curl

WORKDIR /data

# Cache buster - change this to invalidate cache
ARG CACHE_BUSTER=1.0.16

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

# Create a cache-busting file to force COPY to run
RUN echo "${CACHE_BUSTER}" > /tmp/cachebuster

# Copy rootfs - this should now run because cachebuster changes
COPY rootfs/ /

RUN chmod a+x /usr/bin/run.sh

EXPOSE 8080 8081

CMD ["/usr/bin/run.sh"]
