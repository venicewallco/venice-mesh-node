#!/bin/sh 
 
 # Venice Mesh - Offline SQLite Queue for OpenWrt 
 # Stores API requests when internet/VPS is unreachable 
 
 QUEUE_DB = "/root/mesh-queue.db" 
 API_URL = " ${API_URL :- https : / / your-vps-ip : 3000} " 
 MAX_RETRIES = 10 
 RETRY_DELAY = 60 
 
 # Initialize SQLite database 
 init_queue ( ) { 
 if [ ! -f " $QUEUE_DB " ] ; then 
        sqlite3  " $QUEUE_DB " << EOF 
 CREATE TABLE IF NOT EXISTS queue ( 
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    endpoint TEXT NOT NULL, 
    payload TEXT NOT NULL, 
    retries INTEGER DEFAULT 0, 
    created_at INTEGER DEFAULT (strftime('%s', 'now')), 
    last_attempt INTEGER 
 ); 
 
 CREATE TABLE IF NOT EXISTS processed ( 
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    endpoint TEXT, 
    payload TEXT, 
    processed_at INTEGER DEFAULT (strftime('%s', 'now')) 
 ); 
 
 CREATE INDEX idx_queue_created ON queue(created_at); 
 EOF 
 echo "Queue database initialized at  $QUEUE_DB " 
 fi 
 } 
 
 # Add request to queue 
 queue_request ( ) { 
 local endpoint = " $1 " 
 local payload = " $2 " 
 
    init_queue 
 
    sqlite3  " $QUEUE_DB " \ 
 "INSERT INTO queue (endpoint, payload) VALUES (' $endpoint ', ' $payload ')" 
 
 echo "Request queued:  $endpoint " 
 } 
 
 # Send a single request to API 
 send_request ( ) { 
 local endpoint = " $1 " 
 local payload = " $2 " 
 
 local response = $( curl -s -X  POST  \ 
 -H "Content-Type: application/json" \ 
 -d " $payload " \ 
 -w "%{http_code}" \ 
        --max-time  10 \ 
 " $API_URL $endpoint " 2 > /dev/null ) 
 
 local http_code = " ${response :  -3} " 
 
 if [ " $http_code " = "200" ] || [ " $http_code " = "201" ] ; then 
 return 0 
 else 
 return 1 
 fi 
 } 
 
 # Process queue (called periodically) 
 process_queue ( ) { 
    init_queue 
 
 # Get pending requests 
 local pending = $( sqlite3  " $QUEUE_DB " \ 
 "SELECT id, endpoint, payload, retries FROM queue WHERE retries <  $MAX_RETRIES  ORDER BY created_at ASC LIMIT 10" ) 
 
 if [ -z " $pending " ] ; then 
 return 0 
 fi 
 
 echo " $pending " | while IFS = '|' read id  endpoint payload retries ; do 
 echo "Processing queued request  $id  (attempt  $(( retries  + 1 )) / $MAX_RETRIES )" 
 
 if  send_request  " $endpoint " " $payload " ; then 
 # Move to processed table 
            sqlite3  " $QUEUE_DB " \ 
 "INSERT INTO processed (endpoint, payload) VALUES (' $endpoint ', ' $payload '); \ 
                 DELETE FROM queue WHERE id =  $id " 
 echo "Request  $id  sent successfully" 
 else 
 # Increment retry count 
 local new_retries = $(( retries  + 1 )) 
 local now = $( date  +%s ) 
            sqlite3  " $QUEUE_DB " \ 
 "UPDATE queue SET retries =  $new_retries , last_attempt =  $now  WHERE id =  $id " 
 echo "Request  $id  failed, retry  $new_retries / $MAX_RETRIES " 
 fi 
 done 
 } 
 
 # Get queue stats 
 queue_stats ( ) { 
    init_queue 
 local pending = $( sqlite3  " $QUEUE_DB " "SELECT COUNT(*) FROM queue" ) 
 local processed = $( sqlite3  " $QUEUE_DB " "SELECT COUNT(*) FROM processed" ) 
 local oldest = $( sqlite3  " $QUEUE_DB " "SELECT MIN(created_at) FROM queue" ) 
 
 echo "{ \" pending \" :  $pending ,  \" processed \" :  $processed ,  \" oldest \" :  $oldest }" 
 } 
 
 # Clear old processed entries (keep 7 days) 
 cleanup_queue ( ) { 
 local week_ago = $( date -d "7 days ago"  +%s  2 > /dev/null  || echo $(( $( date +%s )  -  604800 ) )) 
    sqlite3  " $QUEUE_DB " "DELETE FROM processed WHERE processed_at <  $week_ago " 
 echo "Cleaned up old processed entries" 
 } 
 
 # Main - if called directly 
 if [ " $1 " = "process" ] ; then 
    process_queue 
 elif [ " $1 " = "stats" ] ; then 
    queue_stats 
 elif [ " $1 " = "cleanup" ] ; then 
    cleanup_queue 
 elif [ " $1 " = "add" ] && [ -n " $2 " ] && [ -n " $3 " ] ; then 
    queue_request  " $2 " " $3 " 
 else 
 echo "Usage:  $0  {process|stats|cleanup|add <endpoint> <payload>}" 
 echo "" 
 echo "  process  - Process all pending queue items" 
 echo "  stats    - Show queue statistics" 
 echo "  cleanup  - Remove old processed entries" 
 echo "  add      - Add request to queue" 
 fi