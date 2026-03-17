# Technical Onboarding Checklist

## Environment Verification
- [ ] Python 3.9+ installed (`python3 --version`)
- [ ] Node.js 18+ installed (`node --version`)
- [ ] Docker available (`docker --version`)
- [ ] Git repository cloned locally

## Build & Run Verification
- [ ] Python dependencies installed: `pip install -r requirements.txt`
- [ ] Frontend dependencies: `cd frontend && npm install`
- [ ] Frontend built: `cd frontend && npm run build`
- [ ] Server starts locally: `PORT=8443 AUDIO_PORT=8081 python3 webrtc_server_relay.py`
- [ ] Health endpoint responds: `curl -s http://localhost:8443/health | grep healthy`
- [ ] MP3 stream endpoint: `curl -I http://localhost:8081/stream/latest.mp3`

## Code Navigation Exercises
- [ ] Locate WebSocket message handler: `webrtc_server_relay.py:135` (`handle_message`)
- [ ] Find sender setup: `webrtc_server_relay.py:171` (`setup_sender`)
- [ ] Find receiver setup: `webrtc_server_relay.py:226` (`setup_receiver`)
- [ ] Locate MP3 encoding: `audio_stream_server.py:173` (`stream_handler`)
- [ ] Find SSL detection logic: `ssl-setup.sh:50` (`try_ha_certs`)
- [ ] Locate stream cleanup bug: `webrtc_server_relay.py:78` (`hasattr` on dict)

## Configuration Verification
- [ ] Examine default config: `cat config.yaml`
- [ ] Verify exposed ports in Dockerfile: `grep EXPOSE Dockerfile`
- [ ] Check add-on metadata: `grep -A5 "name:" config.yaml`
- [ ] Validate frontend build output: `ls -la frontend/dist/`

## Debugging Readiness
- [ ] Enable debug logging: `LOG_LEVEL=debug python3 webrtc_server_relay.py`
- [ ] Test WebSocket connection: `wscat -c ws://localhost:8443/ws`
- [ ] Test ICE gathering: Observe logs for "ICE connection state"
- [ ] Verify track subscription: Check for "Subscribed to track" in logs
- [ ] Validate MP3 streaming: `ffprobe http://localhost:8081/stream/latest.mp3`

## Deployment Validation
- [ ] Build Docker image: `docker build -t webrtc-test .`
- [ ] Run container: `docker run -p 8443:8443 -p 8081:8081 webrtc-test`
- [ ] Verify container health: `curl http://localhost:8443/health`
- [ ] Check container logs: `docker logs <container_id>`

## Known Issue Verification
- [ ] Confirm stream cleanup bug: Inspect `webrtc_server_relay.py:75-88`
- [ ] Verify frontend registration requirement: Check `register_frontend.py:13`
- [ ] Validate host network requirement: Check `config.yaml:16`
- [ ] Confirm port conflict handling: Examine `run.sh:21-23`

Each item represents a concrete, verifiable action or code location to examine. Complete all items to demonstrate familiarity with the codebase.