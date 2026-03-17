# Architecture Documentation - WebRTC License Server

**Last Updated**: 2026-03-17  
**Architecture Pattern**: Layered Architecture with Security-First Design

---

## Table of Contents

1. [System Overview](#system-overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Component Architecture](#component-architecture)
4. [Data Flow](#data-flow)
5. [Security Architecture](#security-architecture)
6. [Database Schema](#database-schema)
7. [API Architecture](#api-architecture)

---

## System Overview

### Context Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         External Systems                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐ │
│  │  Add-on CLI │         │   Browser   │         │  Monitoring │ │
│  │  (Customer) │         │  (Admin UI) │         │   Systems   │ │
│  └──────┬──────┘         └──────┬──────┘         └──────┬──────┘ │
│         │                       │                        │       │
└─────────┼───────────────────────┼────────────────────────┼───────┘
          │                       │                        │
          │ Hardware ID           │ HTTPS                  │ Logs
          │ Token Validation      │ Session Cookie         │ Metrics
          │ Heartbeat             │ Dashboard Data         │ Alerts
          │                       │                        │
┌─────────┼───────────────────────┼────────────────────────┼───────┐
│         ▼                       ▼                        ▼       │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    License Server System                     │ │
│  │  ┌──────────────────────────────────────────────────────┐   │ │
│  │  │                    nginx (Reverse Proxy)              │   │ │
│  │  │  • SSL Termination                                    │   │ │
│  │  │  • Rate Limiting (5/min login, 10r/s API)            │   │ │
│  │  │  • Static File Serving (dashboard)                   │   │ │
│  │  └─────────────────────────┬────────────────────────────┘   │ │
│  │                            │                                 │ │
│  │  ┌─────────────────────────▼────────────────────────────┐   │ │
│  │  │              FastAPI Application Layer                │   │ │
│  │  │  • Authentication (session cookies)                  │   │ │
│  │  │  • Authorization (admin routes)                      │   │ │
│  │  │  • Business Logic (license lifecycle)                │   │ │
│  │  │  • Security Detection (fraud patterns)               │   │ │
│  │  └─────────────────────────┬────────────────────────────┘   │ │
│  │                            │                                 │ │
│  │  ┌─────────────────────────▼────────────────────────────┐   │ │
│  │  │              SQLAlchemy ORM Layer                     │   │ │
│  │  │  • Repository Pattern                                │   │ │
│  │  │  • Session Management                                │   │ │
│  │  │  • Transaction Handling                              │   │ │
│  │  └─────────────────────────┬────────────────────────────┘   │ │
│  │                            │                                 │ │
│  │  ┌─────────────────────────▼────────────────────────────┐   │ │
│  │  │                 PostgreSQL Database                  │   │ │
│  │  │  • licenses                                          │   │ │
│  │  │  • validation_logs                                   │   │ │
│  │  │  • security_incidents                                │   │ │
│  │  │  • session_states                                    │   │ │
│  │  └──────────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Volume Mounts (Persistent Storage)              │ │
│  │  /keys: RSA keys, SSL certs                                 │ │
│  │  /var/lib/postgresql/data: Database files                   │ │
│  │  /var/log/nginx: Access logs                                │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## High-Level Architecture

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  Admin Dashboard │  │  Public API     │                  │
│  │  (HTML/JS/CSS)  │  │  (REST/JSON)    │                  │
│  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  FastAPI Routes (main.py)                            │   │
│  │  • Authentication middleware                         │   │
│  │  • Request validation (Pydantic)                     │   │
│  │  • Business logic orchestration                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ TokenGenerator  │  │ HwFingerprint   │                  │
│  │  • JWT signing  │  │  • HW ID gen    │                  │
│  │  • Verification │  │  • Validation   │                  │
│  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Repository Layer                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  SQLAlchemy ORM (models.py)                          │   │
│  │  • LicenseRepository                                 │   │
│  │  • ValidationLogRepository                           │   │
│  │  • SecurityIncidentRepository                        │   │
│  │  • SessionStateRepository                            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                      │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │   PostgreSQL    │  │  File System    │                  │
│  │   Database      │  │  (RSA keys)     │                  │
│  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         Main Components                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  main.py (FastAPI Application)                        │    │
│  │  ──────────────────────────────────────────────────── │    │
│  │  Routes:                                              │    │
│  │  • /api/v1/activate       - Hardware registration     │    │
│  │  • /api/v1/validate       - Token validation          │    │
│  │  • /api/v1/heartbeat      - Session keepalive         │    │
│  │  • /api/v1/status/{code}  - License status            │    │
│  │  • /api/v1/admin/*        - Admin operations          │    │
│  │  • /api/v1/auth/*         - Authentication            │    │
│  │                                                       │    │
│  │  Dependencies:                                        │    │
│  │  • require_admin()        - Session auth check        │    │
│  │  • get_db()               - DB session provider       │    │
│  │  • detect_concurrent_sessions() - Fraud detection    │    │
│  │  • create_security_incident() - Incident logging     │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  token_generator.py (Token Service)                   │    │
│  │  ──────────────────────────────────────────────────── │    │
│  │  Class: TokenGenerator                                │    │
│  │                                                       │    │
│  │  Methods:                                             │    │
│  │  • generate_license_token()  - Create JWT + checksum │    │
│  │  • verify_token()            - Validate + verify HW  │    │
│  │  • get_public_key_pem()      - Return public key     │    │
│  │                                                       │    │
│  │  Security:                                            │    │
│  │  • RSA-4096 asymmetric encryption                    │    │
│  │  • Dual-layer binding (JWT claim + SHA256 checksum) │    │
│  │  • Hardcoded salt: webrtc_salt_2024                  │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  hw_fingerprint.py (Hardware Service)                 │    │
│  │  ──────────────────────────────────────────────────── │    │
│  │  Functions:                                           │    │
│  │  • generate_hardware_id()     - Create SHA256 hash   │    │
│  │  • validate_hardware_components() - 60% match check  │    │
│  │                                                       │    │
│  │  Hardware Sources (Linux-only):                       │    │
│  │  • /etc/machine-id                                    │    │
│  │  • MAC address                                        │    │
│  │  • CPU serial (/proc/cpuinfo)                        │    │
│  │  • Disk UUID (blkid)                                 │    │
│  │  • Hostname                                           │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  models.py (Data Models)                              │    │
│  │  ──────────────────────────────────────────────────── │    │
│  │  Entities:                                            │    │
│  │  • License         - License records                 │    │
│  │  • ValidationLog   - Audit trail                     │    │
│  │  • SecurityIncident - Fraud detection                │    │
│  │  • SessionState    - Active sessions                 │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Interactions

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Request    │─────▶│  main.py     │─────▶│  TokenGen    │
│  (Activate)  │      │  (Route)     │      │  (Service)   │
└──────────────┘      └──────┬───────┘      └──────────────┘
                             │
                             ▼
                      ┌──────────────┐      ┌──────────────┐
                      │  HwFingerprint│◀────│   License    │
                      │  (Service)    │      │   (Model)    │
                      └──────────────┘      └──────────────┘
```

---

## Data Flow

### License Activation Flow

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Add-on    │      │License Server│      │  Database   │
│   (Client)  │      │  (FastAPI)   │      │ (PostgreSQL)│
└──────┬──────┘      └──────┬───────┘      └──────┬──────┘
       │                    │                      │
       │ 1. POST /activate  │                      │
       │    {email,         │                      │
       │     purchase_code, │                      │
       │     hardware_id,   │                      │
       │     components}    │                      │
       │───────────────────▶│                      │
       │                    │                      │
       │                    │ 2. Lookup license    │
       │                    │    by email+code     │
       │                    │─────────────────────▶│
       │                    │                      │
       │                    │ 3. License found     │
       │                    │    (status: pending) │
       │                    │◀─────────────────────│
       │                    │                      │
       │                    │ 4. Store hardware_id │
       │                    │    + components      │
       │                    │─────────────────────▶│
       │                    │                      │
       │                    │ 5. Return PENDING_   │
       │                    │    token             │
       │◀───────────────────│                      │
       │                    │                      │
       │ 6. Admin approves  │                      │
       │    (dashboard)     │                      │
       │───────────────────▶│                      │
       │                    │                      │
       │                    │ 7. Generate JWT      │
       │                    │    (RSA-signed)      │
       │                    │─────────────────────▶│
       │                    │    Update status     │
       │                    │    to "active"       │
       │                    │─────────────────────▶│
       │                    │                      │
       │ 8. Return active   │                      │
       │    token           │                      │
       │◀───────────────────│                      │
       │                    │                      │
```

### Token Validation Flow

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Add-on    │      │License Server│      │  Security   │
│   (Client)  │      │  (FastAPI)   │      │   Detector  │
└──────┬──────┘      └──────┬───────┘      └──────┬──────┘
       │                    │                      │
       │ 1. POST /validate  │                      │
       │    {token,         │                      │
       │     hardware_id,   │                      │
       │     session_id,    │                      │
       │     telemetry}     │                      │
       │───────────────────▶│                      │
       │                    │                      │
       │                    │ 2. Decode JWT        │
       │                    │    (base64)          │
       │                    │                      │
       │                    │ 3. Verify RSA        │
       │                    │    signature         │
       │                    │                      │
       │                    │ 4. Verify checksum   │
       │                    │    (SHA256)          │
       │                    │                      │
       │                    │ 5. Check hardware    │
       │                    │    match (≥60%)      │
       │                    │─────────────────────▶│
       │                    │                      │
       │                    │ 6. Hardware mismatch?│
       │                    │─────────────────────▶│
       │                    │    Create incident   │
       │                    │    Auto-suspend      │
       │                    │◀─────────────────────│
       │                    │                      │
       │                    │ 7. Check concurrent  │
       │                    │    sessions          │
       │                    │─────────────────────▶│
       │                    │                      │
       │                    │ 8. Log validation    │
       │                    │    Update heartbeat  │
       │                    │                      │
       │ 9. Return valid    │                      │
       │    {valid: true,   │                      │
       │     expires_at,    │                      │
       │     warning_count} │                      │
       │◀───────────────────│                      │
       │                    │                      │
```

### Security Incident Flow

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Validation │      │  Incident    │      │   License   │
│  Request    │      │  Detector    │      │   Manager   │
└──────┬──────┘      └──────┬───────┘      └──────┬──────┘
       │                    │                      │
       │ Hardware mismatch  │                      │
       │ detected           │                      │
       │───────────────────▶│                      │
       │                    │                      │
       │                    │ Create SecurityIncident
       │                    │ type: hardware_mismatch
       │                    │ severity: critical    │
       │                    │─────────────────────▶│
       │                    │                      │
       │                    │                      │ Auto-suspend
       │                    │                      │ license
       │                    │                      │ (status=suspended)
       │                    │                      │
       │                    │ Incident logged      │
       │                    │◀─────────────────────│
       │                    │                      │
       │ Return 403         │                      │
       │ "Hardware mismatch"│                      │
       │◀───────────────────│                      │
       │                    │                      │
```

---

## Security Architecture

### Authentication Flow

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Browser   │      │License Server│      │   Session   │
│   (Admin)   │      │  (FastAPI)   │      │   Store     │
└──────┬──────┘      └──────┬───────┘      └──────┬──────┘
       │                    │                      │
       │ 1. POST /auth/login│                      │
       │    {email,         │                      │
       │     password}      │                      │
       │───────────────────▶│                      │
       │                    │                      │
       │                    │ 2. Verify password   │
       │                    │    (bcrypt)          │
       │                    │                      │
       │                    │ 3. Create session    │
       │                    │    token (itsdangerous)
       │                    │─────────────────────▶│
       │                    │                      │
       │ 4. Set cookie      │                      │
       │    admin_session    │                      │
       │    (httpOnly,       │                      │
       │     secure,         │                      │
       │     sameSite=lax)   │                      │
       │◀───────────────────│                      │
       │                    │                      │
       │ 5. Subsequent      │                      │
       │    requests with   │                      │
       │    cookie          │                      │
       │───────────────────▶│                      │
       │                    │                      │
       │                    │ 6. Verify session    │
       │                    │    (require_admin)   │
       │                    │─────────────────────▶│
       │                    │                      │
       │                    │ 7. Session valid     │
       │                    │◀─────────────────────│
       │                    │                      │
       │ 8. Return data     │                      │
       │◀───────────────────│                      │
       │                    │                      │
```

### Token Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│              License Token Security Stack                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 1: Base64 Encoding                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │ base64(JWT_token.checksum)                         │    │
│  │ Purpose: Obfuscation (NOT encryption)              │    │
│  └────────────────────────────────────────────────────┘    │
│                          │                                   │
│                          ▼                                   │
│  Layer 2: JWT (RS256)                                        │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Header: {"alg": "RS256", "typ": "JWT"}            │    │
│  │ Payload: {                                         │    │
│  │   "sub": user_email,                              │    │
│  │   "hwid": hardware_id,     ← Hardware binding     │    │
│  │   "purchase_code": code,                          │    │
│  │   "iat": issued_at,                               │    │
│  │   "exp": expires_at,       ← Expiration           │    │
│  │   "jti": unique_id                                │    │
│  │ }                                                  │    │
│  │ Signature: RSA-4096 SHA256                        │    │
│  └────────────────────────────────────────────────────┘    │
│                          │                                   │
│                          ▼                                   │
│  Layer 3: Hardware Checksum                                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │ checksum = SHA256(token|hwid|webrtc_salt_2024)[:24]│    │
│  │ Purpose: Prevent token extraction + reuse          │    │
│  │ Even if JWT is decoded, checksum prevents reuse    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Rate Limiting Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                  Rate Limiting Configuration                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Endpoint: /api/v1/auth/login                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Zone: login                                        │    │
│  │ Limit: 5 requests/minute                          │    │
│  │ Burst: 3                                          │    │
│  │ Purpose: Prevent brute force password attacks     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Endpoint: /api/* (general API)                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Zone: api_limit                                    │    │
│  │ Limit: 10 requests/second                         │    │
│  │ Purpose: Prevent API abuse, DDoS                  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Implementation: nginx limit_req_zone + SlowAPI            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   Database Schema (PostgreSQL)               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐                                           │
│  │   licenses   │                                           │
│  ├──────────────┤                                           │
│  │ id (PK)      │──┬────────────────────────────────┐      │
│  │ user_email   │  │                                │      │
│  │ purchase_code│  │                                │      │
│  │ hardware_id  │  │                                │      │
│  │ token        │  │                                │      │
│  │ expires_at   │  │                                │      │
│  │ status       │  │                                │      │
│  │ warning_count│  │                                │      │
│  └──────────────┘  │                                │      │
│         │          │                                │      │
│         │ 1:N      │ N:1                            │ N:1  │
│         ▼          ▼                                ▼      │
│  ┌──────────────┐ ┌──────────────┐       ┌──────────────┐ │
│  │validation_   │ │security_     │       │session_      │ │
│  │logs          │ │incidents     │       │states        │ │
│  ├──────────────┤ ├──────────────┤       ├──────────────┤ │
│  │id (PK)       │ │id (PK)       │       │id (PK)       │ │
│  │license_id(FK)│ │license_id(FK)│       │license_id(FK)│ │
│  │validated_at  │ │detected_at   │       │session_id    │ │
│  │ip_address    │ │incident_type │       │hardware_id   │ │
│  │hardware_id   │ │severity      │       │last_heartbeat│ │
│  │session_id    │ │action_taken  │       │active        │ │
│  │validation_   │ │              │       │              │ │
│  │success       │ │              │       │              │ │
│  └──────────────┘ └──────────────┘       └──────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Table Specifications

#### licenses

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, default uuid4() | Unique license identifier |
| user_email | VARCHAR(255) | UNIQUE, NOT NULL, INDEX | Customer email |
| purchase_code | VARCHAR(255) | UNIQUE, NOT NULL | License purchase code |
| hardware_id | VARCHAR(128) | UNIQUE, nullable, INDEX | Bound hardware fingerprint |
| hardware_components | JSON | nullable | Component details for validation |
| token | TEXT | UNIQUE, nullable | JWT token (generated on activation) |
| issued_at | DATETIME | default utcnow() | License creation timestamp |
| expires_at | DATETIME | nullable | Expiration (null = unlimited) |
| last_validated | DATETIME | nullable | Last validation timestamp |
| status | VARCHAR(20) | NOT NULL | pending/active/suspended/revoked/expired |
| activation_count | INTEGER | default 0 | Number of activations |
| warning_count | INTEGER | default 0 | Concurrent session warnings |
| suspension_reason | TEXT | nullable | Auto-suspend reason |
| addon_version | VARCHAR(20) | nullable | Add-on version |
| created_ip | VARCHAR(45) | nullable | Creation IP address |

#### validation_logs

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique log identifier |
| license_id | UUID | FK → licenses.id, INDEX | Reference to license |
| validated_at | DATETIME | default utcnow(), INDEX | Validation timestamp |
| ip_address | VARCHAR(45) | NOT NULL | Client IP |
| hardware_id | VARCHAR(128) | NOT NULL | Hardware fingerprint |
| session_id | VARCHAR(64) | nullable | Session identifier |
| cpu_usage | FLOAT | nullable | Telemetry data |
| memory_usage | FLOAT | nullable | Telemetry data |
| uptime_seconds | INTEGER | nullable | Telemetry data |
| active_streams | INTEGER | nullable | Telemetry data |
| addon_version | VARCHAR(20) | nullable | Add-on version |
| country_code | VARCHAR(2) | nullable | Geolocation data |
| city | VARCHAR(100) | nullable | Geolocation data |
| validation_success | BOOLEAN | default True | Validation result |
| failure_reason | VARCHAR(255) | nullable | Failure reason if any |

#### security_incidents

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique incident identifier |
| license_id | UUID | FK → licenses.id, INDEX | Reference to license |
| detected_at | DATETIME | default utcnow() | Detection timestamp |
| incident_type | VARCHAR(50) | NOT NULL | hardware_mismatch/concurrent_sessions |
| severity | VARCHAR(20) | NOT NULL | low/medium/high/critical |
| details | JSON | nullable | Incident details |
| anomaly_score | FLOAT | nullable | Anomaly detection score |
| action_taken | VARCHAR(50) | nullable | logged/suspended/revoke |
| resolved | BOOLEAN | default False | Resolution status |
| resolved_at | DATETIME | nullable | Resolution timestamp |
| admin_notes | TEXT | nullable | Admin notes |

#### session_states

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique session identifier |
| license_id | UUID | FK → licenses.id, INDEX | Reference to license |
| session_id | VARCHAR(64) | UNIQUE, NOT NULL | Session identifier |
| hardware_id | VARCHAR(128) | NOT NULL | Hardware fingerprint |
| started_at | DATETIME | default utcnow() | Session start timestamp |
| last_heartbeat | DATETIME | default utcnow(), INDEX | Last heartbeat timestamp |
| ip_address | VARCHAR(45) | nullable | Session IP |
| active | BOOLEAN | default True, INDEX | Active status |

---

## API Architecture

### RESTful Design

```
┌─────────────────────────────────────────────────────────────┐
│                      API Endpoint Groups                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Public Endpoints (No Authentication)                       │
│  ─────────────────────────────────────────────────────────  │
│  POST   /api/v1/activate                                    │
│         Purpose: Register hardware, request activation      │
│         Body: {email, purchase_code, hardware_id,           │
│                hardware_components}                         │
│         Response: {success, token (PENDING_), status}       │
│                                                              │
│  POST   /api/v1/validate                                    │
│         Purpose: Validate license token                     │
│         Body: {token, hardware_id, session_id, telemetry}   │
│         Response: {valid, expires_at, status, warning_count}│
│                                                              │
│  POST   /api/v1/heartbeat                                   │
│         Purpose: Session keepalive                          │
│         Body: {token, session_id}                           │
│         Response: {success}                                 │
│                                                              │
│  GET    /api/v1/status/{purchase_code}                      │
│         Purpose: Check license status                       │
│         Response: {email, status, expires_at,               │
│                   last_validated, warning_count}            │
│                                                              │
│  GET    /api/v1/public_key                                  │
│         Purpose: Get RSA public key for offline validation  │
│         Response: {public_key (PEM)}                        │
│                                                              │
│  POST   /api/v1/auth/login                                  │
│         Purpose: Admin authentication                       │
│         Body: {email, password}                             │
│         Response: {success, email} + Set-Cookie             │
│                                                              │
│  POST   /api/v1/auth/logout                                 │
│         Purpose: Admin logout                               │
│         Response: {success} + Delete-Cookie                 │
│                                                              │
│  GET    /api/v1/auth/check                                  │
│         Purpose: Verify current session                     │
│         Response: {authenticated, email}                    │
│                                                              │
│  GET    /health                                             │
│         Purpose: Health check                               │
│         Response: {status, timestamp, database}             │
│                                                              │
│  Admin Endpoints (Require Session Cookie)                   │
│  ─────────────────────────────────────────────────────────  │
│  POST   /api/v1/admin/licenses                              │
│         Purpose: Create pending license                     │
│         Auth: require_admin()                               │
│         Body: {email, purchase_code, duration_days/unlimited│
│         Response: {success, message, email, purchase_code}  │
│                                                              │
│  GET    /api/v1/admin/licenses                              │
│         Purpose: List all licenses                          │
│         Auth: require_admin()                               │
│         Response: [{user_email, purchase_code, status,      │
│                    hardware_id, warning_count}]             │
│                                                              │
│  PATCH  /api/v1/admin/licenses/{purchase_code}              │
│         Purpose: Modify license                             │
│         Auth: require_admin()                               │
│         Body: {action, reason?, email?, extend_days?,       │
│                set_unlimited?, hardware_id?,                │
│                hardware_components?}                        │
│         Actions: activate|suspend|reinstate|revoke|reset|   │
│                  update                                     │
│         Response: {success, purchase_code, new_status}      │
│                                                              │
│  DELETE /api/v1/admin/licenses/{purchase_code}              │
│         Purpose: Delete license (cascade)                   │
│         Auth: require_admin()                               │
│         Response: {success, message}                        │
│                                                              │
│  GET    /api/v1/admin/sessions                              │
│         Purpose: List active sessions                       │
│         Auth: require_admin()                               │
│         Response: [{session_id, user_email, hardware_id,    │
│                    last_heartbeat}]                         │
│                                                              │
│  GET    /api/v1/admin/incidents                             │
│         Purpose: List security incidents                    │
│         Auth: require_admin()                               │
│         Response: [{incident_type, severity, action_taken,  │
│                    license_email, hardware_id, created_at}] │
│                                                              │
│  GET    /api/v1/admin/logs                                  │
│         Purpose: List validation logs                       │
│         Auth: require_admin()                               │
│         Response: [{user_email, session_id, is_valid,       │
│                    failure_reason, ip_address, country}]    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Next Steps

After understanding the architecture:
1. Read **[03-DECISION-LOG.md](./03-DECISION-LOG.md)** for why these decisions were made
2. Review **[04-GOTCHAS.md](./04-GOTCHAS.md)** for known issues
3. Complete **[05-ONBOARDING-CHECKLIST.md](./05-ONBOARDING-CHECKLIST.md)** tasks
