ARG BUILD_FROM=alpine:latest
FROM $BUILD_FROM

# Install dependencies
RUN apk update && \
    apk add --no-cache python3 py3-pip curl openssl jq netcat-openbsd bash

# Set working directory to /app
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --break-system-packages -r requirements.txt

# Copy application files
COPY . .

# Copy scripts to root
COPY ssl-setup.sh /
COPY run.sh /

# Fix permissions
RUN chmod a+x *.py && chmod a+x /run.sh /ssl-setup.sh

EXPOSE 8099 8443 8555 8080

CMD ["/run.sh"]
