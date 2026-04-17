const  dgram  = require ( 'dgram' ) ; 
 const  crypto  = require ( 'crypto' ) ; 
 const {  query  } = require ( './database' ) ; 
 
 class RADIUSServer { 
 constructor ( port  = 1812 ,  secret  = 'testing123' ) { 
 this . port  =  port ; 
 this . secret  =  secret ; 
 this . server  =  dgram . createSocket ( 'udp4' ) ; 
 this . pendingRequests  = new Map ( ) ; 
 } 
 
 // RADIUS packet structure 
 createPacket ( code ,  identifier ,  attributes ,  secret ) { 
 const  length  = 20 +  attributes . length ; // Header(20) + attributes 
 const  packet  =  Buffer . alloc ( length ) ; 
 
    packet . writeUInt8 ( code , 0 ) ; // Code 
    packet . writeUInt8 ( identifier , 1 ) ; // Identifier 
    packet . writeUInt16BE ( length , 2 ) ; // Length 
 
 // Authenticator (16 bytes of random) 
 const  authenticator  =  crypto . randomBytes ( 16 ) ; 
    authenticator . copy ( packet , 4 ) ; 
 
 // Copy attributes 
    attributes . copy ( packet , 20 ) ; 
 
 // Calculate Response Authenticator (for Access-Accept/Reject) 
 const  responseAuth  =  crypto . createHash ( 'md5' ) 
 . update ( packet . slice ( 0 , 4 ) ) // Code + ID + Length 
 . update ( authenticator ) 
 . update ( attributes ) 
 . update ( secret ) 
 . digest ( ) ; 
 
    responseAuth . copy ( packet , 4 ) ; 
 
 return  packet ; 
 } 
 
 parseAttributes ( buffer ,  offset  = 0 ) { 
 const  attributes  = { } ; 
 let  pos  =  offset ; 
 
 while ( pos  <  buffer . length ) { 
 const  type  =  buffer . readUInt8 ( pos ) ; 
 const  length  =  buffer . readUInt8 ( pos  + 1 ) ; 
 const  value  =  buffer . slice ( pos  + 2 ,  pos  +  length ) ; 
 
 switch ( type ) { 
 case 1 : // User-Name 
          attributes . UserName  =  value . toString ( ) ; 
 break ; 
 case 2 : // User-Password 
          attributes . UserPassword  =  value . toString ( ) ; 
 break ; 
 case 4 : // NAS-IP-Address 
          attributes . NASIPAddress  = ` ${ value [ 0 ] } . ${ value [ 1 ] } . ${ value [ 2 ] } . ${ value [ 3 ] } ` ; 
 break ; 
 case 8 : // Framed-IP-Address 
          attributes . FramedIPAddress  = ` ${ value [ 0 ] } . ${ value [ 1 ] } . ${ value [ 2 ] } . ${ value [ 3 ] } ` ; 
 break ; 
 case 12 : // Called-Station-Id (AP MAC) 
          attributes . CalledStationId  =  value . toString ( ) ; 
 break ; 
 case 31 : // Calling-Station-Id (Client MAC) 
          attributes . CallingStationId  =  value . toString ( ) ; 
 break ; 
 case 32 : // NAS-Identifier 
          attributes . NASIdentifier  =  value . toString ( ) ; 
 break ; 
 case 61 : // NAS-Port-Type 
          attributes . NASPortType  =  value . readUInt32BE ( ) ; 
 break ; 
 } 
 
      pos  +=  length ; 
 } 
 
 return  attributes ; 
 } 
 
 async authenticate ( username ,  password ,  nas_ip ,  calling_station_id ) { 
 // Check if user has active session 
 const  session  = await query ( 
 ` SELECT id, mac_address, node_id, session_token 
       FROM sessions 
       WHERE mac_address = $1 AND ended_at IS NULL AND expires_at > NOW() 
       ORDER BY started_at DESC LIMIT 1 ` , 
 [ calling_station_id ] 
 ) ; 
 
 if ( session . rows . length  > 0 ) { 
 // Existing session - allow seamless roaming 
 return { accept : true , session_id :  session . rows [ 0 ] . id  } ; 
 } 
 
 // New session - check if MAC is allowed (open network, no password) 
 if ( password  === '' ) { 
 // Open network - create session 
 const  newSession  = await query ( 
 ` INSERT INTO sessions (mac_address, node_id, started_at, expires_at) 
         VALUES ($1, $2, NOW(), NOW() + INTERVAL '24 hours') 
         RETURNING id ` , 
 [ calling_station_id ,  nas_ip ] 
 ) ; 
 
 return { accept : true , session_id :  newSession . rows [ 0 ] . id  } ; 
 } 
 
 return { accept : false , reason : 'Invalid credentials' } ; 
 } 
 
 start ( ) { 
 this . server . on ( 'message' , async ( msg ,  rinfo ) => { 
 const  code  =  msg . readUInt8 ( 0 ) ; 
 const  identifier  =  msg . readUInt8 ( 1 ) ; 
 const  length  =  msg . readUInt16BE ( 2 ) ; 
 const  authenticator  =  msg . slice ( 4 , 20 ) ; 
 const  attributes  = this . parseAttributes ( msg , 20 ) ; 
 
 if ( code  === 1 ) { // Access-Request 
        console . log ( ` RADIUS Access-Request from  ${ rinfo . address } : ${ rinfo . port } ` ) ; 
        console . log ( `   Username:  ${ attributes . UserName } ` ) ; 
        console . log ( `   MAC:  ${ attributes . CallingStationId } ` ) ; 
 
 const {  accept ,  session_id ,  reason  } = await this . authenticate ( 
          attributes . UserName , 
          attributes . UserPassword , 
          attributes . NASIPAddress  ||  rinfo . address , 
          attributes . CallingStationId 
 ) ; 
 
 if ( accept ) { 
 // Send Access-Accept 
 const  replyAttrs  =  Buffer . alloc ( 6 ) ; 
          replyAttrs . writeUInt8 ( 27 , 0 ) ; // Session-Timeout 
          replyAttrs . writeUInt8 ( 6 , 1 ) ; // Length 
          replyAttrs . writeUInt32BE ( 86400 , 2 ) ; // 24 hours 
 
 const  response  = this . createPacket ( 2 ,  identifier ,  replyAttrs , this . secret ) ; 
 this . server . send ( response ,  rinfo . port ,  rinfo . address ) ; 
          console . log ( `   -> Access-Accept (session:  ${ session_id } ) ` ) ; 
 } else { 
 // Send Access-Reject 
 const  response  = this . createPacket ( 3 ,  identifier ,  Buffer . alloc ( 0 ) , this . secret ) ; 
 this . server . send ( response ,  rinfo . port ,  rinfo . address ) ; 
          console . log ( `   -> Access-Reject ( ${ reason } ) ` ) ; 
 } 
 } 
 } ) ; 
 
 this . server . bind ( this . port , ( ) => { 
      console . log ( ` RADIUS server listening on port  ${ this . port } ` ) ; 
 } ) ; 
 } 
 } 
 
 module . exports  = {  RADIUSServer  } ;