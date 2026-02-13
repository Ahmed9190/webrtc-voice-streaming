#!/bin/bash
set -e

echo "=== RUN.SH DEBUG ==="
echo "Current directory: $(pwd)"
echo "Listing /data:"
ls -la /data/ 2>&1 || echo "Failed to list /data"
echo ""
echo "Trying to find webrtc_server_relay.py:"
find / -name "webrtc_server_relay.py" 2>/dev/null || echo "Not found anywhere"
echo ""
echo "Dockerfile contents from /data:"
cat /data/Dockerfile 2>&1 || echo "No Dockerfile in /data"

echo ""
echo "Attempting to start server..."
cd /data
exec python3 /data/webrtc_server_relay.py
