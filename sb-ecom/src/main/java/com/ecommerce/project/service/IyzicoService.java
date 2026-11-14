package com.ecommerce.project.service;

import com.ecommerce.project.payload.Iyzico3dsInitResponse;
import com.ecommerce.project.payload.Iyzico3dsPaymentRequest;
import com.ecommerce.project.payload.IyzicoCallbackResult;
import com.ecommerce.project.payload.IyzicoInstallmentQueryRequest;
import com.ecommerce.project.payload.IyzicoInstallmentResponse;

public interface IyzicoService {
    Iyzico3dsInitResponse initialize3dsPayment(String email, String clientIp, Iyzico3dsPaymentRequest paymentRequest);
    IyzicoInstallmentResponse getInstallmentOptions(String email, IyzicoInstallmentQueryRequest queryRequest);
    IyzicoCallbackResult complete3dsPayment(String status, String paymentId, String conversationData,
                                            String conversationId, String mdStatus);
}
