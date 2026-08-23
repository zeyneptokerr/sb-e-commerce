import { useDispatch } from "react-redux";

const PaymentSuccess = () => {

  const dispatch = useDispatch();
  localStorage.removeItem("cartItems");
  localStorage.removeItem("CHECKOUT_ADDRESS");
  dispatch({ type: "CLEAR_CART"});
    
  return (
    <div className='max-w-md mx-auto p-5 bg-white shadow-md rounded-lg mt-16 border'>
        <h1 className='text-2xl font-semibold mb-4'>Payment Success</h1>
        
    </div>
  )
}

export default PaymentSuccess;