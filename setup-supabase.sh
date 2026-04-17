#!/bin/bash

# Venice Mesh - Supabase Setup Script
# This script helps you set up your Supabase database connection

set -e

echo "================================"
echo "Venice Mesh - Supabase Setup"
echo "================================"
echo ""

# Check if .env file exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists. Backing up to .env.backup"
    cp .env .env.backup
fi

# Supabase Project Details
SUPABASE_URL="https://qtgbavxodeexazadglwp.supabase.co"
SUPABASE_HOST="db.qtgbavxodeexazadglwp.supabase.co"

echo "Supabase Project URL: $SUPABASE_URL"
echo ""

# Prompt for credentials
read -p "Enter your Supabase database password: " -s POSTGRES_PASSWORD
echo ""
read -p "Enter a JWT secret (or press Enter to generate one): " JWT_SECRET

# Generate JWT secret if not provided
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 32)
    echo "Generated JWT secret: $JWT_SECRET"
fi

# Create .env file
cat > .env << EOF
# Venice Mesh - Supabase Configuration
# Generated: $(date)

# Supabase Database
POSTGRES_HOST=$SUPABASE_HOST
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=postgres

# API Configuration
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000

# JWT
JWT_SECRET=$JWT_SECRET
JWT_EXPIRY=7d

# Redis (local development)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Blockchain (Polygon)
POLYGON_RPC_URL=https://polygon-rpc.com
PRIVATE_KEY=
CONTRACT_ADDRESS=
POLYGONSCAN_API_KEY=

# RADIUS
RADIUS_SECRET=testing123
RADIUS_PORT=1812

# Logging
LOG_LEVEL=info
EOF

echo ""
echo "✅ .env file created successfully!"
echo ""
echo "Next steps:"
echo "1. Update the following in .env if needed:"
echo "   - PRIVATE_KEY (your wallet private key)"
echo "   - CONTRACT_ADDRESS (after deploying VNM token)"
echo "   - POLYGONSCAN_API_KEY (for contract verification)"
echo ""
echo "2. Initialize your database schema:"
echo "   psql postgresql://postgres:$POSTGRES_PASSWORD@$SUPABASE_HOST:5432/postgres < db/init.sql"
echo ""
echo "3. Start the API:"
echo "   npm install"
echo "   npm run dev"
echo ""
echo "4. Test the connection:"
echo "   curl http://localhost:3000/api/health"
echo ""
