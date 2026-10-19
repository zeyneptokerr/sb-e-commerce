package com.ecommerce.project.service;

import com.ecommerce.project.payload.IyzicoCallbackResult;
import com.iyzipay.model.CheckoutFormInitialize;
import com.ecommerce.project.payload.IyzicoPaymentDto;

public interface IyzicoService {
    CheckoutFormInitialize initializeCheckoutForm(String email, IyzicoPaymentDto paymentDto);
    IyzicoCallbackResult retrieveCheckoutFormResult(String token);
}
