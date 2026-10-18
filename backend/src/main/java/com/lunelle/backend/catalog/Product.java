package com.lunelle.backend.catalog;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "product")
@Getter
@Setter
@NoArgsConstructor
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "category_id", nullable = false)
    private UUID categoryId;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(name = "name_en", nullable = false)
    private String nameEn;

    @Column(name = "name_fr", nullable = false)
    private String nameFr;

    @Column(name = "description_en")
    private String descriptionEn;

    @Column(name = "description_fr")
    private String descriptionFr;

    @Column(name = "scent_notes_en")
    private String scentNotesEn;

    @Column(name = "scent_notes_fr")
    private String scentNotesFr;

    @Column(length = 30)
    private String badge;

    // product-level discount, controlled from the dashboard
    @Column(name = "discount_active", nullable = false)
    private boolean discountActive;

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type", length = 10)
    private DiscountType discountType;

    @Column(name = "discount_value")
    private Integer discountValue;

    @Column(name = "discount_starts_at")
    private Instant discountStartsAt;

    @Column(name = "discount_ends_at")
    private Instant discountEndsAt;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "is_featured", nullable = false)
    private boolean featured;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "archived_at")
    private Instant archivedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC, label ASC")
    @BatchSize(size = 100)
    private List<ProductVariant> variants = new ArrayList<>();
}