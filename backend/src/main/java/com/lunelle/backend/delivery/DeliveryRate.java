package com.lunelle.backend.delivery;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "delivery_rate")
@Getter
@Setter
@NoArgsConstructor
public class DeliveryRate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "wilaya_id", nullable = false)
    private Integer wilayaId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DeliveryMethod method; // only HOME or STOP_DESK

    @Column(nullable = false)
    private int fee;

    @Column(name = "is_available", nullable = false)
    private boolean available = true;
}