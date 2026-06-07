# StyleHaus — E-Commerce Platform
## Vibe Coding Master Reference

> Stack: Angular 17+ · FastAPI (Python 3.12) · PostgreSQL 16 · Redis · Nginx · Docker Compose  
> Markets: Nigeria (NGN) + International (USD)  
> Checkout: WhatsApp close — no payment gateway  
> Auth: Mandatory login before cart/checkout  
> Scale: 50–200 products (medium, small business)

---

## What You Are Building

A fashion-forward e-commerce storefront selling clothes, bags, and accessories for men and women. Customers browse, discover products in a 3-angle image view, build a cart, and are routed to a WhatsApp deep link to finalise the order. A non-technical staff member manages the product catalogue through a built-in CMS. No payment gateway — WhatsApp closes every sale.

---

## Project Structure

```
stylehaus/
├── backend/                  # FastAPI app
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py         # Settings via pydantic-settings
│   │   ├── database.py       # SQLAlchemy engine + session
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic v2 request/response schemas
│   │   ├── routers/          # One file per feature domain
│   │   ├── services/         # Business logic, no DB calls in routers
│   │   ├── dependencies/     # FastAPI Depends() — auth, roles, DB session
│   │   ├── utils/            # Email, image processing, WhatsApp URL builder
│   │   └── middleware/       # CORS, rate limiting, security headers
│   ├── alembic/              # DB migrations
│   ├── tests/
│   ├── .env                  # Never commit this
│   └── Dockerfile
│
├── frontend/                 # Angular 17+ app
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/         # Auth service, interceptors, guards
│   │   │   ├── shared/       # Reusable components, pipes, directives
│   │   │   ├── features/
│   │   │   │   ├── auth/     # Login, register, forgot-password
│   │   │   │   ├── shop/     # Product listing, product detail
│   │   │   │   ├── cart/     # Cart page, order review, WhatsApp redirect
│   │   │   │   ├── wishlist/ # Saved items
│   │   │   │   └── cms/      # Staff product management panel
│   │   │   └── app.routes.ts
│   │   └── environments/
│   └── Dockerfile
│
├── nginx/
│   ├── nginx.conf
│   └── ssl/                  # Certbot managed
│
├── docker-compose.yml
└── docker-compose.prod.yml
```

---

## Data Models

### users
```
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
email           VARCHAR(255) UNIQUE NOT NULL
hashed_password VARCHAR(255) NOT NULL
role            ENUM('USER', 'STAFF', 'ADMIN') DEFAULT 'USER'
is_verified     BOOLEAN DEFAULT FALSE
preferred_currency ENUM('NGN', 'USD') DEFAULT 'NGN'
created_at      TIMESTAMPTZ DEFAULT NOW()
deleted_at      TIMESTAMPTZ                   -- soft delete
```

### products
```
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
name            VARCHAR(255) NOT NULL
description     TEXT NOT NULL
category        ENUM('clothes', 'bags', 'accessories') NOT NULL
gender_target   ENUM('men', 'women', 'unisex') NOT NULL
price_ngn       NUMERIC(12, 2) NOT NULL
sizes           VARCHAR(10)[]                 -- ['S','M','L','XL'] or [] if N/A
is_in_stock     BOOLEAN DEFAULT TRUE
is_featured     BOOLEAN DEFAULT FALSE
created_by      UUID REFERENCES users(id)
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

### product_images
```
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
product_id  UUID REFERENCES products(id) ON DELETE CASCADE
url         TEXT NOT NULL                    -- CDN URL (Cloudflare R2)
position    SMALLINT CHECK (position IN (1,2,3))
alt_text    VARCHAR(255)
```

### outfit_tags
```
id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
source_product_id UUID REFERENCES products(id) ON DELETE CASCADE
target_product_id UUID REFERENCES products(id) ON DELETE CASCADE
UNIQUE (source_product_id, target_product_id)
```

### cart_items
```
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id     UUID REFERENCES users(id) ON DELETE CASCADE
product_id  UUID REFERENCES products(id) ON DELETE CASCADE
size        VARCHAR(10)
quantity    SMALLINT DEFAULT 1 CHECK (quantity > 0)
added_at    TIMESTAMPTZ DEFAULT NOW()
UNIQUE (user_id, product_id, size)
```

### wishlist_items
```
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id     UUID REFERENCES users(id) ON DELETE CASCADE
product_id  UUID REFERENCES products(id) ON DELETE CASCADE
added_at    TIMESTAMPTZ DEFAULT NOW()
UNIQUE (user_id, product_id)
```

### settings
```
key         VARCHAR(100) PRIMARY KEY
value       TEXT NOT NULL
updated_by  UUID REFERENCES users(id)
updated_at  TIMESTAMPTZ DEFAULT NOW()
```
**Seed rows:** `exchange_rate` (e.g. `"1520"`), `whatsapp_number` (e.g. `"2348012345678"`)

### audit_log
```
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
actor_id    UUID REFERENCES users(id)
action      VARCHAR(100) NOT NULL            -- e.g. 'product.create', 'settings.update'
target_type VARCHAR(50)                      -- e.g. 'product', 'settings'
target_id   UUID
payload     JSONB                            -- before/after snapshot
created_at  TIMESTAMPTZ DEFAULT NOW()
```

---

## API Routes

### Auth — `/api/v1/auth`
```
POST   /register          Public      Register with email + password
POST   /verify-email      Public      Verify email with token from email link
POST   /login             Public      Returns access token + sets refresh cookie
POST   /refresh           Public      Rotates refresh token, returns new access token
POST   /logout            USER+       Blacklists refresh token in Redis
POST   /forgot-password   Public      Sends 6-digit OTP to email (TTL 10 min)
POST   /reset-password    Public      Verifies OTP, sets new password
GET    /me                USER+       Returns current user profile
PATCH  /me                USER+       Update preferred_currency
```

### Products — `/api/v1/products`
```
GET    /                  Public      List products (filter: category, gender, size, in_stock, price_min, price_max, featured)
GET    /search            Public      Full-text search by name (min 3 chars, rate limited 10/min per IP)
GET    /{id}              Public      Product detail + images + outfit_tags + recommended
POST   /                  STAFF+      Create product
PATCH  /{id}              STAFF+      Update product fields
DELETE /{id}              ADMIN       Soft-delete product
POST   /{id}/images       STAFF+      Upload image (position 1/2/3), re-encoded to WebP via Pillow
DELETE /{id}/images/{pos} STAFF+      Remove image at position
POST   /{id}/outfit-tags  STAFF+      Set companion product IDs (max 5)
```

### Cart — `/api/v1/cart`
```
GET    /                  USER+       Get current user's cart with line totals + grand total
POST   /items             USER+       Add item (product_id, size, quantity)
PATCH  /items/{id}        USER+       Update quantity
DELETE /items/{id}        USER+       Remove item
DELETE /                  USER+       Clear entire cart
POST   /checkout          USER+       Generate WhatsApp URL from cart (server-side). Returns {url, order_summary}
```

### Wishlist — `/api/v1/wishlist`
```
GET    /                  USER+       Get user's wishlist
POST   /                  USER+       Add product
DELETE /{product_id}      USER+       Remove product
```

### Settings — `/api/v1/settings`
```
GET    /exchange-rate     Public      Returns current NGN→USD rate value only
GET    /                  ADMIN       Full settings list
PATCH  /{key}             ADMIN       Update any setting key
```

### CMS — `/api/v1/cms`
```
GET    /audit-log         ADMIN       Paginated audit log (filter by actor, action, date)
GET    /staff             ADMIN       List staff accounts
POST   /staff             ADMIN       Create STAFF role user
DELETE /staff/{id}        ADMIN       Revoke STAFF role (set to USER)
```

---

## Authentication & Security Rules

### JWT Strategy
- **Access token:** 15-minute TTL, signed HS256, contains `user_id`, `role`, `email`. Stored in Angular service memory only — never `localStorage`, never `sessionStorage`.
- **Refresh token:** 7-day TTL, stored as `HttpOnly; SameSite=Strict; Secure` cookie. Hashed copy stored in Redis with user-agent fingerprint.
- **On logout:** refresh token hash deleted from Redis → effectively blacklisted.
- **On refresh:** old token deleted, new token issued. Redis entry replaced.

### Rate Limiting (slowapi + Redis)
```
POST /auth/login          5 requests / 15 min / IP
POST /auth/register       10 requests / hour / IP
POST /auth/forgot-password 3 requests / hour / IP
GET  /products/search     10 requests / min / IP
POST /cart/checkout       5 requests / min / USER
All other endpoints       100 requests / min / IP (global)
```
After 5 failed logins: set `login_locked:{user_id}` in Redis with 15-min TTL. Check this key before any login attempt regardless of correct password.

### Role Enforcement
```python
# Never trust the frontend for role checks
# Every protected endpoint uses FastAPI Depends

def require_role(*roles):
    def checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=403)
        return current_user
    return checker

# Usage in routers:
@router.post("/products")
async def create_product(
    _: User = Depends(require_role("STAFF", "ADMIN")),
    ...
```

### BOLA Prevention
Every cart and wishlist query filters by the authenticated user's ID from the JWT — never from the request body or URL.
```python
# CORRECT
cart_items = db.query(CartItem).filter(
    CartItem.user_id == current_user.id,   # from JWT
    CartItem.id == item_id                  # from URL
).first()

# NEVER do this
cart_items = db.query(CartItem).filter(CartItem.id == item_id).first()
```

### Image Upload Security
1. MIME type validated server-side using `python-magic` (not file extension)
2. File size hard-capped at 5 MB in FastAPI (`UploadFile` max_size enforcement)
3. Re-encode through Pillow on upload — strips all EXIF data, converts to WebP, resizes to max 800px wide
4. Store on isolated object storage bucket (Cloudflare R2) — never on the app server
5. CDN URL returned after upload — app never serves images directly
6. Only JPG, PNG, WebP accepted at input

### WhatsApp URL Generation (Server-Side Only)
```python
# backend/app/utils/whatsapp.py
def build_whatsapp_url(cart_items: list, user: User, exchange_rate: float, currency: str) -> str:
    number = get_setting("whatsapp_number")  # from DB, not client
    lines = []
    total_ngn = Decimal("0")

    for item in cart_items:
        product = item.product
        line_total = product.price_ngn * item.quantity
        total_ngn += line_total
        size_str = f" | Size: {item.size}" if item.size else ""
        lines.append(
            f"• {product.name}{size_str} × {item.quantity} = ₦{line_total:,.0f}"
        )

    total_usd = total_ngn / Decimal(str(exchange_rate))
    currency_note = f"(≈ ${total_usd:,.2f} USD)" if currency == "USD" else ""

    message = (
        f"Hello, I'd like to order the following:\n\n"
        + "\n".join(lines)
        + f"\n\n*Total: ₦{total_ngn:,.0f} {currency_note}*"
        + f"\n\nName: {user.email}"
    )

    encoded = urllib.parse.quote(message)
    return f"https://wa.me/{number}?text={encoded}"
```
The client receives only the completed URL. It cannot modify product names, prices, or the total.

### Nginx Security Headers
```nginx
add_header Content-Security-Policy "default-src 'self'; img-src 'self' https://your-r2-domain.r2.dev; script-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none';" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), camera=(), microphone=()" always;
```

### CORS (FastAPI)
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # NO wildcard ever
    allow_credentials=True,                    # Required for cookie
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
```

---

## Frontend Architecture (Angular)

### Route Map
```
/                         Public      Homepage (featured products hero)
/shop                     Public      Product listing with filters
/shop/:id                 Public      Product detail (3-image view, recommended, outfit tags)
/auth/login               Public      Login page
/auth/register            Public      Register page
/auth/verify-email        Public      Email verification landing
/auth/forgot-password     Public      Forgot password flow
/cart                     AuthGuard   Cart page
/cart/review              AuthGuard   Order review before WhatsApp redirect
/wishlist                 AuthGuard   Saved items
/cms                      StaffGuard  CMS dashboard
/cms/products             StaffGuard  Product list management
/cms/products/new         StaffGuard  Add product
/cms/products/:id/edit    StaffGuard  Edit product
/cms/settings             AdminGuard  Exchange rate, WhatsApp number
/cms/audit-log            AdminGuard  Audit trail
```

### Guards
```typescript
// AuthGuard: redirect to /auth/login if no valid access token
// StaffGuard: AuthGuard + role must be STAFF or ADMIN
// AdminGuard: AuthGuard + role must be ADMIN
// PublicGuard: redirect to /shop if already authenticated (login/register pages)
```

### Auth Interceptor
Attaches `Authorization: Bearer {token}` to every API request. On 401 response, calls `/auth/refresh` once, retries original request. On second 401, logs user out and redirects to `/auth/login`.

### NgRx — Cart State
The cart count badge and cart contents are held in NgRx store so they update live across all components without re-fetching.

### Currency Pipe
```typescript
// shared/pipes/currency-display.pipe.ts
// Reads preferred_currency from auth store
// Applies exchange rate from settings store
// Formats: ₦1,520.00 or $1.00
```

### Product Detail Component — 3-Image View
Three image thumbnails displayed as tabs (not a carousel). Clicking a thumbnail swaps the main image. Max 3 positions (front, back, detail). All images fetched from CDN.

### Outfit Tags — "Complete the Look"
Displayed as a horizontal row below the main product detail. Pulls up to 5 companion products from the `outfit_tags` field in the product detail API response. Each card is clickable and routes to that product's detail page.

### Recommended Products
4 products from the same `category` + `gender_target`, excluding the current product. Displayed in a horizontal scroll row. Pulled from the product detail API response.

---

## Environment Variables

### Backend `.env`
```env
# Database
DATABASE_URL=postgresql+asyncpg://stylehaus:password@db:5432/stylehaus_db

# Redis
REDIS_URL=redis://redis:6379/0

# JWT
JWT_SECRET_KEY=<256-bit-random-string>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Email (SMTP)
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USERNAME=resend
SMTP_PASSWORD=<your-resend-api-key>
EMAIL_FROM=no-reply@yourdomain.com

# Image Storage (Cloudflare R2)
R2_ACCOUNT_ID=<your-account-id>
R2_ACCESS_KEY_ID=<your-key>
R2_SECRET_ACCESS_KEY=<your-secret>
R2_BUCKET_NAME=stylehaus-images
R2_PUBLIC_URL=https://images.yourdomain.com

# App
ENVIRONMENT=production
FRONTEND_ORIGIN=https://yourdomain.com
```

### Frontend `environment.prod.ts`
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://yourdomain.com/api/v1',
};
```

---

## Docker Compose (Production)

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: stylehaus_db
      POSTGRES_USER: stylehaus
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

  backend:
    build: ./backend
    env_file: .env
    depends_on: [db, redis]
    restart: unless-stopped

  frontend:
    build: ./frontend
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on: [backend, frontend]
    restart: unless-stopped

volumes:
  pgdata:
```

---

## Phased Delivery Plan

### Phase 1 — Foundation (Weeks 1–3)
- Docker Compose environment (Postgres, Redis, FastAPI, Nginx, Angular scaffold)
- DB schema + all Alembic migrations
- Full auth system: register, email verify, login, refresh, logout, forgot-password, reset-password
- Role model (USER / STAFF / ADMIN)
- Rate limiting on auth endpoints
- CORS, security headers, JWT middleware
- Angular: auth module, login/register pages, auth interceptor, AuthGuard
- **Exit criteria:** A user can register, verify email, log in, and get a JWT. No products yet.

### Phase 2 — Catalogue & CMS (Weeks 4–6)
- Product API (full CRUD + image upload with Pillow re-encoding)
- Settings API (exchange rate, WhatsApp number)
- Full-text search (pg_trgm)
- Audit logging on all STAFF/ADMIN writes
- Angular: CMS module (product add/edit/delete, image upload, stock toggle, exchange rate, audit log)
- Angular: shop module (product listing with filters, product detail with 3-image tabs, currency toggle)
- Recommended products on product detail
- **Exit criteria:** Staff can manage catalogue. Shoppers can browse and filter products.

### Phase 3 — Cart & WhatsApp Checkout (Weeks 7–8)
- Cart API (add, update, remove, clear, server-side checkout URL generation)
- Wishlist API
- NgRx cart state in Angular
- Cart page, order review page, WhatsApp redirect
- Cart badge on navbar
- **Exit criteria:** A user can fill a cart and be routed to WhatsApp with a pre-filled, server-generated order message.

### Phase 4 — Outfit Matching & Polish (Weeks 9–10)
- Outfit tag system in CMS (multi-select companion product picker)
- "Complete the look" row on product detail page
- Featured products homepage hero section
- Angular SSR for product pages (SEO + Open Graph meta tags)
- Image CDN finalised, WebP delivery confirmed
- Performance audit: API p95 ≤ 500ms, FCP ≤ 3s on 4G
- **Exit criteria:** Outfit matching live. Homepage hero works. Pages are SEO-ready.

### Phase 5 — Hardening & Launch (Weeks 11–12)
- Full Nginx security header configuration
- Cloudflare setup: proxy, DDoS rules, bot management, CDN caching
- OWASP Top 10 manual walkthrough (auth, BOLA, injection, XSS, CSRF, misconfig)
- CI pipeline: pip-audit, ruff, mypy, Angular ESLint, pytest, jest
- Automated daily `pg_dump` to S3
- SSL via Certbot + auto-renew
- Staging environment cutover → production
- Staff CMS training session with documentation
- **Exit criteria:** Business owner signs off. Staff can manage catalogue independently. Zero P0 security findings.

---

## Security Threat Model (STRIDE)

| Threat | Severity | Mitigation |
|--------|----------|------------|
| Brute force login | HIGH | 5 attempts / 15 min per IP via slowapi + Redis. Account-level lockout key in Redis. hCaptcha after 3 failures. |
| JWT / session hijack | HIGH | Access token in memory only (never localStorage). Refresh token in HttpOnly SameSite=Strict cookie. Token blacklist on logout. 15-min access TTL. |
| SQL injection | HIGH | All DB via SQLAlchemy ORM parameterised queries. No raw SQL. Pydantic v2 validates all input before ORM layer. pip-audit in CI. |
| CSRF | HIGH | SameSite=Strict cookie. State-changing requests require Bearer token in header (not readable cross-site). CORS locked to exact origin. |
| BOLA (broken object level auth) | HIGH | Every cart/wishlist query filters by `current_user.id` from JWT at the service layer. Never trusts client-supplied user ID. |
| Privilege escalation | HIGH | Role in JWT. CMS routes protected by both Angular Guard (UX) AND FastAPI `require_role` Depends (enforcement). Role changes ADMIN-only. |
| Malicious file upload | MED | python-magic MIME validation. 5 MB hard cap. Pillow re-encode strips all EXIF. Stored in isolated R2 bucket. Never served from app domain. CSP blocks execution. |
| XSS via product content | MED | Angular template escaping by default. Descriptions stored as plain text. CSP: script-src 'self' only. No innerHTML. |
| WhatsApp message tampering | MED | URL generated server-side from authenticated cart. Client receives completed URL only. User cannot edit pre-filled message content. |
| DDoS / scraping | MED | Cloudflare proxy (DDoS + bot rules). Search endpoint rate-limited. Product listing cached 60s at CDN. Nginx connection limits. |
| Secrets exposure | MED | All secrets in .env (gitignored). GitHub Actions Secrets for CI. JWT secret minimum 256-bit random. Rotation runbook documented. |
| Insecure settings access | LOW | Exchange rate endpoint returns value only (not full settings row). Settings write is ADMIN-only via `require_role`. |

---

## Open Decisions (Resolve Before Phase 1)

| # | Decision | Options |
|---|----------|---------|
| D1 | Brand / store name | Needed for domain, logo, email sender name |
| D2 | Hosting provider | DigitalOcean Droplet / Hetzner VPS / AWS Lightsail / existing VPS |
| D3 | Image storage | Cloudflare R2 (cheapest) / AWS S3 + CloudFront / Bunny.net |
| D4 | Transactional email (SMTP) | Resend / Brevo / Gmail SMTP (low volume only) |
| D5 | Exchange rate source | Manual update in CMS (simplest) / daily auto-fetch from open FX API |
| D6 | Google OAuth in Phase 1? | Include now / defer to Phase 2 |

---

## Key Rules for the AI Coding Agent

1. **Never trust the frontend for auth or role enforcement.** Every protected endpoint enforces role via FastAPI `Depends`. Guards are UX only.
2. **Never store access token in localStorage or sessionStorage.** Angular service memory only.
3. **Never build SQL strings manually.** SQLAlchemy ORM + parameterised queries only.
4. **Never generate the WhatsApp URL on the frontend.** Always call `POST /cart/checkout` and use the URL returned by the server.
5. **Never serve uploaded images from the app server.** Store to R2, return CDN URL, serve from CDN only.
6. **Filter every cart and wishlist query by `current_user.id` from JWT.** Never from request body.
7. **Every CMS write action must create an audit_log record.** Use a service wrapper, not ad-hoc.
8. **Never skip CORS origin validation.** No wildcard. `allow_origins` must be the exact frontend domain.
9. **Refresh token rotation is mandatory.** Old token deleted from Redis when new one issued.
10. **All images must pass through Pillow on upload** before going to R2. No raw file passthrough.
