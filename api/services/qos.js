const {  query  } = require ( './database' ) ; 
 const {  getCache ,  setCache  } = require ( './redis' ) ; 
 
 class QOSManager { 
 constructor ( ) { 
 this . bandwidthPerClient  = 1 ; // Mbps default 
 this . priorityRules  = { 
 'voip' : { min : 0.5 , max : 2 , priority : 1 } , 
 'video' : { min : 1 , max : 5 , priority : 2 } , 
 'browsing' : { min : 0.5 , max : 10 , priority : 3 } , 
 'download' : { min : 0.1 , max : 20 , priority : 4 } 
 } ; 
 } 
 
 async getNodeBandwidth ( node_id ) { 
 // Get total bandwidth available at this node 
 const  node  = await query ( 
 ` SELECT total_bandwidth_mbps, active_sessions 
       FROM nodes WHERE node_id = $1 ` , 
 [ node_id ] 
 ) ; 
 
 return  node . rows [ 0 ] || { total_bandwidth_mbps : 100 , active_sessions : 0 } ; 
 } 
 
 async allocateBandwidth ( node_id ,  session_id ,  traffic_type  = 'browsing' ) { 
 const  node  = await this . getNodeBandwidth ( node_id ) ; 
 const  activeSessions  =  node . active_sessions  || 1 ; 
 
 // Fair share allocation 
 const  fairShare  =  node . total_bandwidth_mbps  /  activeSessions ; 
 
 // Apply priority multiplier 
 const  priority  = this . priorityRules [ traffic_type ] || this . priorityRules . browsing ; 
 let  allocated  =  Math . min ( fairShare  * ( 4 /  priority . priority ) ,  priority . max ) ; 
    allocated  =  Math . max ( allocated ,  priority . min ) ; 
 
 // Store allocation in Redis 
 await setCache ( ` qos: ${ session_id } ` , { 
      node_id , 
 allocated_mbps :  allocated , 
      traffic_type , 
 updated_at : new Date ( ) 
 } , 60 ) ; 
 
 // Apply to router via SSH or API 
 await this . applyQoSRule ( node_id ,  session_id ,  allocated ) ; 
 
 return  allocated ; 
 } 
 
 async applyQoSRule ( node_id ,  session_id ,  bandwidth_mbps ) { 
 // Send command to OpenWrt node to apply tc (traffic control) rule 
 // This would typically be done via SSH or a local API on the router 
 
 const  command  = ` tc class add dev br-lan parent 1: classid 1: ${ session_id }  htb rate  ${ bandwidth_mbps } mbit ceil  ${ bandwidth_mbps } mbit ` ; 
 
 // For now, log the command 
    console . log ( ` [QOS] Node  ${ node_id } : Apply  ${ bandwidth_mbps } Mbps to session  ${ session_id } ` ) ; 
 
 // In production, call router API: 
 // await axios.post(`http://${node_ip}:8080/api/qos`, { session_id, bandwidth_mbps }); 
 } 
 
 async getCurrentLoad ( node_id ) { 
 const  cacheKey  = ` qos:load: ${ node_id } ` ; 
 let  load  = await getCache ( cacheKey ) ; 
 
 if ( ! load ) { 
 // Calculate from active sessions 
 const  sessions  = await query ( 
 ` SELECT COUNT(*) as count, 
                AVG(bytes_used) as avg_usage 
         FROM sessions 
         WHERE node_id = $1 AND ended_at IS NULL ` , 
 [ node_id ] 
 ) ; 
 
      load  = { 
 active_sessions : parseInt ( sessions . rows [ 0 ] ?. count  || 0 ) , 
 total_bandwidth_used : 0 , 
 peak_hour : new Date ( ) . getHours ( ) 
 } ; 
 
 await setCache ( cacheKey ,  load , 10 ) ; 
 } 
 
 return  load ; 
 } 
 
 async optimizeNetwork ( ) { 
 // Periodically rebalance bandwidth across nodes 
 const  nodes  = await query ( 
 ` SELECT node_id, client_count, cpu_load 
       FROM nodes 
       WHERE status = 'online' AND last_seen > NOW() - INTERVAL '5 minutes' ` 
 ) ; 
 
 for ( const  node  of  nodes . rows ) { 
 const  load  = await this . getCurrentLoad ( node . node_id ) ; 
 
 if ( load . active_sessions  > 50 &&  node . cpu_load  > 0.7 ) { 
 // Node is overloaded - reduce per-client bandwidth 
        console . log ( ` Node  ${ node . node_id }  is overloaded, reducing bandwidth ` ) ; 
 this . bandwidthPerClient  =  Math . max ( 0.5 , this . bandwidthPerClient  * 0.9 ) ; 
 } else if ( load . active_sessions  < 10 &&  node . cpu_load  < 0.3 ) { 
 // Node has capacity - increase bandwidth 
 this . bandwidthPerClient  =  Math . min ( 10 , this . bandwidthPerClient  * 1.1 ) ; 
 } 
 } 
 } 
 } 
 
 module . exports  = {  QOSManager  } ;