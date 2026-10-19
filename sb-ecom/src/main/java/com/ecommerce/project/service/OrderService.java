package com.ecommerce.project.service;

import com.ecommerce.project.payload.OrderDTO;
import com.ecommerce.project.payload.OrderResponse;
import jakarta.transaction.Transactional;

public interface OrderService {
    @Transactional
    OrderDTO placeOrder(String emailId, Long addressId, String paymentMethod, String pgName, String pgPaymentId, String pgStatus, String pgResponseMessage);

    void createPendingIyzicoOrder(String emailId, Long addressId, String iyzicoToken);

    Long completeIyzicoOrder(String iyzicoToken, String pgPaymentId, String paidPrice, String currency, String responseMessage);

    void failIyzicoOrder(String iyzicoToken, String pgPaymentId, String responseMessage);

    OrderResponse getAllOrders(Integer pageNumber, Integer pageSize, String sortBy, String sortOrder);

    OrderResponse getUserOrders(String email, Integer pageNumber, Integer pageSize);

    OrderDTO updateOrder(Long orderId, String status);

    OrderResponse getAllSellerOrders(Integer pageNumber, Integer pageSize, String sortBy, String sortOrder);
}
