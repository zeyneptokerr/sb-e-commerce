package com.ecommerce.project.controller;

import com.ecommerce.project.payload.ProductCommentDTO;
import com.ecommerce.project.service.ProductCommentService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api")
public class ProductCommentController {
    private final ProductCommentService commentService;

    public ProductCommentController(ProductCommentService commentService) {
        this.commentService = commentService;
    }

    @PostMapping(value = "/comments/orders/{deliveryNo}/products/{productId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ProductCommentDTO createComment(@PathVariable Long deliveryNo,
                                           @PathVariable Long productId,
                                           @RequestParam("comment") String comment,
                                           @RequestParam(value = "rating", required = false) Integer rating,
                                           @RequestParam(value = "usernameVisible", defaultValue = "false") Boolean usernameVisible,
                                           @RequestParam(value = "images", required = false) List<MultipartFile> images) throws IOException {
        return commentService.createComment(deliveryNo, productId, comment, rating, usernameVisible, images);
    }

    @PutMapping(value = "/comments/{commentId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ProductCommentDTO updateComment(@PathVariable Long commentId,
                                           @RequestParam("comment") String comment,
                                           @RequestParam(value = "rating", required = false) Integer rating,
                                           @RequestParam(value = "usernameVisible", defaultValue = "false") Boolean usernameVisible,
                                           @RequestParam(value = "images", required = false) List<MultipartFile> images,
                                           @RequestParam(value = "removeImageIds", required = false) List<Long> removeImageIds) throws IOException {
        return commentService.updateComment(commentId, comment, rating, usernameVisible, images, removeImageIds);
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(@PathVariable Long commentId) throws IOException {
        commentService.deleteComment(commentId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/comments/orders/{deliveryNo}")
    public List<ProductCommentDTO> getOrderComments(@PathVariable Long deliveryNo) {
        return commentService.getOrderComments(deliveryNo);
    }

    @GetMapping("/public/products/{productId}/comments")
    public List<ProductCommentDTO> getProductComments(@PathVariable Long productId) {
        return commentService.getProductComments(productId);
    }
}
