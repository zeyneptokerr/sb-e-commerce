package com.ecommerce.project.service;

import com.ecommerce.project.exceptions.APIException;
import com.ecommerce.project.exceptions.ResourceNotFoundException;
import com.ecommerce.project.model.*;
import com.ecommerce.project.payload.ProductCommentDTO;
import com.ecommerce.project.repositories.OrderItemRepository;
import com.ecommerce.project.repositories.OrderRepository;
import com.ecommerce.project.repositories.ProductCommentRepository;
import com.ecommerce.project.util.AuthUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class ProductCommentService {
    private final ProductCommentRepository commentRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final AuthUtil authUtil;
    private final FileService fileService;

    @Value("${project.image}")
    private String imageDirectory;

    public ProductCommentService(ProductCommentRepository commentRepository,
                                 OrderRepository orderRepository,
                                 OrderItemRepository orderItemRepository,
                                 AuthUtil authUtil,
                                 FileService fileService) {
        this.commentRepository = commentRepository;
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.authUtil = authUtil;
        this.fileService = fileService;
    }

    @Transactional
    public ProductCommentDTO createComment(Long deliveryNo, Long productId, String commentText, List<MultipartFile> uploads) throws IOException {
        User user = authUtil.loggedInUser();
        Order order = orderRepository.findById(deliveryNo).orElseThrow(
                () -> new ResourceNotFoundException("Order", "deliveryNo", deliveryNo));
        if (!order.getEmail().equalsIgnoreCase(user.getEmail())) {
            throw new APIException("Bu sipariş için yorum ekleme yetkiniz yok.");
        }
        if (!"delivered".equalsIgnoreCase(order.getOrderStatus())) {
            throw new APIException("Yalnızca teslim edilmiş ürünlere yorum yapılabilir.");
        }

        OrderItem orderItem = orderItemRepository.findByOrder_OrderIdAndProduct_ProductId(deliveryNo, productId)
                .orElseThrow(() -> new APIException("Ürün bu siparişte bulunamadı."));
        Product product = orderItem.getProduct();
        if (product.getUser() == null) {
            throw new APIException("Ürünün satıcı bilgisi bulunamadı.");
        }
        if (commentText == null || commentText.isBlank() || commentText.length() > 4000) {
            throw new APIException("Yorum 1 ile 4000 karakter arasında olmalıdır.");
        }
        if (commentRepository.existsByUser_UserIdAndDelivery_OrderIdAndProduct_ProductId(user.getUserId(), deliveryNo, productId)) {
            throw new APIException("Bu sipariş ürünü için daha önce yorum eklenmiş.");
        }

        ProductComment comment = new ProductComment();
        comment.setUser(user);
        comment.setSeller(product.getUser());
        comment.setProduct(product);
        comment.setDelivery(order);
        comment.setCreatedAt(LocalDateTime.now());
        comment.setCommentText(commentText.trim());
        commentRepository.save(comment);

        if (uploads != null) {
            for (MultipartFile upload : uploads) {
                if (upload == null || upload.isEmpty()) continue;
                if (upload.getContentType() == null || !upload.getContentType().toLowerCase().startsWith("image/")) {
                    throw new APIException("Yalnızca görsel dosyaları eklenebilir.");
                }
                ImagesForComment image = new ImagesForComment();
                image.setComment(comment);
                image.setImageName(fileService.uploadImage(imageDirectory, upload));
                comment.getImages().add(image);
            }
        }
        return toDto(comment);
    }

    @Transactional(readOnly = true)
    public List<ProductCommentDTO> getProductComments(Long productId) {
        return commentRepository.findByProduct_ProductIdOrderByCreatedAtDesc(productId).stream().map(this::toDto).toList();
    }

    private ProductCommentDTO toDto(ProductComment comment) {
        ProductCommentDTO dto = new ProductCommentDTO();
        dto.setCommentId(comment.getCommentId());
        dto.setUserId(comment.getUser().getUserId());
        dto.setUserName(comment.getUser().getUserName());
        dto.setSellerId(comment.getSeller().getUserId());
        dto.setSellerName(comment.getSeller().getUserName());
        dto.setProductId(comment.getProduct().getProductId());
        dto.setDeliveryNo(comment.getDelivery().getOrderId());
        dto.setCreatedAt(comment.getCreatedAt());
        dto.setCommentText(comment.getCommentText());
        dto.setImages(comment.getImages().stream().map(image -> "/images/" + image.getImageName()).toList());
        return dto;
    }
}
