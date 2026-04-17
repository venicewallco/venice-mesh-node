const  express  = require ( 'express' ) ; 
 const  router  =  express . Router ( ) ; 
 const {  query  } = require ( '../services/database' ) ; 
 const {  getCache ,  setCache  } = require ( '../services/redis' ) ; 
 
 // POST /api/mesh/heartbeat - Node heartbeat 
 router . post ( '/heartbeat' , async ( req ,  res ) => { 
 const {  node_id ,  ip_address ,  firmware_version ,  client_count ,  mesh_peers ,  uptime ,  cpu_load ,  free_memory  } =  req . body ; 
 
 try { 
 await query ( 
 ` INSERT INTO nodes (node_id, ip_address, firmware_version, last_seen, status, client_count, mesh_peers, uptime, cpu_load, free_memory) 
         VALUES ($1, $2, $3, NOW(), 'online', $4, $5, $6, $7, $8) 
         ON CONFLICT (node_id) DO UPDATE SET 
           ip_address = EXCLUDED.ip_address, 
           firmware_version = EXCLUDED.firmware_version, 
           last_seen = NOW(), 
           status = 'online', 
           client_count = EXCLUDED.client_count, 
           mesh_peers = EXCLUDED.mesh_peers, 
           uptime = EXCLUDED.uptime, 
           cpu_load = EXCLUDED.cpu_load, 
           free_memory = EXCLUDED.free_memory ` , 
 [ node_id ,  ip_address ,  firmware_version ,  client_count ,  mesh_peers ,  uptime ,  cpu_load ,  free_memory ] 
 ) ; 
 
 // Log heartbeat history 
 await query ( 
 ` INSERT INTO heartbeats (node_id, client_count, mesh_peers, uptime, cpu_load) 
         VALUES ($1, $2, $3, $4, $5) ` , 
 [ node_id ,  client_count ,  mesh_peers ,  uptime ,  cpu_load ] 
 ) ; 
 
      res . json ( { status : 'success' } ) ; 
 } catch ( err ) { 
      console . error ( 'Heartbeat error:' ,  err ) ; 
      res . status ( 500 ) . json ( { error : 'Database error' } ) ; 
 } 
 } ) ; 
 
 // GET /api/mesh/nodes/:node_id - Get node status 
 router . get ( '/nodes/:node_id' , async ( req ,  res ) => { 
 const {  node_id  } =  req . params ; 
 
 // Try cache 
 const  cached  = await getCache ( ` node: ${ node_id } ` ) ; 
 if ( cached ) return  res . json ( cached ) ; 
 
 const  result  = await query ( 'SELECT * FROM nodes WHERE node_id = $1' , [ node_id ] ) ; 
 if ( result . rows . length  === 0 ) { 
 return  res . status ( 404 ) . json ( { error : 'Node not found' } ) ; 
 } 
 
 await setCache ( ` node: ${ node_id } ` ,  result . rows [ 0 ] , 30 ) ; 
  res . json ( result . rows [ 0 ] ) ; 
 } ) ; 
 
 module . exports  =  router ;