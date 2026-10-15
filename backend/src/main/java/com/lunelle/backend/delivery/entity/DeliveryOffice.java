package com.lunelle.backend.delivery.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "delivery_offices")
public class DeliveryOffice {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, length = 100)
    private String wilaya;

    @Column(nullable = false, length = 150)
    private String commune;

    protected DeliveryOffice() {
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getWilaya() {
        return wilaya;
    }

    public String getCommune() {
        return commune;
    }
    
    public static DeliveryOffice create(
            String name,
            String wilaya,
            String commune) {

        DeliveryOffice office = new DeliveryOffice();
        office.name = name;
        office.wilaya = wilaya;
        office.commune = commune;
        return office;
    }
    
    public void updateDetails(String name, String wilaya, String commune) {
        if (name != null) {
            this.name = name;
        }

        if (wilaya != null) {
            this.wilaya = wilaya;
        }

        if (commune != null) {
            this.commune = commune;
        }
    }
}
