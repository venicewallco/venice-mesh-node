// SPDX-License-Identifier: MIT 
 pragma solidity ^ 0.8.19 ; 
 
 import "@openzeppelin/contracts/token/ERC20/ERC20.sol" ; 
 import "@openzeppelin/contracts/access/Ownable.sol" ; 
 import "@openzeppelin/contracts/security/Pausable.sol" ; 
 
 contract VeniceMeshToken is  ERC20 ,  Ownable ,  Pausable  { 
 uint256 public constant  MAX_SUPPLY  = 100 _000_000  * 10 ** 18 ; 
 uint256 public  rewardRate  = 0.001 * 10 ** 18 ; // 0.001 tokens per minute 
 mapping ( address => uint256 ) public  lastClaimTime ; 
 mapping ( address => uint256 ) public  stakedBalance ; 
 mapping ( address => uint256 ) public  stakingStartTime ; 
 
 event TokensEarned ( address indexed  user , uint256  amount , uint256  minutesConnected ) ; 
 event TokensStaked ( address indexed  user , uint256  amount ) ; 
 event TokensUnstaked ( address indexed  user , uint256  amount , uint256  reward ) ; 
 event ReferralBonus ( address indexed  referrer , address indexed  referred , uint256  bonus ) ; 
 
 constructor ( ) ERC20 ( "Venice Mesh Token" , "VNM" ) Ownable ( msg . sender ) { 
 _mint ( msg . sender , 10 _000_000  * 10 ** 18 ) ; // 10M tokens to treasury 
 } 
 
 function mint ( address  to , uint256  amount ) external  onlyOwner  { 
 require ( totalSupply ( ) +  amount  <=  MAX_SUPPLY , "Exceeds max supply" ) ; 
 _mint ( to ,  amount ) ; 
 } 
 
 function earnTokens ( address  user , uint256  minutesConnected ) external  onlyOwner  { 
 require ( minutesConnected  > 0 , "Minutes must be positive" ) ; 
 uint256  reward  =  minutesConnected  *  rewardRate ; 
 require ( totalSupply ( ) +  reward  <=  MAX_SUPPLY , "Exceeds max supply" ) ; 
 
 _mint ( user ,  reward ) ; 
        lastClaimTime [ user ] =  block . timestamp ; 
 
 emit TokensEarned ( user ,  reward ,  minutesConnected ) ; 
 } 
 
 function stake ( uint256  amount ) external  whenNotPaused  { 
 require ( amount  > 0 , "Amount must be positive" ) ; 
 require ( balanceOf ( msg . sender ) >=  amount , "Insufficient balance" ) ; 
 
 _transfer ( msg . sender , address ( this ) ,  amount ) ; 
        stakedBalance [ msg . sender ] +=  amount ; 
 
 if ( stakingStartTime [ msg . sender ] == 0 ) { 
            stakingStartTime [ msg . sender ] =  block . timestamp ; 
 } 
 
 emit TokensStaked ( msg . sender ,  amount ) ; 
 } 
 
 function unstake ( ) external  whenNotPaused  { 
 uint256  amount  =  stakedBalance [ msg . sender ] ; 
 require ( amount  > 0 , "Nothing staked" ) ; 
 
 uint256  stakingDuration  =  block . timestamp  -  stakingStartTime [ msg . sender ] ; 
 uint256  reward  = ( amount  *  stakingDuration  * 8 ) / ( 365  days  * 100 ) ; // 8% APY 
 
        stakedBalance [ msg . sender ] = 0 ; 
        stakingStartTime [ msg . sender ] = 0 ; 
 
 _transfer ( address ( this ) ,  msg . sender ,  amount  +  reward ) ; 
 
 emit TokensUnstaked ( msg . sender ,  amount ,  reward ) ; 
 } 
 
 function referUser ( address  referrer , address  referred ) external { 
 uint256  bonus  = 10 * 10 ** 18 ; // 10 tokens 
 require ( totalSupply ( ) +  bonus  <=  MAX_SUPPLY , "Exceeds max supply" ) ; 
 
 _mint ( referrer ,  bonus ) ; 
 emit ReferralBonus ( referrer ,  referred ,  bonus ) ; 
 } 
 
 function pause ( ) external  onlyOwner  { 
 _pause ( ) ; 
 } 
 
 function unpause ( ) external  onlyOwner  { 
 _unpause ( ) ; 
 } 
 
 function getStakingInfo ( address  user ) external view returns ( uint256  staked , uint256  pendingReward ) { 
        staked  =  stakedBalance [ user ] ; 
 if ( staked  > 0 &&  stakingStartTime [ user ] > 0 ) { 
 uint256  stakingDuration  =  block . timestamp  -  stakingStartTime [ user ] ; 
            pendingReward  = ( staked  *  stakingDuration  * 8 ) / ( 365  days  * 100 ) ; 
 } 
 } 
 }