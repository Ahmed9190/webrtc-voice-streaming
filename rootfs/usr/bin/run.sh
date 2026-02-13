#!/bin/bash
set -e

echo "Starting Voice Streaming Backend..."
echo "Current directory: $(pwd)"
echo "Contents of /data:"
ls -la /data/

cd /data
python3 webrtc_server_relay.py
