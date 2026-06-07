# BMOD Production Deployment

Recommended stack:

- GitHub: source control and CI
- Vercel: Angular frontend
- Render: FastAPI backend
- Supabase: PostgreSQL database
- Upstash: Redis
- Cloudflare R2: product images
- Resend: transactional email

## 1. GitHub

Push the repository to GitHub and keep `main` protected. The workflow in `.github/workflows/ci.yml` runs backend compilation/tests and frontend production build on pull requests and pushes to `main`.

Required GitHub Actions behavior:

- Backend: install Python deps, compile `app` and `alembic`, run tests against Postgres.
- Frontend: `npm ci`, then `npm run build:vercel` with a dummy `API_URL`.
- Deployments should only happen after CI is green.

## 2. Supabase Database

Create a Supabase project, then copy two database URLs:

- Runtime URL: Supabase Transaction Pooler, port `6543`.
- Migration URL: direct database URL, port `5432`, if you want to run migrations from your machine.

For the FastAPI app, convert the runtime URL to async SQLAlchemy format:

```text
postgresql+asyncpg://postgres.PROJECT_REF:PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres
```

The backend Docker start command runs:

```bash
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

In production the app does not call `create_all`; schema changes must come through Alembic migrations.

## 3. Render Backend

Use `render.yaml` as the blueprint or create a Web Service manually:

- Root directory: `backend`
- Runtime: Docker
- Dockerfile: `backend/Dockerfile`
- Health check path: `/health`
- Readiness path after deploy: `/ready`

Set Render environment variables from [backend/render.env.example](backend/render.env.example).

Important Render variables:

```text
ENVIRONMENT=production
DATABASE_URL=postgresql+asyncpg://...
REDIS_URL=rediss://...
JWT_SECRET_KEY=<64 char random hex>
FRONTEND_ORIGIN=https://your-app.vercel.app
WHATSAPP_NUMBER=2348012345678
```

Generate `JWT_SECRET_KEY` locally:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

After deploy, verify:

```text
https://your-render-service.onrender.com/health
https://your-render-service.onrender.com/ready
```

## 4. Vercel Frontend

Create a Vercel project from GitHub:

- Root directory: `frontend`
- Framework preset: Other
- Build command: `npm run build:vercel`
- Output directory: `dist/bmod/browser`

Set Vercel variables from [frontend/vercel.env.example](frontend/vercel.env.example):

```text
API_URL=https://your-render-service.onrender.com/api/v1
```

The `frontend/scripts/set-env.js` script writes this into Angular's production environment at build time.

## 5. Final CORS Wiring

Once Vercel has a URL, set Render:

```text
FRONTEND_ORIGIN=https://your-app.vercel.app
```

For a custom domain plus Vercel URL, use comma-separated origins:

```text
FRONTEND_ORIGIN=https://your-app.vercel.app,https://www.yourdomain.com
```

Do not use `*` with credentialed auth cookies.

## 6. Production Launch Checklist

- CI is green on GitHub.
- Render `/health` returns `ok`.
- Render `/ready` can connect to Supabase.
- Vercel app loads and calls the Render `/api/v1` URL.
- Register, verify email, login, refresh token, logout all work cross-domain.
- Product images upload to R2 and render from the public image URL.
- WhatsApp checkout creates an order reference and opens/copies the prefilled message.
- Supabase backups are enabled.
- Real domain and email sender domain are verified.

## 7. Current Production Caveats

This code now has a safer pending-order WhatsApp handoff, but these are still recommended before heavy paid traffic:

- Add numeric stock quantities and reservation records.
- Add order management screens for staff.
- Add analytics events for order prepared, WhatsApp opened, and summary copied.
- Add error monitoring such as Sentry.
- Add privacy policy and terms pages linked from checkout.
