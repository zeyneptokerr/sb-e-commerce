import { useEffect } from "react";
import { useSelector } from "react-redux";
import api from "../../api/api";

const PaymentFailed = () => {
  const user = useSelector((state) => state.auth.user);
  useEffect(() => {
    const restoreCart = async () => {
      const cart = JSON.parse(localStorage.getItem("cartItems") || "[]");
      if (user && cart.length > 0) {
        try {
          await api.post("/cart/create", cart.map(({ productId, quantity }) => ({ productId, quantity })));
        } catch (error) {
          console.error("Failed to restore cart after failed payment", error);
        }
      }
      if (window.self !== window.top) window.top.location.replace(window.location.href);
    };
    restoreCart();
  }, [user]);
    
  return (
    <div className='max-w-md mx-auto p-5 bg-white shadow-md rounded-lg mt-16 border'>
        <h1 className='text-2xl font-semibold mb-4'>Payment Failed</h1>
        
    </div>
  )
}

export default PaymentFailed;