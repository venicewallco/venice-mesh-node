#!/bin/sh 
 
 # Venice Beach Mesh - Node Daemon 
 # Runs on each OpenWrt router, reports telemetry to central API 
 # Version: 1.0.0 
 
 # ==================== CONFIGURATION ==================== 
 # API endpoint (change to your VPS IP) 
 API_URL = "https://your-vps-ip:3000" 
 NODE_ID = $( uci get system.@system [ 0 ] .hostname  2 > /dev/null  || cat  /proc/sys/kernel/hostname ) 
 INTERVAL = 60 # Seconds between heartbeats 
 LOG_FILE = "/var/log/mesh-node.log" 
 
 # Colors for logging 
 RED = '\033[0;31m' 
 GREEN = '\033[0;32m' 
 YELLOW = '\033[1;33m' 
 NC = '\033[0m' 
 
 # ==================== LOGGING FUNCTION ==================== 
 log ( ) { 
 echo "[ $( date '+%Y-%m-%d %H:%M:%S' ) ]  $1 " >> $LOG_FILE 
 echo -e " ${GREEN} [MESH] ${NC} $1 " 
 } 
 
 log_error ( ) { 
 echo "[ $( date '+%Y-%m-%d %H:%M:%S' ) ] ERROR:  $1 " >> $LOG_FILE 
 echo -e " ${RED} [ERROR] ${NC} $1 " 
 } 
 
 # ==================== TELEMETRY COLLECTION ==================== 
 
 # Get number of connected WiFi clients 
 get_client_count ( ) { 
 # Count unique MAC addresses across all interfaces 
    iwinfo  | grep -oE "([0-9A-F]{2}:){5}[0-9A-F]{2}" | sort -u | wc -l 
 } 
 
 # Get mesh peer count (802.11s) 
 get_mesh_peers ( ) { 
    iw dev mesh0 station dump  2 > /dev/null  | grep -c "Station" || echo "0" 
 } 
 
 # Get Batman-adv neighbor count 
 get_batman_neighbors ( ) { 
    batctl o  2 > /dev/null  | grep -v "Originator" | grep -c "." || echo "0" 
 } 
 
 # Get system uptime (seconds) 
 get_uptime ( ) { 
 cat  /proc/uptime  | cut  -d ' ' -f1 | cut  -d.  -f1 
 } 
 
 # Get CPU load average 
 get_cpu_load ( ) { 
 cat  /proc/loadavg  | cut  -d ' ' -f1 
 } 
 
 # Get free memory (KB) 
 get_free_memory ( ) { 
 free | grep  Mem  | awk '{print $4}' 
 } 
 
 # Get firmware version 
 get_firmware_version ( ) { 
 cat  /etc/openwrt_release  | grep  DISTRIB_RELEASE  | cut  -d '"' -f2 
 } 
 
 # Get LAN IP address 
 get_lan_ip ( ) { 
    uci get network.lan.ipaddr  2 > /dev/null  || echo "192.168.1.1" 
 } 
 
 # Get active sessions (from openNDS captive portal) 
 get_active_sessions ( ) { 
 if  pgrep  -x "opennds" >  /dev/null ; then 
        ndsctl status  2 > /dev/null  | grep -c "Client:" || echo "0" 
 else 
 echo "0" 
 fi 
 } 
 
 # Get bandwidth usage (bytes transferred in last minute) 
 get_bandwidth_usage ( ) { 
 # Simple approximation using ifconfig delta 
 local rx_before = $( cat  /sys/class/net/wlan0/statistics/rx_bytes  2 > /dev/null  || echo "0" ) 
 local tx_before = $( cat  /sys/class/net/wlan0/statistics/tx_bytes  2 > /dev/null  || echo "0" ) 
 sleep 1 
 local rx_after = $( cat  /sys/class/net/wlan0/statistics/rx_bytes  2 > /dev/null  || echo "0" ) 
 local tx_after = $( cat  /sys/class/net/wlan0/statistics/tx_bytes  2 > /dev/null  || echo "0" ) 
 local rx_rate = $(( ( rx_after  -  rx_before ) / 1024 )) # KB/s 
 local tx_rate = $(( ( tx_after  -  tx_before ) / 1024 )) 
 echo "{ \" rx_kbps \" :  $rx_rate ,  \" tx_kbps \" :  $tx_rate }" 
 } 
 
 # ==================== API COMMUNICATION ==================== 
 
 # Send heartbeat to central API 
 send_heartbeat ( ) { 
 local client_count = $( get_client_count ) 
 local mesh_peers = $( get_mesh_peers ) 
 local batman_neighbors = $( get_batman_neighbors ) 
 local uptime = $( get_uptime ) 
 local cpu_load = $( get_cpu_load ) 
 local free_mem = $( get_free_memory ) 
 local firmware = $( get_firmware_version ) 
 local ip_addr = $( get_lan_ip ) 
 local active_sessions = $( get_active_sessions ) 
 local bandwidth = $( get_bandwidth_usage ) 
 
 # Build JSON payload 
 local payload = "{ 
 \" node_id \" :  \" $NODE_ID \" , 
 \" ip_address \" :  \" $ip_addr \" , 
 \" firmware_version \" :  \" $firmware \" , 
 \" client_count \" :  $client_count , 
 \" mesh_peers \" :  $mesh_peers , 
 \" batman_neighbors \" :  $batman_neighbors , 
 \" uptime \" :  $uptime , 
 \" cpu_load \" :  $cpu_load , 
 \" free_memory \" :  $free_mem , 
 \" active_sessions \" :  $active_sessions , 
 \" bandwidth \" :  $bandwidth , 
 \" timestamp \" :  \" $( date -Iseconds ) \" 
    }" 
 
 # Send to API 
 local response = $( curl -s -X  POST  \ 
 -H "Content-Type: application/json" \ 
 -d " $payload " \ 
 -w "%{http_code}" \ 
        --max-time  10 \ 
 " $API_URL /api/node/heartbeat" 2 > /dev/null ) 
 
 local http_code = " ${response :  -3} " 
 local response_body = " ${response % ???} " 
 
 if [ " $http_code " = "200" ] || [ " $http_code " = "201" ] ; then 
        log  "Heartbeat sent successfully - Clients:  $client_count , Mesh peers:  $mesh_peers " 
 return 0 
 else 
        log_error  "Heartbeat failed (HTTP  $http_code ):  $response_body " 
 return 1 
 fi 
 } 
 
 # Report a new client session (when someone connects to WiFi) 
 report_session ( ) { 
 local mac_address = $1 
 local zone = $2 
 
 local payload = "{ 
 \" node_id \" :  \" $NODE_ID \" , 
 \" mac_address \" :  \" $mac_address \" , 
 \" zone \" :  \" $zone \" , 
 \" started_at \" :  \" $( date -Iseconds ) \" 
    }" 
 
 curl -s -X  POST  \ 
 -H "Content-Type: application/json" \ 
 -d " $payload " \ 
        --max-time  5 \ 
 " $API_URL /api/node/session" >  /dev/null  2 > &1 
 
    log  "Session reported for MAC:  $mac_address " 
 } 
 
 # Report ad impression (called from openNDS theme) 
 report_impression ( ) { 
 local session_id = $1 
 local campaign_id = $2 
 local zone = $3 
 
 local payload = "{ 
 \" session_id \" :  $session_id , 
 \" campaign_id \" :  $campaign_id , 
 \" node_id \" :  \" $NODE_ID \" , 
 \" zone \" :  \" $zone \" 
    }" 
 
 curl -s -X  POST  \ 
 -H "Content-Type: application/json" \ 
 -d " $payload " \ 
        --max-time  5 \ 
 " $API_URL /api/node/impression" >  /dev/null  2 > &1 
 } 
 
 # ==================== CAPTIVE PORTAL INTEGRATION (openNDS) ==================== 
 
 # Install openNDS theme hooks (run once) 
 setup_captive_portal_hooks ( ) { 
 local theme_dir = "/etc/opennds/htdocs/venice" 
 
 # Create theme directory 
 mkdir -p $theme_dir 
 
 # Create custom splash page with API integration 
 cat > $theme_dir /splash.html  << 'EOF' 
 <!DOCTYPE html> 
 <html> 
 <head> 
    <title>Venice Beach Free WiFi</title> 
    <meta name="viewport" content="width=device-width, initial-scale=1"> 
    <style> 
        body { font-family: Arial; text-align: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; } 
        .container { max-width: 400px; margin: auto; background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; } 
        button { background: #4CAF50; color: white; padding: 15px 30px; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; } 
        .ad-space { margin: 20px 0; padding: 20px; background: rgba(0,0,0,0.3); border-radius: 10px; } 
    </style> 
 </head> 
 <body> 
    <div class="container"> 
        <h1>Venice Beach WiFi</h1> 
        <p>Free high-speed internet for our visitors</p> 
 
        <div class="ad-space" id="ad-container"> 
            <!-- Dynamic ad content loaded from API --> 
            <img id="ad-image" src="" style="max-width: 100%; border-radius: 10px;"> 
            <p id="ad-text">Supporting local businesses</p> 
        </div> 
 
        <button onclick="acceptTerms()">Connect Now</button> 
        <p><small>By connecting, you agree to our terms and privacy policy</small></p> 
    </div> 
 
    <script> 
        // Fetch ad from local API 
        fetch('/api/ad?zone=venice_pier&mac=' + getMacAddress()) 
            .then(r => r.json()) 
            .then(ad => { 
                if (ad.image_url) document.getElementById('ad-image').src = ad.image_url; 
                if (ad.text) document.getElementById('ad-text').innerText = ad.text; 
                // Report impression 
                fetch('/api/report-impression', { 
                    method: 'POST', 
                    body: JSON.stringify({ campaign_id: ad.campaign_id }) 
                }); 
            }); 
 
        function getMacAddress() { 
            // Client MAC is available via openNDS variable 
            return window.location.search.match(/client_mac=([^&]+)/)?.[1] || 'unknown'; 
        } 
 
        function acceptTerms() { 
            window.location.href = 'http://1.0.0.0:2050/opennds_preauth/?url=' + encodeURIComponent(window.location.href); 
        } 
    </script> 
 </body> 
 </html> 
 EOF 
 
 # Configure openNDS to use custom theme 
    uci  set  opennds.@opennds [ 0 ] .theme_path = "/etc/opennds/htdocs/venice" 
    uci  set  opennds.@opennds [ 0 ] .preauth_id = "1" 
    uci commit opennds 
 
    log  "Captive portal theme installed" 
 } 
 
 # ==================== HEALTH CHECKS ==================== 
 
 # Verify Batman-adv is running 
 check_batman ( ) { 
 if !  lsmod  | grep -q  batman_adv ; then 
        log_error  "Batman-adv not loaded. Attempting to load..." 
        modprobe batman_adv 
 fi 
 } 
 
 # Verify mesh interface exists 
 check_mesh ( ) { 
 if ! ip link  show mesh0  >  /dev/null  2 > &1 ; then 
        log_error  "mesh0 interface missing" 
 return 1 
 fi 
 return 0 
 } 
 
 # Verify bat0 interface exists 
 check_bat0 ( ) { 
 if ! ip link  show bat0  >  /dev/null  2 > &1 ; then 
        log_error  "bat0 interface missing" 
 return 1 
 fi 
 return 0 
 } 
 
 # Verify API connectivity 
 check_api ( ) { 
 local response = $( curl -s -o  /dev/null  -w "%{http_code}"  --max-time  5 " $API_URL /api/health" 2 > /dev/null ) 
 if [ " $response " = "200" ] ; then 
 return 0 
 else 
        log_error  "API unreachable (HTTP  $response )" 
 return 1 
 fi 
 } 
 
 # ==================== MAIN DAEMON LOOP ==================== 
 
 # Run initial checks 
 init_daemon ( ) { 
    log  "Starting Venice Mesh Node Daemon" 
    log  "Node ID:  $NODE_ID " 
    log  "API URL:  $API_URL " 
 
 # Check dependencies 
    check_batman 
    check_mesh 
    check_bat0 
 
 # Setup captive portal if openNDS is installed 
 if command -v  ndsctl  >  /dev/null ; then 
        setup_captive_portal_hooks 
 else 
        log  "openNDS not installed - captive portal disabled" 
 fi 
 
 # Test API connectivity 
 if  check_api ; then 
        log  "API connection successful" 
 else 
        log_error  "API connection failed - will retry" 
 fi 
 
 # Send initial heartbeat 
    send_heartbeat 
 } 
 
 # Main loop 
 main ( ) { 
    init_daemon 
 
 while true ; do 
 sleep $INTERVAL 
 
 # Check API before sending (reconnect if needed) 
 if  check_api ; then 
            send_heartbeat 
 else 
            log_error  "API unreachable, skipping heartbeat" 
 fi 
 
 # Rotate log if too large (>10MB) 
 if [ -f " $LOG_FILE " ] && [ $( stat  -c%s  " $LOG_FILE " ) -gt 10485760 ] ; then 
 mv $LOG_FILE ${LOG_FILE} .old 
            log  "Log rotated" 
 fi 
 done 
 } 
 
 # Handle signals 
 trap 'log "Daemon stopped"; exit 0'  INT  TERM 
 
 # Run main function 
 main
