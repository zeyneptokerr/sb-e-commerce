package com.ecommerce.project.repositories;

import com.ecommerce.project.model.ProductComment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductCommentRepository extends JpaRepository<ProductComment, Long> {
    boolean existsByUser_UserIdAndDelivery_OrderIdAndProduct_ProductId(Long userId, Long deliveryNo, Long productId);
    List<ProductComment> findByProduct_ProductIdOrderByCreatedAtDesc(Long productId);
    List<ProductComment> findByDelivery_OrderIdOrderByCreatedAtDesc(Long deliveryNo);
}
