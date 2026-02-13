# Container Foundation & Base Images

> File: `02-container-build.md`

## Base Image Strategy

Use dynamic `BUILD_FROM` argument in Dockerfile for cross-architecture support.

## Supported Architectures

| Architecture | Alpine Tag | Use Case |
|--------------|------------|----------|
| amd64 | ghcr.io/home-assistant/amd64-base:latest | Desktop PCs, Intel NUCs, VMs |
| aarch64 | ghcr.io/home-assistant/aarch64-base:latest | Raspberry Pi 4/5, Odroid N2+ |
| armv7 | ghcr.io/home-assistant/armv7-base:latest | Raspberry Pi 3, older SBCs |

## build.yaml (Optional)

```yaml
build_from:
  aarch64: ghcr.io/home-assistant/aarch64-base:3.19
  amd64: ghcr.io/home-assistant/amd64-base:3.19
  armv7: ghcr.io/home-assistant/armv7-base:3.19
args:
  s6_overlay_version: "3.2.0.0"
labels:
  io.hass.type: "addon"
  io.hass.version: "1.0.0"
```

## Dockerfile Templates

### Simple Add-on (Recommended)

Use this approach for Python, Node.js, or single-process apps:

```dockerfile
ARG BUILD_FROM
FROM $BUILD_FROM

RUN apk add --no-cache python3 py3-pip

WORKDIR /data

COPY rootfs/ /

EXPOSE 8080

RUN chmod a+x /usr/bin/run.sh

CMD ["/usr/bin/run.sh"]
```

Key points:
- **Always use CMD** - runs your app via base image's init system
- **Never use ENTRYPOINT** - breaks signal handling
- **Use EXPOSE** to document the port

### S6-Overlay (Advanced)

Only use for complex multi-service orchestration. See `03-s6-overlay.md`.

## References

- [App Configuration Docs](https://developers.home-assistant.io/docs/apps/configuration/)
- [Builder Action](https://github.com/marketplace/actions/home-assistant-builder)
