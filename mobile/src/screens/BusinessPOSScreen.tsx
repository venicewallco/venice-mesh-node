import  React , {  useState  } from 'react' ; 
 import { 
  View , 
  Text , 
  StyleSheet , 
  TextInput , 
  TouchableOpacity , 
  Alert , 
  ScrollView , 
 } from 'react-native' ; 
 import  QRCode  from 'react-native-qrcode-svg' ; 
 import  AsyncStorage  from '@react-native-async-storage/async-storage' ; 
 
 const API_URL = 'https://api.venicemesh.com' ; 
 
 export const  BusinessPOSScreen :  React . FC = ( ) => { 
 const [ amount ,  setAmount ] = useState ( '' ) ; 
 const [ customerAddress ,  setCustomerAddress ] = useState ( '' ) ; 
 const [ qrValue ,  setQrValue ] = useState ( '' ) ; 
 const [ loading ,  setLoading ] = useState ( false ) ; 
 
 const generateQR = ( ) => { 
 if ( ! amount  || parseFloat ( amount ) <= 0 ) { 
      Alert . alert ( 'Error' , 'Please enter a valid amount' ) ; 
 return ; 
 } 
 
 // Generate payment request 
 const  paymentRequest  = JSON . stringify ( { 
      amount : parseFloat ( amount ) , 
      merchant : 'Venice Beach WiFi' , 
      timestamp :  Date . now ( ) , 
 } ) ; 
 
 setQrValue ( paymentRequest ) ; 
 } ; 
 
 const processPayment = async ( ) => { 
 if ( ! customerAddress  || ! amount ) { 
      Alert . alert ( 'Error' , 'Please enter customer address and amount' ) ; 
 return ; 
 } 
 
 setLoading ( true ) ; 
 
 try { 
 const  merchantAddress  = await  AsyncStorage . getItem ( 'wallet_address' ) ; 
 const  privateKey  = await  AsyncStorage . getItem ( 'private_key' ) ; 
 
 const  response  = await fetch ( ` ${ API_URL } /api/tokens/transfer ` , { 
        method : 'POST' , 
        headers : { 'Content-Type' : 'application/json' } , 
        body : JSON . stringify ( { 
          from_address :  customerAddress , 
          to_address :  merchantAddress , 
          amount : parseFloat ( amount ) , 
          private_key :  privateKey , 
 } ) , 
 } ) ; 
 
 const  data  = await  response . json ( ) ; 
 
 if ( data . success ) { 
        Alert . alert ( 'Success' , ` Payment of  ${ amount }  VNM received! ` ) ; 
 setAmount ( '' ) ; 
 setCustomerAddress ( '' ) ; 
 setQrValue ( '' ) ; 
 } else { 
        Alert . alert ( 'Error' ,  data . error  || 'Payment failed' ) ; 
 } 
 } catch ( error ) { 
      Alert . alert ( 'Error' , 'Failed to process payment' ) ; 
 } finally { 
 setLoading ( false ) ; 
 } 
 } ; 
 
 return ( 
 < ScrollView style = { styles . container } > 
 < View style = { styles . header } > 
 < Text style = { styles . title } > Venice Beach  POS < / Text > 
 < Text style = { styles . subtitle } > Accept  VNM  Tokens < / Text > 
 < / View > 
 
 < View style = { styles . card } > 
 < Text style = { styles . label } > Amount ( VNM ) < / Text > 
 < TextInput 
          style = { styles . input } 
          value = { amount } 
          onChangeText = { setAmount } 
          placeholder = "0.00" 
          keyboardType = "decimal-pad" 
 / > 
 
 < TouchableOpacity style = { styles . qrButton }  onPress = { generateQR } > 
 < Text style = { styles . qrButtonText } > Generate  QR  Code < / Text > 
 < / TouchableOpacity > 
 
 { qrValue  ? ( 
 < View style = { styles . qrContainer } > 
 < QRCode value = { qrValue }  size = { 200 } / > 
 < Text style = { styles . qrHint } > Scan  with  customer wallet < / Text > 
 < / View > 
 ) : null } 
 < / View > 
 
 < View style = { styles . card } > 
 < Text style = { styles . label } > Customer Wallet Address < / Text > 
 < TextInput 
          style = { styles . input } 
          value = { customerAddress } 
          onChangeText = { setCustomerAddress } 
          placeholder = "0x..." 
 / > 
 
 < TouchableOpacity 
          style = { styles . payButton } 
          onPress = { processPayment } 
          disabled = { loading } 
 > 
 < Text style = { styles . payButtonText } > 
 { loading  ? 'Processing...' : 'Process Payment' } 
 < / Text > 
 < / TouchableOpacity > 
 < / View > 
 
 < View style = { styles . statsCard } > 
 < Text style = { styles . statsTitle } > Today's Sales < / Text > 
 < Text style = { styles . statsAmount } > 1 , 250 VNM < / Text > 
 < Text style = { styles . statsSub } > ≈ $12 . 50 USD < / Text > 
 < Text style = { styles . statsCount } > 12  transactions < / Text > 
 < / View > 
 < / ScrollView > 
 ) ; 
 } ; 
 
 const  styles  =  StyleSheet . create ( { 
  container : { 
    flex : 1 , 
    backgroundColor : '#f5f5f5' , 
 } , 
  header : { 
    backgroundColor : '#007AFF' , 
    padding : 30 , 
    alignItems : 'center' , 
 } , 
  title : { 
    fontSize : 24 , 
    fontWeight : 'bold' , 
    color : 'white' , 
 } , 
  subtitle : { 
    fontSize : 14 , 
    color : 'rgba(255,255,255,0.8)' , 
 } , 
  card : { 
    backgroundColor : 'white' , 
    margin : 15 , 
    padding : 20 , 
    borderRadius : 10 , 
    shadowColor : '#000' , 
    shadowOffset : {  width : 0 ,  height : 2 } , 
    shadowOpacity : 0.1 , 
    shadowRadius : 4 , 
    elevation : 3 , 
 } , 
  label : { 
    fontSize : 14 , 
    fontWeight : '600' , 
    marginBottom : 8 , 
    color : '#333' , 
 } , 
  input : { 
    borderWidth : 1 , 
    borderColor : '#ddd' , 
    borderRadius : 8 , 
    padding : 12 , 
    fontSize : 16 , 
    marginBottom : 15 , 
 } , 
  qrButton : { 
    backgroundColor : '#5856D6' , 
    padding : 12 , 
    borderRadius : 8 , 
    alignItems : 'center' , 
    marginBottom : 15 , 
 } , 
  qrButtonText : { 
    color : 'white' , 
    fontWeight : '600' , 
 } , 
  qrContainer : { 
    alignItems : 'center' , 
    marginTop : 15 , 
 } , 
  qrHint : { 
    marginTop : 10 , 
    color : '#666' , 
    fontSize : 12 , 
 } , 
  payButton : { 
    backgroundColor : '#4CD964' , 
    padding : 15 , 
    borderRadius : 8 , 
    alignItems : 'center' , 
 } , 
  payButtonText : { 
    color : 'white' , 
    fontSize : 16 , 
    fontWeight : 'bold' , 
 } , 
  statsCard : { 
    backgroundColor : 'white' , 
    margin : 15 , 
    padding : 20 , 
    borderRadius : 10 , 
    alignItems : 'center' , 
 } , 
  statsTitle : { 
    fontSize : 14 , 
    color : '#666' , 
 } , 
  statsAmount : { 
    fontSize : 32 , 
    fontWeight : 'bold' , 
    color : '#333' , 
    marginVertical : 5 , 
 } , 
  statsSub : { 
    fontSize : 14 , 
    color : '#666' , 
 } , 
  statsCount : { 
    fontSize : 12 , 
    color : '#999' , 
    marginTop : 10 , 
 } , 
 } ) ;