const  rateLimit  = require ( 'express-rate-limit' ) ; 
 
 // General API rate limiter 
 const  rateLimiter  = rateLimit ( { 
 windowMs : 60 * 1000 , // 1 minute 
 max : 100 , // 100 requests per minute 
 message : { error : 'Too many requests, please try again later' } , 
 standardHeaders : true , 
 legacyHeaders : false , 
 } ) ; 
 
 // Stricter limiter for authentication endpoints 
 const  authLimiter  = rateLimit ( { 
 windowMs : 15 * 60 * 1000 , // 15 minutes 
 max : 5 , // 5 attempts 
 message : { error : 'Too many authentication attempts, try again later' } , 
 } ) ; 
 
 // Node heartbeat limiter (higher limit for mesh nodes) 
 const  nodeLimiter  = rateLimit ( { 
 windowMs : 60 * 1000 , 
 max : 300 , // 300 heartbeats per minute 
 skip : ( req ) =>  req . path  === '/api/mesh/heartbeat' , 
 } ) ; 
 
 module . exports  = { 
  rateLimiter , 
  authLimiter , 
  nodeLimiter 
 } ;