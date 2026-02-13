# Configuration (config.yaml)

> File: `04-configuration.md`

## Minimum Required Fields

```yaml
name: "My App"
version: "1.0.0"
slug: "my_app"
description: "App description"
url: "https://github.com/example/repo"
arch:
  - aarch64
  - amd64
  - armv7
init: false
boot: auto
homeassistant: "2022.12.0"
```

## Critical Settings

- **`init: false`** - Required for simple add-ons using CMD approach
- **`homeassistant`** - Minimum HA version requirement
- **Do NOT use `startup: application`** - Causes S6 errors with simple add-ons
- **`slug`** - Immutable identifier (no updates allowed)

## Common Options

```yaml
ports:
  8080/tcp: 8080
ingress: true
ingress_port: 8080
panel_icon: mdi:web
```

## Schema Types

| Type | UI Rendering |
|------|--------------|
| str/int/bool | Text box / Number / Toggle |
| password | Password field with visibility toggle |
| `list(a\|b\|c)` | Dropdown |
| device | Device path dropdown |
| `device(filter)` | Filtered device list |
| `match(regex)` | Text box with validation |

```yaml
options:
  port: 8080
  log_level: info
schema:
  port: port
  log_level: list(trace|debug|info|warning|error)
```

`?` marks field as optional.

## Hardware Flags

- `udev: true` - Enumerate USB devices
- `usb: true` - Mount USB bus
- `video: true` - Access /dev/video*
- `gpio: true` - GPIO pins (Raspberry Pi)
- `privileged: true` - AVOID (destroys security rating)

## References

- [App Configuration Docs](https://developers.home-assistant.io/docs/apps/configuration/)
