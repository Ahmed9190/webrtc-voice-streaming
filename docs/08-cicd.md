# CI/CD Pipeline

> File: `08-cicd.md`

## GitHub Actions Workflow

```yaml
name: Release App

on:
  release:
    types: [published]

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      id-token: write  # Required for Cosign

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and Publish
        uses: home-assistant/builder@2025.11.0
        with:
          args: |
            --all \
            --target my-app \
            --image my-app-{arch} \
            --docker-hub ghcr.io/${{ github.repository_owner }} \
            --cosign \
            --release-tag
```

## Features

- Builds all architectures from config.yaml
- Tags with release version
- Signs with Cosign
- Pushes to GitHub Container Registry

## Docker Build Cloud

ARM emulation on x86 runners is slow. Use Docker Build Cloud for native ARM builds:

```yaml
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3
  with:
    driver-opts: |
      image=moby/buildkit:buildx-stable-1
      network=host
```

This offloads builds to cloud runners with native ARM.

## Codenotary / Cosign

- `--cosign` flag enables image signing
- `id-token: write` required for OIDC authentication
- Allows Supervisor to verify image integrity
- Adds +1 to security rating

## References

- [Home Assistant Builder](https://github.com/home-assistant/builder)
- [Docker Build Cloud Guide](https://dev.to/prasadb89/supercharging-multi-architecture-docker-builds-with-docker-build-cloud-in-github-actions-ol1)
