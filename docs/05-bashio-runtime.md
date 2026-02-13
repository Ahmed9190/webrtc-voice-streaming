# Bashio Runtime & Scripting

> File: `05-bashio-runtime.md`

## Overview

Bashio is a Bash library included in official base images. Standardizes logging, config parsing, and Supervisor API interaction.

## Common Modules

### Logging
```bash
bashio::log.info "Message"
bashio::log.warning "Warning"
bashio::log.error "Error"
```

### Configuration
```bash
bashio::config 'key'          # Read string value
bashio::config.true 'flag'    # Check boolean
bashio::config.false 'flag'
```

### Variables
```bash
bashio::var.true 'value'      # Check if "true"
bashio::var.false 'value'
```

### Services
```bash
bashio::services mqtt         # Get MQTT service info
```

### API
```bash
bashio::api.supervisor GET /info
```

## Exit Codes

- `bashio::exit.ok` - Exit 0 (success)
- `bashio::exit.nok` - Exit 1 (error)
- `bashio::exit.config_error` - Configuration error

## Example: Dynamic Config Generation

```bash
#!/usr/bin/with-contenv bashio

CONFIG_PATH="/etc/nginx/nginx.conf"

echo "worker_processes auto;" > "$CONFIG_PATH"
echo "events { worker_connections 1024; }" >> "$CONFIG_PATH"
echo "http {" >> "$CONFIG_PATH"

if bashio::config.true 'ssl'; then
    bashio::log.info "Enabling SSL..."
    CERT=$(bashio::config 'certfile')
    echo "  ssl_certificate $CERT;" >> "$CONFIG_PATH"
fi

echo "}" >> "$CONFIG_PATH"
```

This runs as a **oneshot** service before the main app starts.

## References

- [Bashio GitHub](https://github.com/hassio-addons/bashio)
- [Bashio var.sh](https://github.com/hassio-addons/bashio/blob/main/lib/var.sh)
