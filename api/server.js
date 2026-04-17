const  express  = require ( 'express' ) ; 
 const  cors  = require ( 'cors' ) ; 
 const  helmet  = require ( 'helmet' ) ; 
 const  dotenv  = require ( 'dotenv' ) ; 
 const  winston  = require ( 'winston' ) ; 
 
 // Load environment variables 
 dotenv . config ( { path : '../.env' } ) ; 
 
 // Import routes 
 const  meshRoutes  = require ( './routes/mesh' ) ; 
 const  businessRoutes  = require ( './routes/business' ) ; 
 const  telemetryRoutes  = require ( './routes/telemetry' ) ; 
 
 // Import middleware 
 const {  rateLimiter  } = require ( './middleware/rateLimit' ) ; 
 
 // Setup logging 
 const  logger  =  winston . createLogger ( { 
 level : 'info' , 
 format :  winston . format . json ( ) , 
 transports : [ 
 new winston . transports . File ( { filename : '/var/log/venice-api/error.log' , level : 'error' } ) , 
 new winston . transports . File ( { filename : '/var/log/venice-api/combined.log' } ) , 
 new winston . transports . Console ( { format :  winston . format . simple ( ) } ) 
 ] 
 } ) ; 
 
 const  app  = express ( ) ; 
 const PORT =  process . env . PORT || 3000 ; 
 
 // Middleware 
 app . use ( helmet ( ) ) ; 
 app . use ( cors ( ) ) ; 
 app . use ( express . json ( { limit : '10mb' } ) ) ; 
 app . use ( rateLimiter ) ; 
 
 // Request logging 
 app . use ( ( req ,  res ,  next ) => { 
  logger . info ( ` ${ req . method } ${ req . path }  -  ${ req . ip } ` ) ; 
 next ( ) ; 
 } ) ; 
 
 // Health check 
 app . get ( '/health' , ( req ,  res ) => { 
  res . json ( { status : 'ok' , timestamp : new Date ( ) . toISOString ( ) , service : 'venice-mesh-api' } ) ; 
 } ) ; 
 
 // Routes 
 app . use ( '/api/mesh' ,  meshRoutes ) ; 
 app . use ( '/api/business' ,  businessRoutes ) ; 
 app . use ( '/api/telemetry' ,  telemetryRoutes ) ; 
 
 // 404 handler 
 app . use ( ( req ,  res ) => { 
  res . status ( 404 ) . json ( { error : 'Endpoint not found' } ) ; 
 } ) ; 
 
 // Error handler 
 app . use ( ( err ,  req ,  res ,  next ) => { 
  logger . error ( err . stack ) ; 
  res . status ( 500 ) . json ( { error : 'Internal server error' } ) ; 
 } ) ; 
 
 // Start server 
 app . listen ( PORT , ( ) => { 
  logger . info ( ` Venice Mesh API running on port  ${ PORT } ` ) ; 
  console . log ( ` 🚀 Server started on http://localhost: ${ PORT } ` ) ; 
 } ) ; 
 
 module . exports  =  app ;