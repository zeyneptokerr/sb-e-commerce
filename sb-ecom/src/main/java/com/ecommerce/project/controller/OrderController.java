package com.ecommerce.project.controller;

import com.ecommerce.project.payload.IyzicoPaymentDto;
import com.ecommerce.project.payload.OrderDTO;
import com.ecommerce.project.payload.OrderRequestDTO;
import com.ecommerce.project.service.IyzicoService;
import com.ecommerce.project.service.OrderService;
import com.ecommerce.project.util.AuthUtil;
import com.iyzipay.model.CheckoutForm;
import com.iyzipay.model.CheckoutFormInitialize;
import org.springframework.beans.factory.annotation.Autowired;
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
    public ResponseEntity<CheckoutFormInitialize> createIyzicoPayment(@RequestBody IyzicoPaymentDto iyzicoPaymentDto) {
        CheckoutFormInitialize checkoutFormInitialize = iyzicoService.initializeCheckoutForm();
        return new ResponseEntity<>(checkoutFormInitialize, HttpStatus.CREATED);
    }

    @PostMapping(value = "/order/iyzico-payment-callback", produces = MediaType.TEXT_HTML_VALUE)
    public RedirectView iyzicoCallBack(@RequestParam("token") String token) {
        String status = iyzicoService.retrieveCheckoutFormResult(token);

        if (status.equals("success")) {
            /*return """
            <!DOCTYPE html>
            <html>
            <body>
                <script>
                    window.parent.postMessage(
                        { type: 'IYZICO_PAYMENT_SUCCESS' },
                        '*'
                    );
                </script>
                Ödeme başarılı.
            </body>
            </html>
            """;*/
            return new RedirectView(
                    "http://localhost:5173/payment-success"
            );
        }
        return new RedirectView(
                "http://localhost:5173/payment-success"
        );/*"""
        <!DOCTYPE html>
        <html>
        <body>
            <script>
                window.parent.postMessage(
                    { type: 'IYZICO_PAYMENT_FAILED' },
                    '*'
                );
            </script>
            Ödeme başarısız.
        </body>
        </html>
        """;*/
    }
}