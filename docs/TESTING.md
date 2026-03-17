# Autonomous SSL & Network Operations

## 1. Zero-Touch Network Configuration

We have enabled **Host Networking** mode for maximum autonomy and reliability.

### How it works automatically:

1.  **No Port Mapping**: The add-on shares the host's network stack directly.
2.  **Smart Port Allocation**:
    - The server attempts to start on **Port 8443**.
    - **Conflict Handling**: If port 8443 is taken by another service (e.g., AdGuard), the server **automatically hunts** for the next available port (`8444`, `8445`, etc.).
    - It will **never crash** due to a "Port Already in Use" error.

## 2. Dynamic Discovery (Frontend)

When the server successfully starts (e.g., on port 8444), it writes its connection details to:
`/config/www/voice_streaming_backend/server_state.json`

This ensures that the frontend card can dynamically discover the correct port and connect without manual reconfiguration.

## 3. Deployment Instructions

### Standard Install

1.  Install the Add-on.
2.  Start it.
3.  Check Logs:
    ```
    [SSL] 🏠 Local LAN Mode: Prioritizing local IP access
    [SSL] 🔐 Generating local CA...
    ✅ Server successfully started on https://0.0.0.0:8444
    ```
    _(Note: The port might be 8443 or different depending on availability)_

### Troubleshooting

- **"Port Busy" Warnings in logs**: This is normal if you have other services running. The system is self-healing.
- **Frontend Connection**: Ensure your cards are updated to read the dynamic configuration if you have frequent port conflicts.
