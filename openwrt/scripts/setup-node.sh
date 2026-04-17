#!/bin/sh 
 
 # Venice Mesh - One-line Node Installer 
 # Usage: curl -sL https://raw.githubusercontent.com/venicewallco/venice-mesh/main/openwrt/scripts/setup-node.sh | sh 
 
 set -e 
 
 # Colors 
 RED = '\033[0;31m' 
 GREEN = '\033[0;32m' 
 YELLOW = '\033[1;33m' 
 NC = '\033[0m' 
 
 echo " ${GREEN} ======================================== ${NC} " 
 echo " ${GREEN} Venice Beach Mesh Node Installer ${NC} " 
 echo " ${GREEN} ======================================== ${NC} " 
 
 # Detect architecture 
 ARCH = $( uname -m ) 
 echo "Detected architecture:  $ARCH " 
 
 # Check if running on OpenWrt 
 if ! grep -q "OpenWrt"  /etc/openwrt_release  2 > /dev/null ; then 
 echo " ${RED} Error: This script must run on OpenWrt ${NC} " 
 exit 1 
 fi 
 
 # Get API URL from user 
 echo "" 
 echo "Enter your Venice Mesh API URL (e.g., https://api.venicemesh.com):" 
 read  API_URL 
 
 if [ -z " $API_URL " ] ; then 
 echo " ${RED} API URL required ${NC} " 
 exit 1 
 fi 
 
 # Update opkg 
 echo "" 
 echo " ${YELLOW} Updating package lists... ${NC} " 
 opkg update 
 
 # Install required packages 
 echo " ${YELLOW} Installing dependencies... ${NC} " 
 opkg  install curl  jq sqlite3-cli batctl kmod-batman-adv iwinfo 
 
 # Create directory structure 
 echo " ${YELLOW} Creating directories... ${NC} " 
 mkdir -p  /root/.venice 
 mkdir -p  /etc/venice 
 mkdir -p  /var/log/venice 
 
 # Download mesh daemon 
 echo " ${YELLOW} Downloading mesh-node-daemon... ${NC} " 
 cat >  /root/mesh-node-daemon.sh  << 'EOF' 
 [Placeholder - paste the full mesh-node-daemon.sh content here] 
 EOF 
 
 chmod  +x /root/mesh-node-daemon.sh 
 
 # Download queue script 
 echo " ${YELLOW} Downloading queue script... ${NC} " 
 cat >  /root/mesh-queue.sh  << 'EOF' 
 [Placeholder - paste mesh-queue.sh content here] 
 EOF 
 
 chmod  +x /root/mesh-queue.sh 
 
 # Configure API URL in scripts 
 sed -i "s|API_URL= \" .* \" |API_URL= \" $API_URL \" |g"  /root/mesh-node-daemon.sh 
 sed -i "s|API_URL= \" .* \" |API_URL= \" $API_URL \" |g"  /root/mesh-queue.sh 
 
 # Create init script 
 echo " ${YELLOW} Creating init script... ${NC} " 
 cat >  /etc/init.d/mesh-node  << 'EOF' 
 #!/bin/sh /etc/rc.common 
 
 START=99 
 STOP=10 
 
 USE_PROCD=1 
 PROG=/root/mesh-node-daemon.sh 
 
 start_service() { 
    procd_open_instance 
    procd_set_param command $PROG 
    procd_set_param respawn 3600 5 0 
    procd_set_param stdout 1 
    procd_set_param stderr 1 
    procd_close_instance 
 } 
 
 stop_service() { 
    killall mesh-node-daemon.sh 
 } 
 EOF 
 
 chmod  +x /etc/init.d/mesh-node 
 
 # Create cron job for queue processing 
 echo " ${YELLOW} Setting up cron jobs... ${NC} " 
 cat >>  /etc/crontabs/root  << EOF 
 # Venice Mesh - Process queue every minute 
 * * * * * /root/mesh-queue.sh process >> /var/log/venice/queue.log 2>&1 
 # Cleanup old queue entries daily at 2am 
 0 2 * * * /root/mesh-queue.sh cleanup >> /var/log/venice/queue.log 2>&1 
 EOF 
 
 # Start the daemon 
 echo " ${YELLOW} Starting mesh node daemon... ${NC} " 
 /etc/init.d/mesh-node  enable 
 /etc/init.d/mesh-node start 
 
 # Test API connectivity 
 echo " ${YELLOW} Testing API connectivity... ${NC} " 
 sleep 2 
 if grep -q "Heartbeat sent"  /var/log/mesh-node.log  2 > /dev/null ; then 
 echo " ${GREEN} ✅ Node successfully connected to API ${NC} " 
 else 
 echo " ${YELLOW} ⚠️  Node registered but first heartbeat pending. Check log: tail -f /var/log/mesh-node.log ${NC} " 
 fi 
 
 # Show status 
 echo "" 
 echo " ${GREEN} ======================================== ${NC} " 
 echo " ${GREEN} Installation Complete! ${NC} " 
 echo " ${GREEN} ======================================== ${NC} " 
 echo "" 
 echo "Node ID:  $( uci get system.@system [ 0 ] .hostname ) " 
 echo "API URL:  $API_URL " 
 echo "" 
 echo "Useful commands:" 
 echo "  tail -f /var/log/mesh-node.log    - View node logs" 
 echo "  /etc/init.d/mesh-node restart     - Restart daemon" 
 echo "  /root/mesh-queue.sh stats         - Check queue status" 
 echo "  batctl o                          - View mesh neighbors" 
 echo 