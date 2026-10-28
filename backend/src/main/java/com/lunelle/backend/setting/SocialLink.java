package com.lunelle.backend.setting;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "social_link")
@Getter
@Setter
@NoArgsConstructor
public class SocialLink {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SocialNetwork network;

    @Column(length = 60)
    private String label;

    @Column(nullable = false, length = 300)
    private String url;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}