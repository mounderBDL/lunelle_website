
package com.lunelle.backend.products.repository;

import com.lunelle.backend.products.entity.ProductImage;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductImageRepository
    extends JpaRepository<ProductImage, UUID> {

    List<ProductImage>
        findAllByProduct_IdOrderByDisplayOrderAscCreatedAtAsc(
            UUID productId
        );

    Optional<ProductImage> findByProduct_IdAndPrimaryTrue(
        UUID productId
    );

    Optional<ProductImage> findByIdAndProduct_Id(
        UUID imageId, UUID productId
    );
    
}
