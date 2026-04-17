const  express  = require ( 'express' ) ; 
 const  router  =  express . Router ( ) ; 
 const {  query  } = require ( '../services/database' ) ; 
 const {  setCache ,  getCache  } = require ( '../services/redis' ) ; 
 const {  verifyToken  } = require ( '../middleware/auth' ) ; 
 
 // Token configuration 
 const TOKEN_CONFIG = { 
 symbol : 'VNM' , 
 name : 'Venice Mesh Token' , 
 decimals : 18 , 
 reward_rate : 0.001 , // Tokens per minute of WiFi usage 
 referral_bonus : 10 , // Tokens for referring a new user 
 staking_apy : 0.08 // 8% APY for staking 
 } ; 
 
 // Get user token balance 
 router . get ( '/balance/:address' , async ( req ,  res ) => { 
 const {  address  } =  req . params ; 
 
 // Try cache 
 const  cached  = await getCache ( ` token_balance: ${ address } ` ) ; 
 if ( cached ) { 
 return  res . json ( cached ) ; 
 } 
 
 const  result  = await query ( 
 ` SELECT address, balance, staked_balance, total_earned, last_claim_at 
     FROM token_balances 
     WHERE address = $1 ` , 
 [ address ] 
 ) ; 
 
 let  balance ; 
 if ( result . rows . length  === 0 ) { 
 // Create new balance 
 const  insert  = await query ( 
 ` INSERT INTO token_balances (address, balance, staked_balance, total_earned) 
       VALUES ($1, 0, 0, 0) 
       RETURNING * ` , 
 [ address ] 
 ) ; 
    balance  =  insert . rows [ 0 ] ; 
 } else { 
    balance  =  result . rows [ 0 ] ; 
 } 
 
 await setCache ( ` token_balance: ${ address } ` ,  balance , 30 ) ; 
 
  res . json ( balance ) ; 
 } ) ; 
 
 // Earn tokens for WiFi usage 
 router . post ( '/earn' , async ( req ,  res ) => { 
 const {  wallet_address ,  session_id ,  minutes_connected  } =  req . body ; 
 
 if ( ! wallet_address  || ! session_id ) { 
 return  res . status ( 400 ) . json ( { error : 'wallet_address and session_id required' } ) ; 
 } 
 
 const  tokens_earned  =  Math . floor ( minutes_connected  * TOKEN_CONFIG . reward_rate ) ; 
 
 if ( tokens_earned  <= 0 ) { 
 return  res . json ( { earned : 0 } ) ; 
 } 
 
 // Update balance 
 await query ( 
 ` INSERT INTO token_balances (address, balance, total_earned) 
     VALUES ($1, $2, $2) 
     ON CONFLICT (address) DO UPDATE SET 
       balance = token_balances.balance + EXCLUDED.balance, 
       total_earned = token_balances.total_earned + EXCLUDED.balance ` , 
 [ wallet_address ,  tokens_earned ] 
 ) ; 
 
 // Record earnings transaction 
 await query ( 
 ` INSERT INTO token_transactions (from_address, to_address, amount, type, session_id) 
     VALUES ('system', $1, $2, 'earn', $3) ` , 
 [ wallet_address ,  tokens_earned ,  session_id ] 
 ) ; 
 
 // Invalidate cache 
 await setCache ( ` token_balance: ${ wallet_address } ` , null , 0 ) ; 
 
  res . json ( { earned :  tokens_earned  } ) ; 
 } ) ; 
 
 // Transfer tokens between wallets 
 router . post ( '/transfer' ,  verifyToken , async ( req ,  res ) => { 
 const {  from_address ,  to_address ,  amount  } =  req . body ; 
 const  user_address  =  req . user . wallet_address ; 
 
 // Verify sender is authenticated user 
 if ( from_address  !==  user_address ) { 
 return  res . status ( 403 ) . json ( { error : 'Cannot transfer from another wallet' } ) ; 
 } 
 
 if ( amount  <= 0 ) { 
 return  res . status ( 400 ) . json ( { error : 'Amount must be positive' } ) ; 
 } 
 
 // Start transaction 
 const  client  = await query ( 'BEGIN' ) ; 
 
 try { 
 // Check sufficient balance 
 const  balanceCheck  = await query ( 
 ` SELECT balance FROM token_balances WHERE address = $1 FOR UPDATE ` , 
 [ from_address ] 
 ) ; 
 
 if ( balanceCheck . rows [ 0 ] ?. balance  <  amount ) { 
 await query ( 'ROLLBACK' ) ; 
 return  res . status ( 400 ) . json ( { error : 'Insufficient balance' } ) ; 
 } 
 
 // Deduct from sender 
 await query ( 
 ` UPDATE token_balances SET balance = balance - $1 WHERE address = $2 ` , 
 [ amount ,  from_address ] 
 ) ; 
 
 // Add to recipient (create if doesn't exist) 
 await query ( 
 ` INSERT INTO token_balances (address, balance) 
       VALUES ($1, $2) 
       ON CONFLICT (address) DO UPDATE SET 
         balance = token_balances.balance + EXCLUDED.balance ` , 
 [ to_address ,  amount ] 
 ) ; 
 
 // Record transaction 
 await query ( 
 ` INSERT INTO token_transactions (from_address, to_address, amount, type) 
       VALUES ($1, $2, $3, 'transfer') ` , 
 [ from_address ,  to_address ,  amount ] 
 ) ; 
 
 await query ( 'COMMIT' ) ; 
 
 // Invalidate caches 
 await setCache ( ` token_balance: ${ from_address } ` , null , 0 ) ; 
 await setCache ( ` token_balance: ${ to_address } ` , null , 0 ) ; 
 
    res . json ( { success : true ,  amount  } ) ; 
 } catch ( err ) { 
 await query ( 'ROLLBACK' ) ; 
    console . error ( 'Transfer error:' ,  err ) ; 
    res . status ( 500 ) . json ( { error : 'Transfer failed' } ) ; 
 } 
 } ) ; 
 
 // Stake tokens 
 router . post ( '/stake' ,  verifyToken , async ( req ,  res ) => { 
 const {  address ,  amount  } =  req . body ; 
 
 if ( amount  <= 0 ) { 
 return  res . status ( 400 ) . json ( { error : 'Amount must be positive' } ) ; 
 } 
 
 const  result  = await query ( 
 ` UPDATE token_balances 
     SET balance = balance - $1, staked_balance = staked_balance + $1 
     WHERE address = $2 AND balance >= $1 
     RETURNING * ` , 
 [ amount ,  address ] 
 ) ; 
 
 if ( result . rows . length  === 0 ) { 
 return  res . status ( 400 ) . json ( { error : 'Insufficient balance' } ) ; 
 } 
 
 await query ( 
 ` INSERT INTO token_transactions (from_address, amount, type) 
     VALUES ($1, $2, 'stake') ` , 
 [ address ,  amount ] 
 ) ; 
 
 await setCache ( ` token_balance: ${ address } ` , null , 0 ) ; 
 
  res . json ( { success : true , staked :  amount  } ) ; 
 } ) ; 
 
 // Get transaction history 
 router . get ( '/transactions/:address' , async ( req ,  res ) => { 
 const {  address  } =  req . params ; 
 const {  limit  = 50 } =  req . query ; 
 
 const  result  = await query ( 
 ` SELECT * FROM token_transactions 
     WHERE from_address = $1 OR to_address = $1 
     ORDER BY created_at DESC 
     LIMIT $2 ` , 
 [ address ,  limit ] 
 ) ; 
 
  res . json ( result . rows ) ; 
 } ) ; 
 
 // Get token stats 
 router . get ( '/stats' , async ( req ,  res ) => { 
 const  result  = await query ( 
 ` SELECT 
       COUNT(*) as total_holders, 
       SUM(balance) as total_supply, 
       SUM(staked_balance) as total_staked 
     FROM token_balances 
     WHERE balance > 0 OR staked_balance > 0 ` 
 ) ; 
 
  res . json ( { 
 ... result . rows [ 0 ] , 
 config : TOKEN_CONFIG , 
 circulating_supply : ( result . rows [ 0 ] ?. total_supply  || 0 ) + ( result . rows [ 0 ] ?. total_staked  || 0 ) 
 } ) ; 
 } ) ; 
 
 module . exports  =  router ;