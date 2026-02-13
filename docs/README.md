# Home Assistant Add-on Development Guide

AI-friendly index for Home Assistant add-on development.

## Quick Start

### 1. Create Repository

```bash
gh repo create my-addon --public
```

### 2. Required Files

```
my-addon/
├── config.yaml        # Add-on metadata
├── Dockerfile        # Container build
├── repository.yaml   # For Add-on Store
└── rootfs/
    └── usr/bin/
        └── run.sh    # Entry point script
```

### 3. Minimal config.yaml

```yaml
name: "My Addon"
version: "1.0.0"
slug: "my_addon"
description: "My add-on description"
url: "https://github.com/user/my-addon"
arch:
  - aarch64
  - amd64
  - armv7
init: false
boot: auto
homeassistant: "2022.12.0"
```

### 4. Minimal Dockerfile

```dockerfile
ARG BUILD_FROM
FROM $BUILD_FROM

RUN apk add --no-cache python3 py3-pip

WORKDIR /data

COPY rootfs/ /

RUN chmod a+x /usr/bin/run.sh

CMD ["/usr/bin/run.sh"]
```

### 5. repository.yaml

```yaml
name: My Add-ons
url: https://github.com/user/my-addon
maintainer: Your Name
```

### 6. run.sh

```bash
#!/bin/bash
exec python3 -c "
# Your code here
print('Hello from add-on!')
"
```

### 7. Push and Install

```bash
git add .
git commit -m "Initial add-on"
git push
```

In Home Assistant:
1. Settings → Add-ons → Add-on Store
2. Three dots → Repositories
3. Add: `https://github.com/user/my-addon`

## Files

| File | Topic |
|------|-------|
| `01-supervisor-architecture.md` | Supervisor architecture |
| `02-container-build.md` | Dockerfile, build.yaml |
| `03-s6-overlay.md` | When to use S6 vs CMD |
| `04-configuration.md` | config.yaml options |
| `05-bashio-runtime.md` | Bashio library |
| `06-network.md` | Ingress, ports |
| `07-hardware-security.md` | Security |
| `08-cicd.md` | CI/CD |
| `09-repository.md` | Repository structure |

## Common Issues

| Error | Solution |
|-------|----------|
| `s6-overlay-suexec: fatal: can only run as pid 1` | Use CMD approach, not S6 |
| "Not a valid add-on repository" | Add `repository.yaml` |
| Add-on not showing in store | Check repository URL |

## Quick Reference

- **Init**: Use `init: false` + CMD (not S6)
- **Network**: Prefer Ingress
- **Security**: Target score 5-6
