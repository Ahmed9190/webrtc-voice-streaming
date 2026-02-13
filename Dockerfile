ARG BUILD_FROM
FROM $BUILD_FROM

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    ffmpeg \
    gcc \
    musl-dev \
    libffi-dev \
    libssl-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /data

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod a+x /usr/bin/run.sh

EXPOSE 8080 8081

CMD ["/usr/bin/run.sh"]
