package com.ecommerce.project.service;

import com.ecommerce.project.exceptions.APIException;
import com.ecommerce.project.exceptions.ResourceNotFoundException;
import com.ecommerce.project.model.Address;
import com.ecommerce.project.model.Cart;
import com.ecommerce.project.model.CartItem;
import com.ecommerce.project.payload.Iyzico3dsInitResponse;
import com.ecommerce.project.payload.Iyzico3dsPaymentRequest;
import com.ecommerce.project.payload.IyzicoCallbackResult;
import com.ecommerce.project.payload.IyzicoInstallmentOption;
import com.ecommerce.project.payload.IyzicoInstallmentQueryRequest;
import com.ecommerce.project.payload.IyzicoInstallmentResponse;
import com.ecommerce.project.repositories.AddressRepository;
import com.ecommerce.project.repositories.CartRepository;
import com.iyzipay.Options;
import com.iyzipay.model.*;
import com.iyzipay.request.CreatePaymentRequest;
import com.iyzipay.request.CreateThreedsPaymentRequest;
import com.iyzipay.request.RetrieveInstallmentInfoRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class IyzicoServiceImpl implements IyzicoService {

    @Value("${iyzico.api.key}")
    private String iyzicoApiKey;

    @Value("${iyzico.secret.key}")
    private String iyzicoSecretKey;

    @Value("${iyzico.base.url}")
    private String iyzicoBaseUrl;

    @Value("${iyzico.callback.url}")
    private String callbackUrl;

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private AddressRepository addressRepository;

    @Autowired
    private OrderService orderService;

    private static final Logger logger = LoggerFactory.getLogger(IyzicoServiceImpl.class);

    @Override
    public Iyzico3dsInitResponse initialize3dsPayment(String email, String clientIp, Iyzico3dsPaymentRequest paymentRequest) {
        Cart cart = cartRepository.findCartByEmail(email);
        if (cart == null || cart.getCartItems() == null || cart.getCartItems().isEmpty()) {
            throw new APIException("Ödeme için sepet boş.");
        }
        if (paymentRequest == null || paymentRequest.getAddressId() == null) {
            throw new APIException("Teslimat adresi zorunludur.");
        }

        Address address = addressRepository.findById(paymentRequest.getAddressId())
                .orElseThrow(() -> new ResourceNotFoundException("Address", "addressId", paymentRequest.getAddressId()));
        if (address.getUser() == null || !email.equals(address.getUser().getEmail())) {
            throw new APIException("Teslimat adresi kullanıcıya ait değil.");
        }

        validatePaymentInput(paymentRequest, address);
        int selectedInstallment = paymentRequest.getInstallment() == null ? 1 : paymentRequest.getInstallment();
        BigDecimal paidPrice = calculateCartTotal(cart);
        if (selectedInstallment > 1) {
            String binNumber = paymentRequest.getCardNumber().replaceAll("\\s", "").substring(0, 8);
            List<IyzicoInstallmentOption> eligibleOptions = queryInstallmentOptions(binNumber, paidPrice).options();
            IyzicoInstallmentOption selectedOption = eligibleOptions.stream()
                    .filter(option -> option.installmentNumber() == selectedInstallment).findFirst().orElse(null);
            if (selectedOption == null) {
                throw new APIException("Bu kart için seçilen taksit seçeneği kullanılamıyor. Taksitleri yeniden sorgulayın.");
            }
            paidPrice = selectedOption.totalPrice();
        }
        BigDecimal totalPrice = BigDecimal.ZERO;
        List<BasketItem> basketItems = new ArrayList<>();
        for (CartItem cartItem : cart.getCartItems()) {
            BigDecimal itemPrice = BigDecimal.valueOf(cartItem.getProductPrice())
                    .multiply(BigDecimal.valueOf(cartItem.getQuantity()))
                    .setScale(2, RoundingMode.HALF_UP);
            totalPrice = totalPrice.add(itemPrice);

            BasketItem basketItem = new BasketItem();
            basketItem.setId(String.valueOf(cartItem.getProduct().getProductId()));
            basketItem.setName(cartItem.getProduct().getProductName());
            basketItem.setCategory1(cartItem.getProduct().getCategory() != null
                    ? cartItem.getProduct().getCategory().getCategoryName() : "Ürün");
            basketItem.setItemType(BasketItemType.PHYSICAL.name());
            basketItem.setPrice(itemPrice);
            basketItems.add(basketItem);
        }

        Options options = createOptions();
        String conversationId = UUID.randomUUID().toString();
        String fullAddress = String.join(" ", nonBlank(address.getNeighborhood(), address.getStreet(),
                address.getBuildingName(), address.getCity(), address.getState()));
        String[] userNameParts = cart.getUser().getUserName().trim().split("\\s+", 2);
        String buyerName = StringUtils.hasText(address.getFirstName()) ? address.getFirstName() : userNameParts[0];
        String buyerSurname = StringUtils.hasText(address.getLastName()) ? address.getLastName()
                : (userNameParts.length > 1 ? userNameParts[1] : userNameParts[0]);

        PaymentCard paymentCard = new PaymentCard();
        paymentCard.setCardHolderName(paymentRequest.getCardHolderName().trim());
        paymentCard.setCardNumber(paymentRequest.getCardNumber().replaceAll("\\s", ""));
        paymentCard.setExpireMonth(paymentRequest.getExpireMonth());
        paymentCard.setExpireYear(paymentRequest.getExpireYear());
        paymentCard.setCvc(paymentRequest.getCvc());
        paymentCard.setRegisterCard(0);

        Buyer buyer = new Buyer();
        buyer.setId(String.valueOf(cart.getUser().getUserId()));
        buyer.setName(buyerName);
        buyer.setSurname(buyerSurname);
        buyer.setGsmNumber(normalizePhone(address.getPhone()));
        buyer.setEmail(cart.getUser().getEmail());
        buyer.setIdentityNumber(paymentRequest.getIdentityNumber().replaceAll("\\s", ""));
        buyer.setRegistrationAddress(fullAddress);
        buyer.setIp(clientIp);
        buyer.setCity(address.getState());
        buyer.setCountry(address.getCountry());
        buyer.setZipCode(address.getPincode());

        com.iyzipay.model.Address iyzicoAddress = new com.iyzipay.model.Address();
        iyzicoAddress.setContactName(buyerName + " " + buyerSurname);
        iyzicoAddress.setAddress(fullAddress);
        iyzicoAddress.setCity(address.getState());
        iyzicoAddress.setCountry(address.getCountry());
        iyzicoAddress.setZipCode(address.getPincode());

        CreatePaymentRequest request = new CreatePaymentRequest();
        request.setLocale(Locale.TR.getValue());
        request.setConversationId(conversationId);
        request.setPrice(totalPrice);
        request.setPaidPrice(paidPrice);
        request.setCurrency(Currency.TRY.name());
        request.setInstallment(selectedInstallment);
        request.setPaymentChannel("WEB");
        request.setBasketId(String.valueOf(cart.getCartId()));
        request.setPaymentGroup(PaymentGroup.PRODUCT.name());
        request.setCallbackUrl(callbackUrl);
        request.setPaymentCard(paymentCard);
        request.setBuyer(buyer);
        request.setShippingAddress(iyzicoAddress);
        request.setBillingAddress(iyzicoAddress);
        request.setBasketItems(basketItems);

        ThreedsInitialize initResponse = ThreedsInitialize.create(request, options);
        if (initResponse == null || !"success".equalsIgnoreCase(initResponse.getStatus())
                || !StringUtils.hasText(initResponse.getHtmlContent())) {
            String error = initResponse != null && StringUtils.hasText(initResponse.getErrorMessage())
                    ? initResponse.getErrorMessage() : "iyzico 3D Secure işlemi başlatılamadı.";
            logger.warn("iyzico 3DS initialization failed. conversationId={}, errorCode={}",
                    conversationId, initResponse == null ? null : initResponse.getErrorCode());
            throw new APIException(error);
        }

        orderService.createPendingIyzicoOrder(email, address.getAddressId(), conversationId, paidPrice);
        logger.info("iyzico 3DS initialized. conversationId={}", conversationId);
        return new Iyzico3dsInitResponse(initResponse.getHtmlContent());
    }

    @Override
    public IyzicoInstallmentResponse getInstallmentOptions(String email, IyzicoInstallmentQueryRequest queryRequest) {
        Cart cart = cartRepository.findCartByEmail(email);
        if (cart == null || cart.getCartItems() == null || cart.getCartItems().isEmpty()) {
            throw new APIException("Taksit sorgulaması için sepet boş.");
        }
        if (queryRequest == null || queryRequest.getBinNumber() == null
                || !queryRequest.getBinNumber().matches("\\d{8}")) {
            throw new APIException("Taksit sorgulaması için kartın ilk 8 hanesi gereklidir.");
        }
        return queryInstallmentOptions(queryRequest.getBinNumber(), calculateCartTotal(cart));
    }

    private IyzicoInstallmentResponse queryInstallmentOptions(String binNumber, BigDecimal price) {
        RetrieveInstallmentInfoRequest request = new RetrieveInstallmentInfoRequest();
        request.setLocale(Locale.TR.getValue());
        request.setBinNumber(binNumber);
        request.setPrice(price);
        request.setCurrency(Currency.TRY.name());

        InstallmentInfo response = InstallmentInfo.retrieve(request, createOptions());
        if (response == null || !"success".equalsIgnoreCase(response.getStatus())) {
            String message = response != null && StringUtils.hasText(response.getErrorMessage())
                    ? response.getErrorMessage() : "iyzico taksit seçenekleri alınamadı.";
            throw new APIException(message);
        }

        InstallmentDetail detail = response.getInstallmentDetails() == null ? null
                : response.getInstallmentDetails().stream()
                .filter(item -> item.getInstallmentPrices() != null && !item.getInstallmentPrices().isEmpty())
                .findFirst().orElse(null);
        List<IyzicoInstallmentOption> options = new ArrayList<>();
        if (detail != null) {
            detail.getInstallmentPrices().forEach(item -> options.add(new IyzicoInstallmentOption(
                    item.getInstallmentNumber(), item.getInstallmentPrice(), item.getTotalPrice())));
        }
        if (options.stream().noneMatch(option -> option.installmentNumber() == 1)) {
            options.add(new IyzicoInstallmentOption(1, price, price));
        }
        options.sort(java.util.Comparator.comparing(IyzicoInstallmentOption::installmentNumber));
        return new IyzicoInstallmentResponse(
                detail == null ? null : detail.getBankName(),
                detail == null ? null : detail.getCardFamilyName(), options);
    }

    private BigDecimal calculateCartTotal(Cart cart) {
        return cart.getCartItems().stream()
                .map(item -> BigDecimal.valueOf(item.getProductPrice())
                        .multiply(BigDecimal.valueOf(item.getQuantity())).setScale(2, RoundingMode.HALF_UP))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Override
    public IyzicoCallbackResult complete3dsPayment(String status, String paymentId, String conversationData,
                                                   String conversationId, String mdStatus) {
        if (!StringUtils.hasText(conversationId)) {
            logger.warn("iyzico 3DS callback did not include conversationId");
            return new IyzicoCallbackResult(false, null);
        }
        if (!"success".equalsIgnoreCase(status) || !"1".equals(mdStatus) || !StringUtils.hasText(paymentId)) {
            orderService.failIyzicoOrder(conversationId, paymentId, "3D Secure doğrulaması başarısız oldu.");
            return new IyzicoCallbackResult(false, null);
        }

        CreateThreedsPaymentRequest authRequest = new CreateThreedsPaymentRequest();
        authRequest.setLocale(Locale.TR.getValue());
        authRequest.setConversationId(conversationId);
        authRequest.setPaymentId(paymentId);
        if (StringUtils.hasText(conversationData)) authRequest.setConversationData(conversationData);

        ThreedsPayment payment;
        try {
            payment = ThreedsPayment.create(authRequest, createOptions());
        } catch (RuntimeException exception) {
            logger.warn("iyzico 3DS authorization request could not be completed. conversationId={}", conversationId);
            orderService.failIyzicoOrder(conversationId, paymentId, "Ödeme doğrulama isteği tamamlanamadı.");
            return new IyzicoCallbackResult(false, null);
        }
        if (payment != null && "success".equalsIgnoreCase(payment.getStatus())
                && payment.getErrorCode() == null && payment.getErrorMessage() == null
                && payment.getErrorGroup() == null && payment.verifySignature(iyzicoSecretKey)) {
            Long orderId = orderService.completeIyzicoOrder(conversationId, payment.getPaymentId(),
                    String.valueOf(payment.getPaidPrice()), payment.getCurrency(), "Payment successful");
            return new IyzicoCallbackResult(true, orderId);
        }

        String error = payment != null && StringUtils.hasText(payment.getErrorMessage())
                ? payment.getErrorMessage() : "iyzico 3D Secure ödemesi doğrulanamadı.";
        logger.error("iyzico 3DS authorization failed. conversationId={}, paymentId={}, errorCode={}",
                conversationId, paymentId, payment == null ? null : payment.getErrorCode());
        orderService.failIyzicoOrder(conversationId, paymentId, error);
        return new IyzicoCallbackResult(false, null);
    }

    private void validatePaymentInput(Iyzico3dsPaymentRequest request, Address address) {
        if (!StringUtils.hasText(request.getCardHolderName())) throw new APIException("Kart üzerindeki ad soyad zorunludur.");
        String cardNumber = request.getCardNumber() == null ? "" : request.getCardNumber().replaceAll("\\s", "");
        if (!cardNumber.matches("\\d{13,19}")) throw new APIException("Kart numarası geçersiz.");
        if (request.getExpireMonth() == null || !request.getExpireMonth().matches("0[1-9]|1[0-2]")) {
            throw new APIException("Son kullanma ayı geçersiz.");
        }
        if (request.getExpireYear() == null || !request.getExpireYear().matches("\\d{2}|\\d{4}")) {
            throw new APIException("Son kullanma yılı geçersiz.");
        }
        if (request.getCvc() == null || !request.getCvc().matches("\\d{3,4}")) throw new APIException("CVV geçersiz.");
        if (request.getIdentityNumber() == null || !request.getIdentityNumber().replaceAll("\\s", "").matches("\\d{11}")) {
            throw new APIException("T.C. kimlik numarası 11 haneli olmalıdır.");
        }
        int installment = request.getInstallment() == null ? 1 : request.getInstallment();
        if (!List.of(1, 2, 3, 4, 6, 9, 12).contains(installment)) throw new APIException("Taksit seçimi geçersiz.");
        if (!StringUtils.hasText(address.getPhone())) throw new APIException("Teslimat adresinizde telefon numarası bulunmalıdır.");
        if (!StringUtils.hasText(address.getCity()) || !StringUtils.hasText(address.getState()) || !StringUtils.hasText(address.getCountry())) {
            throw new APIException("Teslimat adresinde il, ilçe ve ülke bilgileri bulunmalıdır.");
        }
    }

    private String normalizePhone(String phone) {
        String digits = phone.replaceAll("\\D", "");
        if (digits.startsWith("90")) digits = digits.substring(2);
        if (digits.startsWith("0")) digits = digits.substring(1);
        if (digits.length() != 10) throw new APIException("Teslimat adresindeki telefon numarası geçersiz.");
        return "+90" + digits;
    }

    private List<String> nonBlank(String... values) {
        List<String> parts = new ArrayList<>();
        for (String value : values) if (StringUtils.hasText(value)) parts.add(value.trim());
        return parts;
    }

    private Options createOptions() {
        Options options = new Options();
        options.setApiKey(iyzicoApiKey);
        options.setSecretKey(iyzicoSecretKey);
        options.setBaseUrl(iyzicoBaseUrl);
        return options;
    }
}
