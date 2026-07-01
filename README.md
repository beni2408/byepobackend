# Byepo — Feature Flag Management System · Backend

Node.js/Express REST API for a multi-tenant feature flag management system. Three separate frontend applications (Super Admin, Org Admin, End User) consume this single backend.

---

## Architecture

```
byepobackend/
├── server.js                  # Entry point — loads env, connects DB, starts Express
└── src/
    ├── app.js                 # Express app setup, middleware stack, route mounts
    ├── config/
    │   └── db.js              # Mongoose connection
    ├── models/
    │   ├── Organization.js    # Tenant model
    │   ├── User.js            # Org Admin + End User accounts
    │   └── FeatureFlag.js     # Flags scoped per organization
    ├── controllers/
    │   ├── superAdmin.controller.js
    │   ├── auth.controller.js
    │   ├── flag.controller.js
    │   └── feature.controller.js
    ├── routes/
    │   ├── superAdmin.routes.js
    │   ├── auth.routes.js
    │   ├── flag.routes.js
    │   └── feature.routes.js
    ├── middleware/
    │   ├── auth.middleware.js  # Verifies Bearer JWT → attaches req.user
    │   ├── role.middleware.js  # requireRole(...roles) guard → 403 on mismatch
    │   └── error.middleware.js # Centralised JSON error handler (4-arg Express)
    └── utils/
        └── token.js            # signToken / verifyToken (jsonwebtoken HS256)
```

**Request flow:**
```
Request → cors() → express.json() → Route
  └── authenticate   (verifies JWT, sets req.user)
  └── requireRole()  (checks req.user.role)
  └── Controller     (queries MongoDB via Mongoose)
  └── errorHandler   (last middleware — converts all thrown errors to JSON)
```

The stack is intentionally flat — no service layer — because business logic per endpoint is thin enough that an extra layer would be pure indirection with no benefit at this scale.

---

## Data Model

### Organization
```
{
  _id:       ObjectId   (MongoDB auto-generated)
  name:      String     unique, trimmed
  createdAt: Date       auto (Mongoose timestamps)
}
```

### User
```
{
  _id:            ObjectId
  email:          String    unique, stored lowercase
  passwordHash:   String    bcrypt cost factor 12
  role:           String    enum: ['org_admin', 'end_user']
  organizationId: ObjectId  ref → Organization
  createdAt:      Date
}
```

### FeatureFlag
```
{
  _id:            ObjectId
  key:            String    lowercase, trimmed
  enabled:        Boolean   default: false
  organizationId: ObjectId  ref → Organization
  createdAt:      Date      (Mongoose timestamps)
  updatedAt:      Date      (Mongoose timestamps)
}

Compound unique index: { key: 1, organizationId: 1 }
```

The compound index on `(key, organizationId)` enforces that flag keys are unique **per tenant**, not globally. Two organisations can both have a `dark_mode` flag — they are entirely independent documents.

---

## Environment Variables

| Variable               | Description                                           |
|------------------------|-------------------------------------------------------|
| `MONGO_URI`            | MongoDB Atlas connection string                       |
| `JWT_SECRET`           | Secret used to sign/verify all JWTs                   |
| `SUPER_ADMIN_EMAIL`    | Static Super Admin email (never stored in DB)         |
| `SUPER_ADMIN_PASSWORD` | Static Super Admin password (never stored in DB)      |
| `PORT`                 | Server port — default 4000; Render sets automatically |

---

## Running Locally

```bash
npm install
# populate .env with the variables above
node server.js
# → Server running on http://localhost:4000
```

---

## API Reference

**Base URL (production):** `https://your-render-app.onrender.com`

All protected routes require:
```
Authorization: Bearer <jwt>
```

Error response shape: `{ "error": "descriptive message" }`

---

### Health Check

| Method | Path      | Auth |
|--------|-----------|------|
| GET    | `/health` | None |

```json
// Response 200
{ "status": "ok" }
```

Used by uptime monitors (cron-jobs.org) to keep the Render free-tier instance awake.

---

### Super Admin

> Super Admin credentials live in `.env` only — this role has **no database record**. The JWT payload is `{ role: 'super_admin' }` with no `userId` or `organizationId`.

| Method | Path                                    | Auth        |
|--------|-----------------------------------------|-------------|
| POST   | `/api/super-admin/login`                | None        |
| POST   | `/api/super-admin/organizations`        | super_admin |
| GET    | `/api/super-admin/organizations`        | super_admin |
| PATCH  | `/api/super-admin/organizations/:id`    | super_admin |
| DELETE | `/api/super-admin/organizations/:id`    | super_admin |

**POST /api/super-admin/login**
```json
// Request body
{ "email": "superadmin@byepo.com", "password": "SuperAdmin@123" }

// Response 200
{ "token": "<jwt>" }

// Errors: 400 missing fields · 401 wrong credentials
```

**POST /api/super-admin/organizations**
```json
// Request body
{ "name": "Acme Corp" }

// Response 201
{ "_id": "...", "name": "Acme Corp", "createdAt": "..." }

// Errors: 400 name missing · 409 name already exists
```

**GET /api/super-admin/organizations**
```json
// Response 200 — sorted newest first
[
  { "_id": "...", "name": "Acme Corp", "createdAt": "..." }
]
```

**PATCH /api/super-admin/organizations/:id**
```json
// Request body
{ "name": "Acme Corporation" }

// Response 200
{ "_id": "...", "name": "Acme Corporation", "createdAt": "..." }

// Errors: 400 name missing · 404 org not found · 409 name taken
```

**DELETE /api/super-admin/organizations/:id**
```json
// Response 200
{ "message": "\"Acme Corp\" deleted" }

// Errors: 404 org not found
```

---

### Auth

| Method | Path                    | Auth      | Creates      |
|--------|-------------------------|-----------|--------------|
| POST   | `/api/auth/signup`      | None      | org_admin    |
| POST   | `/api/auth/user-signup` | None      | end_user     |
| POST   | `/api/auth/login`       | None      | —            |
| GET    | `/api/auth/me`          | Any role  | —            |

**POST /api/auth/signup** — Org Admin registration
```json
// Request body
{
  "email": "admin@acme.com",
  "password": "Acme@123",
  "organizationId": "<org _id from super admin>"
}

// Response 201
{ "token": "<jwt>", "organizationId": "...", "organizationName": "Acme Corp" }

// Errors: 400 missing fields · 404 org not found · 409 email already registered
```

**POST /api/auth/user-signup** — End User registration
```json
// Request body
{
  "email": "user@acme.com",
  "password": "User@123",
  "organizationId": "<org _id>"
}

// Response 201
{ "token": "<jwt>", "organizationId": "...", "organizationName": "Acme Corp" }

// Errors: 400 missing fields · 404 org not found · 409 email already registered
```

**POST /api/auth/login** — Shared for both roles
```json
// Request body
{ "email": "admin@acme.com", "password": "Acme@123" }

// Response 200
{
  "token": "<jwt>",
  "role": "org_admin",
  "organizationId": "...",
  "organizationName": "Acme Corp"
}

// Errors: 400 missing fields · 401 invalid credentials
// Note: same error message for unknown email and wrong password — avoids user enumeration
```

**GET /api/auth/me**
```json
// Response 200
{
  "email": "admin@acme.com",
  "role": "org_admin",
  "organizationId": "...",
  "organizationName": "Acme Corp"
}

// Errors: 401 invalid/expired token · 404 user not found
```

---

### Feature Flags — Org Admin

> All routes require a valid `org_admin` JWT.
> `organizationId` is **always read from the token**, never from the request body.

| Method | Path              | Auth      |
|--------|-------------------|-----------|
| POST   | `/api/flags`      | org_admin |
| GET    | `/api/flags`      | org_admin |
| PATCH  | `/api/flags/:id`  | org_admin |
| DELETE | `/api/flags/:id`  | org_admin |

**POST /api/flags** — Create a flag
```json
// Request body
{ "key": "dark_mode" }
// Keys are stored lowercase and trimmed automatically.

// Response 201
{ "_id": "...", "key": "dark_mode", "enabled": false, "organizationId": "..." }

// Errors: 400 key missing · 409 key already exists in this org
```

**GET /api/flags** — List all flags for the org
```json
// Response 200
[
  { "_id": "...", "key": "dark_mode", "enabled": true,  "organizationId": "..." },
  { "_id": "...", "key": "beta_ui",   "enabled": false, "organizationId": "..." }
]
```

**PATCH /api/flags/:id** — Toggle enabled state
```json
// Request body
{ "enabled": true }

// Response 200
{ "_id": "...", "key": "dark_mode", "enabled": true, "organizationId": "..." }

// Errors: 404 flag not found or belongs to a different org
```

**DELETE /api/flags/:id**
```json
// Response 200
{ "message": "Flag deleted" }

// Errors: 404 flag not found or belongs to a different org
```

---

### Feature Check — End User

> Requires a valid `end_user` JWT.
> `organizationId` is resolved from the token — the user only supplies the feature key.

| Method | Path                   | Auth     |
|--------|------------------------|----------|
| POST   | `/api/features/check`  | end_user |

**POST /api/features/check**
```json
// Request body
{ "key": "dark_mode" }

// Response 200 — flag found
{ "key": "dark_mode", "enabled": true }

// Response 404 — key doesn't exist in this org
{ "error": "Feature key \"dark_mode\" not found for your organization" }

// Errors: 400 key missing · 401 invalid token · 403 wrong role
```

---

## JWT Token Structure

```js
// Super Admin — no userId or organizationId
{ role: "super_admin", iat: ..., exp: ... }

// Org Admin / End User
{ userId: "...", role: "org_admin" | "end_user", organizationId: "...", iat: ..., exp: ... }
```

Algorithm: **HS256** · Expiry: **7 days**

---

## Middleware Detail

### auth.middleware.js
Reads the `Authorization: Bearer <token>` header, verifies it with `verifyToken()`, and attaches the decoded payload to `req.user`. Returns `401` if the header is missing or the token is invalid/expired.

### role.middleware.js
`requireRole('org_admin', 'end_user')` — returns Express middleware that checks `req.user.role` against the allowed list. Returns `403` if the role is not permitted.

### error.middleware.js
4-argument Express error handler mounted last in `app.js`. Mappings:

| Condition                        | HTTP Status |
|----------------------------------|-------------|
| Mongoose duplicate key (11000)   | 409         |
| Mongoose ValidationError         | 400         |
| `err.status` set by controller   | that value  |
| All other errors                 | 500         |

---

## Key Design Decisions & Trade-offs

### 1. Super Admin not stored in the database
Credentials live in `.env` only. The JWT payload is `{ role: 'super_admin' }` with no `userId`. This eliminates a bootstrapping problem (who creates the first admin?), removes an attack surface, and makes credential rotation a deployment config change rather than a DB migration.

**Trade-off:** Only one Super Admin is possible and changing credentials requires a redeploy. Acceptable for a single-operator system.

---

### 2. organizationId always sourced from the JWT on flag operations
Every flag query filters by `organizationId: req.user.organizationId` — never by a value from `req.body` or `req.params`. This means an authenticated admin cannot affect another org's flags even if they craft a request with a foreign org ID.

---

### 3. Compound unique index on FeatureFlag `{ key, organizationId }`
Uniqueness is enforced at the database layer, not just in application code. The same flag key can exist in multiple organizations independently; it just cannot be duplicated within the same org. The application returns a 409 on duplicate, which is backed by this index rather than a prior `findOne` check (avoids a race condition).

---

### 4. Feature check endpoint requires authentication
`POST /api/features/check` requires a valid `end_user` JWT. The org is resolved from the token so:
- End users cannot query flags for organizations they don't belong to
- No org ID enumeration is possible via the public API
- The request body is minimal — just `{ key }`

**Trade-off:** Anonymous/SDK-style integrations are not supported. For this assignment scope, requiring auth aligns with the spec requirement that end users "belong to one organisation."

---

### 5. Separate signup routes for org_admin and end_user
`POST /api/auth/signup` hardcodes `role: 'org_admin'`; `POST /api/auth/user-signup` hardcodes `role: 'end_user'`. Both share one login endpoint since authentication logic is identical.

**Alternative rejected:** A single signup route accepting a `role` field in the body. This would allow anyone to self-elevate to `org_admin` simply by passing `"role": "org_admin"` — a direct privilege escalation vulnerability.

---

### 6. Centralised error handling via error.middleware
Controllers call `next(err)` and never craft error responses directly. All error formatting, Mongoose error mapping, and status code assignment happens in one place. Adding a new error mapping requires changing one file, and every route gets consistent error shape automatically.

---

### 7. Password hashing at bcrypt cost factor 12
Cost 12 (~300ms on a modern server) provides meaningfully stronger brute-force resistance than the common default of 10, with an acceptable latency overhead for a low-frequency auth endpoint.

---

## Deployment

**Backend:** Render Web Service
- Build command: `npm install`
- Start command: `node server.js`
- Environment variables set via Render dashboard

**Uptime:** A cron job on [cron-jobs.org](https://cron-jobs.org) pings `GET /health` every 5 minutes to prevent the Render free-tier instance from spinning down after 15 minutes of inactivity.

**Frontends:** Three separate Netlify sites (static SvelteKit, `adapter-static`), each with `PUBLIC_API_URL` set to the Render backend URL.
