-- Venice Mesh Network - Database Schema 
 
 -- Nodes table 
 CREATE TABLE IF NOT EXISTS  nodes  ( 
  node_id  TEXT PRIMARY KEY , 
  ip_address  TEXT , 
  firmware_version  TEXT , 
  last_seen  TIMESTAMP , 
 status TEXT DEFAULT 'offline' , 
  client_count  INTEGER DEFAULT 0 , 
  mesh_peers  INTEGER DEFAULT 0 , 
  batman_neighbors  INTEGER DEFAULT 0 , 
  uptime  INTEGER DEFAULT 0 , 
  cpu_load  DECIMAL ( 5 , 2 ) , 
  free_memory  INTEGER , 
  active_sessions  INTEGER DEFAULT 0 , 
  created_at  TIMESTAMP DEFAULT NOW ( ) 
 ) ; 
 
 -- Heartbeats history 
 CREATE TABLE IF NOT EXISTS  heartbeats  ( 
  id  SERIAL PRIMARY KEY , 
  node_id  TEXT REFERENCES  nodes ( node_id ) , 
  client_count  INTEGER , 
  mesh_peers  INTEGER , 
  uptime  INTEGER , 
  cpu_load  DECIMAL ( 5 , 2 ) , 
  recorded_at  TIMESTAMP DEFAULT NOW ( ) 
 ) ; 
 
 -- Sessions (client connections) 
 CREATE TABLE IF NOT EXISTS  sessions  ( 
  id  SERIAL PRIMARY KEY , 
  node_id  TEXT REFERENCES  nodes ( node_id ) , 
  mac_address  TEXT , 
  zone  TEXT , 
  bytes_used  BIGINT DEFAULT 0 , 
  duration_seconds  INTEGER DEFAULT 0 , 
  started_at  TIMESTAMP , 
  ended_at  TIMESTAMP 
 ) ; 
 
 -- Impressions (ad views) 
 CREATE TABLE IF NOT EXISTS  impressions  ( 
  id  SERIAL PRIMARY KEY , 
  session_id  INTEGER REFERENCES  sessions ( id ) , 
  campaign_id  INTEGER , 
  node_id  TEXT , 
  zone  TEXT , 
  viewed_at  TIMESTAMP DEFAULT NOW ( ) 
 ) ; 
 
 -- Campaigns 
 CREATE TABLE IF NOT EXISTS  campaigns  ( 
  id  SERIAL PRIMARY KEY , 
  business_name  TEXT NOT NULL , 
  business_email  TEXT , 
  budget  INTEGER , 
  spent  INTEGER DEFAULT 0 , 
  goal  TEXT , 
  zones  TEXT [ ] , 
  creative_url  TEXT , 
 status TEXT DEFAULT 'pending' , 
  impressions  INTEGER DEFAULT 0 , 
  clicks  INTEGER DEFAULT 0 , 
  created_at  TIMESTAMP DEFAULT NOW ( ) 
 ) ; 
 
 -- Businesses (advertisers) 
 CREATE TABLE IF NOT EXISTS  businesses  ( 
  id  SERIAL PRIMARY KEY , 
  email  TEXT UNIQUE NOT NULL , 
  password_hash  TEXT NOT NULL , 
  business_name  TEXT , 
  phone  TEXT , 
  created_at  TIMESTAMP DEFAULT NOW ( ) 
 ) ; 
 
 -- Request queue (for offline nodes) 
 CREATE TABLE IF NOT EXISTS  request_queue  ( 
  id  SERIAL PRIMARY KEY , 
  node_id  TEXT , 
  endpoint  TEXT , 
  payload JSONB , 
  retry_count  INTEGER DEFAULT 0 , 
  last_error  TEXT , 
 status TEXT DEFAULT 'pending' , 
  created_at  TIMESTAMP DEFAULT NOW ( ) , 
  completed_at  TIMESTAMP 
 ) ; 
 
 -- Indexes 
 CREATE INDEX IF NOT EXISTS  idx_nodes_last_seen  ON  nodes ( last_seen ) ; 
 CREATE INDEX IF NOT EXISTS  idx_impressions_viewed_at  ON  impressions ( viewed_at ) ; 
 CREATE INDEX IF NOT EXISTS  idx_impressions_campaign  ON  impressions ( campaign_id ) ; 
 CREATE INDEX IF NOT EXISTS  idx_sessions_started_at  ON  sessions ( started_at ) ; 
 CREATE INDEX IF NOT EXISTS  idx_sessions_node  ON  sessions ( node_id ) ; 
 CREATE INDEX IF NOT EXISTS  idx_request_queue_status  ON  request_queue ( status ) ; 
 
 -- Views 
 CREATE OR REPLACE VIEW  daily_analytics  AS 
 SELECT 
 DATE ( viewed_at ) as date , 
 COUNT ( * ) as  total_impressions , 
 COUNT ( DISTINCT  session_id ) as  unique_sessions , 
 COUNT ( DISTINCT  node_id ) as  active_nodes 
 FROM  impressions 
 GROUP BY DATE ( viewed_at ) 
 ORDER BY date DESC ;