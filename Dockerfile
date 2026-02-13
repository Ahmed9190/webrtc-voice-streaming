ARG BUILD_FROM
FROM $BUILD_FROM

# Cache busting arguments
ARG BUILD_DATE
ARG VCS_REF

RUN apk add --no-cache python3 py3-pip ffmpeg gcc musl-dev libffi-dev openssl-dev

WORKDIR /data

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --break-system-packages -r requirements.txt

# Copy application files with explicit paths
COPY audio_stream_server.py /data/audio_stream_server.py
COPY webrtc_server_relay.py /data/webrtc_server_relay.py
COPY config.json /data/config.json

# Copy rootfs
COPY rootfs/ /

# Verify files exist and make executable
RUN ls -la /data/ && chmod a+x /usr/bin/run.sh

EXPOSE 8080 8081

CMD ["/usr/bin/run.sh"]
