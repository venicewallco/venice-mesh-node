require ( "@nomicfoundation/hardhat-toolbox" ) ; 
 
 /** @type import('hardhat/config').HardhatUserConfig */ 
 module . exports  = { 
 solidity : { 
 version : "0.8.19" , 
 settings : { 
 optimizer : { 
 enabled : true , 
 runs : 200 
 } 
 } 
 } , 
 networks : { 
 polygon : { 
 url :  process . env . POLYGON_RPC_URL || "https://polygon-rpc.com" , 
 accounts :  process . env . PRIVATE_KEY ? [ process . env . PRIVATE_KEY ] : [ ] , 
 } , 
 amoy : { 
 url : "https://rpc-amoy.polygon.technology" , 
 accounts :  process . env . PRIVATE_KEY ? [ process . env . PRIVATE_KEY ] : [ ] , 
 } , 
 hardhat : { 
 chainId : 31337 
 } 
 } , 
 etherscan : { 
 apiKey :  process . env . POLYGONSCAN_API_KEY 
 } 
 } ;