import React, { useEffect, useMemo, useRef } from 'react';
import { Skeleton } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { createIzicoPayment } from '../../store/actions';

const IzicoPayment = () => {
  const dispatch = useDispatch();
  const { totalPrice } = useSelector((state) => state.carts);
  const { errorMessage } = useSelector((state) => state.errors);
  const { user, selectedUserCheckoutAddress } = useSelector((state) => state.auth);
  const paymentIzico = useSelector((state) => state.paymentIzico.payload);
  const requestedPayment = useRef(null);
  const [isIframeLoading, setIsIframeLoading] = React.useState(true);

  const requestKey = `${user?.email ?? ''}:${selectedUserCheckoutAddress?.addressId ?? ''}:${totalPrice}`;

  useEffect(() => {
    if (!user || !selectedUserCheckoutAddress || requestedPayment.current === requestKey) return;
    requestedPayment.current = requestKey;

    const sendData = {
      amount: Number(totalPrice) * 100,
      currency: 'tr',
      email: user.email,
      name: user.username,
      address: selectedUserCheckoutAddress,
    };
    dispatch(createIzicoPayment(sendData));
  }, [dispatch, requestKey, totalPrice, user, selectedUserCheckoutAddress]);

  const iframeUrl = useMemo(() => {
    if (!paymentIzico?.paymentPageUrl) return '';

    const url = new URL(paymentIzico.paymentPageUrl);
    url.searchParams.set('iframe', 'true');
    return url.toString();
  }, [paymentIzico?.paymentPageUrl]);

  useEffect(() => {
    if (iframeUrl) setIsIframeLoading(true);
  }, [iframeUrl]);

  return (
    <section className="mx-auto w-full max-w-4xl px-4 pb-28">
      <h1 className="mb-4 text-xl font-semibold">Güvenli ödeme</h1>
      {errorMessage ? (
        <p role="alert" className="rounded-md bg-red-50 p-4 text-red-700">
          {errorMessage}
        </p>
      ) : iframeUrl ? (
        <div className="relative">
          {isIframeLoading && (
            <Skeleton
              variant="rectangular"
              animation="wave"
              className="absolute inset-0 z-10"
              sx={{ height: 760, borderRadius: 1 }}
            />
          )}
          <iframe
            src={iframeUrl}
            title="iyzico ödeme formu"
            className={`w-full rounded-md border border-slate-200 bg-white ${
              isIframeLoading ? 'invisible' : 'visible'
            }`}
            style={{ height: '760px' }}
            allow="payment"
            onLoad={() => setIsIframeLoading(false)}
          />
        </div>
      ) : (
        <div role="status" aria-label="Ödeme formu yükleniyor">
          <Skeleton variant="rectangular" animation="wave" height={760} sx={{ borderRadius: 1 }} />
        </div>
      )}
    </section>
  );
};

export default IzicoPayment;