# S6-Overlay & Service Orchestration

> File: `03-s6-overlay.md`

## Two Approaches

### 1. Simple Add-on (Recommended for Most Cases)

Use CMD approach for single-process apps:

```dockerfile
CMD ["/usr/bin/run.sh"]
```

- Run script in `rootfs/usr/bin/run.sh`
- Base image handles PID 1 properly
- No S6 configuration needed

### 2. S6-Overlay (Advanced)

Only use when you need multi-service orchestration:
- Multiple processes that must start in order
- Complex dependencies between services

## S6-Overlay Structure

```
/etc/s6-overlay/s6-rc.d/
├── app-prepare/
│   ├── type (contains "oneshot")
│   ├── up
│   └── dependencies.d/base
├── app-main/
│   ├── type (contains "longrun")
│   ├── run
│   └── dependencies.d/app-prepare
```

## Service Types

| Type | Purpose | Script |
|------|---------|--------|
| **Longrun** | Continuous processes | `run` |
| **Oneshot** | Setup tasks | `up` |

## Common Error

> `s6-overlay-suexec: fatal: can only run as pid 1`

This means you're using S6 approach incorrectly. **Use the simple CMD approach instead.**

## References

- [S6-Overlay GitHub](https://github.com/just-containers/s6-overlay)
- [S6-Overlay Update Blog](https://developers.home-assistant.io/blog/2022/05/12/s6-overlay-base-images/)
