import { Alert, AlertTitle, Skeleton } from '@mui/material'
import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import PaymentForm from './PaymentForm';
import { createIzicoPayment } from '../../store/actions';
import { useNavigate } from "react-router-dom";

const IzicoPayment = () => {
  const dispatch = useDispatch();
  const { totalPrice } = useSelector((state) => state.carts);
  const { isLoading, errorMessage } = useSelector((state) => state.errors);
  const { user, selectedUserCheckoutAddress } = useSelector((state) => state.auth);
  const paymentIzico = useSelector((state) => state.paymentIzico.payload);
  const navigate = useNavigate();

  useEffect(() => {
    const sendData = {
      amount: Number(totalPrice) * 100,
      currency: "tr",
      email: user.email,
      name: user.username,
      address: selectedUserCheckoutAddress,
    };
    dispatch(createIzicoPayment(sendData));
  }, [dispatch, totalPrice, user, selectedUserCheckoutAddress]);

  useEffect(() => {
    if (paymentIzico?.paymentPageUrl) {
        window.location.href = paymentIzico.paymentPageUrl;
    }
  }, [paymentIzico]);

  // useEffect(() => {
  //   const handleMessage = (event) => {

  //       if (event.data?.type === "IYZICO_PAYMENT_SUCCESS") {
  //           navigate("/payment-success");
  //       }

  //       if (event.data?.type === "IYZICO_PAYMENT_FAILED") {
  //           navigate("/payment-failed");
  //       }
  //   };

  //   window.addEventListener("message", handleMessage);

  //   return () => {
  //       window.removeEventListener("message", handleMessage);
  //   };
  // }, [navigate]);

  if (isLoading) {
    return (
      <div className='max-w-lg mx-auto'>
        <Skeleton />
      </div>
    )
  }

  // const iframeUrl = paymentIzico?.paymentPageUrl
  //       ? `${paymentIzico?.paymentPageUrl}${paymentIzico?.paymentPageUrl.includes("?") ? "&" : "?"}iframe=true`
  //       : "";

  return (
    // <div
    //   style={{
    //       width: "100%",
    //       maxWidth: "1000px",
    //       margin: "30px auto",
    //   }}
    // >
    //   {iframeUrl ? (
    //     <iframe
    //       src={iframeUrl}
    //       title="iyzico Ödeme Formu"
    //       style={{
    //           width: "100%",
    //           height: "750px",
    //           border: "none",
    //       }}
    //       allow="payment"
    //     />
    //   ) : (
    //       <p>Ödeme ekranı oluşturulamadı.</p>
    //   )}
    // </div>
    <div>
      <p>deneme</p>
    </div>
  )
}

export default IzicoPayment;