package com.lunelle.backend.delivery;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "wilaya")
@Getter
@Setter
@NoArgsConstructor
public class Wilaya {

    @Id
    private Integer id; // official wilaya code, assigned (not generated)

    @Column(nullable = false)
    private String name;

    @Column(name = "name_ar")
    private String nameAr;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}