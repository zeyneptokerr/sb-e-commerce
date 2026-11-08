package com.ecommerce.project.service;

import com.ecommerce.project.exceptions.APIException;
import com.ecommerce.project.exceptions.ResourceNotFoundException;
import com.ecommerce.project.model.*;
import com.ecommerce.project.payload.ProductCommentDTO;
import com.ecommerce.project.payload.ProductCommentImageDTO;
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
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class ProductCommentService {
    private static final int MAX_COMMENT_IMAGES = 5;
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
    public ProductCommentDTO createComment(Long deliveryNo, Long productId, String commentText, Integer rating, Boolean usernameVisible, List<MultipartFile> uploads) throws IOException {
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
        validateComment(commentText, rating);
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
        comment.setRating(rating);
        comment.setUsernameVisible(Boolean.TRUE.equals(usernameVisible));
        commentRepository.save(comment);

        saveImages(comment, uploads);
        return toDto(comment);
    }

    @Transactional(readOnly = true)
    public List<ProductCommentDTO> getProductComments(Long productId) {
        return commentRepository.findByProduct_ProductIdOrderByCreatedAtDesc(productId).stream().map(comment -> toDto(comment, true)).toList();
    }

    @Transactional(readOnly = true)
    public List<ProductCommentDTO> getOrderComments(Long deliveryNo) {
        User user = authUtil.loggedInUser();
        Order order = orderRepository.findById(deliveryNo).orElseThrow(
                () -> new ResourceNotFoundException("Order", "deliveryNo", deliveryNo));
        if (!order.getEmail().equalsIgnoreCase(user.getEmail())) {
            throw new APIException("Bu siparişin yorumlarına erişim yetkiniz yok.");
        }
        return commentRepository.findByDelivery_OrderIdOrderByCreatedAtDesc(deliveryNo).stream().map(comment -> toDto(comment, false)).toList();
    }

    @Transactional
    public ProductCommentDTO updateComment(Long commentId, String commentText, Integer rating, Boolean usernameVisible, List<MultipartFile> uploads, List<Long> removeImageIds) throws IOException {
        User user = authUtil.loggedInUser();
        ProductComment comment = commentRepository.findById(commentId).orElseThrow(
                () -> new ResourceNotFoundException("Comment", "commentId", commentId));
        if (!comment.getUser().getUserId().equals(user.getUserId())) {
            throw new APIException("Yalnızca kendi yorumunuzu güncelleyebilirsiniz.");
        }
        if (!"delivered".equalsIgnoreCase(comment.getDelivery().getOrderStatus())) {
            throw new APIException("Yalnızca teslim edilmiş ürünlerin yorumları güncellenebilir.");
        }
        validateComment(commentText, rating);
        removeImages(comment, removeImageIds);
        comment.setCommentText(commentText.trim());
        comment.setRating(rating);
        comment.setUsernameVisible(Boolean.TRUE.equals(usernameVisible));
        saveImages(comment, uploads);
        return toDto(commentRepository.save(comment), false);
    }

    @Transactional
    public void deleteComment(Long commentId) throws IOException {
        User user = authUtil.loggedInUser();
        ProductComment comment = commentRepository.findById(commentId).orElseThrow(
                () -> new ResourceNotFoundException("Comment", "commentId", commentId));
        if (!comment.getUser().getUserId().equals(user.getUserId())) {
            throw new APIException("Yalnızca kendi yorumunuzu silebilirsiniz.");
        }
        for (ImagesForComment image : comment.getImages()) {
            fileService.deleteImage(imageDirectory, image.getImageName());
        }
        commentRepository.delete(comment);
    }

    private void validateComment(String commentText, Integer rating) {
        if (commentText == null || commentText.isBlank() || commentText.length() > 4000) {
            throw new APIException("Yorum 1 ile 4000 karakter arasında olmalıdır.");
        }
        if (rating != null && (rating < 1 || rating > 5)) {
            throw new APIException("Puan 1 ile 5 yıldız arasında olmalıdır.");
        }
    }

    private void saveImages(ProductComment comment, List<MultipartFile> uploads) throws IOException {
        if (uploads == null) return;
        long uploadCount = uploads.stream().filter(upload -> upload != null && !upload.isEmpty()).count();
        if (comment.getImages().size() + uploadCount > MAX_COMMENT_IMAGES) {
            throw new APIException("Bir yoruma en fazla 5 görsel eklenebilir.");
        }
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

    private void removeImages(ProductComment comment, List<Long> removeImageIds) throws IOException {
        if (removeImageIds == null || removeImageIds.isEmpty()) return;
        Set<Long> requestedIds = new HashSet<>(removeImageIds);
        Set<Long> ownedIds = comment.getImages().stream().map(ImagesForComment::getImageId).collect(java.util.stream.Collectors.toSet());
        if (!ownedIds.containsAll(requestedIds)) {
            throw new APIException("Yorumda bulunmayan görsel kaldırılamaz.");
        }
        for (ImagesForComment image : List.copyOf(comment.getImages())) {
            if (requestedIds.contains(image.getImageId())) {
                fileService.deleteImage(imageDirectory, image.getImageName());
                comment.getImages().remove(image);
            }
        }
    }

    private ProductCommentDTO toDto(ProductComment comment) {
        return toDto(comment, false);
    }

    private ProductCommentDTO toDto(ProductComment comment, boolean applyUsernamePrivacy) {
        ProductCommentDTO dto = new ProductCommentDTO();
        dto.setCommentId(comment.getCommentId());
        dto.setUserId(comment.getUser().getUserId());
        boolean usernameVisible = Boolean.TRUE.equals(comment.getUsernameVisible());
        String username = comment.getUser().getUserName();
        dto.setUserName(applyUsernamePrivacy && !usernameVisible && username != null && !username.isEmpty()
                ? username.substring(0, 1) + "**"
                : username);
        dto.setUsernameVisible(usernameVisible);
        dto.setSellerId(comment.getSeller().getUserId());
        dto.setSellerName(comment.getSeller().getUserName());
        dto.setProductId(comment.getProduct().getProductId());
        dto.setDeliveryNo(comment.getDelivery().getOrderId());
        dto.setCreatedAt(comment.getCreatedAt());
        dto.setCommentText(comment.getCommentText());
        dto.setRating(comment.getRating());
        dto.setImages(comment.getImages().stream().map(image -> "/images/" + image.getImageName()).toList());
        dto.setImageDetails(comment.getImages().stream()
                .map(image -> new ProductCommentImageDTO(image.getImageId(), "/images/" + image.getImageName()))
                .toList());
        return dto;
    }
}
