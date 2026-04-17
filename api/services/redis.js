const  redis  = require ( 'redis' ) ; 
 
 let  client  = null ; 
 
 const initRedis = async ( ) => { 
 if ( ! client ) { 
    client  =  redis . createClient ( { 
 url :  process . env . REDIS_URL || 'redis://redis:6379' , 
 password :  process . env . REDIS_PASSWORD , 
 } ) ; 
 
    client . on ( 'error' , ( err ) =>  console . error ( 'Redis Client Error:' ,  err ) ) ; 
    client . on ( 'connect' , ( ) =>  console . log ( 'Redis connected' ) ) ; 
 
 await  client . connect ( ) ; 
 } 
 return  client ; 
 } ; 
 
 const getCache = async ( key ) => { 
 const  redisClient  = await initRedis ( ) ; 
 const  data  = await  redisClient . get ( key ) ; 
 return  data  ? JSON . parse ( data ) : null ; 
 } ; 
 
 const setCache = async ( key ,  value ,  ttlSeconds  = 300 ) => { 
 const  redisClient  = await initRedis ( ) ; 
 await  redisClient . set ( key , JSON . stringify ( value ) , { EX :  ttlSeconds  } ) ; 
 } ; 
 
 const deleteCache = async ( key ) => { 
 const  redisClient  = await initRedis ( ) ; 
 await  redisClient . del ( key ) ; 
 } ; 
 
 const incrementCounter = async ( key ) => { 
 const  redisClient  = await initRedis ( ) ; 
 return await  redisClient . incr ( key ) ; 
 } ; 
 
 module . exports  = { 
  initRedis , 
  getCache , 
  setCache , 
  deleteCache , 
  incrementCounter 
 } ;