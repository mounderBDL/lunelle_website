package com.lunelle.backend.delivery;

import com.lunelle.backend.delivery.DeliveryDtos.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DeliveryService {

    private static final RateDto UNAVAILABLE = new RateDto(0, false);

    private final WilayaRepository wilayas;
    private final CommuneRepository communes;
    private final DeliveryRateRepository rates;

    private record RateKey(int wilayaId, DeliveryMethod method) {
    }

    /**
     * Wilayas shown at checkout: active only. The office option is only available
     * where at least one commune has a Yalidine office.
     */
    @Transactional(readOnly = true)
    public List<WilayaDeliveryDto> listForCheckout() {
        Map<RateKey, DeliveryRate> byKey = rateMap();
        Map<Integer, Integer> offices = officeCounts();
        return wilayas.findByActiveTrueOrderByIdAsc().stream()
                .map(w -> toDto(w, byKey, offices, true))
                .toList();
    }

    /** Admin grid: every wilaya, active or not, with the real rate settings. */
    @Transactional(readOnly = true)
    public List<WilayaDeliveryDto> listForAdmin() {
        Map<RateKey, DeliveryRate> byKey = rateMap();
        Map<Integer, Integer> offices = officeCounts();
        return wilayas.findAllByOrderByIdAsc().stream()
                .map(w -> toDto(w, byKey, offices, false))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CommuneDto> communesOf(int wilayaId, boolean officeOnly) {
        Wilaya wilaya = wilayas.findById(wilayaId)
                .filter(Wilaya::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown wilaya"));
        List<Commune> list = officeOnly
                ? communes.findByWilayaIdAndActiveTrueAndHasOfficeTrueOrderByNameAsc(wilaya.getId())
                : communes.findByWilayaIdAndActiveTrueOrderByNameAsc(wilaya.getId());
        return list.stream().map(c -> new CommuneDto(c.getId(), c.getName())).toList();
    }

    /** Bulk update from the admin grid. Wilayas not in the list are left untouched. */
    @Transactional
    public void update(List<WilayaDeliveryUpdate> updates) {
        Map<Integer, Wilaya> wilayaById = new HashMap<>();
        wilayas.findAll().forEach(w -> wilayaById.put(w.getId(), w));
        Map<RateKey, DeliveryRate> byKey = rateMap();

        for (WilayaDeliveryUpdate u : updates) {
            Wilaya wilaya = wilayaById.get(u.id());
            if (wilaya == null) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown wilaya " + u.id());
            }
            wilaya.setActive(u.active());
            applyRate(byKey, wilaya.getId(), DeliveryMethod.HOME, u.home());
            applyRate(byKey, wilaya.getId(), DeliveryMethod.STOP_DESK, u.stopDesk());
        }
    }

    /**
     * Delivery fee for an order. Hand-to-hand is always free; HOME / STOP_DESK must be available
     * for that wilaya. (Whether the commune has an office is checked by checkout.)
     */
    @Transactional(readOnly = true)
    public int feeFor(int wilayaId, DeliveryMethod method) {
        Wilaya wilaya = wilayas.findById(wilayaId)
                .filter(Wilaya::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Wilaya not available"));
        if (method == DeliveryMethod.HAND_TO_HAND) {
            return 0;
        }
        DeliveryRate rate = rates.findByWilayaIdAndMethod(wilaya.getId(), method)
                .filter(DeliveryRate::isAvailable)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "This delivery method is not available for this wilaya"));
        return rate.getFee();
    }

    private void applyRate(Map<RateKey, DeliveryRate> byKey, int wilayaId, DeliveryMethod method, RateUpdate update) {
        RateKey key = new RateKey(wilayaId, method);
        DeliveryRate rate = byKey.get(key);
        if (rate == null) {
            rate = new DeliveryRate();
            rate.setWilayaId(wilayaId);
            rate.setMethod(method);
        }
        rate.setFee(update.fee());
        rate.setAvailable(update.available());
        byKey.put(key, rates.save(rate));
    }

    private Map<RateKey, DeliveryRate> rateMap() {
        Map<RateKey, DeliveryRate> map = new HashMap<>();
        for (DeliveryRate r : rates.findAll()) {
            map.put(new RateKey(r.getWilayaId(), r.getMethod()), r);
        }
        return map;
    }

    private Map<Integer, Integer> officeCounts() {
        Map<Integer, Integer> map = new HashMap<>();
        for (Object[] row : communes.countOfficesByWilaya()) {
            map.put((Integer) row[0], ((Long) row[1]).intValue());
        }
        return map;
    }

    private WilayaDeliveryDto toDto(Wilaya w, Map<RateKey, DeliveryRate> byKey,
                                    Map<Integer, Integer> offices, boolean forCheckout) {
        int officeCount = offices.getOrDefault(w.getId(), 0);
        RateDto stopDesk = toRateDto(byKey.get(new RateKey(w.getId(), DeliveryMethod.STOP_DESK)));
        if (forCheckout && officeCount == 0) {
            stopDesk = new RateDto(stopDesk.fee(), false); // no office anywhere in this wilaya
        }
        return new WilayaDeliveryDto(
                w.getId(),
                w.getName(),
                w.isActive(),
                toRateDto(byKey.get(new RateKey(w.getId(), DeliveryMethod.HOME))),
                stopDesk,
                officeCount);
    }

    private RateDto toRateDto(DeliveryRate r) {
        return r == null ? UNAVAILABLE : new RateDto(r.getFee(), r.isAvailable());
    }
}