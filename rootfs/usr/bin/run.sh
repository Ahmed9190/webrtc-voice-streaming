#!/bin/bash
set -e

cd /data
exec python3 webrtc_server_relay.py
