#!/bin/bash
set -e

echo "Checking for webrtc_server_relay.py..."
ls -la /data/webrtc_server_relay.py

cd /data
exec python3 /data/webrtc_server_relay.py
