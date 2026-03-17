# WebRTC License Server - Handover Documentation

**Project**: WebRTC Backend License Server  
**Analysis Date**: 2026-03-17  
**Architecture Pattern**: Layered Architecture with Security-First Design  
**Tech Stack**: Python 3.11, FastAPI, PostgreSQL, SQLAlchemy, JWT (RSA-4096), Docker, nginx

---

## 🎯 What This System Does

A **license management server** for WebRTC add-on products that:

1. **Issues hardware-bound licenses** - Each license is cryptographically bound to a specific device's hardware fingerprint
2. **Validates licenses in real-time** - Add-ons must validate tokens on every session
3. **Detects fraud automatically** - Hardware mismatches and concurrent session abuse trigger auto-suspension
4. **Provides admin dashboard** - Web UI for license management, monitoring, and incident response

---

## 🏗️ System at a Glance

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Add-on CLI    │────▶│  License Server  │────▶│ PostgreSQL  │
│  (Customer HW)  │◀────│(FastAPI + nginx) │◀────│   Database  │
└─────────────────┘     └──────────────────┘     └─────────────┘
       │                        │
       │ 1. Activate (hwid)     │ Admin Dashboard
       │ 2. Validate (token)    │ (React + vanilla JS)
       │ 3. Heartbeat           │
       ▼                        ▼
┌─────────────────┐     ┌──────────────────┐
│  Hardware ID    │     │  Security Events │
│  (SHA256 hash)  │     │  & Audit Logs    │
└─────────────────┘     └──────────────────┘
```

---

## 🚀 Quick Start (5 Minutes)

### Prerequisites

- Docker & Docker Compose
- Python 3.11+ (for local development)
- Linux environment (hardware fingerprinting is Linux-specific)

### Development Setup

```bash
# 1. Clone and navigate to project
cd ./license_server

# 2. Copy environment template
cp .env.example .env

# 3. Generate admin credentials
python generate_admin_hash.py
# Follow prompts to create admin password hash
# Add the output to .env

# 4. Generate SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"
# Add to .env as SECRET_KEY

# 5. Start all services
docker compose up -d --build

# 6. Verify health
curl -k https://localhost/health

# 7. Access dashboard
# Open browser: https://localhost
# Login with ADMIN_EMAIL and password from step 3
```

### Run Tests

```bash
cd tests
chmod +x test_license_server.sh
./test_license_server.sh
```

---

## 📁 Documentation Index

| Document                                                       | Purpose                                            |
| -------------------------------------------------------------- | -------------------------------------------------- |
| **[01-SETUP-GUIDE.md](./01-SETUP-GUIDE.md)**                   | Detailed setup instructions for dev and production |
| **[02-ARCHITECTURE.md](./02-ARCHITECTURE.md)**                 | System design, data flow, and component diagrams   |
| **[03-DECISION-LOG.md](./03-DECISION-LOG.md)**                 | Why architectural decisions were made              |
| **[04-GOTCHAS.md](./04-GOTCHAS.md)**                           | Known issues, workarounds, and "gotchas"           |
| **[05-ONBOARDING-CHECKLIST.md](./05-ONBOARDING-CHECKLIST.md)** | New developer onboarding checklist                 |

---

## 🔑 Core Concepts

### Hardware Binding

Licenses are bound to a **hardware fingerprint** (SHA256 hash) generated from:

- `/etc/machine-id`
- MAC address
- CPU serial (from `/proc/cpuinfo`)
- Disk UUID (from `blkid`)
- Hostname

**Validation requires 60% component match** - allows minor hardware changes.

### Two-Step Activation

1. **Admin creates pending license** - No hardware bound yet
2. **Add-on registers hardware** - Calls `/api/v1/activate` with hardware_id
3. **Admin approves** - Clicks "Activate" in dashboard
4. **Token generated** - RSA-signed JWT with hardware binding

### Token Structure

```
base64(JWT_token.checksum)

Where:
- JWT_token = RS256 signed payload with hwid claim
- checksum = SHA256(token|hwid|webrtc_salt_2024)[:24]
```

### Security Auto-Response

| Trigger                        | Response                                          |
| ------------------------------ | ------------------------------------------------- |
| Hardware mismatch (validation) | Critical incident + auto-suspend                  |
| 3+ concurrent sessions         | High incident + warning count + auto-suspend at 3 |
| Invalid token                  | HTTP 401, logged                                  |
| Expired license                | HTTP 403, status set to "expired"                 |

---

## 📊 Database Schema (Simplified)

```
licenses
├── id (UUID)
├── user_email (unique)
├── purchase_code (unique)
├── hardware_id (unique, nullable)
├── hardware_components (JSON)
├── token (unique, nullable) - JWT token
├── expires_at (nullable) - null = unlimited
├── status - pending/active/suspended/revoked/expired
├── warning_count
└── suspension_reason

validation_logs - Every validation attempt
security_incidents - Auto-detected fraud attempts
session_states - Active sessions with heartbeat
```

---

## 🌐 API Endpoints

### Public (No Authentication)

```
POST /api/v1/activate           - Register hardware
POST /api/v1/validate           - Validate token
POST /api/v1/heartbeat          - Session keepalive
GET  /api/v1/status/{code}      - Check license status
GET  /api/v1/public_key         - Get RSA public key
POST /api/v1/auth/login         - Admin login
POST /api/v1/auth/logout        - Admin logout
GET  /api/v1/auth/check         - Verify session
GET  /health                    - Health check
```

### Admin (Requires Session Cookie)

```
POST   /api/v1/admin/licenses           - Create license
GET    /api/v1/admin/licenses           - List licenses
PATCH  /api/v1/admin/licenses/{code}    - Modify license
DELETE /api/v1/admin/licenses/{code}    - Delete license
GET    /api/v1/admin/sessions           - Active sessions
GET    /api/v1/admin/incidents          - Security incidents
GET    /api/v1/admin/logs               - Validation logs
```

---

## 🛡️ Security Features

| Feature            | Implementation                            |
| ------------------ | ----------------------------------------- |
| Password Storage   | Bcrypt hashing                            |
| Session Management | Signed cookies (itsdangerous), 24h expiry |
| Rate Limiting      | 5/min login, 10r/s API                    |
| Token Security     | RSA-4096 + hardware checksum              |
| Auto-Suspension    | On hardware mismatch or abuse             |
| Audit Trail        | All validations and incidents logged      |
| CORS               | Configurable allowed origins              |
| HTTPS              | nginx with SSL (self-signed for dev)      |

---

## ⚠️ Critical Gotchas

1. **Linux-only hardware fingerprinting** - Won't work on Windows
2. **RSA private key must be backed up** - Losing it invalidates all tokens
3. **No database migrations** - Schema changes are manual
4. **Hardcoded salt in token checksum** - `webrtc_salt_2024`
5. **Test credentials hardcoded** - `admin123` in test scripts

See **[04-GOTCHAS.md](./04-GOTCHAS.md)** for complete list.

---

## 📦 Deployment Checklist

### Pre-Production

- [ ] Generate strong SECRET_KEY (32+ chars)
- [ ] Create admin password hash with `generate_admin_hash.py`
- [ ] Update ALLOWED_ORIGINS to production domain
- [ ] Replace self-signed SSL with Let's Encrypt
- [ ] Backup RSA private key securely
- [ ] Configure database backups
- [ ] Set up monitoring/alerting

### Production

- [ ] ENVIRONMENT=production in .env
- [ ] HTTPS enforced (nginx)
- [ ] Firewall: only ports 80/443 open
- [ ] Rate limiting active
- [ ] Log aggregation configured
- [ ] Disaster recovery plan documented

---

## 🔧 Common Operations

### Reset Admin Password

```bash
python generate_admin_hash.py
# Update ADMIN_PASSWORD_HASH in .env
docker compose restart license_server
```

### View Logs

```bash
docker compose logs -f license_server
docker compose logs -f db
docker compose logs -f nginx
```

### Database Access

```bash
docker compose exec db psql -U license_user -d webrtc_licenses
```

### Emergency Auth Bypass

Add to `.env`:

```
DISABLE_AUTH=true
```

Then restart service. **Remove immediately after use!**

---

## 📞 Support & Maintenance

### Daily Tasks

- Monitor security incidents dashboard
- Review validation logs for anomalies
- Check active sessions count

### Weekly Tasks

- Review suspended licenses
- Backup database
- Check disk space for logs

### Monthly Tasks

- Rotate SECRET_KEY (requires re-issuing all tokens)
- Review and update ALLOWED_ORIGINS
- Audit admin access logs

---

## 🎓 Learning Resources

- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **SQLAlchemy ORM**: https://docs.sqlalchemy.org/
- **JWT Best Practices**: https://datatracker.ietf.org/doc/html/rfc8725
- **Docker Compose**: https://docs.docker.com/compose/

---

**Next Step**: Read **[01-SETUP-GUIDE.md](./01-SETUP-GUIDE.md)** for detailed setup instructions.
