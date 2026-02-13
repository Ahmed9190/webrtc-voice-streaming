# Network Architecture

> File: `06-network.md`

## Ingress

When `ingress: true` is set, Supervisor proxies traffic from HA UI to container port (default 8099).

**Key header**: `X-Ingress-Path` contains the dynamic root path (e.g., `/api/hassio_ingress/token_xyz`)

### Nginx Configuration for Ingress

```nginx
server {
    listen 8099;
    allow 172.30.32.2;  # Only Supervisor
    deny all;

    location / {
        proxy_pass http://127.0.0.1:3000;
        
        # Inject base tag for path-agnostic apps
        sub_filter_once off;
        sub_filter_types text/html;
        sub_filter '<head>' '<head><base href="$http_x_ingress_path/">';
    }
}
```

The `<base>` tag ensures relative links resolve correctly.

## Internal DNS

Apps can resolve each other via: `{repository_hash}-{slug}`

Example: `core-mosquitto`

## Home Assistant Core API

- Hostname: `supervisor` or `http://supervisor/core/api`
- Requires: `homeassistant_api: true` in config.yaml
- Token: `SUPERVISOR_TOKEN` environment variable

## Host Networking

```yaml
host_network: true
```

**Pros**: Native mDNS, SSDP, broadcast support (Matter, Cast)

**Cons**: 
- Port conflicts
- Lost internal DNS
- **-1 security rating penalty**

## References

- [App Communication Docs](https://developers.home-assistant.io/docs/apps/communication/)
- [Ingress Discussion](https://community.home-assistant.io/t/addon-ingress/936226)
