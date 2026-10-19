package com.ecommerce.project.service;

import com.ecommerce.project.exceptions.APIException;
import com.ecommerce.project.exceptions.ResourceNotFoundException;
import com.ecommerce.project.model.*;
import com.ecommerce.project.payload.OrderDTO;
import com.ecommerce.project.payload.OrderItemDTO;
import com.ecommerce.project.payload.OrderResponse;
import com.ecommerce.project.repositories.*;
import com.ecommerce.project.util.AuthUtil;
import jakarta.transaction.Transactional;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class OrderServiceImpl implements OrderService{

    @Autowired
    CartRepository cartRepository;

    @Autowired
    AddressRepository addressRepository;

    @Autowired
    PaymentRepository paymentRepository;

    @Autowired
    OrderRepository orderRepository;

    @Autowired
    OrderItemRepository orderItemRepository;

    @Autowired
    ProductRepository productRepository;

    @Autowired
    CartService cartService;

    @Autowired
    ModelMapper modelMapper;

    @Autowired
    AuthUtil authUtil;

    @Transactional
    @Override
    public OrderDTO placeOrder(String emailId, Long addressId, String paymentMethod, String pgName, String pgPaymentId, String pgStatus, String pgResponseMessage) {
        Cart cart = cartRepository.findCartByEmail(emailId);
        if (cart == null) {
            throw new ResourceNotFoundException("Cart", "emailId", emailId);
        }

        Address address = addressRepository.findById(addressId).orElseThrow(() -> new ResourceNotFoundException("Address", "addressId", addressId));

        Order order = new Order();
        order.setEmail(emailId);
        order.setOrderDate(LocalDate.now());
        order.setTotalAmount(cart.getTotalPrice());
        order.setOrderStatus("Accepted");
        order.setAddress(address);

        Payment payment = new Payment(paymentMethod, pgPaymentId, pgStatus, pgResponseMessage, pgName);
        payment.setOrder(order);
        payment = paymentRepository.save(payment);
        order.setPayment(payment);

        Order savedOrder = orderRepository.save(order);

        List<CartItem> cartItems = cart.getCartItems();
        if (cartItems.isEmpty()) {
            throw new APIException("Cart is empty.");
        }

        List<OrderItem> orderItems = new ArrayList<>();
        for (CartItem cartItem : cartItems) {
            OrderItem orderItem = new OrderItem();
            orderItem.setProduct(cartItem.getProduct());
            orderItem.setQuantity(cartItem.getQuantity());
            orderItem.setDiscount(cartItem.getDiscount());
            orderItem.setOrderedProductPrice(cartItem.getProductPrice());
            orderItem.setOrder(savedOrder);
            orderItems.add(orderItem);
        }

        orderItems = orderItemRepository.saveAll(orderItems);

        cart.getCartItems().forEach(item -> {
            int quantity = item.getQuantity();
            Product product = item.getProduct();
            product.setQuantity(product.getQuantity() - quantity);
            productRepository.save(product);

            cartService.deleteProductFromCart(cart.getCartId(), item.getProduct().getProductId());
        });

        OrderDTO orderDTO = modelMapper.map(savedOrder, OrderDTO.class);
        orderItems.forEach(item -> orderDTO.getOrderItems().add(modelMapper.map(item, OrderItemDTO.class)));

        orderDTO.setAddressId(addressId);

        return orderDTO;
    }

    @Transactional
    @Override
    public void createPendingIyzicoOrder(String emailId, Long addressId, String iyzicoToken) {
        Cart cart = cartRepository.findCartByEmail(emailId);
        if (cart == null || cart.getCartItems() == null || cart.getCartItems().isEmpty()) {
            throw new APIException("Cart is empty.");
        }

        Address address = addressRepository.findById(addressId).orElseThrow(() -> new ResourceNotFoundException("Address", "addressId", addressId));
        if (address.getUser() == null || !emailId.equals(address.getUser().getEmail())) {
            throw new APIException("Address does not belong to the current user.");
        }

        Payment payment = new Payment("iyzico", null, "PENDING", "Payment is awaiting confirmation", "iyzico");
        payment.setIyzicoToken(iyzicoToken);
        payment = paymentRepository.save(payment);

        Order order = new Order();
        order.setEmail(emailId);
        order.setOrderDate(LocalDate.now());
        order.setTotalAmount(cart.getTotalPrice());
        order.setOrderStatus("Payment Pending");
        order.setAddress(address);
        order.setPayment(payment);
        payment.setOrder(order);
        Order savedOrder = orderRepository.save(order);

        List<OrderItem> orderItems = cart.getCartItems().stream().map(cartItem -> {
            OrderItem orderItem = new OrderItem();
            orderItem.setProduct(cartItem.getProduct());
            orderItem.setQuantity(cartItem.getQuantity());
            orderItem.setDiscount(cartItem.getDiscount());
            orderItem.setOrderedProductPrice(cartItem.getProductPrice());
            orderItem.setOrder(savedOrder);
            return orderItem;
        }).toList();
        orderItemRepository.saveAll(orderItems);
    }

    @Transactional
    @Override
    public Long completeIyzicoOrder(String iyzicoToken, String pgPaymentId, String paidPrice, String currency, String responseMessage) {
        Payment payment = paymentRepository.findByIyzicoToken(iyzicoToken).orElseThrow(() -> new ResourceNotFoundException("Payment", "iyzicoToken", iyzicoToken));
        Order order = payment.getOrder();
        if (order == null) {
            throw new APIException("No order is associated with this payment.");
        }

        // Callback retries must not deduct inventory or create another order.
        if ("SUCCESS".equalsIgnoreCase(payment.getPgStatus())) {
            return order.getOrderId();
        }

        double paidAmount;
        try {
            paidAmount = Double.parseDouble(paidPrice);
        } catch (NumberFormatException exception) {
            throw new APIException("Iyzico returned an invalid paid amount.");
        }
        if (Math.abs(paidAmount - order.getTotalAmount()) > 0.01 || !"TRY".equalsIgnoreCase(currency)) {
            throw new APIException("Iyzico payment amount or currency does not match the order.");
        }

        for (OrderItem orderItem : order.getOrderItems()) {
            Product product = orderItem.getProduct();
            if (product == null || product.getQuantity() < orderItem.getQuantity()) {
                throw new APIException("Insufficient stock to complete this order.");
            }
            product.setQuantity(product.getQuantity() - orderItem.getQuantity());
            productRepository.save(product);
        }

        payment.setPgPaymentId(pgPaymentId);
        payment.setPgStatus("SUCCESS");
        payment.setPgResponseMessage(responseMessage);
        paymentRepository.save(payment);
        order.setOrderStatus("Accepted");
        orderRepository.save(order);

        Cart cart = cartRepository.findCartByEmail(order.getEmail());
        if (cart != null) {
            order.getOrderItems().forEach(item -> cartService.deleteProductFromCart(cart.getCartId(), item.getProduct().getProductId()));
        }
        return order.getOrderId();
    }

    @Transactional
    @Override
    public void failIyzicoOrder(String iyzicoToken, String pgPaymentId, String responseMessage) {
        paymentRepository.findByIyzicoToken(iyzicoToken).ifPresent(payment -> {
            if (!"SUCCESS".equalsIgnoreCase(payment.getPgStatus())) {
                payment.setPgPaymentId(pgPaymentId);
                payment.setPgStatus("FAILED");
                payment.setPgResponseMessage(responseMessage);
                paymentRepository.save(payment);
                if (payment.getOrder() != null) {
                    payment.getOrder().setOrderStatus("Payment Failed");
                    orderRepository.save(payment.getOrder());
                }
            }
        });
    }

    @Override
    public OrderResponse getAllOrders(Integer pageNumber, Integer pageSize, String sortBy, String sortOrder) {
        Sort sortByAndOrder = sortOrder.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageDetails = PageRequest.of(pageNumber, pageSize, sortByAndOrder);
        Page<Order> pageOrders = orderRepository.findAll(pageDetails);
        List<Order> orders = pageOrders.getContent();
        List<OrderDTO> orderDTOs = orders.stream().map(order -> modelMapper.map(order, OrderDTO.class)).toList();
        OrderResponse orderResponse = new OrderResponse();
        orderResponse.setContent(orderDTOs);
        orderResponse.setPageNumber(pageOrders.getNumber());
        orderResponse.setPageSize(pageOrders.getSize());
        orderResponse.setTotalElements(pageOrders.getTotalElements());
        orderResponse.setTotalPages(pageOrders.getTotalPages());
        orderResponse.setLastPage(pageOrders.isLast());
        return orderResponse;
    }

    @Transactional
    @Override
    public OrderResponse getUserOrders(String email, Integer pageNumber, Integer pageSize) {
        Pageable pageDetails = PageRequest.of(pageNumber, pageSize);
        Page<Order> pageOrders = orderRepository.findByEmailOrderByOrderDateDescOrderIdDesc(email, pageDetails);

        List<OrderDTO> orderDTOs = pageOrders.getContent().stream().map(order -> modelMapper.map(order, OrderDTO.class)).toList();

        OrderResponse response = new OrderResponse();
        response.setContent(orderDTOs);
        response.setPageNumber(pageOrders.getNumber());
        response.setPageSize(pageOrders.getSize());
        response.setTotalElements(pageOrders.getTotalElements());
        response.setTotalPages(pageOrders.getTotalPages());
        response.setLastPage(pageOrders.isLast());
        return response;
    }

    @Override
    public OrderDTO updateOrder(Long orderId, String status) {
        Order order = orderRepository.findById(orderId).orElseThrow(() -> new ResourceNotFoundException("Order","orderId",orderId));
        order.setOrderStatus(status);
        orderRepository.save(order);
        return modelMapper.map(order, OrderDTO.class);
    }

    @Override
    public OrderResponse getAllSellerOrders(Integer pageNumber, Integer pageSize, String sortBy, String sortOrder) {
        Sort sortByAndOrder = sortOrder.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageDetails = PageRequest.of(pageNumber, pageSize, sortByAndOrder);
        User seller = authUtil.loggedInUser();
        Page<Order> pageOrders = orderRepository.findAll(pageDetails);
        List<Order> sellerOrders = pageOrders.getContent().stream().filter(order -> order.getOrderItems().stream().anyMatch(
                orderItem -> {
                    var product = orderItem.getProduct();
                    if (product == null || product.getUser() == null) {
                        return false;
                    }
                    return product.getUser().getUserId().equals(seller.getUserId());
                })).toList();

        List<OrderDTO> orderDTOs = sellerOrders.stream().map(order -> modelMapper.map(order, OrderDTO.class)).toList();
        OrderResponse orderResponse = new OrderResponse();
        orderResponse.setContent(orderDTOs);
        orderResponse.setPageNumber(pageOrders.getNumber());
        orderResponse.setPageSize(pageOrders.getSize());
        orderResponse.setTotalElements(pageOrders.getTotalElements());
        orderResponse.setTotalPages(pageOrders.getTotalPages());
        orderResponse.setLastPage(pageOrders.isLast());
        return orderResponse;
    }
}
