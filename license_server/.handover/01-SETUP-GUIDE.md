# Setup Guide - WebRTC License Server

**Last Updated**: 2026-03-17  
**Verified On**: Linux (Ubuntu 22.04), Docker 24.0, Python 3.11

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (Development)](#quick-start-development)
3. [Production Deployment](#production-deployment)
4. [Configuration Reference](#configuration-reference)
5. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Docker | 20.10+ | Container runtime |
| Docker Compose | 2.0+ | Multi-service orchestration |
| Python | 3.11+ | Local development scripts |
| OpenSSL | 1.1.1+ | SSL certificate generation |
| curl | 7.0+ | API testing |

### Verify Prerequisites

```bash
docker --version
docker compose version
python3 --version
openssl version
```

### System Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 1 core | 2 cores |
| RAM | 512 MB | 1 GB |
| Disk | 2 GB | 5 GB |
| Network | Port 80, 443 | Port 80, 443 |

---

## Quick Start (Development)

### Step 1: Clone Repository

```bash
cd /mnt/Files/Programming/playground/webrtc_backend/license_server
```

### Step 2: Generate Environment Configuration

```bash
# Copy template
cp .env.example .env

# View required variables
cat .env.example
```

### Step 3: Generate Admin Credentials

**Option A: Interactive Script (Recommended)**

```bash
python3 generate_admin_hash.py
```

You'll be prompted for:
- Admin email (e.g., `admin@example.com`)
- Password (min 8 characters)
- Password confirmation

The script outputs:
```
=== Add these to your .env file ===
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD_HASH=$2b$12$...
```

**Option B: Manual Generation**

```python
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
password_hash = pwd_context.hash("your_secure_password")
print(password_hash)
```

### Step 4: Generate SECRET_KEY

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

Copy the output and add to `.env`:
```
SECRET_KEY=your_generated_secret_key_here
```

### Step 5: Update Environment File

Edit `.env` with your values:

```bash
# Database (default works for Docker)
DATABASE_URL=postgresql://license_user:license_pass@db:5432/webrtc_licenses

# Security (REQUIRED - change these!)
SECRET_KEY=your_32_char_random_string_here
ADMIN_EMAIL=your_admin_email@example.com
ADMIN_PASSWORD_HASH=$2b$12$your_bcrypt_hash_here

# CORS (optional - default allows all)
ALLOWED_ORIGINS=http://localhost,https://localhost

# Environment (optional - default is development)
ENVIRONMENT=development
```

### Step 6: Build and Start Services

```bash
# Build all containers
docker compose build

# Start services (detached mode)
docker compose up -d

# View logs
docker compose logs -f
```

### Step 7: Verify Health

```bash
# Check service health
curl -k https://localhost/health

# Expected response:
# {"status":"healthy","database":"healthy","timestamp":"..."}
```

### Step 8: Access Dashboard

1. Open browser: `https://localhost`
2. Accept self-signed certificate warning
3. Login with admin credentials from Step 3

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Strong SECRET_KEY generated (32+ random characters)
- [ ] Admin password hash created (min 12 char password)
- [ ] SSL certificates obtained (Let's Encrypt recommended)
- [ ] ALLOWED_ORIGINS restricted to production domain
- [ ] Database credentials changed from defaults
- [ ] Firewall configured (ports 80, 443 only)
- [ ] Backup strategy for RSA keys and database

### Step 1: Secure Environment Configuration

Create production `.env`:

```bash
# Production Database (use strong password)
DATABASE_URL=postgresql://license_user:STRONG_PASSWORD_HERE@db:5432/webrtc_licenses

# Production Security
SECRET_KEY=64_char_cryptographically_secure_random_string
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD_HASH=$2b$12$... (use generate_admin_hash.py)

# Production CORS (restrict to your domain)
ALLOWED_ORIGINS=https://yourdomain.com

# Production Environment
ENVIRONMENT=production
```

### Step 2: SSL Certificates

**Option A: Let's Encrypt (Recommended)**

```bash
# Install certbot
sudo apt install certbot

# Obtain certificate (replace with your domain)
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates to project
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/key.pem

# Set permissions
chmod 644 nginx/cert.pem
chmod 600 nginx/key.pem
```

**Option B: Self-Signed (Testing Only)**

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/key.pem \
  -out nginx/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=yourdomain.com"
```

### Step 3: Update nginx Configuration

Edit `nginx/nginx.conf` for production:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### Step 4: Docker Compose Production Configuration

Update `docker-compose.yml` for production:

```yaml
services:
  license_server:
    environment:
      - ENVIRONMENT=production
      - SECRET_KEY=${SECRET_KEY}
      - ADMIN_EMAIL=${ADMIN_EMAIL}
      - ADMIN_PASSWORD_HASH=${ADMIN_PASSWORD_HASH}
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M

  db:
    restart: unless-stopped
    volumes:
      - license_postgres_data:/var/lib/postgresql/data
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
```

### Step 5: Deploy

```bash
# Build with production settings
docker compose build

# Start services
docker compose up -d

# Verify all services running
docker compose ps

# Check logs
docker compose logs -f license_server
```

### Step 6: Backup RSA Keys

**CRITICAL**: Backup the RSA private key immediately!

```bash
# Locate private key (inside container)
docker compose exec license_server cat /keys/private_key.pem > backup_private_key.pem

# Secure backup
chmod 600 backup_private_key.pem
# Store in secure location (encrypted, offline)
```

### Step 7: Configure Database Backups

```bash
# Create backup script
cat > backup_db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker compose exec -T db pg_dump -U license_user webrtc_licenses > backup_${DATE}.sql
# Keep only last 7 backups
ls -t backup_*.sql | tail -n +8 | xargs rm -f
EOF

chmod +x backup_db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /path/to/backup_db.sh
```

---

## Configuration Reference

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | `sqlite:////keys/licenses.db` | PostgreSQL connection string. Format: `postgresql://user:pass@host:port/dbname` |
| `SECRET_KEY` | Yes | Random | Session signing key. Min 32 characters. Use `secrets.token_urlsafe(32)` |
| `ADMIN_EMAIL` | Yes | `admin@example.com` | Admin login email |
| `ADMIN_PASSWORD_HASH` | Yes | None | Bcrypt hash of admin password. Generate with `generate_admin_hash.py` |
| `ALLOWED_ORIGINS` | No | `*` | Comma-separated CORS origins. Production: restrict to your domain |
| `ENVIRONMENT` | No | `development` | `production` or `development`. Affects cookie security settings |

### Docker Volumes

| Volume | Purpose | Backup Priority |
|--------|---------|-----------------|
| `license_keys` | RSA keys, SSL certs | **CRITICAL** |
| `license_postgres_data` | Database files | **CRITICAL** |
| `license_logs` | nginx logs | Low |

### Port Mapping

| Service | Internal | External | Purpose |
|---------|----------|----------|---------|
| nginx | 80 | 80 | HTTP redirect |
| nginx | 443 | 443 | HTTPS |
| license_server | 8000 | 8000 | Direct API access (dev only) |
| db | 5432 | - | Internal only |

---

## Troubleshooting

### Service Won't Start

**Symptom**: `license_server` container exits immediately

```bash
# Check logs
docker compose logs license_server

# Common causes:
# 1. DATABASE_URL invalid - verify connection string
# 2. SECRET_KEY missing - ensure .env file loaded
# 3. ADMIN_PASSWORD_HASH not set - run generate_admin_hash.py
```

### Database Connection Failed

**Symptom**: `unhealthy: (psycopg2.OperationalError) could not translate host name`

```bash
# Verify db service is running
docker compose ps db

# Check db logs
docker compose logs db

# Test connection from license_server
docker compose exec license_server python3 -c "
from sqlalchemy import create_engine
engine = create_engine('postgresql://license_user:license_pass@db:5432/webrtc_licenses')
conn = engine.connect()
print('Connection successful!')
"
```

### SSL Certificate Errors

**Symptom**: Browser shows `ERR_SSL_VERSION_OR_CIPHER_MISMATCH`

```bash
# Verify certificates exist
docker compose exec nginx ls -la /etc/nginx/ssl/

# Check certificate validity
openssl x509 -in nginx/cert.pem -text -noout | grep -A2 "Validity"

# Regenerate if expired
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/key.pem -out nginx/cert.pem \
  -subj "/CN=localhost"
```

### Admin Login Fails

**Symptom**: `Invalid credentials` despite correct password

```bash
# Verify ADMIN_EMAIL and ADMIN_PASSWORD_HASH in .env
docker compose exec license_server env | grep ADMIN

# Regenerate password hash
python3 generate_admin_hash.py

# Restart service
docker compose restart license_server
```

### Hardware Fingerprinting Fails

**Symptom**: `Hardware ID generation error` on non-Linux systems

**Cause**: Hardware fingerprinting is Linux-specific (`/etc/machine-id`, `blkid`)

**Solution**: 
- For development on Windows/Mac: Use Docker Linux container
- For production: Deploy on Linux server only

### Rate Limiting Too Aggressive

**Symptom**: `429 Too Many Requests` during testing

```bash
# Temporarily increase limits in nginx/nginx.conf
# Edit: limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;

# Reload nginx
docker compose exec nginx nginx -s reload
```

### RSA Key Not Found

**Symptom**: `FileNotFoundError: /keys/private_key.pem`

```bash
# Check volume mount
docker compose exec license_server ls -la /keys/

# Keys are generated on first run - check container logs
docker compose logs license_server | grep "Generating"

# If lost, delete and restart (WARNING: invalidates all tokens!)
docker compose down -v
docker compose up -d
```

---

## Development Workflow

### Local Development (Without Docker)

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL=sqlite:////keys/licenses.db
export SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
export ADMIN_EMAIL=admin@example.com
export ADMIN_PASSWORD_HASH=$(python3 generate_admin_hash.py)

# Run server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Running Tests

```bash
cd tests

# Run integration tests
chmod +x test_license_server.sh
./test_license_server.sh

# View test coverage (if pytest configured)
pytest --cov=.
```

### Debugging

```bash
# Enable debug logging
export LOG_LEVEL=DEBUG

# Run with pdb on error
python3 -m pdb main.py

# Or use VS Code debugger with launch.json:
{
    "name": "Python: FastAPI",
    "type": "python",
    "request": "launch",
    "module": "uvicorn",
    "args": ["main:app", "--reload"],
    "console": "integratedTerminal"
}
```

---

## Maintenance Operations

### Rotate Admin Password

```bash
# Generate new hash
python3 generate_admin_hash.py

# Update .env
nano .env  # Update ADMIN_PASSWORD_HASH

# Restart service (no data loss)
docker compose restart license_server
```

### View Active Sessions

```bash
# Via API (requires admin login)
curl -k https://localhost/api/v1/admin/sessions \
  -H "Cookie: admin_session=YOUR_SESSION_TOKEN"

# Via database
docker compose exec db psql -U license_user -d webrtc_licenses \
  -c "SELECT session_id, hardware_id, last_heartbeat FROM session_states WHERE active=true;"
```

### Suspend License Manually

```bash
# Via API
curl -k -X PATCH https://localhost/api/v1/admin/licenses/PURCHASE_CODE \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_session=YOUR_SESSION_TOKEN" \
  -d '{"action": "suspend", "reason": "Manual suspension"}'

# Via database
docker compose exec db psql -U license_user -d webrtc_licenses \
  -c "UPDATE licenses SET status='suspended', suspension_reason='Manual' WHERE purchase_code='PURCHASE_CODE';"
```

### Export Validation Logs

```bash
docker compose exec db psql -U license_user -d webrtc_licenses \
  -c "COPY (SELECT * FROM validation_logs WHERE validated_at > NOW() - INTERVAL '7 days') TO STDOUT WITH CSV HEADER" > validation_logs_week.csv
```

---

## Next Steps

After setup:
1. Read **[02-ARCHITECTURE.md](./02-ARCHITECTURE.md)** for system design
2. Review **[04-GOTCHAS.md](./04-GOTCHAS.md)** for known issues
3. Complete **[05-ONBOARDING-CHECKLIST.md](./05-ONBOARDING-CHECKLIST.md)** tasks
