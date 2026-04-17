const {  Pool  } = require ( 'pg' ) ; 
 
 let  pool  = null ; 
 
 const initDatabase = ( ) => { 
 if ( ! pool ) { 
    pool  = new Pool ( { 
 host :  process . env . DB_HOST || 'postgres' , 
 port : parseInt ( process . env . DB_PORT ) || 5432 , 
 database :  process . env . DB_NAME || 'venice_mesh' , 
 user :  process . env . DB_USER || 'venice' , 
 password :  process . env . DB_PASSWORD , 
 max : 20 , 
 idleTimeoutMillis : 30000 , 
 connectionTimeoutMillis : 2000 , 
 } ) ; 
 
 // Test connection 
    pool . on ( 'error' , ( err ) => { 
      console . error ( 'Unexpected database error:' ,  err ) ; 
 } ) ; 
 } 
 return  pool ; 
 } ; 
 
 const query = async ( text ,  params ) => { 
 const  start  =  Date . now ( ) ; 
 const  result  = await initDatabase ( ) . query ( text ,  params ) ; 
 const  duration  =  Date . now ( ) -  start ; 
 
 if ( duration  > 1000 ) { 
    console . warn ( ` Slow query ( ${ duration } ms): ` ,  text ) ; 
 } 
 
 return  result ; 
 } ; 
 
 const getClient = async ( ) => { 
 return await initDatabase ( ) . connect ( ) ; 
 } ; 
 
 module . exports  = { 
  query , 
  getClient , 
  initDatabase 
 } ;