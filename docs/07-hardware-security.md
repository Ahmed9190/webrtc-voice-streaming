# Hardware Access & Security

> File: `07-hardware-security.md`

## Serial Device Permissions

Devices typically owned by `dialout` group (GID 20) or `audio` (GID 18).

### Dynamic Permission Fix (Oneshot)

```bash
#!/usr/bin/with-contenv bashio

DEVICE=$(bashio::config 'serial_port')

if [ -n "$DEVICE" ]; then
    bashio::log.info "Fixing permissions for $DEVICE"
    
    GID=$(stat -c '%g' "$DEVICE")
    
    if ! getent group "$GID" >/dev/null; then
        bashio::log.info "Creating group for GID $GID"
        addgroup -g "$GID" hardware-access
    fi
    
    GROUP=$(getent group "$GID" | cut -d: -f1)
    adduser my-app-user "$GROUP"
fi
```

## Stable Device Paths

Use Udev symlinks instead of `/dev/ttyUSB0`:
- Path: `/dev/serial/by-id/...`
- Requires: `udev: true` in config.yaml

## AppArmor Profile

Default profile blocks most access. Provide custom `apparmor.txt` for functionality + security bonus.

### Example Profile

```
#include <tunables/global>

profile hassio-addon-my-app flags=(attach_disconnected,mediate_deleted) {
    #include <abstractions/base>
    
    /init ix,
    /run/{s6,s6-rc*,service}/** ix,
    /etc/services.d/** rwix,
    /usr/lib/bashio/** ix,
    /dev/ttyUSB* rw,
    /run/udev/** r,
    network,
}
```

**Critical**: Include `/init` and `/run/{s6...}` or S6 fails silently.

## Security Rating System

| Score | Meaning |
|-------|---------|
| Base | 5 |
| +1 | AppArmor profile |
| +2 | Ingress |
| +1 | Codenotary signing |
| -1 | host_network |
| -1 | host_pid |
| -2 | hassio_role: admin |
| 1 | privileged or docker_api |

Target: **5 or 6** (green badge). Score 1 shows red warning.

## References

- [App Security Docs](https://developers.home-assistant.io/docs/apps/security/)
- [Serial Port GID Discussion](https://community.home-assistant.io/t/serial-port-group-ownership-dialout-vs-audio-mismatch-after-upgrade-to-2025-1-0/821513)
- [Stable Device Paths](https://community.home-assistant.io/t/verifying-kernel-drivers-and-stable-device-paths-for-usb-serial-devices-ttyusb0-on-home-assistant-os/919027)
