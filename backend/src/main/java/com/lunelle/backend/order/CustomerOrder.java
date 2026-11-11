package com.lunelle.backend.order;

import com.lunelle.backend.delivery.DeliveryMethod;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.BatchSize;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "orders")
@Getter
@Setter
@NoArgsConstructor
public class CustomerOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 30)
    private String code;

    @Column(name = "public_token", nullable = false, unique = true, length = 64)
    private String publicToken;


    @Column(name = "idempotency_key", length = 64)
    private String idempotencyKey;    

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderStatus status = OrderStatus.NEW;

    @Column(name = "customer_name", nullable = false)
    private String customerName;

    @Column(nullable = false, length = 10)
    private String phone;

    @Column(name = "customer_note")
    private String customerNote;

    @Column(nullable = false, length = 5)
    private String locale = "fr";

    @Column(name = "wilaya_id")
    private Integer wilayaId;

    @Column(name = "wilaya_name")
    private String wilayaName;

    @Column(name = "commune_id")
    private Integer communeId;

    @Column(name = "commune_name")
    private String communeName;

    @Column
    private String address;

    @Column(name = "office_id")
    private Integer officeId; // the Yalidine office chosen for a stop-desk delivery    

    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_method", nullable = false, length = 20)
    private DeliveryMethod deliveryMethod;

    @Column(name = "delivery_fee", nullable = false)
    private int deliveryFee;

    @Column(name = "handover_place")
    private String handoverPlace;

    @Column(name = "handover_at")
    private Instant handoverAt;

    @Column(length = 30)
    private String carrier;

    @Column(name = "tracking_number", length = 60)
    private String trackingNumber;

    @Column(nullable = false)
    private int subtotal;

    @Column(nullable = false)
    private int total;

    @Column(name = "admin_note")
    private String adminNote;

    @Column(name = "ip_hash", length = 64)
    private String ipHash;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    @Column(name = "shipped_at")
    private Instant shippedAt;

    @Column(name = "delivered_at")
    private Instant deliveredAt;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 50)
    private List<OrderItem> items = new ArrayList<>();
}