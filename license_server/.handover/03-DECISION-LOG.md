# Decision Log - WebRTC License Server

**Last Updated**: 2026-03-17  
**Purpose**: Document why architectural decisions were made

---

## Table of Contents

1. [Technology Decisions](#technology-decisions)
2. [Security Decisions](#security-decisions)
3. [Architecture Decisions](#architecture-decisions)
4. [Database Decisions](#database-decisions)
5. [API Design Decisions](#api-design-decisions)
6. [Operational Decisions](#operational-decisions)

---

## Technology Decisions

### DEC-001: Python + FastAPI for Backend

**Date**: 2024-Q4  
**Status**: Accepted  
**Context**: Need a backend framework for license management API

**Options Considered**:
1. **FastAPI** - Modern, async, auto OpenAPI docs
2. **Flask** - Simple, mature, but synchronous
3. **Django REST** - Full-featured, but heavy for this use case
4. **Node.js + Express** - Fast, but team has Python expertise

**Decision**: FastAPI

**Rationale**:
- **Async support** - Important for concurrent validation requests
- **Automatic OpenAPI docs** - Reduces documentation burden
- **Pydantic validation** - Built-in request/response validation
- **Performance** - Comparable to Node.js, faster than Flask
- **Type hints** - Better IDE support and fewer runtime errors

**Trade-offs**:
- ✅ Pros: Fast development, excellent docs, async-ready
- ❌ Cons: Younger ecosystem than Django/Flask

**Consequences**:
- Dependencies: `fastapi`, `uvicorn`, `pydantic`
- All endpoints use async/await pattern
- OpenAPI auto-generated at `/docs`

---

### DEC-002: PostgreSQL over SQLite for Production

**Date**: 2024-Q4  
**Status**: Accepted  
**Context**: Database selection for license storage

**Options Considered**:
1. **PostgreSQL** - Full-featured RDBMS
2. **SQLite** - Embedded, file-based
3. **MongoDB** - Document store
4. **Redis** - In-memory key-value

**Decision**: PostgreSQL (SQLite for development only)

**Rationale**:
- **Concurrency** - PostgreSQL handles concurrent writes better
- **Data integrity** - ACID compliance critical for license data
- **JSON support** - Need JSON column for `hardware_components`
- **Indexing** - Complex queries on validation logs need proper indexes
- **Scalability** - PostgreSQL scales better for production load

**Trade-offs**:
- ✅ Pros: Robust, ACID, JSON support, mature
- ❌ Cons: Requires separate service, more complex deployment

**Consequences**:
- Docker Compose includes `db` service
- Development can use SQLite fallback
- Connection string: `postgresql://user:pass@host:port/db`

---

### DEC-003: SQLAlchemy ORM

**Date**: 2024-Q4  
**Status**: Accepted  
**Context**: Database access layer

**Options Considered**:
1. **SQLAlchemy Core** - SQL expression language
2. **SQLAlchemy ORM** - Full ORM with sessions
3. **Peewee** - Lightweight ORM
4. **Raw SQL** - Maximum control

**Decision**: SQLAlchemy ORM

**Rationale**:
- **Abstraction** - Clean separation between business logic and SQL
- **Session management** - Automatic transaction handling
- **Migration support** - Works with Alembic (though not currently used)
- **Team familiarity** - Most developers know SQLAlchemy

**Trade-offs**:
- ✅ Pros: Clean code, session management, testable
- ❌ Cons: Learning curve, potential N+1 queries

**Consequences**:
- Models defined in `models.py`
- Session provider: `get_db()` dependency
- All queries use SQLAlchemy ORM API

---

### DEC-004: RSA-4096 for Token Signing

**Date**: 2024-Q4  
**Status**: Accepted  
**Context**: Cryptographic algorithm for license tokens

**Options Considered**:
1. **RSA-4096** - Asymmetric, well-understood
2. **ECDSA P-256** - Smaller keys, faster
3. **Ed25519** - Modern, fast, small signatures
4. **HMAC-SHA256** - Symmetric, simpler

**Decision**: RSA-4096 with RS256 (JWT)

**Rationale**:
- **Asymmetric** - Public key can be distributed for offline validation
- **Industry standard** - RSA widely understood and trusted
- **JWT support** - RS256 is standard JWT algorithm
- **Key size** - 4096-bit provides long-term security

**Trade-offs**:
- ✅ Pros: Asymmetric, standard, well-supported
- ❌ Cons: Larger signatures, slower than Ed25519

**Consequences**:
- Keys stored in `/keys/private_key.pem` and `/keys/public_key.pem`
- Public key exposed via `/api/v1/public_key`
- Token format: `base64(JWT.checksum)`

---

### DEC-005: nginx Reverse Proxy

**Date**: 2024-Q4  
**Status**: Accepted  
**Context**: Fronting the FastAPI application

**Options Considered**:
1. **nginx** - Mature, performant, feature-rich
2. **Traefik** - Modern, auto-discovery
3. **Caddy** - Auto-HTTPS, simple config
4. **Direct exposure** - No proxy

**Decision**: nginx

**Rationale**:
- **Rate limiting** - Built-in `limit_req_zone` for DDoS protection
- **SSL termination** - Offload HTTPS from application
- **Static file serving** - Serve dashboard HTML/CSS/JS efficiently
- **Load balancing** - Future-proof for horizontal scaling
- **Team familiarity** - Standard in existing infrastructure

**Trade-offs**:
- ✅ Pros: Mature, performant, rate limiting, SSL
- ❌ Cons: Additional service to manage

**Consequences**:
- nginx config in `nginx/nginx.conf`
- Rate limits: 5/min login, 10r/s API
- SSL certificates in `/keys/cert.pem` and `/keys/key.pem`

---

## Security Decisions

### DEC-006: Two-Layer Hardware Binding

**Date**: 2024-Q4  
**Status**: Accepted  
**Context**: Preventing license token reuse on different hardware

**Options Considered**:
1. **JWT claim only** - Include `hwid` in JWT payload
2. **Checksum only** - Append SHA256 checksum
3. **Two-layer** - JWT claim + checksum
4. **Encryption** - Encrypt entire token

**Decision**: Two-layer binding (JWT claim + SHA256 checksum)

**Rationale**:
- **Defense in depth** - Even if JWT is decoded, checksum prevents reuse
- **Performance** - Checksum verification is fast (no crypto)
- **Tamper detection** - Any modification breaks checksum
- **Salt** - Hardcoded salt (`webrtc_salt_2024`) adds obscurity

**Trade-offs**:
- ✅ Pros: Strong binding, fast verification, tamper-proof
- ❌ Cons: Hardcoded salt is security through obscurity

**Consequences**:
- Token format: `base64(jwt_token.checksum)`
- Checksum: `SHA256(token|hwid|webrtc_salt_2024)[:24]`
- Verification checks both JWT `hwid` claim and checksum

---

### DEC-007: 60% Hardware Match Threshold

**Date**: 2024-Q4  
**Status**: Accepted  
**Context**: Handling minor hardware changes

**Options Considered**:
1. **Exact match** - All components must match
2. **Majority match** - >50% components match
3. **60% threshold** - Specific percentage
4. **Weighted scoring** - Different weights for components

**Decision**: 60% match threshold

**Rationale**:
- **Flexibility** - Allows network card replacement, disk changes
- **Security** - Still detects major hardware changes (different machine)
- **Simplicity** - Easier than weighted scoring
- **Empirical** - Tested with common hardware change scenarios

**Trade-offs**:
- ✅ Pros: Flexible, handles legitimate hardware changes
- ❌ Cons: Could potentially allow some component swaps

**Consequences**:
- Implementation in `validate_hardware_components()`
- Match percentage calculated: `matching / stored * 100`
- Validation fails if < 60%

---

### DEC-008: Auto-Suspension on Security Events

**Date**: 2024-Q4  
**Status**: Accepted  
**Context**: Responding to detected fraud

**Options Considered**:
1. **Log only** - Record incident, no action
2. **Warn user** - Return warning in response
3. **Auto-suspend** - Automatically suspend license
4. **Manual review** - Queue for admin review

**Decision**: Auto-suspension for critical events

**Rationale**:
- **Immediate response** - Prevents continued abuse
- **Deterrent** - Users know license will be suspended
- **Reduced admin load** - Only legitimate users contact support
- **Audit trail** - All incidents logged for review

**Trade-offs**:
- ✅ Pros: Immediate protection, reduces admin work
- ❌ Cons: False positives require manual reinstatement

**Consequences**:
- Auto-suspend triggers:
  - Hardware mismatch (critical severity)
  - 3+ concurrent session warnings
- Admin must manually reinstate via dashboard
- All incidents logged in `security_incidents` table

---

### DEC-009: Session-Based Admin Authentication

**Date**: 2024-Q4  
**Status**: Accepted  
**Context**: Admin dashboard authentication

**Options Considered**:
1. **HTTP Basic Auth** - Simple, built-in
2. **Session cookies** - Stateful, user-friendly
3. **JWT tokens** - Stateless, modern
4. **OAuth2** - Enterprise SSO

**Decision**: Session cookies (itsdangerous)

**Rationale**:
- **Simplicity** - No token refresh logic needed
- **Security** - httpOnly cookies prevent XSS token theft
- **Browser handling** - Automatic cookie management
- **Logout** - Simple cookie deletion
- **No localStorage** - Tokens not exposed to JavaScript

**Trade-offs**:
- ✅ Pros: Simple, secure, easy logout
- ❌ Cons: Server-side state (minimal with signed cookies)

**Consequences**:
- Library: `itsdangerous.URLSafeTimedSerializer`
- Cookie name: `admin_session`
- Expiry: 24 hours
- Flags: httpOnly, secure (prod), sameSite=lax

---

### DEC-010: Rate Limiting Strategy

**Date**: 2024-Q4  
**Status**: Accepted  
**Context**: Preventing abuse and brute force

**Options Considered**:
1. **No rate limiting** - Trust users
2. **Global limiting** - One limit for all endpoints
3. **Endpoint-specific** - Different limits per endpoint
4. **User-based** - Per-user limits

**Decision**: Endpoint-specific rate limiting

**Rationale**:
- **Login protection** - 5/min prevents brute force
- **API protection** - 10r/s prevents DDoS
- **Flexibility** - Can tune per endpoint
- **Defense in depth** - nginx + SlowAPI

**Trade-offs**:
- ✅ Pros: Targeted protection, prevents specific attacks
- ❌ Cons: Configuration complexity

**Consequences**:
- nginx `limit_req_zone` for API (10r/s)
- SlowAPI for login endpoint (5/min)
- 429 response on limit exceeded

---

## Architecture Decisions

### DEC-011: Two-Step Activation Flow

**Date**: 2024-Q4  
**Status**: Accepted  
**Context**: License activation process

**Options Considered**:
1. **Instant activation** - Token generated immediately
2. **Email verification** - Confirm email before activation
3. **Admin approval** - Manual activation required
4. **Hybrid** - Auto for trusted, manual for new

**Decision**: Admin approval (two-step: pending → active)

**Rationale**:
- **Fraud prevention** - Prevents automated license generation
- **Control** - Admin can verify payment before activation
- **Flexibility** - Can reject suspicious activations
- **Audit** - Clear record of who approved what

**Trade-offs**:
- ✅ Pros: Fraud control, payment verification
- ❌ Cons: Manual step delays legitimate activations

**Consequences**:
- License statuses: `pending` → `active`
- Flow:
  1. Admin creates pending license
  2. Add-on registers hardware (gets PENDING_ token)
  3. Admin clicks "Activate"
  4. Real JWT token generated

---

### DEC-012: Layered Architecture

**Date**: 2024-Q4  
**Status**: Accepted  
**Context**: Code organization

**Options Considered**:
1. **Monolithic** - All in one file
2. **Layered** - Routes → Services → Repositories
3. **Hexagonal** - Ports and adapters
4. **Microservices** - Separate services per domain

**Decision**: Layered architecture (Routes → Services → Models)

**Rationale**:
- **Separation of concerns** - Clear boundaries
- **Testability** - Can mock services independently
- **Maintainability** - Easy to find and modify code
- **Simplicity** - Not over-engineered (YAGNI)

**Trade-offs**:
- ✅ Pros: Clean, testable, maintainable
- ❌ Cons: More files than monolithic

**Consequences**:
- `main.py` - Routes and request handling
- `token_generator.py`, `hw_fingerprint.py` - Services
- `models.py` - SQLAlchemy ORM models

---

### DEC-013: Heartbeat Mechanism

**Date**: 2024-Q4  
**Status**: Accepted  
**Context**: Tracking active sessions

**Options Considered**:
1. **No heartbeat** - Validate on every request
2. **Periodic heartbeat** - Client sends regular heartbeats
3. **Long-polling** - Server pushes to client
4. **WebSocket** - Real-time connection

**Decision**: Periodic heartbeat (30-second interval)

**Rationale**:
- **Session tracking** - Know which sessions are active
- **Timeout detection** - Detect abandoned sessions (30 min)
- **Low overhead** - Simple POST request
- **Concurrent detection** - Identify multiple active sessions

**Trade-offs**:
- ✅ Pros: Simple, effective session tracking
- ❌ Cons: Network overhead, client must implement

**Consequences**:
- Add-on sends heartbeat every 30 seconds
- Sessions timeout after 30 minutes without heartbeat
- `session_states` table tracks active sessions

---

## Database Decisions

### DEC-014: UUID Primary Keys

**Date**: 2024-Q4  
**Status**: Accepted  
**Context**: Primary key strategy

**Options Considered**:
1. **Auto-increment integer** - Simple, sequential
2. **UUID** - Globally unique
3. **ULID** - Sortable UUID
4. **Composite keys** - Multiple columns

**Decision**: UUID (version 4)

**Rationale**:
- **Uniqueness** - No collision risk across systems
- **Security** - Not guessable (unlike sequential IDs)
- **Distribution** - Works well in distributed systems
- **SQLAlchemy support** - Built-in UUID type

**Trade-offs**:
- ✅ Pros: Unique, secure, distributed-friendly
- ❌ Cons: Larger index size, slower than integers

**Consequences**:
- All tables use `id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))`
- IDs look like: `550e8400-e29b-41d4-a716-446655440000`

---

### DEC-015: JSON Column for Hardware Components

**Date**: 2024-Q4  
**Status**: Accepted  
**Context**: Storing hardware component details

**Options Considered**:
1. **Separate table** - Normalized hardware_components table
2. **JSON column** - Store as JSON blob
3. **HSTORE** - PostgreSQL key-value
4. **Multiple columns** - One column per component

**Decision**: JSON column

**Rationale**:
- **Flexibility** - Schema can evolve without migrations
- **Simplicity** - No JOIN needed for validation
- **PostgreSQL support** - Native JSON type with indexing
- **Query support** - Can query JSON fields if needed

**Trade-offs**:
- ✅ Pros: Flexible, simple, queryable
- ❌ Cons: Less type safety, harder to validate schema

**Consequences**:
- `hardware_components = Column(JSON, nullable=True)`
- Stores: `{"machine_id": "...", "mac": "...", "hostname": "..."}`
- Validation compares JSON objects

---

### DEC-016: Separate Audit Tables

**Date**: 2024-Q4  
**Status**: Accepted  
**Context**: Logging validation attempts

**Options Considered**:
1. **Single log table** - All logs in one table
2. **Separate tables** - validation_logs, security_incidents
3. **External logging** - ELK stack, Splunk
4. **No logging** - Minimal logging

**Decision**: Separate audit tables (validation_logs, security_incidents)

**Rationale**:
- **Separation** - Normal logs vs security events
- **Query performance** - Security incidents queried differently
- **Retention** - May want different retention policies
- **Compliance** - Security events may need special handling

**Trade-offs**:
- ✅ Pros: Clear separation, better queries
- ❌ Cons: More tables, more complex schema

**Consequences**:
- `validation_logs` - Every validation attempt
- `security_incidents` - Only security events
- Both reference `licenses` table via FK

---

## API Design Decisions

### DEC-017: RESTful Resource Naming

**Date**: 2024-Q4  
**Status**: Accepted  
**Context**: API endpoint naming convention

**Options Considered**:
1. **RPC-style** - `/activateLicense`, `/validateToken`
2. **RESTful** - `/api/v1/licenses`, `/api/v1/validations`
3. **GraphQL** - Single endpoint, queries
4. **Mixed** - Some REST, some RPC

**Decision**: RESTful with action-oriented endpoints

**Rationale**:
- **Clarity** - Clear what each endpoint does
- **Versioning** - `/api/v1/` allows future versions
- **Consistency** - Admin endpoints under `/api/v1/admin/`
- **Pragmatism** - Some actions don't fit REST (activate, validate)

**Trade-offs**:
- ✅ Pros: Clear, versioned, consistent
- ❌ Cons: Not purely RESTful (actions vs resources)

**Consequences**:
- Endpoints: `/api/v1/activate`, `/api/v1/validate`
- Admin: `/api/v1/admin/licenses`, `/api/v1/admin/sessions`
- Version prefix allows `/api/v2/` in future

---

### DEC-018: Cookie-Based Authentication for Admin

**Date**: 2024-Q4  
**Status**: Accepted  
**Context**: How admin API authenticates requests

**Options Considered**:
1. **Authorization header** - Bearer token
2. **Cookie** - Session cookie
3. **Query parameter** - API key in URL
4. **Basic auth** - Username:password in header

**Decision**: Cookie-based (session cookie)

**Rationale**:
- **Browser compatibility** - Dashboard is web-based
- **Security** - httpOnly prevents XSS
- **Automatic** - Browser sends cookie automatically
- **No localStorage** - Tokens not exposed to JavaScript

**Trade-offs**:
- ✅ Pros: Secure, browser-friendly, simple
- ❌ Cons: CSRF protection needed (sameSite=lax)

**Consequences**:
- Cookie name: `admin_session`
- Set via `response.set_cookie()` with security flags
- Verified via `require_admin()` dependency

---

## Operational Decisions

### DEC-019: Docker-First Deployment

**Date**: 2024-Q4  
**Status**: Accepted  
**Context**: Deployment strategy

**Options Considered**:
1. **Bare metal** - Install directly on server
2. **VM** - Virtual machine deployment
3. **Docker** - Container-based
4. **Kubernetes** - Orchestration

**Decision**: Docker Compose (single server)

**Rationale**:
- **Consistency** - Same environment everywhere
- **Simplicity** - Easier than Kubernetes
- **Isolation** - Services isolated in containers
- **Portability** - Easy to move between servers

**Trade-offs**:
- ✅ Pros: Consistent, isolated, portable
- ❌ Cons: Docker overhead, learning curve

**Consequences**:
- `docker-compose.yml` defines all services
- Volumes for persistence (database, keys)
- Networks for service isolation

---

### DEC-020: Self-Signed SSL for Development

**Date**: 2024-Q4  
**Status**: Accepted  
**Context**: SSL certificates for development

**Options Considered**:
1. **No SSL** - HTTP only for dev
2. **Self-signed** - Generate locally
3. **mkcert** - Local CA
4. **Let's Encrypt** - Real certificates

**Decision**: Self-signed SSL (generated in Dockerfile)

**Rationale**:
- **HTTPS in dev** - Match production environment
- **Zero config** - Auto-generated on first build
- **No external dependencies** - Works offline
- **Cost** - Free for development

**Trade-offs**:
- ✅ Pros: Free, automatic, HTTPS in dev
- ❌ Cons: Browser warnings, not trusted

**Consequences**:
- SSL certs generated in Dockerfile if not exist
- Stored in `/keys/cert.pem` and `/keys/key.pem`
- Production should use Let's Encrypt

---

## Trade-offs Summary

| Decision | Chosen | Rejected | Why |
|----------|--------|----------|-----|
| Backend | FastAPI | Flask, Django | Async, auto docs, Pydantic |
| Database | PostgreSQL | SQLite, MongoDB | ACID, JSON, scalability |
| Token Crypto | RSA-4096 | ECDSA, Ed25519 | Asymmetric, standard |
| Hardware Binding | Two-layer | JWT only | Defense in depth |
| Match Threshold | 60% | Exact, 50% | Flexibility vs security |
| Auth | Session cookies | JWT, Basic | Simple, secure, easy logout |
| Activation | Admin approval | Instant | Fraud prevention |
| Deployment | Docker | Bare metal, K8s | Consistency, simplicity |

---

## Next Steps

After reviewing decisions:
1. Read **[04-GOTCHAS.md](./04-GOTCHAS.md)** for known issues
2. Complete **[05-ONBOARDING-CHECKLIST.md](./05-ONBOARDING-CHECKLIST.md)** tasks
