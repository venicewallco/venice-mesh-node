const  hre  = require ( "hardhat" ) ; 
 
 async function main ( ) { 
  console . log ( "Deploying VeniceMeshToken..." ) ; 
 
 const  VeniceMeshToken  = await  hre . ethers . getContractFactory ( "VeniceMeshToken" ) ; 
 const  token  = await  VeniceMeshToken . deploy ( ) ; 
 
 await  token . waitForDeployment ( ) ; 
 
 const  address  = await  token . getAddress ( ) ; 
  console . log ( ` VeniceMeshToken deployed to:  ${ address } ` ) ; 
 
 // Verify on Polygonscan 
 if ( hre . network . name  !== "hardhat" ) { 
    console . log ( "Waiting for block confirmations..." ) ; 
 await  token . deploymentTransaction ( ) . wait ( 5 ) ; 
 
 await  hre . run ( "verify:verify" , { 
 address :  address , 
 constructorArguments : [ ] , 
 } ) ; 
    console . log ( "Contract verified on Polygonscan" ) ; 
 } 
 } 
 
 main ( ) . catch ( ( error ) => { 
  console . error ( error ) ; 
  process . exitCode  = 1 ; 
 } ) ;