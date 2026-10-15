
package com.lunelle.backend.products.service;

import com.lunelle.backend.categories.repository.CategoryRepository;
import com.lunelle.backend.common.exception.ResourceConflictException;
import com.lunelle.backend.common.exception.ResourceNotFoundException;
import com.lunelle.backend.products.dto.ProductDetailsResponse;
import com.lunelle.backend.products.dto.ProductImageResponse;
import com.lunelle.backend.products.dto.ProductPageResponse;
import com.lunelle.backend.products.dto.ProductResponse;
import com.lunelle.backend.products.dto.ProductStatusRequest;
import com.lunelle.backend.products.entity.DiscountType;
import com.lunelle.backend.products.entity.Product;
import com.lunelle.backend.products.repository.ProductImageRepository;
import com.lunelle.backend.products.repository.ProductRepository;
import com.lunelle.backend.categories.entity.Category;
import com.lunelle.backend.products.dto.ProductUpdateRequest;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.lunelle.backend.products.dto.ProductCreateRequest;

@Service
public class ProductService {

    private static final int MAX_PAGE_SIZE = 100;

    private static final Map<String, String> ALLOWED_SORT_FIELDS = Map.of(
        "name", "name",
        "price", "price",
        "created_at", "createdAt"
    );

    private final ProductRepository productRepository;
    private final ProductImageRepository productImageRepository;
    private final CategoryRepository categoryRepository;

    public ProductService(
        ProductRepository productRepository,
        ProductImageRepository productImageRepository,
        CategoryRepository categoryRepository
    ) {
        this.productRepository = productRepository;
        this.productImageRepository = productImageRepository;
        this.categoryRepository = categoryRepository;
    }

    @Transactional(readOnly = true)
    public ProductPageResponse getPublicProducts(
        int page,
        int limit,
        UUID categoryId,
        String search,
        String sortBy,
        String sortDirection
    ) {
        if (page < 1) {
            throw new IllegalArgumentException(
                "Page must be at least 1."
            );
        }

        if (limit < 1 || limit > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException(
                "Limit must be between 1 and " + MAX_PAGE_SIZE + "."
            );
        }

        String sortProperty = ALLOWED_SORT_FIELDS.get(sortBy);

        if (sortProperty == null) {
            throw new IllegalArgumentException(
                "Invalid sort_by. Allowed values: name, price, created_at."
            );
        }

        Sort.Direction direction;

        try {
            direction = Sort.Direction.valueOf(
                sortDirection.toUpperCase(Locale.ROOT)
            );
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException(
                "Invalid sort_direction. Allowed values: asc, desc."
            );
        }

        Sort sort = Sort.by(direction, sortProperty)
            .and(Sort.by(Sort.Direction.ASC, "id"));

        Pageable pageable = PageRequest.of(page - 1, limit, sort);

        String normalizedSearch = search == null || search.isBlank()
            ? ""
            : search.trim();

        Page<Product> products = productRepository.findPublicProducts(
            categoryId,
            normalizedSearch,
            pageable
        );

        var productResponses = products.getContent()
            .stream()
            .map(this::toResponse)
            .toList();

        var pagination = new ProductPageResponse.Pagination(
            page,
            limit,
            products.getTotalElements(),
            products.getTotalPages()
        );

        return new ProductPageResponse(productResponses, pagination);
    }

    @Transactional(readOnly = true)
    public ProductDetailsResponse getPublicProductById(UUID id) {
        Product product = productRepository
            .findByIdAndActiveTrueAndCategory_ActiveTrue(id)
            .orElseThrow(() ->
                new ResourceNotFoundException("Product not found.")
            );

        List<ProductImageResponse> images = productImageRepository
            .findAllByProduct_IdOrderByDisplayOrderAscCreatedAtAsc(
                product.getId()
            )
            .stream()
            .map(this::toImageResponse)
            .toList();

        return new ProductDetailsResponse(
            product.getId(),
            product.getName(),
            product.getSlug(),
            product.getDescription(),
            product.getPrice(),
            product.getDiscount(),
            product.getDiscountType(),
            calculateEffectivePrice(
                product.getPrice(),
                product.getDiscount(),
                product.getDiscountType()
            ),
            new ProductResponse.CategorySummary(
                product.getCategory().getId(),
                product.getCategory().getName(),
                product.getCategory().getSlug()
            ),
            images
        );
    }

    private ProductResponse toResponse(Product product) {
        var category = product.getCategory();

        BigDecimal effectivePrice = calculateEffectivePrice(
            product.getPrice(),
            product.getDiscount(),
            product.getDiscountType()
        );

        var categorySummary = new ProductResponse.CategorySummary(
            category.getId(),
            category.getName(),
            category.getSlug()
        );

        return new ProductResponse(
            product.getId(),
            product.getName(),
            product.getSlug(),
            product.getDescription(),
            product.getPrice(),
            product.getDiscount(),
            product.getDiscountType(),
            effectivePrice,
            categorySummary
        );
    }

    private ProductImageResponse toImageResponse(
        com.lunelle.backend.products.entity.ProductImage image
    ) {
        return new ProductImageResponse(
            image.getId(),
            image.getImageUrl(),
            image.isPrimary(),
            image.getDisplayOrder()
        );
    }

    private BigDecimal calculateEffectivePrice(
        BigDecimal price,
        BigDecimal discount,
        DiscountType discountType
    ) {
        BigDecimal reduction;

        if (discountType == DiscountType.PERCENTAGE) {
            reduction = price
                .multiply(discount)
                .divide(
                    BigDecimal.valueOf(100),
                    2,
                    RoundingMode.HALF_UP
                );
        } else {
            reduction = discount;
        }

        BigDecimal effectivePrice = price.subtract(reduction);

        return effectivePrice.max(BigDecimal.ZERO)
            .setScale(2, RoundingMode.HALF_UP);
    }

    @Transactional
    public ProductResponse createProduct(ProductCreateRequest request) {
        String name = request.name().trim();
        String slug = request.slug().trim();

        if (productRepository.existsBySlug(slug)) {
            throw new ResourceConflictException(
                "A product with this slug already exists."
            );
        }

        Category category = categoryRepository
            .findById(request.categoryId())
            .orElseThrow(() ->
                new ResourceNotFoundException("Category not found.")
            );

        if (!category.isActive()) {
            throw new IllegalArgumentException(
                "Products can only be created in active categories."
            );
        }

        BigDecimal price = request.price();
        BigDecimal costPrice = request.costPrice();
        BigDecimal discount = request.discount();

        if (request.discountType() == DiscountType.PERCENTAGE
                && discount.compareTo(new BigDecimal("100")) > 0) {
            throw new IllegalArgumentException(
                "Percentage discount cannot exceed 100."
            );
        }

        if (request.discountType() == DiscountType.FIXED
                && discount.compareTo(price) > 0) {
            throw new IllegalArgumentException(
                "Fixed discount cannot exceed the product price."
            );
        }

        Product product = Product.create(
            name,
            slug,
            request.description(),
            category,
            price,
            costPrice,
            discount,
            request.discountType(),
            request.stock()
        );

        Product savedProduct = productRepository.save(product);

        return toResponse(savedProduct);
    }

    @Transactional
    public ProductResponse updateProduct(UUID id, ProductUpdateRequest request) {
        Product product = productRepository.findById(id)
            .orElseThrow(() ->
                new ResourceNotFoundException("Product not found.")
            );

        String name = request.name() != null
            ? request.name().trim()
            : product.getName();

        String slug = request.slug() != null
            ? request.slug().trim()
            : product.getSlug();

        String description = request.description() != null
            ? request.description()
            : product.getDescription();

        Category category = product.getCategory();

        if (request.categoryId() != null) {
            category = categoryRepository.findById(request.categoryId())
                .orElseThrow(() ->
                    new ResourceNotFoundException("Category not found.")
                );

            if (!category.isActive()) {
                throw new IllegalArgumentException(
                    "Products can only be assigned to active categories."
                );
            }
        }

        BigDecimal price = request.price() != null
            ? request.price()
            : product.getPrice();

        BigDecimal costPrice = request.costPrice() != null
            ? request.costPrice()
            : product.getCostPrice();

        BigDecimal discount = request.discount() != null
            ? request.discount()
            : product.getDiscount();

        DiscountType discountType = request.discountType() != null
            ? request.discountType()
            : product.getDiscountType();

        int stock = request.stock() != null
            ? request.stock()
            : product.getStock();

        if (!slug.equals(product.getSlug())
                && productRepository.existsBySlug(slug)) {
            throw new ResourceConflictException(
                "A product with this slug already exists."
            );
        }

        if (discountType == DiscountType.PERCENTAGE
                && discount.compareTo(new BigDecimal("100")) > 0) {
            throw new IllegalArgumentException(
                "Percentage discount cannot exceed 100."
            );
        }

        if (discountType == DiscountType.FIXED
                && discount.compareTo(price) > 0) {
            throw new IllegalArgumentException(
                "Fixed discount cannot exceed the product price."
            );
        }

        product.updateDetails(
            name, slug, description, category,
            price, costPrice, discount, discountType, stock
        );

        return toResponse(productRepository.save(product));
    }

    @Transactional
    public ProductResponse updateProductStatus(
        UUID id,
        ProductStatusRequest request
    ) {
        Product product = productRepository.findById(id)
            .orElseThrow(() ->
                new ResourceNotFoundException("Product not found.")
            );

        product.updateStatus(request.isActive());

        Product savedProduct = productRepository.save(product);

        return toResponse(savedProduct);
    }

    @Transactional(readOnly = true)
    public List<ProductImageResponse> getAdminProductImages(UUID productId) {
        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Product not found.");
        }

        return productImageRepository
            .findAllByProduct_IdOrderByDisplayOrderAscCreatedAtAsc(productId)
            .stream()
            .map(this::toImageResponse)
            .toList();
    }

}
