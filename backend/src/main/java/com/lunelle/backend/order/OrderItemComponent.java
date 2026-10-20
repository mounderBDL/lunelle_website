package com.lunelle.backend.order;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/** What actually left stock for a pack line (used to restore stock on cancellation). */
@Entity
@Table(name = "order_item_component")
@Getter
@Setter
@NoArgsConstructor
public class OrderItemComponent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_item_id", nullable = false)
    private OrderItem orderItem;

    @Column(name = "variant_id")
    private UUID variantId;

    @Column(name = "name_en", nullable = false)
    private String nameEn;

    @Column(name = "name_fr", nullable = false)
    private String nameFr;

    @Column(name = "variant_label", nullable = false, length = 50)
    private String variantLabel;

    @Column(nullable = false)
    private int quantity; // per one pack unit
}