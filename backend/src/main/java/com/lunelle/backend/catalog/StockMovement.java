package com.lunelle.backend.catalog;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "stock_movement")
@Getter
@Setter
@NoArgsConstructor
public class StockMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "variant_id", nullable = false)
    private UUID variantId;

    @Column(nullable = false)
    private int delta;

    @Column(name = "stock_after", nullable = false)
    private int stockAfter;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StockReason reason;

    @Column(name = "order_id")
    private UUID orderId;

    @Column(name = "admin_id")
    private UUID adminId;

    private String note;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}