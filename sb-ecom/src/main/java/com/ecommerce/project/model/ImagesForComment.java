package com.ecommerce.project.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "images_for_comment")
@Getter
@Setter
@NoArgsConstructor
public class ImagesForComment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long imageId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "comment_id", nullable = false)
    private ProductComment comment;

    @Column(nullable = false, length = 500)
    private String imageName;
}
