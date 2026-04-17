const  express  = require ( 'express' ) ; 
 const  router  =  express . Router ( ) ; 
 const  bcrypt  = require ( 'bcrypt' ) ; 
 const {  query  } = require ( '../services/database' ) ; 
 const {  generateToken  } = require ( '../middleware/auth' ) ; 
 
 // POST /api/auth/register - Register new business 
 router . post ( '/register' , async ( req ,  res ) => { 
 const {  email ,  password ,  business_name  } =  req . body ; 
 
 try { 
 const  hashedPassword  = await  bcrypt . hash ( password , 10 ) ; 
 const  result  = await query ( 
 ` INSERT INTO businesses (email, password_hash, business_name) 
         VALUES ($1, $2, $3) 
         RETURNING id, email, business_name ` , 
 [ email ,  hashedPassword ,  business_name ] 
 ) ; 
 
 const  user  =  result . rows [ 0 ] ; 
 const  token  =  generateToken ( user . id ,  user . email , 'advertiser' ) ; 
 
      res . status ( 201 ) . json ( { user ,  token  } ) ; 
 } catch ( err ) { 
 if ( err . code  === '23505' ) { 
 return  res . status ( 400 ) . json ( { error : 'Email already exists' } ) ; 
 } 
      res . status ( 500 ) . json ( { error : 'Registration failed' } ) ; 
 } 
 } ) ; 
 
 // POST /api/auth/login - Business login 
 router . post ( '/login' , async ( req ,  res ) => { 
 const {  email ,  password  } =  req . body ; 
 
 try { 
 const  result  = await query ( 'SELECT * FROM businesses WHERE email = $1' , [ email ] ) ; 
 if ( result . rows . length  === 0 ) { 
 return  res . status ( 401 ) . json ( { error : 'Invalid credentials' } ) ; 
 } 
 
 const  user  =  result . rows [ 0 ] ; 
 const  isValid  = await  bcrypt . compare ( password ,  user . password_hash ) ; 
 
 if ( ! isValid ) { 
 return  res . status ( 401 ) . json ( { error : 'Invalid credentials' } ) ; 
 } 
 
 const  token  =  generateToken ( user . id ,  user . email , 'advertiser' ) ; 
      res . json ( { 
 user : { id :  user . id ,  email :  user . email ,  business_name :  user . business_name  } , 
        token 
 } ) ; 
 } catch ( err ) { 
      res . status ( 500 ) . json ( { error : 'Login failed' } ) ; 
 } 
 } ) ; 
 
 module . exports  =  router ;