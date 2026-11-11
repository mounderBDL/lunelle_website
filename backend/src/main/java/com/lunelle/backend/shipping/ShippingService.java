package com.lunelle.backend.shipping;

import com.lunelle.backend.delivery.Commune;
import com.lunelle.backend.delivery.CommuneRepository;
import com.lunelle.backend.delivery.DeliveryMethod;
import com.lunelle.backend.order.CustomerOrder;
import com.lunelle.backend.order.CustomerOrderRepository;
import com.lunelle.backend.order.OrderAdminDtos.OrderDetailDto;
import com.lunelle.backend.order.OrderAdminService;
import com.lunelle.backend.order.OrderItem;
import com.lunelle.backend.order.OrderStatus;
import com.lunelle.backend.shipping.YalidineClient.ParcelData;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Sends a confirmed order to Yalidine as a parcel, then marks the order shipped with the tracking number.
 * The network call is made outside any database transaction.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ShippingService {

    static final String CARRIER = "YALIDINE";

    private final CustomerOrderRepository orders;
    private final CommuneRepository communes;
    private final YalidineClient yalidine;
    private final OrderAdminService orderAdmin;
    private final TransactionTemplate tx;

    /** Orders being sent right now: a double click must never create two parcels. */
    private final Set<UUID> sending = ConcurrentHashMap.newKeySet();

    private record Prepared(String code, ParcelData data, Integer communeExternalId, Integer centerId) {
    }

    public boolean enabled() {
        return yalidine.enabled();
    }

    public OrderDetailDto sendToYalidine(UUID id, UUID adminId) {
        if (!yalidine.enabled()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Yalidine is not set up on the server yet");
        }
        if (!sending.add(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This order is already being sent");
        }
        try {
            Prepared prepared = tx.execute(status -> prepare(id));

            Integer stopDeskId = null;
            if (prepared.data().stopDesk()) {
                // the office saved by the Yalidine sync, or ask Yalidine when the sync has not run yet
                stopDeskId = prepared.centerId() != null
                        ? prepared.centerId()
                        : yalidine.centerFor(prepared.communeExternalId());
            }
            String tracking = yalidine.createParcel(prepared.data(), stopDeskId);

            try {
                return orderAdmin.shipWithCarrier(id, CARRIER, tracking, adminId);
            } catch (RuntimeException e) {
                log.error("Parcel {} was created at Yalidine for order {}, but the order could not be updated ({})",
                        tracking, prepared.code(), e.getClass().getSimpleName());
                throw new ResponseStatusException(HttpStatus.CONFLICT, "The parcel was created at Yalidine (tracking "
                        + tracking + ") but the order could not be updated. Enter this tracking number by hand.");
            }
        } finally {
            sending.remove(id);
        }
    }

    private Prepared prepare(UUID id) {
        CustomerOrder o = orders.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        if (o.getDeliveryMethod() == DeliveryMethod.HAND_TO_HAND) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hand-to-hand orders do not go through Yalidine");
        }
        if (o.getStatus() != OrderStatus.CONFIRMED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only confirmed orders can be sent to Yalidine");
        }
        if (o.getTrackingNumber() != null && !o.getTrackingNumber().isBlank()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This order already has a tracking number");
        }
        if (isBlank(o.getWilayaName()) || isBlank(o.getCommuneName())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This order has no wilaya or commune");
        }

        boolean stopDesk = o.getDeliveryMethod() == DeliveryMethod.STOP_DESK;
        Integer external = null;
        Integer center = null;
        if (stopDesk) {
            Optional<Commune> commune = o.getCommuneId() == null ? Optional.empty()
                    : communes.findById(o.getCommuneId());
            external = commune.map(c -> c.getExternalId()).orElse(null);
            center = o.getOfficeId() != null ? o.getOfficeId() : commune.map(c -> c.getCenterId()).orElse(null);
            if (external == null && center == null) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "This commune has no Yalidine id, so its office cannot be found");
            }
        }

        String[] name = splitName(o.getCustomerName());
        String address = isBlank(o.getAddress()) ? o.getCommuneName() + (stopDesk ? " (stop desk)" : "") : o.getAddress();
        String products = o.getItems().stream().map(ShippingService::line).collect(Collectors.joining(", "));
        if (products.length() > 250) {
            products = products.substring(0, 247) + "...";
        }

        ParcelData data = new ParcelData(o.getCode(), name[0], name[1], o.getPhone(), address,
                o.getCommuneName(), o.getWilayaName(), products, o.getSubtotal(), stopDesk);
        return new Prepared(o.getCode(), data, external, center);
    }

    private static String line(OrderItem item) {
        String label = isBlank(item.getVariantLabel()) ? "" : " " + item.getVariantLabel();
        return item.getNameFr() + label + " x" + item.getQuantity();
    }

    /** "Amina Ben Ali" becomes first name "Amina" and family name "Ben Ali"; one word is used for both. */
    static String[] splitName(String full) {
        String name = full == null ? "" : full.trim().replaceAll("\\s+", " ");
        int space = name.indexOf(' ');
        if (space < 0) {
            return new String[]{name, name};
        }
        return new String[]{name.substring(0, space), name.substring(space + 1)};
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
