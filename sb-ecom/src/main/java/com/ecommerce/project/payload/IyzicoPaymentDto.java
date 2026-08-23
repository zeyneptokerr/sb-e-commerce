package com.ecommerce.project.payload;

import com.iyzipay.model.Address;
import com.iyzipay.model.BasketItem;
import com.iyzipay.model.Buyer;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class IyzicoPaymentDto {

//    private BigDecimal price;
//    private BigDecimal paidPrice;
//    private String basketId;
//    private String paymentGroup;
//    private String paymentSource;
//    private String currency;
//    private Buyer buyer;
//    private Address shippingAddress;
//    private Address billingAddress;
//    private List<BasketItem> basketItems;
//    private String callbackUrl;
//    private Integer forceThreeDS;
//    private String cardUserKey;
//    private String posOrderId;
//    private List<Integer> enabledInstallments;
//    private Boolean paymentWithNewCardEnabled;
//    private Boolean debitCardAllowed;
//    private Boolean subscriptionPaymentEnabled;
//    private Boolean payWithIyzico;
//    private Boolean shippingAmountExcluded;
    private String userName;
    private String email;
    private Integer amount;
    private String currency;
    private AddressDTO address;
}
