const  express  = require ( 'express' ) ; 
 const  router  =  express . Router ( ) ; 
 const  crypto  = require ( 'crypto' ) ; 
 const {  query  } = require ( '../services/database' ) ; 
 const {  setCache ,  getCache  } = require ( '../services/redis' ) ; 
 
 // Generate session token for captive portal 
 router . post ( '/auth/start' , async ( req ,  res ) => { 
 const {  mac_address ,  node_id ,  zone ,  user_agent  } =  req . body ; 
 
 if ( ! mac_address  || ! node_id ) { 
 return  res . status ( 400 ) . json ( { error : 'mac_address and node_id required' } ) ; 
 } 
 
 // Generate unique session token 
 const  session_token  =  crypto . randomBytes ( 32 ) . toString ( 'hex' ) ; 
 const  expires_at  = new Date ( Date . now ( ) + 24 * 60 * 60 * 1000 ) ; // 24 hours 
 
 // Check if this MAC already has an active session 
 const  existing  = await query ( 
 ` SELECT id, session_token FROM sessions 
     WHERE mac_address = $1 AND ended_at IS NULL 
     ORDER BY started_at DESC LIMIT 1 ` , 
 [ mac_address ] 
 ) ; 
 
 if ( existing . rows . length  > 0 ) { 
 // Reuse existing session 
 return  res . json ( { 
 success : true , 
 session_token :  existing . rows [ 0 ] . session_token , 
 session_id :  existing . rows [ 0 ] . id , 
 expires_at : new Date ( Date . now ( ) + 24 * 60 * 60 * 1000 ) 
 } ) ; 
 } 
 
 // Create new session 
 const  result  = await query ( 
 ` INSERT INTO sessions (mac_address, node_id, zone, user_agent, session_token, started_at, expires_at) 
     VALUES ($1, $2, $3, $4, $5, NOW(), $6) 
     RETURNING id ` , 
 [ mac_address ,  node_id ,  zone ,  user_agent ,  session_token ,  expires_at ] 
 ) ; 
 
 // Cache session for fast lookup 
 await setCache ( ` session: ${ session_token } ` , { 
 id :  result . rows [ 0 ] . id , 
    mac_address , 
    node_id , 
    zone , 
    expires_at 
 } , 86400 ) ; 
 
  res . json ( { 
 success : true , 
    session_token , 
 session_id :  result . rows [ 0 ] . id , 
    expires_at 
 } ) ; 
 } ) ; 
 
 // Validate session (called by router on each request) 
 router . get ( '/auth/validate/:token' , async ( req ,  res ) => { 
 const {  token  } =  req . params ; 
 
 // Check cache first 
 let  session  = await getCache ( ` session: ${ token } ` ) ; 
 
 if ( ! session ) { 
 // Fall back to database 
 const  result  = await query ( 
 ` SELECT id, mac_address, node_id, zone, expires_at 
       FROM sessions 
       WHERE session_token = $1 AND ended_at IS NULL AND expires_at > NOW() ` , 
 [ token ] 
 ) ; 
 
 if ( result . rows . length  === 0 ) { 
 return  res . status ( 401 ) . json ( { valid : false , error : 'Invalid or expired session' } ) ; 
 } 
 
    session  =  result . rows [ 0 ] ; 
 await setCache ( ` session: ${ token } ` ,  session , 3600 ) ; 
 } 
 
 // Update last activity 
 await query ( 
 ` UPDATE sessions SET last_activity = NOW() WHERE session_token = $1 ` , 
 [ token ] 
 ) ; 
 
  res . json ( { valid : true ,  session  } ) ; 
 } ) ; 
 
 // End session (logout) 
 router . post ( '/auth/end' , async ( req ,  res ) => { 
 const {  session_token  } =  req . body ; 
 
 await query ( 
 ` UPDATE sessions SET ended_at = NOW(), 
     duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER 
     WHERE session_token = $1 AND ended_at IS NULL ` , 
 [ session_token ] 
 ) ; 
 
 await setCache ( ` session: ${ session_token } ` , null , 0 ) ; 
 
  res . json ( { success : true } ) ; 
 } ) ; 
 
 // Get ad for captive portal splash page 
 router . get ( '/ad/:zone' , async ( req ,  res ) => { 
 const {  zone  } =  req . params ; 
 
 // Get active campaign for this zone 
 const  result  = await query ( 
 ` SELECT id, business_name, creative_url, goal 
     FROM campaigns 
     WHERE status = 'active' 
     AND ($1 = ANY(zones) OR 'all' = ANY(zones)) 
     ORDER BY 
       CASE WHEN priority = 'high' THEN 1 ELSE 2 END, 
       RANDOM() 
     LIMIT 1 ` , 
 [ zone ] 
 ) ; 
 
 if ( result . rows . length  === 0 ) { 
 // Default ad 
 return  res . json ( { 
 campaign_id : null , 
 image_url : '/images/venice-beach-default.jpg' , 
 text : 'Support Venice Beach Local Businesses' , 
 cta : 'Learn More' 
 } ) ; 
 } 
 
 const  campaign  =  result . rows [ 0 ] ; 
 
  res . json ( { 
 campaign_id :  campaign . id , 
 business_name :  campaign . business_name , 
 image_url :  campaign . creative_url , 
 text : ` Sponsored by  ${ campaign . business_name } ` , 
 cta :  campaign . goal  || 'Visit Website' 
 } ) ; 
 } ) ; 
 
 // Report ad click 
 router . post ( '/ad/click' , async ( req ,  res ) => { 
 const {  campaign_id ,  session_id ,  node_id  } =  req . body ; 
 
 await query ( 
 ` UPDATE campaigns SET clicks = clicks + 1 WHERE id = $1 ` , 
 [ campaign_id ] 
 ) ; 
 
 await query ( 
 ` INSERT INTO ad_clicks (campaign_id, session_id, node_id, clicked_at) 
     VALUES ($1, $2, $3, NOW()) ` , 
 [ campaign_id ,  session_id ,  node_id ] 
 ) ; 
 
  res . json ( { success : true } ) ; 
 } ) ; 
 
 module . exports  =  router ;