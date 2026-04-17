#  Venice Mesh - System Architecture 
 
 ##  Overview 
 Venice Mesh is a decentralized mesh network providing free WiFi to Venice Beach visitors while enabling targeted advertising and a token economy. 
 
 ##  Architecture Diagram
 
 ```
 ┌─────────────────────────────────────────────────────────────────┐  
 │ OpenWrt Mesh Nodes │  
 │ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │  
 │ │ Node 1 │◄►│ Node 2 │◄►│ Node 3 │◄►│ Node N │ │  
 │ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ │  
 │ │ │ │ │ │  
 │ └────────────┴────────────┴────────────┘ │  
 │ │ │  
 │ [batman-adv] │  
 └──────────────────────────│──────────────────────────────────────┘  
 │ HTTPS  
 ▼  
 ┌─────────────────────────────────────────────────────────────────┐  
 │ VPS / Cloud │  
 │ ┌─────────────────────────────────────────────────────────┐ │  
 │ │ Nginx (SSL) │ │  
 │ └─────────────────────────│───────────────────────────────┘ │  
 │ │ │  
 │ ┌─────────────────────────▼───────────────────────────────┐ │  
 │ │ Node.js API (Express) │ │  
 │ │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │ │  
 │ │ │ Mesh │ │ Business │ │ Tokens │ │ Telemetry│ │ │  
 │ │ │ Routes │ │ Routes │ │ Routes │ │ Routes │ │ │  
 │ │ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │ │  
 │ │ │ │ │ │ │ │  
 │ │ └────────────┴────────────┴────────────┘ │ │  
 │ └─────────────────────────│───────────────────────────────┘ │  
 │ │ │  
 │ ┌─────────────┬───────────┼───────────┬─────────────────────┐ │  
 │ │ │ │ │ │ │  
 │ ▼ ▼ ▼ ▼ ▼ │  
 │┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  
 ││Postgres│ │ Redis │ │ Queue │ │ RADIUS │ │Web3 │  
 ││(Primary│ │(Cache) │ │(SQLite)│ │ Server │ │(Polygon│  
 ││Storage)│ │ │ │Backup) │ │ │ │) │  
 │└────────┘ └────────┘ └────────┘ └────────┘ └────────┘  
 └─────────────────────────────────────────────────────────────────┘  
 │  
 ▼  
 ┌─────────────────────────────────────────────────────────────────┐  
 │ Client Applications │  
 │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │  
 │ │ Manus UI │ │ Mobile App │ │ Merchant │ │  
 │ │ (Dashboard) │ │ (React Nat) │ │ POS │ │  
 │ └─────────────┘ └─────────────┘ └─────────────┘ │  
 └─────────────────────────────────────────────────────────────────┘
 ```
 
 ## Component Details 
 
 ### 1. OpenWrt Mesh Nodes 
 - **Batman-adv**: Layer 2 mesh routing 
 - **802.11s**: Wireless mesh backhaul 
 - **802.11r**: Fast roaming for seamless connectivity 
 - **openNDS**: Captive portal for authentication 
 - **Node Daemon**: Heartbeat and telemetry reporting 
 
 ### 2. API Backend (Node.js/Express) 
 - **RESTful endpoints** for all operations 
 - **JWT authentication** for business accounts 
 - **Rate limiting** per IP and endpoint 
 - **Request queue** for offline node handling 
 
 ### 3. Database Layer 
 - **PostgreSQL**: Primary data store 
 - **Redis**: Real-time caching and session storage 
 - **SQLite**: Offline queue on nodes 
 
 ### 4. Blockchain Layer (Polygon) 
 - **VNM Token**: ERC-20 with staking and rewards 
 - **Gasless transactions**: Meta-transactions for user onboarding 
 
 ## Data Flow 
 
 1. **User connects to WiFi** → RADIUS auth → Session created → API receives session 
 2. **User views ad** → Impression recorded → API updates campaign metrics 
 3. **User earns tokens** → Time-based rewards → Minted on Polygon 
 4. **Business creates campaign** → API stores in PostgreSQL → Served to nodes 
 
 ## Security 
 
 - All API traffic over HTTPS 
 - JWT tokens expire after 7 days 
 - Rate limiting prevents abuse 
 - Input validation on all endpoints 
 - Private keys never exposed