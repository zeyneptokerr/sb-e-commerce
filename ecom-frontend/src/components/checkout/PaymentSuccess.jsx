import { useEffect } from "react";
import { useDispatch } from "react-redux";

const PaymentSuccess = () => {

  const dispatch = useDispatch();
  useEffect(() => {
    localStorage.removeItem("cartItems");
    localStorage.removeItem("CHECKOUT_ADDRESS");
    dispatch({ type: "CLEAR_CART" });

    // The callback redirects inside the payment iframe. Once this same-origin
    // result page loads, move the top-level checkout window to the result page.
    if (window.self !== window.top) {
      window.top.location.replace(window.location.href);
    }
  }, [dispatch]);
    
  return (
    <div className='max-w-md mx-auto p-5 bg-white shadow-md rounded-lg mt-16 border'>
        <h1 className='text-2xl font-semibold mb-4'>Payment Success</h1>
        
    </div>
  )
}

export default PaymentSuccess;