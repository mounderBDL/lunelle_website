package com.lunelle.backend;

import com.lunelle.backend.setting.SocialLinkDtos.SocialLinkDto;
import com.lunelle.backend.setting.SocialLinkDtos.SocialLinkRequest;
import com.lunelle.backend.setting.SocialLinkService;
import com.lunelle.backend.setting.SocialNetwork;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

import static com.lunelle.backend.setting.SocialNetwork.FACEBOOK;
import static com.lunelle.backend.setting.SocialNetwork.INSTAGRAM;
import static com.lunelle.backend.setting.SocialNetwork.OTHER;
import static com.lunelle.backend.setting.SocialNetwork.WEBSITE;
import static com.lunelle.backend.setting.SocialNetwork.WHATSAPP;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SocialLinkServiceTest extends IntegrationTestBase {

    @Autowired
    private SocialLinkService links;

    @AfterEach
    void clear() {
        links.replace(List.of());
    }

    private static SocialLinkRequest link(SocialNetwork network, String label, String url) {
        return new SocialLinkRequest(network, label, url);
    }

    private static void assert400(Throwable t) {
        assertThat(t).isInstanceOfSatisfying(ResponseStatusException.class,
                e -> assertThat(e.getStatusCode().value()).isEqualTo(400));
    }

    @Test
    void linksKeepTheOrderTheyAreSavedIn() {
        SocialLinkRequest instagram = link(INSTAGRAM, null, "https://www.instagram.com/lunelle.scents/");
        SocialLinkRequest facebook = link(FACEBOOK, null, "https://www.facebook.com/lunelle");

        links.replace(List.of(instagram, facebook));
        assertThat(links.list()).extracting(SocialLinkDto::network).containsExactly(INSTAGRAM, FACEBOOK);

        links.replace(List.of(facebook, instagram));
        assertThat(links.list()).extracting(SocialLinkDto::network).containsExactly(FACEBOOK, INSTAGRAM);
    }

    @Test
    void aWhatsAppPhoneNumberBecomesAChatLink() {
        List<SocialLinkDto> saved = links.replace(List.of(link(WHATSAPP, null, "+213 551 23 45 67")));
        assertThat(saved.get(0).url()).isEqualTo("https://wa.me/213551234567");
    }

    @Test
    void onlyWebLinksAreAcceptedAndABadSaveChangesNothing() {
        links.replace(List.of(link(INSTAGRAM, null, "https://www.instagram.com/lunelle.scents/")));

        for (String bad : new String[]{"javascript:alert(1)", "instagram.com/lunelle", "https://", "ftp://example.com/x"}) {
            assertThatThrownBy(() -> links.replace(List.of(link(FACEBOOK, null, bad))))
                    .as("input: " + bad)
                    .satisfies(SocialLinkServiceTest::assert400);
        }
        assertThat(links.list()).hasSize(1);
    }

    @Test
    void otherLinksNeedANameAndThereIsALimit() {
        assertThatThrownBy(() -> links.replace(List.of(link(OTHER, " ", "https://example.com/blog"))))
                .satisfies(SocialLinkServiceTest::assert400);

        // a website name is optional
        links.replace(List.of(link(WEBSITE, null, "https://example.com")));

        List<SocialLinkRequest> tooMany = new ArrayList<>();
        for (int i = 0; i < 11; i++) {
            tooMany.add(link(OTHER, "Link " + i, "https://example.com/" + i));
        }
        assertThatThrownBy(() -> links.replace(tooMany)).satisfies(SocialLinkServiceTest::assert400);
    }
}