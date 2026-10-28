package com.lunelle.backend.setting;

import com.lunelle.backend.common.PhoneUtil;
import com.lunelle.backend.setting.SocialLinkDtos.SocialLinkDto;
import com.lunelle.backend.setting.SocialLinkDtos.SocialLinkRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class SocialLinkService {

    private static final int MAX_LINKS = 10;

    private final SocialLinkRepository links;

    @Transactional(readOnly = true)
    public List<SocialLinkDto> list() {
        return links.findAllByOrderBySortOrderAsc().stream().map(SocialLinkService::toDto).toList();
    }

    /** Replaces the whole list; the order sent is the order shown in the shop's footer. */
    @Transactional
    public List<SocialLinkDto> replace(List<SocialLinkRequest> requests) {
        if (requests.size() > MAX_LINKS) {
            throw bad("You can add up to " + MAX_LINKS + " links");
        }
        List<SocialLink> fresh = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        int order = 0;
        for (SocialLinkRequest r : requests) {
            String url = normalizeUrl(r.network(), r.url());
            if (!seen.add(url.toLowerCase(Locale.ROOT))) {
                throw bad("The same link is listed twice");
            }
            String label = r.label() == null ? null : r.label().trim();
            if (label != null && label.isEmpty()) {
                label = null;
            }
            if (r.network() == SocialNetwork.OTHER && label == null) {
                throw bad("Give a name to this link: " + url);
            }
            if (r.network() != SocialNetwork.OTHER && r.network() != SocialNetwork.WEBSITE) {
                label = null; // known networks are shown with their own name
            }
            SocialLink link = new SocialLink();
            link.setNetwork(r.network());
            link.setLabel(label);
            link.setUrl(url);
            link.setSortOrder(order++);
            fresh.add(link);
        }
        links.deleteAllInBatch();
        links.saveAll(fresh);
        return fresh.stream().map(SocialLinkService::toDto).toList();
    }

    private static String normalizeUrl(SocialNetwork network, String raw) {
        String text = raw == null ? "" : raw.trim();
        if (network == SocialNetwork.WHATSAPP && !text.regionMatches(true, 0, "http", 0, 4)) {
            // a plain phone number: build the WhatsApp chat link
            String phone = PhoneUtil.normalize(text);
            return "https://wa.me/213" + phone.substring(1);
        }
        if (text.length() > 300) {
            throw bad("A link is too long");
        }
        try {
            URI uri = new URI(text);
            String scheme = uri.getScheme();
            boolean web = scheme != null && (scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"));
            if (!web || uri.getHost() == null) {
                throw bad("Links must start with http:// or https://");
            }
        } catch (URISyntaxException e) {
            throw bad("This link is not valid: " + text);
        }
        return text;
    }

    private static SocialLinkDto toDto(SocialLink l) {
        return new SocialLinkDto(l.getId(), l.getNetwork(), l.getLabel(), l.getUrl());
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}