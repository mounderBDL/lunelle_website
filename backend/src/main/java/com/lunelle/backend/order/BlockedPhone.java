package com.lunelle.backend.order;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "blocked_phone")
@Getter
@Setter
@NoArgsConstructor
public class BlockedPhone {

    @Id
    @Column(length = 10)
    private String phone;

    private String reason;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;
}