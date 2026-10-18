package com.lunelle.backend.catalog;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.DynamicUpdate;

import java.util.UUID;

/**
 * NEVER change {@code stock} through this entity after creation: use StockService.
 * @DynamicUpdate makes Hibernate write only the changed columns, so editing a price
 * can never overwrite a stock value changed concurrently by an order.
 */
@Entity
@Table(name = "product_variant")
@DynamicUpdate
@Getter
@Setter
@NoArgsConstructor
public class ProductVariant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false, length = 50)
    private String label;

    @Column(length = 60)
    private String sku;

    @Column(nullable = false)
    private int price; // base price in DZD

    @Column(nullable = false)
    private int stock;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}