# Qvízovna — Production Deployment Guide

> Last updated: 2026-03-15

## Quick comparison: Recommended vs. Free

| | Recommended (Railway) | Free tier |
|---|---|---|
| **Frontend** | Vercel (Hobby/Pro) | Vercel Hobby |
| **Backend API** | Railway (~$5–15/mo) | Render free |
| **Database** | Railway PostgreSQL | Supabase free (500 MB, pauses after 7 days) |
| **Redis** | Railway Redis | Upstash free (10k cmds/day) |
| **File storage** | Cloudflare R2 free tier | Cloudflare R2 free tier |
| **Cold starts** | None | ~30–60 s after inactivity on Render |
| **Est. monthly cost** | ~$10–20 USD | $0 (with limits) |

**Verdict:** For a class of 30 students with daily use, the free tier is functional. For a school or production deployment, Railway is the recommended starting point.

---

## 1. What You Need Before You Start

| Requirement | Notes |
|---|---|
| Domain name | e.g. `quizik.app` — buy on Namecheap / Cloudflare |
| Git repo (GitHub / GitLab) | Already have one or create now |
| Google OAuth Client ID | Only if you use Google sign-in |
| S3-compatible storage | For question image uploads (AWS S3 or Cloudflare R2 — free tier) |
| Email (optional) | SMTP for registration emails |

---

## 2. Recommended Hosting — Railway (simplest + cheapest for a startup)

**Why Railway:**
- One-click Postgres + Redis included
- Deploys Docker Compose natively
- Free trial, then ~$5–15/month for hobby traffic
- No DevOps needed

**Alternatives:**

| Provider | Pros | Cons |
|---|---|---|
| **Railway** | Easiest, Docker support, free DB | Higher cost at scale |
| **Render** | Good free tier, auto-deploys | Cold starts on free |
| **DigitalOcean App Platform** | Predictable pricing ($12+/mo) | Manual DB setup |
| **Fly.io** | Very cheap, fast global | More config required |
| **VPS (Hetzner €4/mo)** | Cheapest long-term | You manage everything |

**Recommendation:** Start with Railway. When you hit $50+/month, migrate to Hetzner VPS.

---

## 3. Step-by-Step: Deploy to Railway

### Step 1 — Push code to GitHub

```bash
git init   # if not already
git add .
git commit -m "initial commit"
# create repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/quizik.git
git push -u origin main
```

### Step 2 — Create Railway project

1. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**
2. Select your `quizik` repository
3. Railway detects `docker-compose.yml` — click **Deploy**

### Step 3 — Add Postgres and Redis

In Railway dashboard:
1. Click **+ New** → **Database** → **Add PostgreSQL** — Railway sets `DATABASE_URL` automatically
2. Click **+ New** → **Database** → **Add Redis** — sets `REDIS_URL` automatically

### Step 4 — Set environment variables

In Railway → your **api** service → **Variables**, add:

```
DATABASE_URL          = (auto-set by Railway from Postgres plugin)
REDIS_URL             = (auto-set by Railway from Redis plugin)
SECRET_KEY            = <generate: python -c "import secrets; print(secrets.token_hex(32))">
ALGORITHM             = HS256
ACCESS_TOKEN_EXPIRE_MINUTES = 60
ALLOWED_ORIGINS       = https://yourdomain.com,https://www.yourdomain.com
```

In Railway → your **web** (Next.js) service → **Variables**:

```
NEXT_PUBLIC_API_BASE_URL    = https://your-api-service.railway.app
NEXT_PUBLIC_GOOGLE_CLIENT_ID = <your Google OAuth client ID>
```

### Step 5 — Run database migrations

In Railway → **api** service → **Settings** → **Deploy** → add a **Pre-deploy command**:

```
alembic upgrade head
```

Or run it manually once via Railway shell:

```bash
railway run alembic upgrade head
```

### Step 6 — Add a custom domain

1. Railway → your **web** service → **Settings** → **Custom Domain** → enter `quizik.app`
2. Go to your domain registrar → DNS → add the CNAME record Railway shows you
3. Railway provisions SSL automatically (Let's Encrypt)

---

## 4. Config Files to Update Before Deploying

### `backend/.env.production` (create this, do NOT commit it)

```env
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/quizik
REDIS_URL=redis://default:pass@host:6379
SECRET_KEY=<64-char random hex>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
ALLOWED_ORIGINS=https://quizik.app,https://www.quizik.app
AWS_ACCESS_KEY_ID=<if using S3>
AWS_SECRET_ACCESS_KEY=<if using S3>
AWS_S3_BUCKET=quizik-uploads
AWS_S3_REGION=eu-central-1
```

### `frontend/.env.production` (create this, do NOT commit it)

```env
NEXT_PUBLIC_API_BASE_URL=https://api.quizik.app
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<your-google-client-id>.apps.googleusercontent.com
```

### `docker-compose.prod.yml` (create alongside existing compose file)

```yaml
version: "3.9"
services:
  api:
    build: ./backend
    env_file: ./backend/.env.production
    command: uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers 2
    restart: unless-stopped

  web:
    build:
      context: ./frontend
      args:
        NEXT_PUBLIC_API_BASE_URL: ${NEXT_PUBLIC_API_BASE_URL}
        NEXT_PUBLIC_GOOGLE_CLIENT_ID: ${NEXT_PUBLIC_GOOGLE_CLIENT_ID}
    env_file: ./frontend/.env.production
    restart: unless-stopped

  worker:
    build: ./backend
    env_file: ./backend/.env.production
    command: celery -A src.worker.celery_app worker --loglevel=info
    restart: unless-stopped
```

---

## 5. File Uploads (Question Images)

The app supports image uploads per question. In production you need cloud storage.

### Option A — Cloudflare R2 (recommended, free up to 10GB)

1. Cloudflare dashboard → R2 → Create bucket `quizik-uploads`
2. Create API token with R2 read+write
3. Set in backend env:
   ```
   AWS_ACCESS_KEY_ID=<R2 key id>
   AWS_SECRET_ACCESS_KEY=<R2 key secret>
   AWS_S3_BUCKET=quizik-uploads
   AWS_S3_ENDPOINT_URL=https://<account_id>.r2.cloudflarestorage.com
   AWS_S3_REGION=auto
   ```

### Option B — AWS S3

1. Create bucket `quizik-uploads` in your preferred region
2. Set bucket policy to allow public read (for image serving)
3. Create IAM user with S3 write access, get keys
4. Set env vars as above (without `ENDPOINT_URL`)

---

## 6. Google OAuth Setup for Production

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → your project → **APIs & Services → Credentials**
2. Edit your OAuth client
3. Add to **Authorized JavaScript origins**:
   ```
   https://quizik.app
   https://www.quizik.app
   ```
4. Add to **Authorized redirect URIs** (if using server-side flow):
   ```
   https://quizik.app/api/auth/callback/google
   ```
5. Set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in your frontend env

---

## 7. Pre-Production Checklist

### Security
- [ ] `SECRET_KEY` is at least 32 random bytes, NOT the development default
- [ ] `ALLOWED_ORIGINS` lists only your production domain(s)
- [ ] Database password is strong and not used anywhere else
- [ ] S3 bucket is NOT publicly writable (read-only public, write via signed URLs)
- [ ] HTTPS enforced everywhere (Railway/Render do this automatically)
- [ ] Debug mode OFF in FastAPI (`debug=False` in uvicorn)

### Functionality
- [ ] Run `alembic upgrade head` — all migrations applied
- [ ] Create at least one teacher account manually via API or seed script
- [ ] Test full flow: register → create quiz → create session → play as student → view leaderboard
- [ ] Test Google OAuth login end-to-end
- [ ] Upload a question image, verify it appears in play view
- [ ] Verify minigame shows for a session with gamification enabled

### Performance
- [ ] Enable Celery worker for async jobs (session status updates)
- [ ] Add a health-check endpoint (`GET /health`) to your backend if not already present
- [ ] Set `uvicorn --workers 2` (or more for high traffic)

### Monitoring (optional but recommended)
- [ ] Add [Sentry](https://sentry.io) for error tracking (free tier) — set `SENTRY_DSN` env var
- [ ] Set up Railway/Render alerts for service downtime

---

## 8. Quick Start — Local → Production in 30 Minutes

```bash
# 1. Push to GitHub
git push origin main

# 2. On Railway: New Project → GitHub repo → Deploy
# 3. Add Postgres + Redis plugins in Railway
# 4. Set env vars (SECRET_KEY, ALLOWED_ORIGINS, Google Client ID)
# 5. Add pre-deploy command: alembic upgrade head
# 6. Add custom domain + update DNS
# Done — usually live in 5-10 min after DNS propagates
```

---

## 9. Estimated Monthly Cost

| Setup | Cost |
|---|---|
| Railway (hobby) — api + web + postgres + redis | ~$10–20/month |
| Cloudflare R2 storage (under 10 GB) | Free |
| Domain name | ~$10–15/year |
| **Total** | **~$10–20/month** |

For 100+ concurrent students: upgrade Railway to Pro or move to a Hetzner VPS ($8/month) + managed Postgres (Supabase free tier).

---

## 10. Step-by-Step: Deploy for Free (1-user / testing)

This setup is **$0/month** and sufficient for solo testing or a small pilot class. Expect cold starts (~30–60 s) after inactivity on Render.

### Services used
| Role | Service | Free limits |
|---|---|---|
| Frontend | **Vercel** (Hobby) | Unlimited deploys, custom domain included |
| Backend API | **Render** (free web service) | 750 h/mo, sleeps after 15 min idle |
| Database | **Supabase** (free tier) | 500 MB, pauses after 7 days inactivity |
| Redis | **Upstash** (free tier) | 10 000 commands/day |
| File storage | **Cloudflare R2** (free tier) | 10 GB storage, 1M reads/mo |

---

### Step 1 — Database: Supabase

1. Sign up at [supabase.com](https://supabase.com) → **New Project**
2. Choose a region close to you, set a strong DB password
3. Go to **Project Settings → Database → Connection string (URI)** — copy the `postgresql://...` URL
4. Replace `postgresql://` with `postgresql+asyncpg://` for async SQLAlchemy
5. Save as `DATABASE_URL`

> **Tip:** Supabase pauses free projects after 7 days without activity. Visit the Supabase dashboard to unpause, or upgrade to keep it always on.

---

### Step 2 — Redis: Upstash

1. Sign up at [upstash.com](https://upstash.com) → **Create Database** → pick a region
2. Copy the **Redis URL** (format: `rediss://default:TOKEN@host:PORT`)
3. Save as `REDIS_URL`

---

### Step 3 — Backend: Render

1. Sign up at [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repo → select the `quizik` repository
3. Set:
   - **Root directory:** `backend`
   - **Runtime:** Docker (or Python if you prefer)
   - **Build command:** `pip install -e .`
   - **Start command:** `uvicorn src.main:app --host 0.0.0.0 --port 8000`
4. Under **Environment**, add all backend env vars:
   ```
   DATABASE_URL          = postgresql+asyncpg://... (from Supabase)
   REDIS_URL             = rediss://... (from Upstash)
   SECRET_KEY            = <generate: python -c "import secrets; print(secrets.token_hex(32))">
   ALGORITHM             = HS256
   ACCESS_TOKEN_EXPIRE_MINUTES = 60
   ALLOWED_ORIGINS       = https://your-app.vercel.app
   GOOGLE_CLIENT_ID      = <your Google OAuth client ID>
   ```
5. Click **Create Web Service** — Render builds and deploys automatically
6. After deploy, open the Render shell (**Shell** tab) and run:
   ```bash
   alembic upgrade head
   ```

> **Cold starts:** The free Render tier spins down after 15 min idle. First request after sleep takes ~30–60 s. This is fine for testing; upgrade to the $7/mo plan to avoid it.

---

### Step 4 — Frontend: Vercel

1. Sign up at [vercel.com](https://vercel.com) → **Add New Project** → import your GitHub repo
2. Set **Root Directory** to `frontend`
3. Under **Environment Variables**, add:
   ```
   NEXT_PUBLIC_API_BASE_URL     = https://your-render-service.onrender.com
   NEXT_PUBLIC_GOOGLE_CLIENT_ID = <your Google OAuth client ID>
   ```
4. Click **Deploy** — Vercel detects Next.js automatically
5. After deploy, copy your Vercel URL (e.g. `https://quizik.vercel.app`)

---

### Step 5 — Update CORS

In Render → your web service → **Environment**, update:
```
ALLOWED_ORIGINS = https://quizik.vercel.app
```
Redeploy the service (Render does this automatically on env change).

---

### Step 6 — Google OAuth origins

In [Google Cloud Console](https://console.cloud.google.com) → your OAuth client → **Authorized JavaScript origins**, add:
```
https://quizik.vercel.app
```

---

### Step 7 — Create your admin account

1. Open `https://quizik.vercel.app/register` — register with an invitation code (create one first via the API or DB directly)
2. Or log in via Google
3. Promote yourself to admin via Supabase SQL editor:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
   ```

---

### Free-tier limitations summary

| Limitation | Impact |
|---|---|
| Render sleeps after 15 min idle | ~30–60 s delay on first request after sleep |
| Supabase pauses after 7 days no activity | Unpause manually from Supabase dashboard |
| Upstash 10 000 cmds/day | ~300 quiz submissions/day; fine for testing |
| No custom domain on Vercel Hobby | You get `*.vercel.app`; add a domain for free on Vercel |

---

## 11. Common Issues

| Problem | Fix |
|---|---|
| `alembic upgrade head` fails with "table already exists" | Check current revision: `alembic current`. Run `alembic stamp head` if DB is up to date but revision mismatch |
| CORS error in browser | Make sure `ALLOWED_ORIGINS` includes `https://` prefix and matches exact domain |
| Google OAuth "redirect_uri_mismatch" | Add production URL to Google Cloud Console authorized origins |
| Images not loading | Check `AWS_S3_ENDPOINT_URL` and bucket public-read policy |
| Celery tasks not running | Make sure `worker` service is deployed and `REDIS_URL` matches |
| Next.js env vars not picked up | Rebuild the web container after adding env vars — they're baked in at build time |
