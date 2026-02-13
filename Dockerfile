ARG BUILD_FROM
FROM $BUILD_FROM

# Force rebuild: v1.0.7
RUN apk add --no-cache python3 py3-pip ffmpeg gcc musl-dev libffi-dev openssl-dev

WORKDIR /data

COPY requirements.txt .
RUN pip install --no-cache-dir --break-system-packages -r requirements.txt

COPY rootfs/ /

# Copy Python files explicitly
COPY audio_stream_server.py /data/
COPY webrtc_server.py /data/
COPY webrtc_server_relay.py /data/
COPY config.json /data/

RUN chmod a+x /usr/bin/run.sh

EXPOSE 8080 8081

CMD ["/usr/bin/run.sh"]
