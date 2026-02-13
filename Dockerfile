ARG BUILD_FROM
FROM $BUILD_FROM

# Install dependencies
RUN apk add --no-cache python3 py3-pip ffmpeg gcc musl-dev libffi-dev openssl-dev curl

# Set working directory to /app
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --break-system-packages -r requirements.txt

# Copy application files
COPY . .

# Fix permissions
RUN chmod a+x *.py

# Create run script
RUN echo '#!/usr/bin/with-contenv bashio' > /usr/bin/run.sh && \
    echo 'set -e' >> /usr/bin/run.sh && \
    echo 'bashio::log.info "Starting Voice Streaming Backend..."' >> /usr/bin/run.sh && \
    echo 'if [ -d "/config" ]; then' >> /usr/bin/run.sh && \
    echo '  bashio::log.info "Installing frontend cards to /config/www/voice_streaming_backend..."' >> /usr/bin/run.sh && \
    echo '  mkdir -p /config/www/voice_streaming_backend/dist' >> /usr/bin/run.sh && \
    echo '  cp -rf /app/frontend/dist/* /config/www/voice_streaming_backend/dist/' >> /usr/bin/run.sh && \
    echo 'else' >> /usr/bin/run.sh && \
    echo '  bashio::log.warning "/config directory not found. Check add-on configuration."' >> /usr/bin/run.sh && \
    echo 'fi' >> /usr/bin/run.sh && \
    echo 'cd /app' >> /usr/bin/run.sh && \
    echo 'exec python3 webrtc_server_relay.py' >> /usr/bin/run.sh && \
    chmod a+x /usr/bin/run.sh

EXPOSE 8080 8081


CMD ["/usr/bin/run.sh"]
