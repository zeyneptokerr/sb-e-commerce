package com.ecommerce.project.controller;

import com.ecommerce.project.payload.ProductCommentDTO;
import com.ecommerce.project.service.ProductCommentService;
import org.springframework.http.MediaType;
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
                                           @RequestParam(value = "images", required = false) List<MultipartFile> images) throws IOException {
        return commentService.createComment(deliveryNo, productId, comment, images);
    }

    @GetMapping("/public/products/{productId}/comments")
    public List<ProductCommentDTO> getProductComments(@PathVariable Long productId) {
        return commentService.getProductComments(productId);
    }
}
