package com.lunelle.backend.packs.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "packs")
public class Pack {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, unique = true, length = 220)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected Pack() {}

    public static Pack create(
        String name,
        String slug,
        String description,
        BigDecimal price
    ) {
        Pack pack = new Pack();
        pack.name = name;
        pack.slug = slug;
        pack.description = description;
        pack.price = price;
        pack.active = true;
        return pack;
    }

    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    
    public void updateDetails(
            String name,
            String slug,
            String description,
            BigDecimal price,
            Boolean active) {

        if (name != null) {
            this.name = name.trim();
        }

        if (slug != null) {
            this.slug = slug;
        }

        if (description != null) {
            this.description = description;
        }

        if (price != null) {
            this.price = price;
        }

        if (active != null) {
            this.active = active;
        }
    }


    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getSlug() { return slug; }
    public String getDescription() { return description; }
    public BigDecimal getPrice() { return price; }
    public boolean isActive() { return active; }
}