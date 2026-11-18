package com.lunelle.backend.common;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ClientIpsTest {

    private static final List<String> LOCAL = List.of("127.0.0.1", "::1");

    private static MockHttpServletRequest from(String peer) {
        MockHttpServletRequest r = new MockHttpServletRequest();
        r.setRemoteAddr(peer);
        return r;
    }

    @Test
    void withoutAHeaderSettingRequestsThroughTheProxyAreUnknown() {
        ClientIps ips = new ClientIps("", LOCAL);
        MockHttpServletRequest r = from("127.0.0.1");
        r.addHeader("X-Real-IP", "203.0.113.7");
        r.addHeader("X-Forwarded-For", "203.0.113.7");
        assertThat(ips.of(r)).isNull(); // never guess: all customers would share 127.0.0.1
    }

    @Test
    void theConfiguredHeaderIsReadFromATrustedProxy() {
        ClientIps ips = new ClientIps("CF-Connecting-IP", LOCAL);
        MockHttpServletRequest r = from("127.0.0.1");
        r.addHeader("CF-Connecting-IP", "203.0.113.7");
        r.addHeader("X-Forwarded-For", "1.1.1.1"); // other headers are ignored
        assertThat(ips.of(r)).isEqualTo("203.0.113.7");
    }

    @Test
    void theHeaderIsIgnoredFromAnyoneElse() {
        ClientIps ips = new ClientIps("X-Real-IP", LOCAL);
        MockHttpServletRequest r = from("198.51.100.9");
        r.addHeader("X-Real-IP", "1.2.3.4");
        assertThat(ips.of(r)).isEqualTo("198.51.100.9");
    }

    @Test
    void aListIsReadFromTheRight() {
        ClientIps ips = new ClientIps("X-Real-IP", LOCAL);
        MockHttpServletRequest r = from("::1");
        r.addHeader("X-Real-IP", "6.6.6.6, 203.0.113.7");
        assertThat(ips.of(r)).isEqualTo("203.0.113.7");
    }

    @Test
    void garbageAndHostnamesAreUnknown() {
        ClientIps ips = new ClientIps("X-Real-IP", LOCAL);
        for (String bad : List.of("not-an-ip", "example.com", "999.1.1.1", "abc.def", "")) {
            MockHttpServletRequest r = from("127.0.0.1");
            r.addHeader("X-Real-IP", bad);
            assertThat(ips.of(r)).as(bad).isNull();
        }
    }

    @Test
    void ipv6IsGroupedByItsSlash64() {
        ClientIps ips = new ClientIps("X-Real-IP", LOCAL);
        MockHttpServletRequest a = from("127.0.0.1");
        a.addHeader("X-Real-IP", "2001:db8:1:2:aaaa::1");
        MockHttpServletRequest b = from("127.0.0.1");
        b.addHeader("X-Real-IP", "2001:db8:1:2:bbbb::9");
        assertThat(ips.of(a)).isEqualTo("2001:0db8:0001:0002::/64").isEqualTo(ips.of(b));
    }

    @Test
    void ipv4MappedAddressesCountAsIpv4() {
        ClientIps ips = new ClientIps("X-Real-IP", LOCAL);
        MockHttpServletRequest r = from("127.0.0.1");
        r.addHeader("X-Real-IP", "::ffff:203.0.113.7");
        assertThat(ips.of(r)).isEqualTo("203.0.113.7");
    }
}
