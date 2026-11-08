package com.ecommerce.project.repositories;

import com.ecommerce.project.model.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem,Long> {
    Optional<OrderItem> findByOrder_OrderIdAndProduct_ProductId(Long orderId, Long productId);
}
