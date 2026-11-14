package com.ecommerce.project.payload;

import java.math.BigDecimal;

public record IyzicoInstallmentOption(Integer installmentNumber, BigDecimal installmentPrice,
                                      BigDecimal totalPrice) {
}
