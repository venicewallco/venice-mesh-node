# Venice Mesh Backend Deployment with Supabase

This guide walks you through deploying the Venice Mesh backend API using Supabase for the database and a lightweight server for the API services.

## Overview

**Architecture**:
- **Supabase** (Free Tier): PostgreSQL database, real-time subscriptions, authentication
- **Lightweight VPS or Local Machine**: Node.js API, Redis, Nginx, RADIUS server
- **GitHub**: Code repository and version control

**Benefits of this approach**:
- No need to manage PostgreSQL yourself
- Automatic backups and security updates from Supabase
- Easy to upgrade to paid tier later when you scale
- Clear separation of concerns (database vs. application)

## Prerequisites

Before starting, ensure you have:

- A Supabase account (free tier)
- Your Supabase project URL: `https://qtgbavxodeexazadglwp.supabase.co`
- Your Supabase API key (anon key)
- A server to run the API (local machine, VPS, or cloud instance)
- Git and Node.js 18+ installed
- Docker and Docker Compose (optional, for containerized deployment)

## Step 1: Set Up Supabase Database

### 1.1 Access Your Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `qtgbavxodeexazadglwp`
3. Navigate to **Project Settings** → **Database**

### 1.2 Get Your Connection String

1. In Supabase Dashboard, go to **Settings** → **Database**
2. Scroll down to **Connection String**
3. Copy the connection string (it looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.qtgbavxodeexazadglwp.supabase.co:5432/postgres
   ```
4. Replace `[YOUR-PASSWORD]` with your actual database password

### 1.3 Initialize the Database Schema

You have two options:

**Option A: Using Supabase SQL Editor (Easiest)**

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `db/init.sql` from your GitHub repo
4. Paste it into the SQL editor
5. Click **Run**
6. Tables will be created automatically

**Option B: Using psql Command Line**

```bash
# Download the init script
wget https://raw.githubusercontent.com/venicewallco/venice-mesh-node/main/db/init.sql

# Connect to Supabase and run the script
psql postgresql://postgres:[YOUR-PASSWORD]@db.qtgbavxodeexazadglwp.supabase.co:5432/postgres < db/init.sql

# Verify tables were created
psql postgresql://postgres:[YOUR-PASSWORD]@db.qtgbavxodeexazadglwp.supabase.co:5432/postgres -c "\dt"
```

## Step 2: Configure Your API Environment

### 2.1 Create `.env` File

Create a `.env` file in your project root with your Supabase credentials:

```bash
# Supabase Database Configuration
POSTGRES_HOST=db.qtgbavxodeexazadglwp.supabase.co
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=[YOUR-DATABASE-PASSWORD]
POSTGRES_DB=postgres

# API Configuration
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Redis Configuration (for local development)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Blockchain Configuration (Polygon)
POLYGON_RPC_URL=https://polygon-rpc.com
PRIVATE_KEY=your_wallet_private_key_here
CONTRACT_ADDRESS=0x... # Leave blank for now, deploy later
POLYGONSCAN_API_KEY=your_polygonscan_api_key_here

# RADIUS Server
RADIUS_SECRET=testing123
RADIUS_PORT=1812

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password_here
```

**Important**: 
- Never commit `.env` to Git
- Add `.env` to your `.gitignore`
- Keep your database password secure

### 2.2 Update `.gitignore`

Ensure your `.gitignore` includes:

```
.env
.env.local
.env.*.local
node_modules/
dist/
.DS_Store
```

## Step 3: Update Docker Compose for Supabase

Since you're using Supabase for the database, you can remove the PostgreSQL container from `docker-compose.yml`.

### 3.1 Simplified Docker Compose

Create an updated `docker-compose-supabase.yml`:

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  api:
    build:
      context: .
      dockerfile: api/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - POSTGRES_HOST=db.qtgbavxodeexazadglwp.supabase.co
      - POSTGRES_PORT=5432
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=postgres
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - redis
    volumes:
      - ./api:/app/api

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./docker/nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - api

volumes:
  redis_data:
```

### 3.2 Run with Supabase

```bash
# Load environment variables and start services
docker-compose -f docker-compose-supabase.yml up -d

# Verify services are running
docker-compose -f docker-compose-supabase.yml ps

# View logs
docker-compose -f docker-compose-supabase.yml logs -f api
```

## Step 4: Test the Connection

### 4.1 Verify Database Connection

```bash
# Test connection to Supabase
psql postgresql://postgres:[YOUR-PASSWORD]@db.qtgbavxodeexazadglwp.supabase.co:5432/postgres -c "SELECT version();"

# List tables
psql postgresql://postgres:[YOUR-PASSWORD]@db.qtgbavxodeexazadglwp.supabase.co:5432/postgres -c "\dt"
```

### 4.2 Test API Endpoints

```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Test mesh heartbeat
curl -X POST http://localhost:3000/api/mesh/heartbeat \
  -H "Content-Type: application/json" \
  -d '{
    "node_id": "test-node-01",
    "ip_address": "10.0.0.1",
    "client_count": 5,
    "mesh_peers": 2,
    "uptime": 3600
  }'
```

## Step 5: Deploy to Production

When you're ready to move from testing to production:

### 5.1 Deploy to a VPS

1. **Choose a VPS provider**: DigitalOcean, Linode, AWS, Hetzner (~$5-20/month)
2. **Follow the VPS setup** from `DEPLOYMENT_GUIDE.md`
3. **Use the Supabase connection string** instead of local PostgreSQL
4. **Set up SSL certificates** with Let's Encrypt

### 5.2 Update Environment Variables

On your production server:

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Create .env file with production values
cat > /home/venice-mesh/.env << EOF
POSTGRES_HOST=db.qtgbavxodeexazadglwp.supabase.co
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=[YOUR-PASSWORD]
POSTGRES_DB=postgres
NODE_ENV=production
PORT=3000
API_URL=https://api.yourdomain.com
JWT_SECRET=your_production_jwt_secret
# ... other variables
EOF

# Start services
docker-compose -f docker-compose-supabase.yml up -d
```

## Step 6: Monitor and Maintain

### 6.1 Monitor Supabase

1. Go to Supabase Dashboard
2. Check **Database** → **Connections** to see active connections
3. Monitor **Storage** usage (free tier: 500MB)
4. Check **Bandwidth** usage (free tier: 2GB/month)

### 6.2 Monitor API

```bash
# View API logs
docker-compose -f docker-compose-supabase.yml logs -f api

# Check Redis memory usage
docker-compose -f docker-compose-supabase.yml exec redis redis-cli INFO memory
```

### 6.3 Backup Your Data

Supabase automatically backs up your database, but you can also export data:

```bash
# Export database
pg_dump postgresql://postgres:[YOUR-PASSWORD]@db.qtgbavxodeexazadglwp.supabase.co:5432/postgres > backup_$(date +%Y%m%d).sql

# Restore from backup
psql postgresql://postgres:[YOUR-PASSWORD]@db.qtgbavxodeexazadglwp.supabase.co:5432/postgres < backup_20260417.sql
```

## Step 7: Upgrade to Paid Tier (When Ready)

As your Venice Mesh network grows, you may hit free tier limits. Supabase paid tiers offer:

- Unlimited database storage
- Higher bandwidth limits
- Priority support
- Advanced security features

**Migration is seamless**: Just upgrade in Supabase Dashboard, no code changes needed.

## Troubleshooting

### Connection Refused

```bash
# Verify Supabase is accessible
psql postgresql://postgres:[YOUR-PASSWORD]@db.qtgbavxodeexazadglwp.supabase.co:5432/postgres -c "SELECT 1;"
```

### Free Tier Limits Exceeded

- **Storage**: Delete old session/transaction logs
- **Bandwidth**: Optimize API responses, implement caching
- **Connections**: Use connection pooling (PgBouncer)

### API Not Connecting to Database

1. Verify `.env` file has correct credentials
2. Check firewall allows outbound connections to Supabase
3. Verify database password is correct
4. Test connection manually with psql

## Next Steps

1. **Deploy OpenWrt Nodes**: Configure mesh routers to connect to your API
2. **Test Full Flow**: Verify users can connect, earn tokens, view ads
3. **Monitor Performance**: Set up alerts for database and API health
4. **Scale as Needed**: Upgrade Supabase tier or migrate to self-hosted VPS

## Security Checklist

- [ ] `.env` file added to `.gitignore`
- [ ] Database password is strong and unique
- [ ] JWT secret is secure and random
- [ ] API running over HTTPS in production
- [ ] Supabase firewall rules configured (if needed)
- [ ] Regular backups scheduled
- [ ] Rate limiting enabled on API endpoints

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html)
- [Venice Mesh API Documentation](docs/api.md)
- [Venice Mesh Architecture](docs/architecture.md)

---

**Last Updated**: April 17, 2026  
**Version**: 1.0.0 (Supabase Edition)
