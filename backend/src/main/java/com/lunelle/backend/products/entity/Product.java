package com.lunelle.backend.products.entity;

import com.lunelle.backend.categories.entity.Category;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "slug", nullable = false, unique = true, length = 220)
    private String slug;

    @Column(name = "description")
    private String description;

    @Column(name = "price", nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Column(name = "cost_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal costPrice;

    @Column(name = "discount", nullable = false, precision = 12, scale = 2)
    private BigDecimal discount;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "discount_type", nullable = false, columnDefinition = "discount_type")
    private DiscountType discountType;

    @Column(name = "stock", nullable = false)
    private int stock;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected Product() {
    }

    @PrePersist
    protected void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public Category getCategory() {
        return category;
    }

    public String getName() {
        return name;
    }

    public String getSlug() {
        return slug;
    }

    public String getDescription() {
        return description;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public BigDecimal getCostPrice() {
        return costPrice;
    }

    public BigDecimal getDiscount() {
        return discount;
    }

    public DiscountType getDiscountType() {
        return discountType;
    }

    public int getStock() {
        return stock;
    }

    public boolean isActive() {
        return active;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public static Product create(
        String name,
        String slug,
        String description,
        Category category,
        BigDecimal price,
        BigDecimal costPrice,
        BigDecimal discount,
        DiscountType discountType,
        int stock
    ) {
        Product product = new Product();

        product.name = name;
        product.slug = slug;
        product.description = description;
        product.category = category;
        product.price = price;
        product.costPrice = costPrice;
        product.discount = discount;
        product.discountType = discountType;
        product.stock = stock;
        product.active = true;

        return product;
    }

    public void updateDetails(
        String name,
        String slug,
        String description,
        Category category,
        BigDecimal price,
        BigDecimal costPrice,
        BigDecimal discount,
        DiscountType discountType,
        int stock
    ) {
        this.name = name;
        this.slug = slug;
        this.description = description;
        this.category = category;
        this.price = price;
        this.costPrice = costPrice;
        this.discount = discount;
        this.discountType = discountType;
        this.stock = stock;
    }

    public void updateStatus(boolean active) {
        this.active = active;
    }
}
