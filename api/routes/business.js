const  express  = require ( 'express' ) ; 
 const  router  =  express . Router ( ) ; 
 const {  query  } = require ( '../services/database' ) ; 
 const {  getCache ,  setCache  } = require ( '../services/redis' ) ; 
 
 // GET /api/business/stats - Get advertiser stats 
 router . get ( '/stats' , async ( req ,  res ) => { 
 const {  business_id  } =  req . query ; 
 
 const  cacheKey  = ` business:stats: ${ business_id } ` ; 
 const  cached  = await getCache ( cacheKey ) ; 
 if ( cached ) return  res . json ( cached ) ; 
 
 const  result  = await query ( ` 
    SELECT 
      SUM(impressions) as total_impressions, 
      SUM(clicks) as total_clicks, 
      SUM(spent) as total_spent 
    FROM campaigns 
    WHERE business_id = $1 ` , 
 [ business_id ] 
 ) ; 
 
 // Cache for 30 seconds 
 await setCache ( cacheKey ,  result . rows [ 0 ] , 30 ) ; 
 
  res . json ( result . rows [ 0 ] ) ; 
 } ) ; 
 
 // GET /api/business/pricing - Get current pricing tiers 
 router . get ( '/pricing' , async ( req ,  res ) => { 
 const  pricing  = { 
 tiers : [ 
 { 
 name : "Founding Advertiser" , 
 price : 15000 , 
 description : "Limited to 5 spots - priority placement + case study" , 
 features : [ "Priority ad placement" , "Custom case study" , "Full geo-targeting" , "Dedicated account manager" ] , 
 impressions_estimate : "500,000+" 
 } , 
 { 
 name : "Premium" , 
 price : 7500 , 
 description : "Full geo-targeting + real-time analytics" , 
 features : [ "Real-time analytics dashboard" , "Geo-fenced campaigns" , "A/B testing" , "API access" ] , 
 impressions_estimate : "250,000+" 
 } , 
 { 
 name : "Starter" , 
 price : 3000 , 
 description : "30-day campaign, one zone" , 
 features : [ "Single zone targeting" , "Basic analytics" , "Email support" , "30-day duration" ] , 
 impressions_estimate : "100,000+" 
 } 
 ] , 
 zones : [ 
 { name : "Venice Pier" , daily_impressions : 5000 , price_multiplier : 1.0 } , 
 { name : "Boardwalk" , daily_impressions : 8000 , price_multiplier : 1.2 } , 
 { name : "Windward Ave" , daily_impressions : 3000 , price_multiplier : 0.8 } 
 ] 
 } ; 
 
  res . json ( pricing ) ; 
 } ) ; 
 
 module . exports  =  router ;