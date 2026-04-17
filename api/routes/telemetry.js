const  express  = require ( 'express' ) ; 
 const  router  =  express . Router ( ) ; 
 const {  query  } = require ( '../services/database' ) ; 
 const {  getCache ,  setCache  } = require ( '../services/redis' ) ; 
 
 // GET /api/telemetry/analytics - Real-time analytics for Manus dashboard 
 router . get ( '/analytics' , async ( req ,  res ) => { 
 const {  date_from ,  date_to ,  zone ,  node_id  } =  req . query ; 
 
 // Try cache first (5 second TTL for real-time feel) 
 const  cacheKey  = ` analytics: ${ date_from  || 'today' } : ${ zone  || 'all' } ` ; 
 const  cached  = await getCache ( cacheKey ) ; 
 if ( cached ) { 
 return  res . json ( cached ) ; 
 } 
 
 let  impressionsQuery  = ` 
    SELECT COUNT(*) as total_impressions 
    FROM impressions i 
    JOIN sessions s ON i.session_id = s.id 
    WHERE 1=1 
 ` ; 
 let  sessionsQuery  = ` SELECT COUNT(*) as total_sessions FROM sessions WHERE 1=1 ` ; 
 let  nodesQuery  = ` SELECT COUNT(*) as active_nodes FROM nodes WHERE last_seen > NOW() - INTERVAL '5 minutes' ` ; 
 
 const  params  = [ ] ; 
 let  paramIndex  = 1 ; 
 
 if ( date_from ) { 
    impressionsQuery  += `  AND i.viewed_at >= $ ${ paramIndex } ` ; 
    sessionsQuery  += `  AND started_at >= $ ${ paramIndex } ` ; 
    params . push ( date_from ) ; 
    paramIndex ++ ; 
 } 
 
 if ( date_to ) { 
    impressionsQuery  += `  AND i.viewed_at <= $ ${ paramIndex } ` ; 
    sessionsQuery  += `  AND started_at <= $ ${ paramIndex } ` ; 
    params . push ( date_to ) ; 
    paramIndex ++ ; 
 } 
 
 if ( zone  &&  zone  !== 'all' ) { 
    impressionsQuery  += `  AND i.zone = $ ${ paramIndex } ` ; 
    sessionsQuery  += `  AND zone = $ ${ paramIndex } ` ; 
    params . push ( zone ) ; 
    paramIndex ++ ; 
 } 
 
 if ( node_id ) { 
    impressionsQuery  += `  AND i.node_id = $ ${ paramIndex } ` ; 
    sessionsQuery  += `  AND node_id = $ ${ paramIndex } ` ; 
    params . push ( node_id ) ; 
 } 
 
 const [ impressionsResult ,  sessionsResult ,  nodesResult ] = await  Promise . all ( [ 
 query ( impressionsQuery ,  params ) , 
 query ( sessionsQuery ,  params ) , 
 query ( nodesQuery ) 
 ] ) ; 
 
 // Get top zones 
 const  zonesResult  = await query ( ` 
    SELECT zone, COUNT(*) as impressions 
    FROM impressions 
    WHERE viewed_at > NOW() - INTERVAL '7 days' 
    GROUP BY zone 
    ORDER BY impressions DESC 
 ` ) ; 
 
 const  response  = { 
 impressions : parseInt ( impressionsResult . rows [ 0 ] ?. total_impressions  || 0 ) , 
 sessions : parseInt ( sessionsResult . rows [ 0 ] ?. total_sessions  || 0 ) , 
 active_nodes : parseInt ( nodesResult . rows [ 0 ] ?. active_nodes  || 0 ) , 
 top_zones :  zonesResult . rows , 
 timestamp : new Date ( ) . toISOString ( ) 
 } ; 
 
 // Cache for 5 seconds 
 await setCache ( cacheKey ,  response , 5 ) ; 
 
  res . json ( response ) ; 
 } ) ; 
 
 // GET /api/telemetry/impressions/daily - Daily breakdown 
 router . get ( '/impressions/daily' , async ( req ,  res ) => { 
 const {  days  = 7 } =  req . query ; 
 
 const  result  = await query ( ` 
    SELECT DATE(viewed_at) as date, COUNT(*) as count 
    FROM impressions 
    WHERE viewed_at > NOW() - INTERVAL ' ${ days }  days' 
    GROUP BY DATE(viewed_at) 
    ORDER BY date ASC 
 ` ) ; 
 
  res . json ( result . rows ) ; 
 } ) ; 
 
 // GET /api/telemetry/nodes/health - Node health summary 
 router . get ( '/nodes/health' , async ( req ,  res ) => { 
 const  result  = await query ( ` 
    SELECT 
      COUNT(*) as total_nodes, 
      SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as online_nodes, 
      AVG(client_count) as avg_clients, 
      AVG(mesh_peers) as avg_mesh_peers 
    FROM nodes 
    WHERE last_seen > NOW() - INTERVAL '1 hour' 
 ` ) ; 
 
  res . json ( result . rows [ 0 ] ) ; 
 } ) ; 
 
 module . exports  =  router ;