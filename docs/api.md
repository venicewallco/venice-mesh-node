#  Venice Mesh API Documentation 
 
 ##  Base URL
 
 <https://api.venicemesh.com>
 
 ## Authentication 
 
 Most endpoints require a JWT token in the Authorization header:
 
 Authorization: Bearer <your_jwt_token>
 
 ## Endpoints 
 
 ### Mesh Nodes (OpenWrt) 
 
 #### POST `/api/mesh/heartbeat` 
 Report node status (called every 60 seconds) 
 ```json 
 { 
  "node_id": "venice-node-01", 
  "ip_address": "10.0.0.25", 
  "client_count": 42, 
  "mesh_peers": 5, 
  "uptime": 86400 
 }
 ```
 
 #### POST `/api/mesh/session`
 
 Record new client session
 
 ```json 
 { 
  "node_id": "venice-node-01", 
  "mac_address": "AA:BB:CC:DD:EE:FF", 
  "zone": "venice_pier" 
 }
 ```
 
 #### POST `/api/mesh/impression`
 
 Record ad impression
 
 ```json 
 { 
  "session_id": 12345, 
  "campaign_id": 100, 
  "node_id": "venice-node-01", 
  "zone": "venice_pier" 
 }
 ```
 
 ### Analytics (Manus Dashboard)
 
 #### GET `/api/telemetry/analytics`
 
 Get real-time statistics
 
 - Query params: `date_from`, `date_to`, `zone`
 - Response:
 
 ```json 
 { 
  "impressions": 12430, 
  "sessions": 5678, 
  "active_nodes": 12, 
  "top_zones": [ ... ], 
  "timestamp": "2024-01-15T10:30:00Z" 
 }
 ```
 
 #### GET `/api/telemetry/impressions/daily`
 
 Get daily breakdown (last 7 days)
 
 ### Business (Advertisers)
 
 #### POST `/api/business/register`
 
 Create advertiser account
 
 ```json 
 { 
  "email": "cafe@venice.com", 
  "password": "securepass", 
  "business_name": "Venice Cafe" 
 }
 ```
 
 #### POST `/api/business/login`
 
 Authenticate and receive JWT
 
 #### GET `/api/business/campaigns`
 
 List all campaigns for authenticated business
 
 #### POST `/api/business/campaigns`
 
 Create new campaign
 
 ```json 
 { 
  "business_name": "Venice Cafe", 
  "budget": 7500, 
  "goal": "Increase foot traffic", 
  "zones": ["venice_pier", "boardwalk"], 
  "creative_url": "https://example.com/ad.jpg" 
 }
 ```
 
 #### GET `/api/business/campaigns/:id/stats`
 
 Get campaign performance metrics
 
 #### GET `/api/business/pricing`
 
 Get current pricing tiers
 
 ```json 
 { 
  "tiers": [ 
  { "name": "Founding Advertiser", "price": 15000, "impressions_estimate": "500,000+" }, 
  { "name": "Premium", "price": 7500, "impressions_estimate": "250,000+" }, 
  { "name": "Starter", "price": 3000, "impressions_estimate": "100,000+" } 
  ] 
 }
 ```
 
 ### Tokens
 
 #### GET `/api/tokens/balance/:address`
 
 Get token balance for wallet
 
 #### POST `/api/tokens/earn`
 
 Earn tokens for WiFi usage
 
 ```json 
 { 
  "wallet_address": "0x...", 
  "session_id": 12345, 
  "minutes_connected": 30 
 }
 ```
 
 #### POST `/api/tokens/transfer`
 
 Transfer tokens between wallets (requires auth)
 
 #### POST `/api/tokens/stake`
 
 Stake tokens for rewards
 
 ## Error Responses
 
 ```json 
 { 
  "error": "Description of the error" 
 }
 ```
 
 Common HTTP codes:
 
 - `200` - Success
 - `400` - Bad request
 - `401` - Unauthorized
 - `403` - Forbidden
 - `404` - Not found
 - `429` - Rate limit exceeded
 - `500` - Internal server error
 
 ## Rate Limits
 
 - General API: 100 requests per minute
 - Authentication: 5 attempts per 15 minutes
 - Node heartbeats: 300 per minute