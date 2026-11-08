package com.ecommerce.project.payload;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class ProductCommentDTO {
    private Long commentId;
    private Long userId;
    private String userName;
    private Long sellerId;
    private String sellerName;
    private Long productId;
    private Long deliveryNo;
    private LocalDateTime createdAt;
    private String commentText;
    private List<String> images;
}
