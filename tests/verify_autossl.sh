#!/bin/bash
set -u

# Setup environment for testing
export SSL_DIR=$(mktemp -d)
export ADDON_SSL=$(mktemp -d)
export SUPERVISOR_TOKEN=""

SCRIPT="./ssl-setup.sh"
GREEN="\033[0;32m"
RED="\033[0;31m"
RESET="\033[0m"

echo "================================================="
echo "  Testing Autonomous SSL Cascade"
echo "  SSL_DIR: $SSL_DIR"
echo "  ADDON_SSL: $ADDON_SSL"
echo "================================================="

cleanup() {
    rm -rf "$SSL_DIR" "$ADDON_SSL"
}
trap cleanup EXIT

test_scenario_1_ha_certs() {
    echo -e "\n${GREEN}[TEST 1] Testing Priority 1: Home Assistant Certs${RESET}"
    
    # Create fake HA certs
    openssl req -x509 -newkey rsa:2048 -nodes -keyout "$SSL_DIR/privkey.pem" \
        -out "$SSL_DIR/fullchain.pem" -days 3650 -subj "/CN=localhost" 2>/dev/null

    # Run script
    source "$SCRIPT"
    setup_ssl

    if [ "$SSL_MODE" == "homeassistant" ] && [ "$CERT_FILE" == "$SSL_DIR/fullchain.pem" ]; then
        echo -e "${GREEN}PASS: Detected HA certs correctly${RESET}"
    else
        echo -e "${RED}FAIL: Did not detect HA certs. Mode: $SSL_MODE${RESET}"
        exit 1
    fi
}

test_scenario_2_ingress() {
    echo -e "\n${GREEN}[TEST 2] Testing Priority 2: Ingress Mode${RESET}"
    
    # Simulating clean env
    rm -rf "$SSL_DIR"/* "$ADDON_SSL"/*
    
    # Needs SUPERVISOR_TOKEN
    export SUPERVISOR_TOKEN="dummy_token"
    
    # Mock curl to return ingress: true
    # We create a fake curl function in the shell environment before sourcing
    curl() {
        echo '{"data": {"ingress": true}}'
    }
    export -f curl

    # Run script in subshell to isolate function mock
    (
        source "$SCRIPT"
        setup_ssl > /dev/null
        if [ "$SSL_MODE" == "ingress" ]; then
            echo -e "${GREEN}PASS: Detected Ingress mode correctly${RESET}"
        else
            echo -e "${RED}FAIL: Did not detect Ingress mode. Mode: $SSL_MODE${RESET}"
            exit 1
        fi
    )
    
    export SUPERVISOR_TOKEN=""
}

test_scenario_3_fallback_ca() {
    echo -e "\n${GREEN}[TEST 3] Testing Priority 3: Fallback CA Generation${RESET}"
    
    # Clean env
    rm -rf "$SSL_DIR"/* "$ADDON_SSL"/*
    unset curl
    export SUPERVISOR_TOKEN=""

    # Run script
    source "$SCRIPT"
    setup_ssl > /dev/null

    if [ "$SSL_MODE" == "self-signed" ]; then
        echo -e "${GREEN}PASS: Fell back to self-signed mode${RESET}"
    else
        echo -e "${RED}FAIL: Did not fallback. Mode: $SSL_MODE${RESET}"
        exit 1
    fi

    if [ -f "$ADDON_SSL/ca.crt" ] && [ -f "$ADDON_SSL/server.crt" ]; then
        echo -e "${GREEN}PASS: Generated CA and server certificates${RESET}"
    else
        echo -e "${RED}FAIL: Certificates missing in $ADDON_SSL${RESET}"
        ls -l "$ADDON_SSL"
        exit 1
    fi
}

# Run Tests
test_scenario_1_ha_certs
test_scenario_2_ingress
test_scenario_3_fallback_ca

echo -e "\n${GREEN}ALL TESTS PASSED${RESET}"
