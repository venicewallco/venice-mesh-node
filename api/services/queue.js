const {  query  } = require ( './database' ) ; 
 
 // Store offline requests when nodes are disconnected 
 const queueRequest = async ( nodeId ,  endpoint ,  payload ,  retryCount  = 0 ) => { 
 const  result  = await query ( 
 ` INSERT INTO request_queue (node_id, endpoint, payload, retry_count, status) 
     VALUES ($1, $2, $3, $4, 'pending') 
     RETURNING id ` , 
 [ nodeId ,  endpoint , JSON . stringify ( payload ) ,  retryCount ] 
 ) ; 
 return  result . rows [ 0 ] . id ; 
 } ; 
 
 const getPendingRequests = async ( nodeId  = null ) => { 
 let  sql  = ` SELECT * FROM request_queue WHERE status = 'pending' ORDER BY created_at ASC ` ; 
 let  params  = [ ] ; 
 
 if ( nodeId ) { 
    sql  = ` SELECT * FROM request_queue WHERE node_id = $1 AND status = 'pending' ORDER BY created_at ASC ` ; 
    params  = [ nodeId ] ; 
 } 
 
 const  result  = await query ( sql ,  params ) ; 
 return  result . rows ; 
 } ; 
 
 const markRequestCompleted = async ( id ) => { 
 await query ( 
 ` UPDATE request_queue SET status = 'completed', completed_at = NOW() WHERE id = $1 ` , 
 [ id ] 
 ) ; 
 } ; 
 
 const markRequestFailed = async ( id ,  error ) => { 
 await query ( 
 ` UPDATE request_queue SET status = 'failed', retry_count = retry_count + 1, last_error = $2 WHERE id = $1 ` , 
 [ id ,  error ] 
 ) ; 
 } ; 
 
 const processQueuedRequests = async ( processFn ) => { 
 const  pending  = await getPendingRequests ( ) ; 
 
 for ( const  req  of  pending ) { 
 try { 
 await processFn ( req . endpoint ,  req . payload ) ; 
 await markRequestCompleted ( req . id ) ; 
 } catch ( err ) { 
      console . error ( ` Failed to process queued request  ${ req . id } : ` ,  err ) ; 
 if ( req . retry_count  >= 3 ) { 
 await markRequestFailed ( req . id ,  err . message ) ; 
 } else { 
 await markRequestFailed ( req . id ,  err . message ) ; 
 } 
 } 
 } 
 } ; 
 
 module . exports  = { 
  queueRequest , 
  getPendingRequests , 
  markRequestCompleted , 
  markRequestFailed , 
  processQueuedRequests 
 } ;