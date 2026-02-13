ARG BUILD_FROM
FROM $BUILD_FROM

RUN apk add --no-cache python3 py3-pip ffmpeg gcc musl-dev libffi-dev openssl-dev

WORKDIR /data

# Install dependencies first
COPY requirements.txt .
RUN pip install --no-cache-dir --break-system-packages -r requirements.txt

# Copy application files - v1.0.9
COPY audio_stream_server.py /data/audio_stream_server.py
COPY webrtc_server_relay.py /data/webrtc_server_relay.py
COPY config.json /data/config.json

# Copy rootfs for init scripts
COPY rootfs/ /

RUN chmod a+x /usr/bin/run.sh && ls -la /data/

EXPOSE 8080 8081

CMD ["/usr/bin/run.sh"]
