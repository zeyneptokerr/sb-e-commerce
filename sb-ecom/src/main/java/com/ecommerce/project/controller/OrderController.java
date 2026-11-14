package com.ecommerce.project.controller;

import com.ecommerce.project.config.AppConstants;
import com.ecommerce.project.payload.*;
import com.ecommerce.project.service.IyzicoService;
import com.ecommerce.project.service.OrderService;
import com.ecommerce.project.util.AuthUtil;
import com.ecommerce.project.payload.Iyzico3dsInitResponse;
import com.ecommerce.project.payload.Iyzico3dsPaymentRequest;
import com.ecommerce.project.payload.IyzicoInstallmentQueryRequest;
import com.ecommerce.project.payload.IyzicoInstallmentResponse;
import org.springframework.util.MultiValueMap;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;

@RestController
@RequestMapping("/api")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @Autowired
    AuthUtil authUtil;
    @Autowired
    private IyzicoService iyzicoService;

    @Value("${frontend.url}")
    private String frontendUrl;

    @PostMapping("/order/users/payments/{paymentMethod}")
    public ResponseEntity<OrderDTO> orderProducts(@PathVariable String paymentMethod,
                                                  @RequestBody OrderRequestDTO orderRequestDTO) {
        String emailId = authUtil.loggedInEmail();
        OrderDTO order = orderService.placeOrder(emailId,
                orderRequestDTO.getAddressId(),
                paymentMethod,
                orderRequestDTO.getPgName(),
                orderRequestDTO.getPgPaymentId(),
                orderRequestDTO.getPgStatus(),
                orderRequestDTO.getPgResponseMessage());
        return new ResponseEntity<>(order, HttpStatus.CREATED);
    }

    @PostMapping("/order/iyzico-payment")
    public ResponseEntity<Iyzico3dsInitResponse> createIyzicoPayment(
            @RequestBody Iyzico3dsPaymentRequest paymentRequest, HttpServletRequest httpRequest) {
        Iyzico3dsInitResponse response = iyzicoService.initialize3dsPayment(
                authUtil.loggedInEmail(), httpRequest.getRemoteAddr(), paymentRequest);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PostMapping("/order/iyzico-installments")
    public ResponseEntity<IyzicoInstallmentResponse> getIyzicoInstallments(
            @RequestBody IyzicoInstallmentQueryRequest queryRequest) {
        return ResponseEntity.ok(iyzicoService.getInstallmentOptions(authUtil.loggedInEmail(), queryRequest));
    }

    @PostMapping(value = "/order/iyzico-payment-callback", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public RedirectView iyzicoCallBack(@RequestParam MultiValueMap<String, String> callbackParams) {
        IyzicoCallbackResult result = iyzicoService.complete3dsPayment(
                callbackParams.getFirst("status"),
                callbackParams.getFirst("paymentId"),
                callbackParams.getFirst("conversationData"),
                callbackParams.getFirst("conversationId"),
                callbackParams.getFirst("mdStatus"));
        String baseUrl = frontendUrl.replaceAll("/+$", "");
        String targetUrl = result.successful()
                ? baseUrl + "/payment-success?orderId=" + result.orderId()
                : baseUrl + "/payment-failed";

        RedirectView redirectView = new RedirectView(targetUrl);
        redirectView.setStatusCode(HttpStatus.SEE_OTHER);
        return redirectView;
    }

    @GetMapping("/admin/orders")
    public ResponseEntity<OrderResponse> getAllOrders(
            @RequestParam(name = "pageNumber", defaultValue = AppConstants.PAGE_NUMBER, required = false) Integer pageNumber,
            @RequestParam(name = "pageSize", defaultValue = AppConstants.PAGE_SIZE, required = false) Integer pageSize,
            @RequestParam(name = "sortBy", defaultValue = AppConstants.SORT_ORDERS_BY, required = false) String sortBy,
            @RequestParam(name = "sortOrder", defaultValue = AppConstants.SORT_DIR, required = false) String sortOrder
    ) {
        OrderResponse orderResponse = orderService.getAllOrders(pageNumber, pageSize, sortBy, sortOrder);
        return new ResponseEntity<OrderResponse>(orderResponse, HttpStatus.OK);
    }

    @GetMapping("/seller/orders")
    public ResponseEntity<OrderResponse> getAllSellerOrders(
            @RequestParam(name = "pageNumber", defaultValue = AppConstants.PAGE_NUMBER, required = false) Integer pageNumber,
            @RequestParam(name = "pageSize", defaultValue = AppConstants.PAGE_SIZE, required = false) Integer pageSize,
            @RequestParam(name = "sortBy", defaultValue = AppConstants.SORT_ORDERS_BY, required = false) String sortBy,
            @RequestParam(name = "sortOrder", defaultValue = AppConstants.SORT_DIR, required = false) String sortOrder
    ) {
        OrderResponse orderResponse = orderService.getAllSellerOrders(pageNumber, pageSize, sortBy, sortOrder);
        return new ResponseEntity<OrderResponse>(orderResponse, HttpStatus.OK);
    }

    @GetMapping("/orders/users")
    public ResponseEntity<OrderResponse> getUserOrders(
            @RequestParam(name = "pageNumber", defaultValue = AppConstants.PAGE_NUMBER) Integer pageNumber,
            @RequestParam(name = "pageSize", defaultValue = AppConstants.PAGE_SIZE) Integer pageSize
    ) {
        OrderResponse response = orderService.getUserOrders(authUtil.loggedInEmail(), pageNumber, pageSize);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/admin/orders/{orderId}/status")
    public ResponseEntity<OrderDTO> updateOrderStatus(@PathVariable Long orderId,
                                                      @RequestBody OrderStatusUpdateDto orderStatusUpdateDto) {
        OrderDTO order = orderService.updateOrder(orderId, orderStatusUpdateDto.getStatus());
        return new ResponseEntity<OrderDTO>(order, HttpStatus.OK);
    }

    @PutMapping("/seller/orders/{orderId}/status")
    public ResponseEntity<OrderDTO> updateOrderStatusSeller(@PathVariable Long orderId,
                                                      @RequestBody OrderStatusUpdateDto orderStatusUpdateDto) {
        OrderDTO order = orderService.updateOrder(orderId, orderStatusUpdateDto.getStatus());
        return new ResponseEntity<OrderDTO>(order, HttpStatus.OK);
    }
}