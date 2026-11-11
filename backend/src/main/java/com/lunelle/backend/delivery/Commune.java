package com.lunelle.backend.delivery;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "commune")
@Getter
@Setter
@NoArgsConstructor
public class Commune {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "wilaya_id", nullable = false)
    private Integer wilayaId;

    @Column(nullable = false)
    private String name;

    @Column(name = "external_id")
    private Integer externalId; // Yalidine commune id, for the future API

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "has_office", nullable = false)
    private boolean hasOffice;

    @Column(name = "center_id")
    private Integer centerId; // Yalidine office that serves this commune (stop-desk parcels)    
}
