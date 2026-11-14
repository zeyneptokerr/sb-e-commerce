package com.ecommerce.project.payload;

import java.util.List;

public record IyzicoInstallmentResponse(String bankName, String cardFamilyName,
                                        List<IyzicoInstallmentOption> options) {
}
