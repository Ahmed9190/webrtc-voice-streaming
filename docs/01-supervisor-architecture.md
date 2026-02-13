# Supervisor Architecture & App Lifecycle

> File: `01-supervisor-architecture.md`

## Overview

The Supervisor manages Docker containers for Home Assistant OS. It handles App lifecycle, security, and networking.

## Installation Flow

When user installs an App from the Store:

1. **Manifest Retrieval** - Fetches config.yaml and build.yaml for architecture compatibility
2. **Image Selection** - Pulls appropriate image tag (amd64, aarch64, armv7) based on host hardware
3. **Security Profile** - Generates AppArmor profile (default or custom) and applies to container
4. **Network Bridging** - Configures internal Docker network (172.30.x.x range) with internal DNS

## The "Apps" Nomenclature (2026.2+)

- Rebranded from "Add-ons" to "Apps"
- Users expect native software behavior: seamless install, zero-config networking
- Heavy reliance on **Ingress** for UI embedding
- Developer Tools moved to Settings menu
- Quick Search: Cmd/Ctrl + K

## Key Requirements

- Must handle termination signals properly
- Must not deviate from Supervisor lifecycle policies
- Failing to do so triggers unhealthy status or safe-mode lockouts

## References

- [Home Assistant 2026.2 Release](https://www.home-assistant.io/blog/2026/02/04/release-20262/)
- [App Security Docs](https://developers.home-assistant.io/docs/apps/security/)
