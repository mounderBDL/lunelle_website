package com.lunelle.backend.shipping;

import com.lunelle.backend.delivery.Commune;
import com.lunelle.backend.delivery.CommuneOffice;
import com.lunelle.backend.delivery.CommuneOfficeRepository;
import com.lunelle.backend.delivery.CommuneRepository;
import com.lunelle.backend.delivery.DeliveryMethod;
import com.lunelle.backend.delivery.DeliveryRate;
import com.lunelle.backend.delivery.DeliveryRateRepository;
import com.lunelle.backend.delivery.Wilaya;
import com.lunelle.backend.delivery.WilayaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Copies Yalidine's wilayas, communes, offices and delivery fees into our database, in one go.
 * Everything is read first (that takes a minute or two because of Yalidine's request limits) and saved
 * in a single transaction at the end, so a failure leaves the data exactly as it was.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class YalidineSyncService {

    public enum State { IDLE, RUNNING, DONE, FAILED }

    /** step is one of WILAYAS, COMMUNES, CENTERS, FEES, SAVING; done/total only matter for FEES. */
    public record Status(State state, String step, int done, int total, Summary summary, String error,
                         Instant finishedAt) {
    }

    public record Summary(int wilayas, int communesAdded, int communesUpdated, int communesClosed,
                          int withStopDesk, int offices, int feesUpdated, int feesSkipped) {
    }

    private record Fee(Integer home, Integer desk) {
    }

    private final YalidineClient yalidine;
    private final WilayaRepository wilayas;
    private final CommuneRepository communes;
    private final CommuneOfficeRepository offices;
    private final DeliveryRateRepository rates;
    private final TransactionTemplate tx;

    @Value("${app.yalidine.pause-ms:1500}")
    private long pauseMs;

    private final ExecutorService executor = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "yalidine-sync");
        t.setDaemon(true);
        return t;
    });

    private final AtomicReference<Status> status =
            new AtomicReference<>(new Status(State.IDLE, "", 0, 0, null, null, null));

    public Status status() {
        return status.get();
    }

    /** Starts the sync in the background and returns at once; the studio polls status(). */
    public synchronized Status start() {
        if (!yalidine.enabled()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Yalidine is not set up on the server yet");
        }
        if (status.get().state() == State.RUNNING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A sync is already running");
        }
        status.set(new Status(State.RUNNING, "WILAYAS", 0, 0, null, null, null));
        executor.submit(this::run);
        return status.get();
    }

    private void run() {
        try {
            Summary summary = syncNow();
            status.set(new Status(State.DONE, "", 0, 0, summary, null, Instant.now()));
        } catch (ResponseStatusException e) {
            fail(e.getReason());
        } catch (Exception e) {
            log.error("Yalidine sync failed ({})", e.getClass().getSimpleName());
            fail("The sync failed (" + e.getClass().getSimpleName() + "). Nothing was changed.");
        }
    }

    private void fail(String message) {
        status.set(new Status(State.FAILED, "", 0, 0, null, message, Instant.now()));
    }

    private void progress(String step, int done, int total) {
        status.set(new Status(State.RUNNING, step, done, total, null, null, null));
    }

    // ───────────── the work ─────────────

    /** Reads everything from Yalidine, then saves it. Runs in the caller's thread. */
    public Summary syncNow() {
        progress("WILAYAS", 0, 0);
        List<Map<String, Object>> wilayaRows = yalidine.getAll("wilayas/");
        progress("COMMUNES", 0, 0);
        List<Map<String, Object>> communeRows = yalidine.getAll("communes/");
        progress("CENTERS", 0, 0);
        List<Map<String, Object>> centerRows = yalidine.getAll("centers/");

        if (wilayaRows.isEmpty() || communeRows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Yalidine returned no wilayas or communes. Nothing was changed.");
        }

        int fromId = senderWilayaId(wilayaRows);
        List<Integer> deliverable = new ArrayList<>();
        for (Map<String, Object> row : wilayaRows) {
            Integer id = intOf(row.get("id"));
            if (id != null && truthy(row.get("is_deliverable"))) {
                deliverable.add(id);
            }
        }

        Map<Integer, Fee> fees = new HashMap<>();
        int skipped = 0;
        for (int i = 0; i < deliverable.size(); i++) {
            progress("FEES", i, deliverable.size());
            Fee fee = readFee(fromId, deliverable.get(i));
            if (fee == null) {
                skipped++;
            } else {
                fees.put(deliverable.get(i), fee);
            }
        }

        progress("SAVING", 0, 0);
        int skippedFees = skipped;
        return tx.execute(s -> apply(wilayaRows, communeRows, centerRows, fees, skippedFees));
    }

    private int senderWilayaId(List<Map<String, Object>> wilayaRows) {
        String wanted = norm(yalidine.fromWilaya());
        for (Map<String, Object> row : wilayaRows) {
            if (!wanted.isEmpty() && wanted.equals(norm(String.valueOf(row.get("name"))))) {
                return intOf(row.get("id"));
            }
        }
        throw new ResponseStatusException(HttpStatus.CONFLICT, "The sender wilaya \"" + yalidine.fromWilaya()
                + "\" is not in Yalidine's list. Check YALIDINE_FROM_WILAYA in the server settings.");
    }

    /** One wilaya's fees, or null when Yalidine could not give them. Waits and retries when asked to slow down. */
    private Fee readFee(int fromId, int toId) {
        for (int attempt = 1; attempt <= 3; attempt++) {
            try {
                Fee fee = feeOf(yalidine.fees(fromId, toId));
                pause(pauseMs);
                return fee;
            } catch (YalidineException e) {
                if (e.getStatusCode().value() == 429 && attempt < 3) {
                    log.info("Yalidine asked us to slow down, waiting a minute");
                    pause(65_000);
                    continue;
                }
                if (e.getStatusCode().value() == 429 || e.getStatusCode().is5xxServerError()) {
                    throw e; // give up: the whole sync is retried later by the admin
                }
                log.warn("No fees for wilaya {} ({})", toId, e.getReason());
                return null;
            }
        }
        return null;
    }

    /** The usual (most common) home and stop-desk fee of the wilaya's communes. */
    private static Fee feeOf(Map<String, Object> body) {
        List<Integer> home = new ArrayList<>();
        List<Integer> desk = new ArrayList<>();
        if (body.get("per_commune") instanceof Map<?, ?> perCommune) {
            for (Object value : perCommune.values()) {
                if (value instanceof Map<?, ?> commune) {
                    Integer h = intOf(commune.get("express_home"));
                    Integer d = intOf(commune.get("express_desk"));
                    if (h != null) {
                        home.add(h);
                    }
                    if (d != null) {
                        desk.add(d);
                    }
                }
            }
        }
        Integer h = mode(home);
        Integer d = mode(desk);
        return h == null && d == null ? null : new Fee(h, d);
    }

    /** Most frequent value; on a tie the higher one, so we never undercharge. */
    static Integer mode(List<Integer> values) {
        Map<Integer, Integer> counts = new TreeMap<>();
        for (Integer v : values) {
            counts.merge(v, 1, Integer::sum);
        }
        Integer best = null;
        int bestCount = 0;
        for (Map.Entry<Integer, Integer> e : counts.entrySet()) {
            if (e.getValue() >= bestCount) {
                best = e.getKey();
                bestCount = e.getValue();
            }
        }
        return best;
    }

    private Summary apply(List<Map<String, Object>> wilayaRows, List<Map<String, Object>> communeRows,
                          List<Map<String, Object>> centerRows, Map<Integer, Fee> fees, int feesSkipped) {
        // ── wilayas: name and open/closed follow Yalidine ──
        Map<Integer, Wilaya> ourWilayas = new HashMap<>();
        wilayas.findAll().forEach(w -> ourWilayas.put(w.getId(), w));
        Set<Integer> yalidineWilayas = new HashSet<>();
        int wilayaCount = 0;
        for (Map<String, Object> row : wilayaRows) {
            Integer id = intOf(row.get("id"));
            Wilaya w = id == null ? null : ourWilayas.get(id);
            if (w == null) {
                continue;
            }
            yalidineWilayas.add(id);
            String name = String.valueOf(row.get("name")).trim();
            if (!name.isEmpty()) {
                w.setName(name);
            }
            w.setActive(truthy(row.get("is_deliverable")));
            wilayaCount++;
        }

        // ── offices: the first (lowest id) office of each commune ──
        Map<Integer, Integer> centerOf = new HashMap<>();
        for (Map<String, Object> row : centerRows) {
            Integer commune = intOf(row.get("commune_id"));
            Integer center = intOf(row.get("center_id"));
            if (commune != null && center != null) {
                centerOf.merge(commune, center, Math::min);
            }
        }

        // ── communes: matched by Yalidine id, else by name inside the wilaya; new ones are added ──
        List<Commune> existing = communes.findAll();
        Map<Integer, Commune> byExternal = new HashMap<>();
        Map<String, Commune> byName = new HashMap<>();
        for (Commune c : existing) {
            if (c.getExternalId() != null) {
                byExternal.put(c.getExternalId(), c);
            }
            byName.putIfAbsent(c.getWilayaId() + "|" + norm(c.getName()), c);
        }

        Set<Commune> seen = new HashSet<>();
        List<Commune> toSave = new ArrayList<>();
        int added = 0;
        int updated = 0;
        for (Map<String, Object> row : communeRows) {
            Integer externalId = intOf(row.get("id"));
            Integer wilayaId = intOf(row.get("wilaya_id"));
            String name = String.valueOf(row.get("name")).trim();
            if (externalId == null || wilayaId == null || name.isEmpty() || !ourWilayas.containsKey(wilayaId)) {
                continue;
            }
            Commune c = byExternal.get(externalId);
            if (c == null) {
                c = byName.get(wilayaId + "|" + norm(name));
            }
            if (c == null || seen.contains(c)) {
                c = new Commune();
                c.setWilayaId(wilayaId);
                added++;
            } else {
                updated++;
            }
            boolean deliverable = truthy(row.get("is_deliverable"));
            c.setName(name);
            c.setExternalId(externalId);
            c.setActive(deliverable);
            c.setHasOffice(deliverable && truthy(row.get("has_stop_desk")));
            c.setCenterId(centerOf.get(externalId));
            seen.add(c);
            toSave.add(c);
        }

        // communes Yalidine no longer lists (in wilayas it covers) stay in the database for old orders but close
        int closed = 0;
        for (Commune c : existing) {
            if (!seen.contains(c) && yalidineWilayas.contains(c.getWilayaId()) && (c.isActive() || c.isHasOffice())) {
                c.setActive(false);
                c.setHasOffice(false);
                toSave.add(c);
                closed++;
            }
        }
        communes.saveAll(toSave);

        // ── every office of every commune: a commune can have several ──
        Map<Integer, Commune> ourByExternal = new HashMap<>();
        for (Commune c : seen) {
            ourByExternal.put(c.getExternalId(), c);
        }
        List<CommuneOffice> officeRows = new ArrayList<>();
        Set<Integer> centersSeen = new HashSet<>();
        for (Map<String, Object> row : centerRows) {
            Integer centerId = intOf(row.get("center_id"));
            Integer communeExternal = intOf(row.get("commune_id"));
            Commune c = communeExternal == null ? null : ourByExternal.get(communeExternal);
            if (centerId == null || c == null || c.getId() == null || !centersSeen.add(centerId)) {
                continue;
            }
            CommuneOffice office = new CommuneOffice();
            office.setId(centerId);
            office.setCommuneId(c.getId());
            String officeName = text(row.get("name"));
            office.setName(officeName == null ? "Yalidine office" : officeName);
            office.setAddress(text(row.get("address")));
            officeRows.add(office);
        }
        offices.deleteAllInBatch();
        offices.saveAll(officeRows);

        Set<Integer> withDesk = new HashSet<>();
        int stopDesks = 0;
        for (Commune c : seen) {
            if (c.isHasOffice()) {
                stopDesks++;
                withDesk.add(c.getWilayaId());
            }
        }

        // ── fees: home and stop-desk price of every wilaya ──
        int feesUpdated = 0;
        for (Map.Entry<Integer, Fee> e : fees.entrySet()) {
            Integer wilayaId = e.getKey();
            if (!ourWilayas.containsKey(wilayaId)) {
                continue;
            }
            Fee fee = e.getValue();
            if (saveRate(wilayaId, DeliveryMethod.HOME, fee.home(), fee.home() != null)) {
                feesUpdated++;
            }
            if (saveRate(wilayaId, DeliveryMethod.STOP_DESK, fee.desk(),
                    fee.desk() != null && withDesk.contains(wilayaId))) {
                feesUpdated++;
            }
        }

        return new Summary(wilayaCount, added, updated, closed, stopDesks, officeRows.size(), feesUpdated,
                feesSkipped);
    }

    /** Returns whether the rate changed. A missing fee only switches the option off. */
    private boolean saveRate(int wilayaId, DeliveryMethod method, Integer fee, boolean available) {
        DeliveryRate rate = rates.findByWilayaIdAndMethod(wilayaId, method).orElseGet(() -> {
            DeliveryRate r = new DeliveryRate();
            r.setWilayaId(wilayaId);
            r.setMethod(method);
            return r;
        });
        boolean isNew = rate.getId() == null;
        int newFee = fee == null ? rate.getFee() : fee;
        boolean changed = isNew || rate.getFee() != newFee || rate.isAvailable() != available;
        rate.setFee(newFee);
        rate.setAvailable(available);
        rates.save(rate);
        return changed;
    }

    // ───────────── small helpers ─────────────

    private static void pause(long ms) {
        if (ms <= 0) {
            return;
        }
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "The sync was interrupted");
        }
    }

    static String norm(String s) {
        return Normalizer.normalize(s == null ? "" : s, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }

    private static String text(Object value) {
        if (value == null) {
            return null;
        }
        String s = String.valueOf(value).trim();
        return s.isEmpty() ? null : s;
    }

    static Integer intOf(Object value) {
        if (value instanceof Number n) {
            return n.intValue();
        }
        if (value instanceof String s) {
            try {
                return Integer.parseInt(s.trim());
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    static boolean truthy(Object value) {
        if (value instanceof Boolean b) {
            return b;
        }
        if (value instanceof Number n) {
            return n.intValue() != 0;
        }
        return value instanceof String s && ("1".equals(s) || "true".equalsIgnoreCase(s));
    }
}
