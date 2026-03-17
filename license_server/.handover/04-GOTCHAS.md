# Gotchas & Known Issues - WebRTC License Server

**Last Updated**: 2026-03-17  
**Severity Legend**: 🔴 Critical | 🟡 Warning | ⚪ Info

---

## Table of Contents

1. [Critical Issues](#critical-issues)
2. [Security Gotchas](#security-gotchas)
3. [Development Gotchas](#development-gotchas)
4. [Production Gotchas](#production-gotchas)
5. [Database Gotchas](#database-gotchas)
6. [API Gotchas](#api-gotchas)
7. [Hardware Fingerprinting](#hardware-fingerprinting)
8. [Workarounds & Fixes](#workarounds--fixes)

---

## Critical Issues

### GOTCHA-001: Hardcoded Test Credentials 🔴

**Severity**: Critical  
**Location**: `tests/test_license_server.sh`  
**Issue**: Test script contains hardcoded credentials

```bash
# Line 32-33 in test_license_server.sh
curl -sk -X POST "$BASE_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@example.com","password":"admin123"}'
```

**Impact**: 
- Anyone with access to repo knows test credentials
- Could be accidentally deployed to production

**Workaround**:
```bash
# Before deploying, update test script:
sed -i 's/admin123/YOUR_TEST_PASSWORD/g' tests/test_license_server.sh
```

**Fix Required**: 
- Use environment variables for test credentials
- Add test credentials to `.env.test`

---

### GOTCHA-002: SQLite Fallback in Development 🔴

**Severity**: Critical  
**Location**: `main.py` line 28  
**Issue**: Default DATABASE_URL uses SQLite

```python
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:////keys/licenses.db")
```

**Impact**:
- SQLite doesn't handle concurrent writes well
- Production-like testing with SQLite may miss concurrency bugs
- Different SQL dialects (SQLite vs PostgreSQL)

**Workaround**:
```bash
# Always set DATABASE_URL explicitly, even in dev
export DATABASE_URL=postgresql://localhost:5432/webrtc_licenses
```

**Fix Required**:
- Remove default, make DATABASE_URL required
- Add validation on startup

---

### GOTCHA-003: Self-Signed SSL Certificates Generated at Build Time 🔴

**Severity**: Critical  
**Location**: `Dockerfile` lines 17-25  
**Issue**: SSL certs auto-generated during Docker build

```dockerfile
RUN if [ ! -f /keys/cert.pem ]; then \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /keys/key.pem \
        -out /keys/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=license-server" \
    fi
```

**Impact**:
- Self-signed certs not trusted by browsers
- Different certs on each rebuild (if /keys volume cleared)
- Production may accidentally use self-signed

**Workaround**:
```bash
# For production, mount Let's Encrypt certs:
volumes:
  - /etc/letsencrypt/live/yourdomain.com/fullchain.pem:/keys/cert.pem:ro
  - /etc/letsencrypt/live/yourdomain.com/privkey.pem:/keys/key.pem:ro
```

**Fix Required**:
- Don't generate certs in Dockerfile
- Require explicit cert mounting

---

### GOTCHA-004: RSA Private Key Must Be Backed Up 🔴

**Severity**: Critical  
**Location**: `/keys/private_key.pem` (inside container)  
**Issue**: Losing private key invalidates ALL existing tokens

**Impact**:
- Cannot generate new tokens for existing licenses
- Cannot validate tokens (public key derived from private)
- Must reissue all licenses if key lost

**Workaround**:
```bash
# Backup immediately after first run:
docker compose exec license_server cat /keys/private_key.pem > backup_private_key.pem
docker compose exec license_server cat /keys/public_key.pem > backup_public_key.pem

# Store backups securely (encrypted, offline)
chmod 600 backup_*.pem
```

**Fix Required**:
- Add backup warning to startup logs
- Document backup procedure prominently

---

### GOTCHA-005: No Database Migration System 🔴

**Severity**: Critical  
**Location**: N/A (missing)  
**Issue**: No Alembic or other migration tool configured

**Impact**:
- Schema changes require manual SQL scripts
- Production deployments risky without migrations
- No version tracking for database schema

**Workaround**:
```sql
-- Manual migration example (document every change)
-- Save as migrations/001_add_column.sql
ALTER TABLE licenses ADD COLUMN new_column VARCHAR(255);
```

**Fix Required**:
- Add Alembic configuration
- Generate initial migration
- Document migration workflow

---

## Security Gotchas

### GOTCHA-006: Hardcoded Salt in Token Checksum 🟡

**Severity**: Warning  
**Location**: `token_generator.py` line 77  
**Issue**: Salt value hardcoded in source code

```python
def _generate_hardware_checksum(self, token, hardware_id):
    combined = f"{token}|{hardware_id}|webrtc_salt_2024"
    return hashlib.sha256(combined.encode()).hexdigest()[:24]
```

**Impact**:
- Security through obscurity
- If source leaked, checksum easier to forge
- Cannot rotate salt without regenerating all tokens

**Workaround**: None (accept the risk)

**Fix Required**:
```python
# Use environment variable
SALT = os.getenv("TOKEN_SALT", "webrtc_salt_2024")
```

---

### GOTCHA-007: Hardware Fingerprinting Linux-Only 🟡

**Severity**: Warning  
**Location**: `hw_fingerprint.py`  
**Issue**: Reads Linux-specific files

```python
# Line 10-13
with open("/etc/machine-id", "r") as f:
    components["machine_id"] = f.read().strip()

# Line 30-38
subprocess.run(["blkid", "-s", "UUID", "-o", "value", "/dev/mmcblk0p2"])
```

**Impact**:
- Won't work on Windows or macOS
- Add-on must run on Linux only
- Limits customer base

**Workaround**: None (architectural limitation)

**Fix Required**:
- Add Windows support (WMI, registry)
- Add macOS support (IOKit)
- Or document Linux-only requirement clearly

---

### GOTCHA-008: Session Serializer Salt Hardcoded 🟡

**Severity**: Warning  
**Location**: `main.py` line 61  
**Issue**: Itsdangerous salt is hardcoded

```python
session_serializer = URLSafeTimedSerializer(SECRET_KEY)
# Salt "session" is hardcoded in calls:
session_serializer.dumps({"email": email}, salt="session")
```

**Impact**:
- Cannot rotate salt without invalidating all sessions
- Minor security risk (salt is meant to be public in itsdangerous)

**Workaround**: None (acceptable risk)

**Fix Required**: Not required (itsdangerous design)

---

### GOTCHA-009: Timing Attack Prevention Only on Login 🟡

**Severity**: Warning  
**Location**: `main.py` lines 680-681  
**Issue**: Only login endpoint has timing attack prevention

```python
if login_request.email != ADMIN_EMAIL:
    await asyncio.sleep(1)  # Prevent timing attacks
```

**Impact**:
- Token validation could leak timing information
- Attacker could determine valid tokens faster

**Workaround**: None

**Fix Required**:
```python
# Add constant-time comparison for token validation
async def validate_license(...):
    start_time = datetime.utcnow()
    # ... validation logic ...
    elapsed = datetime.utcnow() - start_time
    if elapsed < timedelta(seconds=0.1):
        await asyncio.sleep(0.1 - elapsed.total_seconds())
```

---

### GOTCHA-010: CORS Default Allows All Origins 🟡

**Severity**: Warning  
**Location**: `main.py` line 29  
**Issue**: Default ALLOWED_ORIGINS is wildcard

```python
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
```

**Impact**:
- Development default allows any origin
- Could be accidentally deployed to production
- CSRF risk if combined with cookie auth

**Workaround**:
```bash
# Always set explicitly in .env
ALLOWED_ORIGINS=https://yourdomain.com
```

**Fix Required**:
- Change default to empty list or localhost only
- Add production checklist item for CORS

---

## Development Gotchas

### GOTCHA-011: Frontend Bundle Not Rebuilt Automatically ⚪

**Severity**: Info  
**Location**: `frontend/bundle.js`  
**Issue**: Compiled bundle checked in, no build script visible

**Impact**:
- Changes to frontend source require manual rebuild
- Easy to forget to update bundle before commit

**Workaround**:
```bash
# Check if there's a build script
ls -la frontend/
# If package.json exists:
cd frontend && npm install && npm run build
```

**Fix Required**:
- Add build script to main Makefile or docker-compose
- Or use live-reload dev server

---

### GOTCHA-012: No Unit Tests, Only Integration Tests ⚪

**Severity**: Info  
**Location**: `tests/` directory  
**Issue**: Only bash integration tests, no Python unit tests

**Impact**:
- Hard to test individual functions
- Regression testing requires full server startup
- Slower development cycle

**Workaround**:
```bash
# Run integration tests
cd tests && ./test_license_server.sh
```

**Fix Required**:
- Add pytest configuration
- Add unit tests for token_generator.py, hw_fingerprint.py

---

### GOTCHA-013: Admin Password Hash Generator Script ⚪

**Severity**: Info  
**Location**: `generate_admin_hash.py`  
**Issue**: Separate script must be run manually

**Impact**:
- Extra step in setup
- Easy to forget
- Script requires passlib dependency

**Workaround**:
```bash
# Install dependency first
pip install passlib[bcrypt]
python generate_admin_hash.py
```

**Fix Required**:
- Add to requirements.txt
- Or integrate into setup script

---

### GOTCHA-014: Index.html References External API ⚪

**Severity**: Info  
**Location**: `index.html` → `frontend/bundle.js`  
**Issue**: API URL configured in frontend bundle

**Impact**:
- API URL may need to be updated for different environments
- Requires frontend rebuild to change API URL

**Workaround**:
```javascript
// In bundle.js, look for:
const API = "https://localhost";
// May need to update for production
```

**Fix Required**:
- Make API URL configurable via environment
- Or use relative paths

---

## Production Gotchas

### GOTCHA-015: Environment Variables Not Validated on Startup 🟡

**Severity**: Warning  
**Location**: `main.py`  
**Issue**: Server starts even with missing critical env vars

**Impact**:
- May run with insecure defaults
- Hard to debug configuration issues

**Workaround**:
```python
# Add validation at startup
@app.on_event("startup")
async def startup_event():
    required_vars = ["SECRET_KEY", "ADMIN_EMAIL", "ADMIN_PASSWORD_HASH"]
    for var in required_vars:
        if not os.getenv(var):
            raise RuntimeError(f"Missing required env var: {var}")
```

**Fix Required**:
- Add startup validation
- Fail fast on missing config

---

### GOTCHA-016: Log Rotation Not Configured ⚪

**Severity**: Info  
**Location**: nginx, application logs  
**Issue**: No logrotate configuration visible

**Impact**:
- Logs can fill up disk over time
- Manual intervention required

**Workaround**:
```bash
# Add logrotate config
cat > /etc/logrotate.d/license-server << 'EOF'
/var/log/nginx/*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
}
EOF
```

**Fix Required**:
- Add logrotate config to repo
- Or configure in Docker

---

### GOTCHA-017: No Health Check for RSA Keys ⚪

**Severity**: Info  
**Location**: `/health` endpoint  
**Issue**: Health check doesn't verify RSA keys exist

```python
@app.get("/health")
async def health_check():
    # Only checks database
    return {"status": "healthy", "database": db_status}
```

**Impact**:
- Server reports healthy even if keys missing
- Token generation will fail silently

**Workaround**:
```python
# Add key check to health endpoint
@app.get("/health")
async def health_check():
    keys_ok = os.path.exists("/keys/private_key.pem")
    return {
        "status": "healthy" if db_ok and keys_ok else "unhealthy",
        "database": db_status,
        "rsa_keys": "ok" if keys_ok else "missing"
    }
```

**Fix Required**:
- Update health endpoint

---

## Database Gotchas

### GOTCHA-018: No Cascade Delete Configured 🟡

**Severity**: Warning  
**Location**: `models.py` foreign keys  
**Issue**: Foreign keys don't have ON DELETE CASCADE

```python
license_id = Column(String(36), ForeignKey("licenses.id"), nullable=False)
# No ondelete='CASCADE'
```

**Impact**:
- Deleting license doesn't automatically delete related records
- Manual cleanup required in `admin_delete_license()`

**Workaround**: Already handled in code:
```python
# main.py line 633
db.query(ValidationLog).filter(ValidationLog.license_id == license.id).delete()
db.query(SecurityIncident).filter(SecurityIncident.license_id == license.id).delete()
db.query(SessionState).filter(SessionState.license_id == license.id).delete()
```

**Fix Required**:
- Add `ondelete='CASCADE'` to FKs
- Or keep manual cleanup (more control)

---

### GOTCHA-019: Timestamp Timezone Awareness 🟡

**Severity**: Warning  
**Location**: Multiple datetime columns  
**Issue**: `datetime.utcnow()` is naive (not timezone-aware)

```python
issued_at = Column(DateTime, default=datetime.utcnow, nullable=False)
```

**Impact**:
- Naive datetimes can cause issues with some databases
- Timezone conversions may be ambiguous

**Workaround**: None (PostgreSQL handles naive datetimes as local)

**Fix Required**:
```python
from datetime import datetime, timezone
# Use aware datetimes
default=lambda: datetime.now(timezone.utc)
```

---

### GOTCHA-020: Index on Low-Cardinality Column ⚪

**Severity**: Info  
**Location**: `models.py` line 94  
**Issue**: Index on `status` column (few unique values)

```python
__table_args__ = (Index("idx_status_expires", "status", "expires_at"),)
```

**Impact**:
- Index on `status` may not be very selective
- Query planner may ignore it

**Workaround**: None (index still useful for sorting)

**Fix Required**: Not required (composite index is reasonable)

---

## API Gotchas

### GOTCHA-021: Purchase Code in URL Path 🟡

**Severity**: Warning  
**Location**: `/api/v1/status/{purchase_code}`  
**Issue**: Purchase code exposed in URL

**Impact**:
- Purchase codes logged in access logs
- Browser history contains purchase codes

**Workaround**: None (RESTful design trade-off)

**Fix Required**:
- Use query parameter: `/api/v1/status?code=XXX`
- Or use POST with body

---

### GOTCHA-022: Token in Response Body 🟡

**Severity**: Warning  
**Location**: `/api/v1/activate` response  
**Issue**: Full token returned in JSON response

```python
return {
    "success": True,
    "token": license.token,  # Token in response
    ...
}
```

**Impact**:
- Token logged if response logged
- Token visible in browser dev tools

**Workaround**: None (acceptable for activation flow)

**Fix Required**: Not required (token must be returned)

---

### GOTCHA-023: No Pagination on List Endpoints 🟡

**Severity**: Warning  
**Location**: `/api/v1/admin/licenses`, `/api/v1/admin/logs`  
**Issue**: Returns all records, no pagination

**Impact**:
- Large datasets cause slow responses
- Memory issues with many licenses

**Workaround**:
```python
# Add pagination
@app.get("/api/v1/admin/licenses")
async def get_admin_licenses(
    skip: int = 0,
    limit: int = 100,
    ...
):
    licenses = db.query(License).offset(skip).limit(limit).all()
```

**Fix Required**:
- Add pagination parameters
- Set reasonable default limits

---

## Hardware Fingerprinting

### GOTCHA-024: Machine-ID Can Change 🟡

**Severity**: Warning  
**Location**: `hw_fingerprint.py` line 10  
**Issue**: `/etc/machine-id` can change on system updates

**Impact**:
- Legitimate hardware changes may break license
- Customer support tickets

**Workaround**: 60% threshold handles this

**Fix Required**: Not required (threshold handles it)

---

### GOTCHA-025: MAC Address Can Be Spoofed 🟡

**Severity**: Warning  
**Location**: `hw_fingerprint.py` line 16  
**Issue**: MAC address not reliable security boundary

**Impact**:
- Determined attackers can spoof MAC
- Part of defense-in-depth (combined with other components)

**Workaround**: None (accept as limitation)

**Fix Required**: Not required (60% threshold + other components compensate)

---

### GOTCHA-026: Blkid May Fail or Timeout 🟡

**Severity**: Warning  
**Location**: `hw_fingerprint.py` lines 30-43  
**Issue**: blkid command can fail or timeout

```python
try:
    result = subprocess.run(
        ["blkid", "-s", "UUID", "-o", "value", "/dev/mmcblk0p2"],
        capture_output=True,
        text=True,
        timeout=2,
    )
```

**Impact**:
- Hardware ID may be incomplete
- Different hardware IDs if some components fail

**Workaround**: None (handled by try/except and 60% threshold)

**Fix Required**: Not required (graceful degradation)

---

## Workarounds & Fixes

### Quick Fixes for Common Issues

#### Fix: Update Test Credentials
```bash
# Generate secure test password
python generate_admin_hash.py

# Update test script
sed -i 's/"password":"admin123"/"password":"YOUR_TEST_PASSWORD"/g' tests/test_license_server.sh
```

#### Fix: Backup RSA Keys
```bash
# Create backup directory
mkdir -p ~/license_backups

# Backup keys
docker compose exec license_server cat /keys/private_key.pem > ~/license_backups/private_key_$(date +%Y%m%d).pem
docker compose exec license_server cat /keys/public_key.pem > ~/license_backups/public_key_$(date +%Y%m%d).pem

# Set secure permissions
chmod 600 ~/license_backups/*.pem
```

#### Fix: Add Environment Validation
```python
# Add to main.py after imports
REQUIRED_ENV_VARS = ["SECRET_KEY", "ADMIN_EMAIL", "ADMIN_PASSWORD_HASH"]

@app.on_event("startup")
async def startup_event():
    missing = [var for var in REQUIRED_ENV_VARS if not os.getenv(var)]
    if missing:
        raise RuntimeError(f"Missing required environment variables: {missing}")
    logger.info("License server starting up...")
```

#### Fix: Add Health Check for RSA Keys
```python
@app.get("/health")
async def health_check():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    keys_status = "ok" if os.path.exists("/keys/private_key.pem") else "missing"

    return {
        "status": "healthy" if db_status == "healthy" and keys_status == "ok" else "unhealthy",
        "timestamp": datetime.utcnow().isoformat(),
        "database": db_status,
        "rsa_keys": keys_status
    }
```

---

## Summary by Severity

| Severity | Count | Action Required |
|----------|-------|-----------------|
| 🔴 Critical | 5 | Immediate attention |
| 🟡 Warning | 15 | Plan fixes |
| ⚪ Info | 7 | Nice to have |

---

## Next Steps

After reviewing gotchas:
1. Address critical issues before production deployment
2. Complete **[05-ONBOARDING-CHECKLIST.md](./05-ONBOARDING-CHECKLIST.md)** tasks
3. Document any additional gotchas discovered
