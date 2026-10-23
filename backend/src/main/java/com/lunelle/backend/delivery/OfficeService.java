package com.lunelle.backend.delivery;

import com.lunelle.backend.delivery.DeliveryDtos.AdminCommuneDto;
import com.lunelle.backend.delivery.DeliveryDtos.OfficeImportResult;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** Which communes have a Yalidine pick-up office (the only ones offered for "office" delivery). */
@Service
@RequiredArgsConstructor
public class OfficeService {

    private static final int MAX_REPORTED = 20;
    private static final Set<String> YES = Set.of("1", "yes", "y", "true", "x", "oui", "o");

    private final WilayaRepository wilayas;
    private final CommuneRepository communes;

    @Transactional(readOnly = true)
    public List<AdminCommuneDto> communesOf(int wilayaId) {
        requireWilaya(wilayaId);
        return communes.findByWilayaIdOrderByNameAsc(wilayaId).stream().map(OfficeService::toDto).toList();
    }

    /** The given communes become THE offices of this wilaya (all others are cleared). */
    @Transactional
    public List<AdminCommuneDto> setOffices(int wilayaId, List<Integer> communeIds) {
        requireWilaya(wilayaId);
        Set<Integer> wanted = new HashSet<>(communeIds);
        List<Commune> inWilaya = communes.findByWilayaIdOrderByNameAsc(wilayaId);
        Set<Integer> known = new HashSet<>();
        inWilaya.forEach(c -> known.add(c.getId()));
        if (!known.containsAll(wanted)) {
            throw bad("Some communes do not belong to this wilaya");
        }
        for (Commune c : inWilaya) {
            c.setHasOffice(wanted.contains(c.getId()));
        }
        return inWilaya.stream().map(OfficeService::toDto).toList();
    }

    /** Every commune with its current flag: the client fills the has_office column and sends it back. */
    @Transactional(readOnly = true)
    public String exportCsv() {
        Map<Integer, String> wilayaNames = new HashMap<>();
        wilayas.findAll().forEach(w -> wilayaNames.put(w.getId(), w.getName()));

        StringBuilder sb = new StringBuilder("\uFEFF"); // BOM so Excel reads the accents correctly
        sb.append("commune_id;wilaya_code;wilaya_name;commune_name;has_office\r\n");
        for (Commune c : communes.findAllByOrderByWilayaIdAscNameAsc()) {
            sb.append(c.getId()).append(';')
                    .append(c.getWilayaId()).append(';')
                    .append(csv(wilayaNames.get(c.getWilayaId()))).append(';')
                    .append(csv(c.getName())).append(';')
                    .append(c.isHasOffice() ? "yes" : "")
                    .append("\r\n");
        }
        return sb.toString();
    }

    /**
     * Reads the exported file back. Only commune_id and has_office are used (names are ignored, so
     * spelling or encoding problems cannot cause mismatches). Communes missing from the file are untouched.
     */
    @Transactional
    public OfficeImportResult importCsv(byte[] bytes) {
        if (bytes.length >= 2 && ((bytes[0] == (byte) 0xFF && bytes[1] == (byte) 0xFE)
                || (bytes[0] == (byte) 0xFE && bytes[1] == (byte) 0xFF))) {
            throw bad("Save the file as CSV (comma or semicolon delimited), not as Unicode text");
        }
        String text = new String(bytes, StandardCharsets.UTF_8);

        try (BufferedReader reader = new BufferedReader(new StringReader(text))) {
            String header = reader.readLine();
            if (header == null) {
                throw bad("The file is empty");
            }
            header = header.replace("\uFEFF", "");
            char delimiter = CommuneImporter.detectDelimiter(header);
            List<String> columns = CommuneImporter.parseLine(header, delimiter).stream()
                    .map(s -> s.toLowerCase(Locale.ROOT))
                    .toList();
            int idIdx = columns.indexOf("commune_id");
            int flagIdx = columns.indexOf("has_office");
            if (idIdx < 0 || flagIdx < 0) {
                throw bad("The file must contain the columns commune_id and has_office. Use the exported file.");
            }

            Map<Integer, Commune> byId = new HashMap<>();
            communes.findAll().forEach(c -> byId.put(c.getId(), c));

            int rows = 0;
            int withOffice = 0;
            int changed = 0;
            int ignored = 0;
            List<String> unknown = new ArrayList<>();

            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) {
                    continue;
                }
                List<String> fields = CommuneImporter.parseLine(line, delimiter);
                if (fields.size() <= Math.max(idIdx, flagIdx)) {
                    ignored++;
                    continue;
                }
                String rawId = fields.get(idIdx).trim();
                Commune commune = null;
                try {
                    commune = byId.get(Integer.parseInt(rawId));
                } catch (NumberFormatException ignoredException) {
                    // handled below
                }
                if (commune == null) {
                    if (unknown.size() < MAX_REPORTED) {
                        unknown.add(rawId);
                    }
                    continue;
                }
                boolean flag = YES.contains(fields.get(flagIdx).trim().toLowerCase(Locale.ROOT));
                rows++;
                if (flag) {
                    withOffice++;
                }
                if (commune.isHasOffice() != flag) {
                    commune.setHasOffice(flag);
                    changed++;
                }
            }
            return new OfficeImportResult(rows, withOffice, changed, ignored, unknown);
        } catch (IOException e) {
            throw bad("Could not read the file");
        }
    }

    private void requireWilaya(int wilayaId) {
        if (!wilayas.existsById(wilayaId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown wilaya");
        }
    }

    private static AdminCommuneDto toDto(Commune c) {
        return new AdminCommuneDto(c.getId(), c.getName(), c.isActive(), c.isHasOffice());
    }

    private static String csv(String value) {
        if (value == null) {
            return "";
        }
        if (value.contains(";") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
