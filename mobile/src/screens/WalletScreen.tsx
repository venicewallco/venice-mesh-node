import  React , {  useState ,  useEffect  } from 'react' ; 
 import { 
  View , 
  Text , 
  StyleSheet , 
  TouchableOpacity , 
  FlatList , 
  RefreshControl , 
  Alert , 
 } from 'react-native' ; 
 import  AsyncStorage  from '@react-native-async-storage/async-storage' ; 
 
 interface WalletData { 
  balance : number ; 
  staked_balance : number ; 
  total_earned : number ; 
  address : string ; 
 } 
 
 interface Transaction { 
  id : number ; 
  amount : number ; 
  type : string ; 
  created_at : string ; 
 } 
 
 const API_URL = 'https://api.venicemesh.com' ; 
 
 export const  WalletScreen :  React . FC = ( ) => { 
 const [ wallet ,  setWallet ] = useState < WalletData  | null > ( null ) ; 
 const [ transactions ,  setTransactions ] = useState < Transaction [ ] > ( [ ] ) ; 
 const [ refreshing ,  setRefreshing ] = useState ( false ) ; 
 const [ loading ,  setLoading ] = useState ( true ) ; 
 
 const loadWallet = async ( ) => { 
 try { 
 const  address  = await  AsyncStorage . getItem ( 'wallet_address' ) ; 
 if ( ! address ) { 
 // Generate new wallet 
 const  response  = await fetch ( ` ${ API_URL } /api/tokens/create-wallet ` , { 
          method : 'POST' , 
 } ) ; 
 const  data  = await  response . json ( ) ; 
 await  AsyncStorage . setItem ( 'wallet_address' ,  data . address ) ; 
 await  AsyncStorage . setItem ( 'private_key' ,  data . private_key ) ; 
 setWallet ( data ) ; 
 } else { 
 // Load existing wallet 
 const  balanceRes  = await fetch ( ` ${ API_URL } /api/tokens/balance/ ${ address } ` ) ; 
 const  balanceData  = await  balanceRes . json ( ) ; 
 setWallet ( balanceData ) ; 
 
 const  txRes  = await fetch ( ` ${ API_URL } /api/tokens/transactions/ ${ address } ` ) ; 
 const  txData  = await  txRes . json ( ) ; 
 setTransactions ( txData ) ; 
 } 
 } catch ( error ) { 
 console . error ( 'Failed to load wallet:' ,  error ) ; 
      Alert . alert ( 'Error' , 'Failed to load wallet data' ) ; 
 } finally { 
 setLoading ( false ) ; 
 } 
 } ; 
 
 const onRefresh = async ( ) => { 
 setRefreshing ( true ) ; 
 await loadWallet ( ) ; 
 setRefreshing ( false ) ; 
 } ; 
 
 const sendTokens = ( ) => { 
    Alert . alert ( 'Send Tokens' , 'Enter recipient address and amount' , [ 
 {  text : 'Cancel' ,  style : 'cancel' } , 
 {  text : 'Send' , onPress : ( ) => console . log ( 'Send' ) } , 
 ] ) ; 
 } ; 
 
 const stakeTokens = ( ) => { 
    Alert . alert ( 'Stake Tokens' , 'Enter amount to stake' , [ 
 {  text : 'Cancel' ,  style : 'cancel' } , 
 {  text : 'Stake' , onPress : ( ) => console . log ( 'Stake' ) } , 
 ] ) ; 
 } ; 
 
 useEffect ( ( ) => { 
 loadWallet ( ) ; 
 } , [ ] ) ; 
 
 if ( loading ) { 
 return ( 
 < View style = { styles . center } > 
 < Text > Loading wallet ... < / Text > 
 < / View > 
 ) ; 
 } 
 
 return ( 
 < View style = { styles . container } > 
 < View style = { styles . balanceCard } > 
 < Text style = { styles . balanceLabel } > VNM  Balance < / Text > 
 < Text style = { styles . balanceAmount } > { wallet ?. balance  || 0 } < / Text > 
 < Text style = { styles . balanceSub } > ≈ $0 . 00 USD < / Text > 
 
 < View style = { styles . statsRow } > 
 < View style = { styles . stat } > 
 < Text style = { styles . statValue } > { wallet ?. staked_balance  || 0 } < / Text > 
 < Text style = { styles . statLabel } > Staked < / Text > 
 < / View > 
 < View style = { styles . stat } > 
 < Text style = { styles . statValue } > { wallet ?. total_earned  || 0 } < / Text > 
 < Text style = { styles . statLabel } > Total Earned < / Text > 
 < / View > 
 < / View > 
 < / View > 
 
 < View style = { styles . actions } > 
 < TouchableOpacity style = { styles . actionButton }  onPress = { sendTokens } > 
 < Text style = { styles . actionText } > Send < / Text > 
 < / TouchableOpacity > 
 < TouchableOpacity style = { styles . actionButton }  onPress = { stakeTokens } > 
 < Text style = { styles . actionText } > Stake < / Text > 
 < / TouchableOpacity > 
 < TouchableOpacity style = { styles . actionButton } > 
 < Text style = { styles . actionText } > Receive < / Text > 
 < / TouchableOpacity > 
 < / View > 
 
 < View style = { styles . transactionsHeader } > 
 < Text style = { styles . transactionsTitle } > Recent Transactions < / Text > 
 < / View > 
 
 < FlatList 
        data = { transactions } 
        keyExtractor = { ( item ) =>  item . id . toString ( ) } 
        refreshControl = { 
 < RefreshControl refreshing = { refreshing }  onRefresh = { onRefresh } / > 
 } 
        renderItem = { ( {  item  } ) => ( 
 < View style = { styles . transactionItem } > 
 < View > 
 < Text style = { styles . transactionType } > { item . type } < / Text > 
 < Text style = { styles . transactionDate } > 
 { new Date ( item . created_at ) . toLocaleDateString ( ) } 
 < / Text > 
 < / View > 
 < Text 
              style = { [ 
                styles . transactionAmount , 
                item . amount  > 0 ?  styles . positive  :  styles . negative , 
 ] } 
 > 
 { item . amount  > 0 ? '+' : '' } { item . amount } VNM 
 < / Text > 
 < / View > 
 ) } 
        ListEmptyComponent = { 
 < Text style = { styles . emptyText } > No transactions yet < / Text > 
 } 
 / > 
 < / View > 
 ) ; 
 } ; 
 
 const  styles  =  StyleSheet . create ( { 
  container : { 
    flex : 1 , 
    backgroundColor : '#f5f5f5' , 
 } , 
  center : { 
    flex : 1 , 
    justifyContent : 'center' , 
    alignItems : 'center' , 
 } , 
  balanceCard : { 
    backgroundColor : '#007AFF' , 
    margin : 20 , 
    padding : 20 , 
    borderRadius : 15 , 
    alignItems : 'center' , 
 } , 
  balanceLabel : { 
    color : 'rgba(255,255,255,0.8)' , 
    fontSize : 14 , 
 } , 
  balanceAmount : { 
    color : 'white' , 
    fontSize : 48 , 
    fontWeight : 'bold' , 
    marginVertical : 10 , 
 } , 
  balanceSub : { 
    color : 'rgba(255,255,255,0.8)' , 
    fontSize : 14 , 
 } , 
  statsRow : { 
    flexDirection : 'row' , 
    marginTop : 20 , 
    paddingTop : 20 , 
    borderTopWidth : 1 , 
    borderTopColor : 'rgba(255,255,255,0.2)' , 
 } , 
  stat : { 
    flex : 1 , 
    alignItems : 'center' , 
 } , 
  statValue : { 
    color : 'white' , 
    fontSize : 20 , 
    fontWeight : 'bold' , 
 } , 
  statLabel : { 
    color : 'rgba(255,255,255,0.8)' , 
    fontSize : 12 , 
    marginTop : 5 , 
 } , 
  actions : { 
    flexDirection : 'row' , 
    justifyContent : 'space-around' , 
    marginHorizontal : 20 , 
    marginBottom : 20 , 
 } , 
  actionButton : { 
    backgroundColor : 'white' , 
    paddingHorizontal : 30 , 
    paddingVertical : 12 , 
    borderRadius : 25 , 
    shadowColor : '#000' , 
    shadowOffset : {  width : 0 ,  height : 2 } , 
    shadowOpacity : 0.1 , 
    shadowRadius : 4 , 
    elevation : 3 , 
 } , 
  actionText : { 
    color : '#007AFF' , 
    fontWeight : '600' , 
 } , 
  transactionsHeader : { 
    flexDirection : 'row' , 
    justifyContent : 'space-between' , 
    alignItems : 'center' , 
    paddingHorizontal : 20 , 
    paddingVertical : 15 , 
 } , 
  transactionsTitle : { 
    fontSize : 18 , 
    fontWeight : 'bold' , 
 } , 
  transactionItem : { 
    flexDirection : 'row' , 
    justifyContent : 'space-between' , 
    alignItems : 'center' , 
    backgroundColor : 'white' , 
    marginHorizontal : 20 , 
    marginBottom : 10 , 
    padding : 15 , 
    borderRadius : 10 , 
 } , 
  transactionType : { 
    fontSize : 16 , 
    fontWeight : '500' , 
 } , 
  transactionDate : { 
    fontSize : 12 , 
    color : '#666' , 
    marginTop : 4 , 
 } , 
  transactionAmount : { 
    fontSize : 16 , 
    fontWeight : 'bold' , 
 } , 
  positive : { 
    color : '#4CD964' , 
 } , 
  negative : { 
    color : '#FF3B30' , 
 } , 
  emptyText : { 
    textAlign : 'center' , 
    color : '#999' , 
    marginTop : 50 , 
 } , 
 } ) ;