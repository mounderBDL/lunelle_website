package com.lunelle.backend.delivery;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Loads data/communes.csv into the commune table, once, when the table is empty.
 * Expected columns (by name): commune_name, wilaya_code.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CommuneImporter implements ApplicationRunner {

    private static final String FILE = "data/communes.csv";

    private final CommuneRepository communes;
    private final WilayaRepository wilayas;

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws Exception {
        ClassPathResource resource = new ClassPathResource(FILE);
        if (!resource.exists()) {
            log.info("{} not found, skipping commune import", FILE);
            return;
        }
        if (communes.count() > 0) {
            return;
        }

        Set<Integer> knownWilayas = wilayas.findAll().stream()
                .map(Wilaya::getId)
                .collect(Collectors.toSet());
        List<Commune> toSave = new ArrayList<>();
        int skipped = 0;

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {

            String header = reader.readLine();
            if (header == null) {
                throw new IllegalStateException(FILE + " is empty");
            }
            header = header.replace("\uFEFF", ""); // strip BOM if present
            char delimiter = detectDelimiter(header);

            List<String> columns = parseLine(header, delimiter).stream()
                    .map(String::toLowerCase)
                    .toList();
            int nameIdx = columns.indexOf("commune_name");
            int codeIdx = columns.indexOf("wilaya_code");
            if (nameIdx < 0 || codeIdx < 0) {
                throw new IllegalStateException(
                        "Expected columns commune_name and wilaya_code in " + FILE + ", found: " + columns);
            }

            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) {
                    continue;
                }
                List<String> fields = parseLine(line, delimiter);
                if (fields.size() <= Math.max(nameIdx, codeIdx)) {
                    skipped++;
                    continue;
                }
                String name = fields.get(nameIdx);
                int wilayaId;
                try {
                    wilayaId = Integer.parseInt(fields.get(codeIdx));
                } catch (NumberFormatException e) {
                    skipped++;
                    continue;
                }
                if (name.isBlank() || !knownWilayas.contains(wilayaId)) {
                    skipped++;
                    continue;
                }
                Commune commune = new Commune();
                commune.setWilayaId(wilayaId);
                commune.setName(name);
                toSave.add(commune);
            }
        }

        communes.saveAll(toSave);
        log.info("Imported {} communes ({} rows skipped)", toSave.size(), skipped);
    }

    private static char detectDelimiter(String header) {
        char best = ',';
        long bestCount = -1;
        for (char candidate : new char[]{'\t', ',', ';'}) {
            long count = header.chars().filter(c -> c == candidate).count();
            if (count > bestCount) {
                best = candidate;
                bestCount = count;
            }
        }
        return best;
    }

    /** Minimal CSV line parser: supports quoted fields and doubled quotes. */
    private static List<String> parseLine(String line, char delimiter) {
        List<String> out = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (inQuotes) {
                if (c == '"') {
                    if (i + 1 < line.length() && line.charAt(i + 1) == '"') {
                        current.append('"');
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    current.append(c);
                }
            } else if (c == '"') {
                inQuotes = true;
            } else if (c == delimiter) {
                out.add(current.toString().trim());
                current.setLength(0);
            } else {
                current.append(c);
            }
        }
        out.add(current.toString().trim());
        return out;
    }
}