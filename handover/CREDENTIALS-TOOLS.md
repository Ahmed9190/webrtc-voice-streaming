# Credentials and Tools Handover

**Project:** WebRTC Voice Streaming Backend → Home Assistant Add-on  
**Generated:** 2026-02-13  
**Status:** Active Development

---

## Home Assistant Access

### Instance Details
- **URL:** http://192.168.122.187
- **Protocol:** HTTP (for local network access)
- **Purpose:** Testing the Home Assistant add-on build and runtime

### API Access
- **API Token:** [PROVIDED SEPARATELY - INSERT HERE]
- **Usage:** For Home Assistant Supervisor API calls and add-on management
- **Scope:** Full admin access for add-on development and testing

### SSH Access (if applicable)
- **Host:** 192.168.122.187
- **User:** [PROVIDED SEPARATELY - INSERT HERE]
- **Password/Key:** [PROVIDED SEPARATELY - INSERT HERE]
- **Port:** 22 (default)

---

## GitHub Repository

### Source Code
- **URL:** https://github.com/Ahmed9190/webrtc-voice-streaming
- **Access:** Public repository
- **Branch:** main
- **Purpose:** Contains the WebRTC backend source code

### Files to Download
The Dockerfile currently downloads these files from GitHub:
- `requirements.txt` - Python dependencies
- `audio_stream_server.py` - HTTP/MP3 audio streaming server
- `webrtc_server_relay.py` - Main WebRTC relay server
- `config.json` - Application configuration

---

## Docker/Container Tools

### Local Development
- **Docker:** Used for building add-on images locally
- **Docker Compose:** Not currently used, but available
- **Build Context:** `/mnt/Files/Programming/playground/webrtc_backend/`

### Home Assistant Builder
- **Location:** Built into Home Assistant OS
- **Access:** Via Home Assistant Supervisor API
- **Command:** Automatic via add-on repository

---

## Network Configuration

### Ports Required
| Port | Protocol | Purpose | Direction |
|------|----------|---------|-----------|
| 8080 | TCP | WebRTC signaling and HTTP | Inbound |
| 8081 | TCP | Audio streaming (MP3) | Inbound |
| 22 | TCP | SSH access (optional) | Inbound |

### Local Network
- **Subnet:** 192.168.122.0/24
- **Gateway:** 192.168.122.1
- **DNS:** Standard network DNS

---

## Testing Environment

### Home Assistant OS
- **Version:** 2023.12.0+
- **Architecture:** Multi-arch (aarch64, amd64, armv7)
- **Add-on Repository:** Custom repository mode

### Test Commands
```bash
# Check Home Assistant health
curl -H "Authorization: Bearer $HA_TOKEN" \
  http://192.168.122.187/api/

# Install add-on (via Supervisor API)
curl -X POST \
  -H "Authorization: Bearer $HA_TOKEN" \
  http://192.168.122.187/addons/local_voice_streaming_backend/install

# Check add-on logs
curl -H "Authorization: Bearer $HA_TOKEN" \
  http://192.168.122.187/addons/local_voice_streaming_backend/logs
```

---

## Build and Deployment

### Build Process
1. **Local Build:**
   ```bash
   cd /mnt/Files/Programming/playground/webrtc_backend/
   docker build -t voice-streaming-backend .
   ```

2. **Home Assistant Build:**
   - Add repository to Home Assistant
   - Build via Supervisor UI or API

### Deployment Steps
1. Push changes to GitHub
2. Update version in `config.yaml`
3. Build in Home Assistant
4. Test runtime functionality
5. Check logs for errors

---

## Troubleshooting Access

### If Home Assistant is Unreachable
1. Verify network connectivity: `ping 192.168.122.187`
2. Check if Home Assistant is running
3. Verify firewall rules
4. Try accessing via SSH and check logs

### If API Token Doesn't Work
1. Verify token hasn't expired
2. Check token permissions
3. Generate new token from Home Assistant UI
4. Update this document with new token

### If Docker Build Fails
1. Check Docker daemon is running
2. Verify internet access for GitHub downloads
3. Check disk space
4. Review build logs for specific errors

---

## Security Notes

**⚠️ IMPORTANT:**
- Keep API tokens secure
- Don't commit credentials to GitHub
- Use environment variables for sensitive data
- Rotate tokens regularly
- Limit token scope to minimum required

---

## Quick Reference

**Home Assistant:** http://192.168.122.187  
**GitHub Repo:** https://github.com/Ahmed9190/webrtc-voice-streaming  
**Add-on Version:** 1.0.17  
**Ports:** 8080 (WebRTC), 8081 (Audio)  

**Next Agent:** Check `HA-ADDON-HANDOVER.md` for project status and next steps.

---

**Last Updated:** 2026-02-13
