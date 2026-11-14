import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FaCheck } from "react-icons/fa";
import api from "../../api/api";

const PaymentSuccess = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  useEffect(() => {
    let active = true;
    const restoreUnselectedItems = async () => {
      let cart = [];
      try {
        cart = JSON.parse(localStorage.getItem("cartItems") || "[]");
      } catch {
        localStorage.removeItem("cartItems");
      }
      const remainingItems = cart.filter((item) => item.selected === false);
      localStorage.setItem("cartItems", JSON.stringify(remainingItems));
      dispatch({ type: "SET_CART_ITEMS", payload: remainingItems });
      localStorage.removeItem("CHECKOUT_ADDRESS");

      if (user) {
        try {
          await api.post("/cart/create", remainingItems.map(({ productId, quantity }) => ({ productId, quantity })));
        } catch (error) {
          console.error("Failed to restore unselected cart items", error);
        }
      }
    };

    setShowSuccessPopup(true);
    restoreUnselectedItems();
    const redirectTimer = window.setTimeout(() => {
      if (active) navigate("/", { replace: true });
    }, 2500);

    return () => {
      active = false;
      window.clearTimeout(redirectTimer);
    };
  }, [dispatch, navigate, user]);

  return (
    <main className="min-h-[60vh]">
      {showSuccessPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 px-4" role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-success-title"
            className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-2xl"
          >
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <FaCheck size={30} />
            </div>
            <h1 id="payment-success-title" className="text-xl font-bold text-slate-900">
              Siparişiniz başarılı bir şekilde alınmıştır.
            </h1>
            <p className="mt-3 text-sm text-slate-500">Ana sayfaya yönlendiriliyorsunuz…</p>
            <div className="mx-auto mt-5 h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-full origin-left animate-[success-progress_2.5s_linear_forwards] rounded-full bg-emerald-500" />
            </div>
          </section>
        </div>
      )}
      <style>{`@keyframes success-progress { from { transform: scaleX(1); } to { transform: scaleX(0); } }`}</style>
    </main>
  );
};

export default PaymentSuccess;