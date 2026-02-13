# Repository Distribution

> File: `09-repository.md`

## Repository Structure

```
my-addons-repo/
├── repository.yaml
├── README.md
├── .github/
│   └── workflows/
└── my-super-app/
    ├── config.yaml
    ├── build.yaml
    ├── Dockerfile
    ├── apparmor.txt
    ├── DOCS.md
    ├── CHANGELOG.md
    ├── icon.png       # 128x128 PNG (square)
    └── logo.png       # 250x100 PNG (horizontal)
```

## repository.yaml

```yaml
name: "My Professional Apps"
url: "https://github.com/my-org/my-addons"
maintainer: "Team Name <support@example.com>"
```

## Required Assets

| File | Size | Purpose |
|------|------|---------|
| icon.png | 128x128 | App list |
| logo.png | 250x100 | App details header |
| DOCS.md | - | Rendered in UI "Documentation" tab |
| CHANGELOG.md | - | Shown during updates |

## One-Click Installation

Use `my.home-assistant.io` deep linking for easy install. Add badge to README.md.

## References

- [Create App Repository](https://developers.home-assistant.io/docs/apps/repository/)
- [Roadmap 2025](https://www.home-assistant.io/blog/2025/05/09/roadmap-2025h1/)
