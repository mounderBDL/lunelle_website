package com.lunelle.backend.packs.entity;

import com.lunelle.backend.products.entity.Product;
import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(
    name = "pack_items",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_pack_items_pack_product",
        columnNames = {"pack_id", "product_id"}
    )
)
public class PackItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pack_id", nullable = false)
    private Pack pack;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false)
    private int quantity;

    protected PackItem() {}

    public static PackItem create(
        Pack pack,
        Product product,
        int quantity
    ) {
        PackItem item = new PackItem();
        item.pack = pack;
        item.product = product;
        item.quantity = quantity;
        return item;
    }

    public UUID getId() { return id; }
    public Pack getPack() { return pack; }
    public Product getProduct() { return product; }
    public int getQuantity() { return quantity; }
}