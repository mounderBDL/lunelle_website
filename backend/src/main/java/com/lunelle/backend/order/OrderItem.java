package com.lunelle.backend.order;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "order_item")
@Getter
@Setter
@NoArgsConstructor
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private CustomerOrder order;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private OrderItemType type;

    @Column(name = "variant_id")
    private UUID variantId;

    @Column(name = "pack_id")
    private UUID packId;

    @Column(name = "name_en", nullable = false)
    private String nameEn;

    @Column(name = "name_fr", nullable = false)
    private String nameFr;

    @Column(name = "variant_label", length = 50)
    private String variantLabel;

    @Column(name = "category_name_en")
    private String categoryNameEn;

    @Column(name = "category_name_fr")
    private String categoryNameFr;

    @Column(name = "original_unit_price", nullable = false)
    private int originalUnitPrice;

    @Column(name = "unit_price", nullable = false)
    private int unitPrice;

    @Column(nullable = false)
    private int quantity;

    @Column(name = "line_total", nullable = false)
    private int lineTotal;

    @Column(name = "requires_follow_up", nullable = false)
    private boolean requiresFollowUp;

    @Column(name = "customization_notes")
    private String customizationNotes;

    @OneToMany(mappedBy = "orderItem", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItemComponent> components = new ArrayList<>();
}