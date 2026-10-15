package com.lunelle.backend.delivery.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "delivery_zones")
public class DeliveryZone {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 100)
    private String wilaya;

    @Column(name = "home_delivery_fee", nullable = false, precision = 12, scale = 2)
    private BigDecimal homeDeliveryFee;

    @Column(name = "office_delivery_fee", nullable = false, precision = 12, scale = 2)
    private BigDecimal officeDeliveryFee;

    protected DeliveryZone() {
    }

    public UUID getId() {
        return id;
    }

    public String getWilaya() {
        return wilaya;
    }

    public BigDecimal getHomeDeliveryFee() {
        return homeDeliveryFee;
    }

    public BigDecimal getOfficeDeliveryFee() {
        return officeDeliveryFee;
    }

    
    public static DeliveryZone create(
            String wilaya,
            BigDecimal homeDeliveryFee,
            BigDecimal officeDeliveryFee) {

        DeliveryZone zone = new DeliveryZone();
        zone.wilaya = wilaya;
        zone.homeDeliveryFee = homeDeliveryFee;
        zone.officeDeliveryFee = officeDeliveryFee;
        return zone;
    }
    
    public void updateFees(
            BigDecimal homeDeliveryFee,
            BigDecimal officeDeliveryFee) {

        if (homeDeliveryFee != null) {
            this.homeDeliveryFee = homeDeliveryFee;
        }

        if (officeDeliveryFee != null) {
            this.officeDeliveryFee = officeDeliveryFee;
        }
    }

}
