ARG BUILD_FROM
FROM $BUILD_FROM

RUN apk add --no-cache python3 py3-pip ffmpeg gcc musl-dev libffi-dev openssl-dev

COPY requirements.txt /data/
WORKDIR /data
RUN pip install --no-cache-dir --break-system-packages -r requirements.txt

COPY rootfs/ /
COPY audio_stream_server.py webrtc_server.py webrtc_server_relay.py test_server.py test_ws.py performance_test.py config.json /data/

RUN chmod a+x /usr/bin/run.sh

EXPOSE 8080 8081

CMD ["/usr/bin/run.sh"]
