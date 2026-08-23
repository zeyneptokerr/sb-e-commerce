package com.ecommerce.project.service;

import com.iyzipay.model.CheckoutFormInitialize;

public interface IyzicoService {
    CheckoutFormInitialize initializeCheckoutForm();
    String retrieveCheckoutFormResult(String token);
}
