package com.ecommerce.project.service;

import com.iyzipay.Options;
import com.iyzipay.model.Currency;
import com.iyzipay.model.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.iyzipay.model.*;
import com.iyzipay.request.CreateCheckoutFormInitializeRequest;
import com.iyzipay.request.RetrieveCheckoutFormRequest;
import com.ecommerce.project.model.Cart;
import com.ecommerce.project.model.CartItem;
import com.ecommerce.project.payload.AddressDTO;
import com.ecommerce.project.payload.IyzicoPaymentDto;
import com.ecommerce.project.payload.IyzicoCallbackResult;
import com.ecommerce.project.repositories.CartRepository;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.*;


@Service
public class IyzicoServiceImpl implements IyzicoService{

    @Value( "${iyzico.api.key}")
    private String iyzicoApiKey;

    @Value( "${iyzico.secret.key}")
    private String iyzicoSecretKey;

    @Value( "${iyzico.base.url}")
    private String iyzicoBaseUrl;

    @Value("${iyzico.callback.url}")
    private String callbackUrl;

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private OrderService orderService;

    private static final Logger logger = LoggerFactory.getLogger(IyzicoServiceImpl.class);


    @Override
    public CheckoutFormInitialize initializeCheckoutForm(String email, IyzicoPaymentDto paymentDto) {
        Cart cart = cartRepository.findCartByEmail(email);
        if (cart == null || cart.getCartItems() == null || cart.getCartItems().isEmpty()) {
            throw new IllegalStateException("Ödeme için sepet boş.");
        }
        if (paymentDto == null || paymentDto.getAddress() == null) {
            throw new IllegalArgumentException("Teslimat adresi zorunludur.");
        }

        AddressDTO addressDto = paymentDto.getAddress();
        if (addressDto.getAddressId() == null) {
            throw new IllegalArgumentException("Kayıtlı teslimat adresi seçilmelidir.");
        }
        String fullAddress = String.join(" ", Arrays.asList(addressDto.getStreet(), addressDto.getBuildingName(), addressDto.getState())).trim();
        if (!StringUtils.hasText(fullAddress) || !StringUtils.hasText(addressDto.getCity()) || !StringUtils.hasText(addressDto.getCountry()) || !StringUtils.hasText(addressDto.getPincode())) {
            throw new IllegalArgumentException("Adresin sokak, şehir, ülke ve posta kodu alanları zorunludur.");
        }

        BigDecimal totalPrice = BigDecimal.ZERO;
        List<BasketItem> basketItems = new ArrayList<>();
        for (CartItem cartItem : cart.getCartItems()) {
            BigDecimal itemPrice = BigDecimal.valueOf(cartItem.getProductPrice()).multiply(BigDecimal.valueOf(cartItem.getQuantity())).setScale(2, java.math.RoundingMode.HALF_UP);
            totalPrice = totalPrice.add(itemPrice);

            BasketItem basketItem = new BasketItem();
            basketItem.setId(String.valueOf(cartItem.getProduct().getProductId()));
            basketItem.setName(cartItem.getProduct().getProductName());
            basketItem.setCategory1(cartItem.getProduct().getCategory() != null ? cartItem.getProduct().getCategory().getCategoryName() : "Ürün");
            basketItem.setItemType(BasketItemType.PHYSICAL.name());
            basketItem.setPrice(itemPrice);
            basketItems.add(basketItem);
        }

        Options options = new Options();
        options.setApiKey(iyzicoApiKey);
        options.setSecretKey(iyzicoSecretKey);
        options.setBaseUrl(iyzicoBaseUrl);

        CreateCheckoutFormInitializeRequest request = new CreateCheckoutFormInitializeRequest();
        request.setLocale(Locale.TR.getValue());
        String conversationId = UUID.randomUUID().toString();
        request.setConversationId(conversationId);
        request.setPrice(totalPrice);
        request.setPaidPrice(totalPrice);
        request.setCurrency(Currency.TRY.name());
        request.setBasketId(String.valueOf(cart.getCartId()));
        request.setPaymentGroup(PaymentGroup.PRODUCT.name());
        request.setCallbackUrl(callbackUrl);
        request.setDebitCardAllowed(Boolean.TRUE);

        List<Integer> enabledInstallments = Arrays.asList(2, 3, 6, 9);
        request.setEnabledInstallments(enabledInstallments);

        Buyer buyer = new Buyer();
        buyer.setId(String.valueOf(cart.getUser().getUserId()));
        String[] nameParts = cart.getUser().getUserName().trim().split("\\s+", 2);
        buyer.setName(nameParts[0]);
        buyer.setSurname(nameParts.length > 1 ? nameParts[1] : nameParts[0]);
        buyer.setGsmNumber("+905000000000"); // Telefon ve kimlik no kullanıcı profilinde tutulmuyor.
        buyer.setEmail(cart.getUser().getEmail());
        buyer.setIdentityNumber("11111111111"); // iyzico sandbox test kimlik numarası
        buyer.setRegistrationAddress(fullAddress);
        buyer.setIp("127.0.0.1");
        buyer.setCity(addressDto.getCity());
        buyer.setCountry(addressDto.getCountry());
        buyer.setZipCode(addressDto.getPincode());
        request.setBuyer(buyer);

        Address shippingAddress = toIyzicoAddress(addressDto, cart.getUser().getUserName());
        request.setShippingAddress(shippingAddress);
        request.setBillingAddress(toIyzicoAddress(addressDto, cart.getUser().getUserName()));
        request.setBasketItems(basketItems);

        CheckoutFormInitialize checkoutFormInitialize = CheckoutFormInitialize.create(request, options);

        if ("success".equalsIgnoreCase(checkoutFormInitialize.getStatus()) && StringUtils.hasText(checkoutFormInitialize.getToken())) {
            orderService.createPendingIyzicoOrder(email, addressDto.getAddressId(), checkoutFormInitialize.getToken());
        }

        logger.info("iyzico checkout initialized. conversationId={}, status={}", conversationId, checkoutFormInitialize.getStatus());

        return checkoutFormInitialize;
    }

    private Address toIyzicoAddress(AddressDTO source, String contactName) {
        Address address = new Address();
        address.setContactName(contactName);
        address.setCity(source.getCity());
        address.setCountry(source.getCountry());
        address.setAddress(String.join(" ", Arrays.asList(source.getStreet(), source.getBuildingName(), source.getState())).trim());
        address.setZipCode(source.getPincode());
        return address;
    }

    @Override
    public IyzicoCallbackResult retrieveCheckoutFormResult(String token) {
        Options options = new Options();
        options.setApiKey(iyzicoApiKey);
        options.setSecretKey(iyzicoSecretKey);
        options.setBaseUrl(iyzicoBaseUrl);

        RetrieveCheckoutFormRequest request = new RetrieveCheckoutFormRequest();
        request.setToken(token);
        CheckoutForm checkoutForm = CheckoutForm.retrieve(request, options);

        if ("success".equals(checkoutForm.getStatus()) && checkoutForm.getErrorCode() == null && checkoutForm.getErrorMessage() == null && checkoutForm.getErrorGroup() == null) {
            Long orderId = orderService.completeIyzicoOrder(token, checkoutForm.getPaymentId(), String.valueOf(checkoutForm.getPaidPrice()), checkoutForm.getCurrency(), "Payment successful");
            return new IyzicoCallbackResult(true, orderId);
        }

        String errorMessage = checkoutForm.getErrorMessage();
        logger.error("Iyzico payment failed. code={}, group={}, message={}", checkoutForm.getErrorCode(), checkoutForm.getErrorGroup(), errorMessage);
        orderService.failIyzicoOrder(token, checkoutForm.getPaymentId(), StringUtils.hasText(errorMessage) ? errorMessage : "Payment failed");
        return new IyzicoCallbackResult(false, null);
    }
}
