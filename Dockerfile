ARG BUILD_FROM
FROM $BUILD_FROM

RUN apk add --no-cache python3 py3-pip ffmpeg gcc musl-dev libffi-dev openssl-dev curl

WORKDIR /data

# Download Python files directly from GitHub
RUN curl -sL https://raw.githubusercontent.com/Ahmed9190/webrtc-voice-streaming/main/requirements.txt -o requirements.txt && \
    curl -sL https://raw.githubusercontent.com/Ahmed9190/webrtc-voice-streaming/main/audio_stream_server.py -o audio_stream_server.py && \
    curl -sL https://raw.githubusercontent.com/Ahmed9190/webrtc-voice-streaming/main/webrtc_server_relay.py -o webrtc_server_relay.py && \
    curl -sL https://raw.githubusercontent.com/Ahmed9190/webrtc-voice-streaming/main/config.json -o config.json

# Install dependencies
RUN pip install --no-cache-dir --break-system-packages -r requirements.txt

# Copy rootfs
COPY rootfs/ /

# Verify files exist and make executable
RUN ls -la /data/ && chmod a+x /usr/bin/run.sh

EXPOSE 8080 8081

CMD ["/usr/bin/run.sh"]
