import asyncio
import logging
import os

import aiohttp

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("register_frontend")

SUPERVISOR_TOKEN = os.environ.get("SUPERVISOR_TOKEN")

RESOURCE_URL = "/local/voice_streaming_backend/dist/voice-streaming-card-dashboard.js"
RESOURCE_TYPE = "module"

BASE_URL = "http://supervisor/core/api"


async def check_yaml_mode(session, headers):
    """Check if Lovelace is in YAML mode."""
    try:
        async with session.get(
            f"{BASE_URL}/lovelace/config",
            headers=headers,
            timeout=aiohttp.ClientTimeout(total=5),
        ) as resp:
            if resp.status == 200:
                config = await resp.json()
                mode = config.get("mode", "yaml")
                logger.info(f"Lovelace mode detected: {mode}")
                return mode == "yaml"
            else:
                logger.warning(
                    f"Could not determine Lovelace mode (status {resp.status})"
                )
                return False
    except Exception as e:
        logger.warning(f"Could not check Lovelace mode: {e}")
        return False


async def register():
    if not SUPERVISOR_TOKEN:
        logger.error("SUPERVISOR_TOKEN not found in environment.")
        logger.error("Cannot auto-register frontend resource.")
        logger.error("")
        logger.error("Please add this resource manually in Home Assistant:")
        logger.error(f"  URL: {RESOURCE_URL}")
        logger.error(f"  Type: {RESOURCE_TYPE}")
        logger.error("")
        logger.error("In UI mode: Settings > Dashboards > Resources > Add Resource")
        logger.error("In YAML mode: Add to configuration.yaml:")
        logger.error("  lovelace:")
        logger.error("    resources:")
        logger.error(f"      - url: {RESOURCE_URL}")
        logger.error(f"        type: {RESOURCE_TYPE}")
        return

    headers = {
        "Authorization": f"Bearer {SUPERVISOR_TOKEN}",
        "Content-Type": "application/json",
    }

    async with aiohttp.ClientSession() as session:
        # Check if Lovelace is in YAML mode
        is_yaml = await check_yaml_mode(session, headers)
        if is_yaml:
            logger.warning(
                "Lovelace is in YAML mode. Resources must be added manually."
            )
            logger.warning(f"Please add this to your configuration.yaml:")
            logger.warning(f"  lovelace:")
            logger.warning(f"    resources:")
            logger.warning(f"      - url: {RESOURCE_URL}")
            logger.warning(f"        type: {RESOURCE_TYPE}")
            return

        # Try to get existing resources
        try:
            async with session.get(
                f"{BASE_URL}/lovelace/resources", headers=headers
            ) as resp:
                if resp.status == 401:
                    logger.error("Unauthorized: Supervisor token rejected.")
                    return
                if resp.status == 404:
                    logger.warning(
                        "Resources endpoint not found. Trying alternative method..."
                    )
                    # Try without /api prefix
                    async with session.get(
                        f"http://supervisor/api/lovelace/resources", headers=headers
                    ) as alt_resp:
                        if alt_resp.status == 200:
                            resources = await alt_resp.json()
                        else:
                            logger.warning(
                                f"Alternative method failed (status {alt_resp.status})"
                            )
                            return
                elif resp.status != 200:
                    text = await resp.text()
                    logger.warning(
                        f"Could not list resources (Status {resp.status}): {text}"
                    )
                    return
                else:
                    resources = await resp.json()

        except Exception as e:
            logger.error(f"Error connecting to Home Assistant API: {e}")
            return

        # Check for duplicates
        for res in resources:
            if res.get("url") == RESOURCE_URL:
                logger.info(
                    f"Frontend resource already registered with ID {res.get('id')}."
                )
                return

        # Register resource
        logger.info(f"Registering new Lovelace resource: {RESOURCE_URL}")
        payload = {"url": RESOURCE_URL, "type": RESOURCE_TYPE}

        try:
            async with session.post(
                f"{BASE_URL}/lovelace/resources", headers=headers, json=payload
            ) as resp:
                if resp.status in [200, 201]:
                    data = await resp.json()
                    logger.info(
                        f"Successfully registered frontend resource! ID: {data.get('id')}"
                    )
                else:
                    text = await resp.text()
                    logger.error(f"Failed to register resource: {resp.status} - {text}")
        except Exception as e:
            logger.error(f"Error registering resource: {e}")


if __name__ == "__main__":
    try:
        asyncio.run(register())
    except Exception as e:
        logger.error(f"Unexpected error in registration script: {e}")
