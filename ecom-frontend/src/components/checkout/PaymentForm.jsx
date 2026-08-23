import { Skeleton } from '@mui/material';
import React from 'react'
import { useState } from 'react';
import { useSelector } from 'react-redux';

const PaymentForm = ({ totalPrice }) => {
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        // if (!stripe || !elements) {
        //     return;
        // }

        const { error: submitError } = await elements.submit();

        if (error) {
            setErrorMessage(error.message);
            return false;
        }
    };

    const paymentElementOptions = {
        layout: "tabs",
    }

    const isLoading = false;

  return (
    <form onSubmit={handleSubmit} className='max-w-lg mx-auto p-4'>
        <h2 className='text-xl font-semibold mb-4'>Payment Information</h2>
        {isLoading ? (
            <Skeleton />
        ) : (
            <>
            {/* izico formu ekle html */}
            {errorMessage && (
                <div className='text-red-500 mt-2'>{errorMessage}</div>
            )}

            <button
                className='text-white w-full px-5 py-[10px] bg-black mt-2 rounded-md font-bold disabled:opacity-50 disabled:animate-pulse'
                disabled={isLoading}>
                    {!isLoading ? `Pay $${Number(totalPrice).toFixed(2)}`
                            : "Processing"}
            </button>
            </>
        )}
    </form>
  )
}

export default PaymentForm;