import React, { useEffect, useMemo, useState } from 'react'
import AddressInfo from './AddressInfo';
import { useDispatch, useSelector } from 'react-redux';
import { createUserCart, getUserAddresses } from '../../store/actions';
import Skeleton from '../shared/Skeleton';
import ErrorPage from '../shared/ErrorPage';
import IzicoPayment from './IzicoPayment';

const Checkout = () => {
    const [cartReady, setCartReady] = useState(false);
    const [addressesLoaded, setAddressesLoaded] = useState(false);
    const dispatch = useDispatch();
    const { errorMessage } = useSelector((state) => state.errors);
    const { cart } = useSelector((state) => state.carts);
    const selectedCart = useMemo(() => cart.filter((item) => item.selected !== false), [cart]);
    const selectedTotal = selectedCart.reduce((sum, item) => sum + Number(item.specialPrice ?? item.price) * Number(item.quantity), 0);
    const selectedCartKey = selectedCart.map((item) => `${item.productId}:${item.quantity}`).join(",");
    const { address, selectedUserCheckoutAddress } = useSelector(
        (state) => state.auth
    )
    useEffect(() => {
        let active = true;
        dispatch(getUserAddresses()).finally(() => {
            if (active) setAddressesLoaded(true);
        });
        return () => { active = false; };
    }, [dispatch]);

    useEffect(() => {
        let active = true;
        if (!selectedCart.length) {
            setCartReady(false);
            return () => { active = false; };
        }
        setCartReady(false);
        dispatch(createUserCart(selectedCart.map(({ productId, quantity }) => ({ productId, quantity }))))
            .then((success) => {
                if (!active) return;
                setCartReady(success);
                if (success) dispatch({ type: "IS_SUCCESS" });
            });
        return () => { active = false; };
    }, [dispatch, selectedCartKey, selectedCart]);

  return (
    <main className='min-h-[calc(100vh-100px)] bg-slate-50 py-8'>
        {!addressesLoaded ? (
            <div className='mx-auto max-w-6xl px-4 py-5'><Skeleton /></div>
        ) : selectedCart.length === 0 ? (
            <div className='mx-auto max-w-6xl px-4'>
                <p className='rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-600'>Satın almak için sepetinizden ürün seçin.</p>
            </div>
        ) : (
            <div className='mx-auto max-w-6xl space-y-6 px-4'>
                <AddressInfo address={address} cart={selectedCart} total={selectedTotal} />
                <IzicoPayment enabled={cartReady && !!selectedUserCheckoutAddress && selectedCart.length > 0} />
            </div>
        )}
        {errorMessage && <div className='mx-auto mt-4 max-w-6xl px-4'><ErrorPage message={errorMessage} /></div>}
    </main>
  );
}

export default Checkout;