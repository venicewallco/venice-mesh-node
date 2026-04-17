#  Venice Mesh - Deployment Guide 
 
 ##  Prerequisites 
 -  VPS with 2GB+ RAM, 20GB+ storage 
 -  Ubuntu 22.04 or Debian 11+ 
 -  Docker & Docker Compose installed 
 -  Domain name (e.g., api.venicemesh.com) with SSL 
 
 ##  Quick Deploy 
 
 ###  1. Clone repository 
 ```bash 
 git clone https://github.com/venicewallco/venice-mesh.git 
 cd venice-mesh
 ```
 
 ### 2. Configure environment
 
 ```bash 
 cp  .env.example .env 
 nano  .env   # Edit passwords and secrets
 ```
 
 ### 3. Start services
 
 ```bash 
 docker-compose  up  -d
 ```
 
 ### 4. Verify deployment
 
 ```bash 
 curl  https://api.venicemesh.com/health 
 # Expected: {"status":"ok","service":"venice-mesh-api"}
 ```
 
 ## Adding OpenWrt Nodes
 
 Run this on each OpenWrt router:
 
 ```bash 
 curl -sL  https://raw.githubusercontent.com/venicewallco/venice-mesh/main/openwrt/scripts/setup-node.sh  | sh
 ```
 
 ## Monitoring
 
 * API logs: `docker-compose logs -f api`
 * Database: `docker-compose exec postgres psql -U venice`
 * Redis: `docker-compose exec redis redis-cli -a yourpassword`