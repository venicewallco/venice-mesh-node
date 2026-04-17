# Venice Mesh + Supabase Quick Start

Get your Venice Mesh backend running with Supabase in 5 minutes.

## Prerequisites

- Supabase account (free tier)
- Node.js 18+ or Docker
- Git

## Quick Setup

### Step 1: Initialize Database Schema

Go to your Supabase Dashboard and run this in the SQL Editor:

```sql
-- Copy the contents of db/init.sql and paste here
-- Then click "Run"
```

Or use the command line:

```bash
# Get your connection string from Supabase Dashboard → Settings → Database
psql postgresql://postgres:[PASSWORD]@db.qtgbavxodeexazadglwp.supabase.co:5432/postgres < db/init.sql
```

### Step 2: Set Up Environment

```bash
# Run the setup script
bash setup-supabase.sh

# It will prompt you for:
# - Supabase database password
# - JWT secret (or generate one)
```

Or manually create `.env`:

```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

### Step 3: Start the API

**Option A: Local Node.js**

```bash
npm install
npm run dev
```

**Option B: Docker**

```bash
docker-compose -f docker-compose-supabase.yml up -d
```

### Step 4: Test

```bash
# Health check
curl http://localhost:3000/api/health

# Expected response:
# {"status":"ok","timestamp":"2026-04-17T..."}
```

## What's Running

- **API**: http://localhost:3000
- **Redis**: localhost:6379
- **Database**: Supabase (cloud-hosted)
- **Nginx**: http://localhost (optional, if using Docker)

## Next Steps

1. **Deploy OpenWrt nodes**: Configure routers to connect to your API
2. **Deploy blockchain contract**: Run `blockchain/scripts/deploy.js`
3. **Test full flow**: Connect to WiFi, earn tokens, view ads
4. **Monitor**: Check Supabase Dashboard for database usage

## Troubleshooting

**"Connection refused"**
```bash
# Verify Supabase is accessible
psql postgresql://postgres:[PASSWORD]@db.qtgbavxodeexazadglwp.supabase.co:5432/postgres -c "SELECT 1;"
```

**"Database not initialized"**
```bash
# Re-run the init script
psql postgresql://postgres:[PASSWORD]@db.qtgbavxodeexazadglwp.supabase.co:5432/postgres < db/init.sql
```

**"API won't start"**
```bash
# Check logs
docker-compose -f docker-compose-supabase.yml logs api

# Or check environment
npm run dev
```

## Free Tier Limits

- 500MB storage
- 2GB bandwidth/month
- 2 concurrent connections
- Project pauses after 1 week of inactivity

**Upgrade to paid tier** when you hit limits (seamless upgrade, no code changes needed).

## Full Documentation

See `SUPABASE_DEPLOYMENT_GUIDE.md` for complete setup instructions.

---

**Ready to deploy?** Follow the full guide for production setup with SSL, monitoring, and scaling.
