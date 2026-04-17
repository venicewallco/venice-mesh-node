const {  ethers  } = require ( 'ethers' ) ; 
 const {  query  } = require ( './database' ) ; 
 
 class BlockchainService { 
 constructor ( ) { 
 this . provider  = null ; 
 this . wallet  = null ; 
 this . contract  = null ; 
 this . initialized  = false ; 
 
 // Contract ABI (minimal ERC20) 
 this . contractABI  = [ 
 'function balanceOf(address owner) view returns (uint256)' , 
 'function transfer(address to, uint256 amount) returns (bool)' , 
 'function mint(address to, uint256 amount)' , 
 'event Transfer(address indexed from, address indexed to, uint256 value)' 
 ] ; 
 } 
 
 async initialize ( rpcUrl ,  privateKey ,  contractAddress ) { 
 if ( ! rpcUrl  || ! privateKey  || ! contractAddress ) { 
      console . log ( 'Blockchain service disabled - missing credentials' ) ; 
 return false ; 
 } 
 
 try { 
 this . provider  = new ethers . JsonRpcProvider ( rpcUrl ) ; 
 this . wallet  = new ethers . Wallet ( privateKey , this . provider ) ; 
 this . contract  = new ethers . Contract ( contractAddress , this . contractABI , this . wallet ) ; 
 this . initialized  = true ; 
      console . log ( 'Blockchain service initialized on Polygon' ) ; 
 return true ; 
 } catch ( err ) { 
      console . error ( 'Failed to initialize blockchain service:' ,  err ) ; 
 return false ; 
 } 
 } 
 
 async getBalance ( address ) { 
 if ( ! this . initialized ) return null ; 
 
 try { 
 const  balance  = await this . contract . balanceOf ( address ) ; 
 return  ethers . formatEther ( balance ) ; 
 } catch ( err ) { 
      console . error ( 'Failed to get balance:' ,  err ) ; 
 return null ; 
 } 
 } 
 
 async mintTokens ( address ,  amount ,  reason  = 'wifi_usage' ) { 
 if ( ! this . initialized ) { 
      console . log ( 'Blockchain disabled - minting to database only' ) ; 
 return this . mintToDatabase ( address ,  amount ,  reason ) ; 
 } 
 
 try { 
 const  amountWei  =  ethers . parseEther ( amount . toString ( ) ) ; 
 const  tx  = await this . contract . mint ( address ,  amountWei ) ; 
 await  tx . wait ( ) ; 
 
 // Record on-chain transaction 
 await query ( 
 ` INSERT INTO blockchain_transactions (tx_hash, from_address, to_address, amount, type, status) 
         VALUES ($1, 'system', $2, $3, $4, 'confirmed') ` , 
 [ tx . hash ,  address ,  amount ,  reason ] 
 ) ; 
 
 return { success : true , tx_hash :  tx . hash  } ; 
 } catch ( err ) { 
      console . error ( 'Mint failed:' ,  err ) ; 
 return { success : false , error :  err . message  } ; 
 } 
 } 
 
 async mintToDatabase ( address ,  amount ,  reason ) { 
 // Fallback: store in database instead of on-chain 
 await query ( 
 ` INSERT INTO token_balances (address, balance, total_earned) 
       VALUES ($1, $2, $2) 
       ON CONFLICT (address) DO UPDATE SET 
         balance = token_balances.balance + EXCLUDED.balance, 
         total_earned = token_balances.total_earned + EXCLUDED.balance ` , 
 [ address ,  amount ] 
 ) ; 
 
 await query ( 
 ` INSERT INTO token_transactions (from_address, to_address, amount, type, metadata) 
       VALUES ('system', $1, $2, $3, $4) ` , 
 [ address ,  amount ,  reason , JSON . stringify ( { offchain : true } ) ] 
 ) ; 
 
 return { success : true , offchain : true } ; 
 } 
 
 async transferTokens ( fromAddress ,  toAddress ,  amount ,  privateKey ) { 
 if ( ! this . initialized ) { 
 return { success : false , error : 'Blockchain not initialized' } ; 
 } 
 
 try { 
 const  wallet  = new ethers . Wallet ( privateKey , this . provider ) ; 
 const  contract  = new ethers . Contract ( this . contract . target , this . contractABI ,  wallet ) ; 
 
 const  amountWei  =  ethers . parseEther ( amount . toString ( ) ) ; 
 const  tx  = await  contract . transfer ( toAddress ,  amountWei ) ; 
 await  tx . wait ( ) ; 
 
 return { success : true , tx_hash :  tx . hash  } ; 
 } catch ( err ) { 
      console . error ( 'Transfer failed:' ,  err ) ; 
 return { success : false , error :  err . message  } ; 
 } 
 } 
 
 async syncBalances ( ) { 
 // Sync database balances with on-chain balances 
 if ( ! this . initialized ) return ; 
 
 const  addresses  = await query ( 
 ` SELECT DISTINCT address FROM token_balances ` 
 ) ; 
 
 for ( const  row  of  addresses . rows ) { 
 const  onChainBalance  = await this . getBalance ( row . address ) ; 
 if ( onChainBalance ) { 
 await query ( 
 ` UPDATE token_balances 
           SET onchain_balance = $1, last_synced = NOW() 
           WHERE address = $2 ` , 
 [ onChainBalance ,  row . address ] 
 ) ; 
 } 
 } 
 } 
 } 
 
 module . exports  = {  BlockchainService  } ;