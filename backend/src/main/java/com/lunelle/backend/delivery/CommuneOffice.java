package com.lunelle.backend.delivery;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** One Yalidine office (stop desk). A commune can have several. The id is Yalidine's center id. */
@Entity
@Table(name = "commune_office")
@Getter
@Setter
@NoArgsConstructor
public class CommuneOffice {

    @Id
    private Integer id;

    @Column(name = "commune_id", nullable = false)
    private Integer communeId;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 300)
    private String address;

    /** "Agence El Khroub - Cite 5 juillet": what the order shows for a stop-desk delivery. */
    public String label() {
        return address == null || address.isBlank() ? name : name + " - " + address.trim();
    }
}
