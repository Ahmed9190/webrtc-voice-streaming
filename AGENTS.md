# Agent Guidelines

When working on this Home Assistant add-on project, always reference the documentation in `docs/` folder.

## Documentation Index

Read `docs/README.md` for the complete topic index. Key topics:

| File | Topic |
|------|-------|
| `01-supervisor-architecture.md` | Supervisor architecture, App lifecycle |
| `02-container-build.md` | Base images, Dockerfile, build.yaml, cross-compilation |
| `03-s6-overlay.md` | S6-Overlay v3, s6-rc, service orchestration |
| `04-configuration.md` | config.yaml, schema, network, hardware flags |
| `05-bashio-runtime.md` | Bashio library, scripting, configuration generation |
| `06-network.md` | Ingress, internal DNS, service discovery |
| `07-hardware-security.md` | Hardware access, permissions, AppArmor |
| `08-cicd.md` | GitHub Actions, Docker Build Cloud, Cosign |
| `09-repository.md` | Repository structure, Store presentation |

## Quick Reference

- **Init System**: S6-Overlay v3 (PID 1 required)
- **Network**: Prefer Ingress over mapped ports
- **Security**: Provide apparmor.txt, minimize privileges, target score 5-6
- **Build**: Automate with GitHub Actions, use Home Assistant Builder

## Workflow

1. Read `docs/README.md` first to understand available topics
2. Consult specific docs files as needed for detailed information
3. Follow the conventions and patterns established in the docs
