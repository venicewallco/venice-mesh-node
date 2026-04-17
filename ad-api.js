// Simple local HTTP server for captive portal ads 
 // Run on port 8080 to serve ads from cache 
 
 const  http  = require ( 'http' ) ; 
 const  fs  = require ( 'fs' ) ; 
 
 const API_URL =  process . env . API_URL || 'https://your-vps-ip:3000' ; 
 const CACHE_FILE = '/tmp/ad-cache.json' ; 
 
 // Load cached ads 
 function loadCache ( ) { 
 try { 
 return JSON . parse ( fs . readFileSync ( CACHE_FILE ) ) ; 
 } catch ( e ) { 
 return [ ] ; 
 } 
 } 
 
 // Fetch fresh ads from central API 
 function fetchAds ( ) { 
 const  https  = require ( 'https' ) ; 
 const  url  = ` ${ API_URL } /api/campaigns/active ` ; 
 
    https . get ( url , ( res ) => { 
 let  data  = '' ; 
        res . on ( 'data' , chunk =>  data  +=  chunk ) ; 
        res . on ( 'end' , ( ) => { 
 const  ads  = JSON . parse ( data ) ; 
            fs . writeFileSync ( CACHE_FILE , JSON . stringify ( ads ) ) ; 
 } ) ; 
 } ) . on ( 'error' , ( e ) => { 
        console . error ( 'Failed to fetch ads:' ,  e ) ; 
 } ) ; 
 } 
 
 // Refresh cache every 5 minutes 
 setInterval ( fetchAds , 300000 ) ; 
 fetchAds ( ) ; // Initial fetch 
 
 // Create HTTP server 
 const  server  =  http . createServer ( ( req ,  res ) => { 
    res . setHeader ( 'Access-Control-Allow-Origin' , '*' ) ; 
 
 if ( req . url . startsWith ( '/api/ad' ) ) { 
 const  urlParams  = new URL ( req . url , 'http://localhost' ) ; 
 const  zone  =  urlParams . searchParams . get ( 'zone' ) || 'venice_pier' ; 
 
 const  cache  = loadCache ( ) ; 
 const  ad  =  cache . find ( a =>  a . zones . includes ( zone ) ) ||  cache [ 0 ] ; 
 
        res . writeHead ( 200 , { 'Content-Type' : 'application/json' } ) ; 
        res . end ( JSON . stringify ( ad  || { image_url : '' , text : 'Support Venice Beach' } ) ) ; 
 } else { 
        res . writeHead ( 404 ) ; 
        res . end ( ) ; 
 } 
 } ) ; 
 
 server . listen ( 8080 , ( ) => { 
    console . log ( 'Local ad server running on port 8080' ) ; 
 } ) ;
