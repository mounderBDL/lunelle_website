package com.lunelle.backend.common;

import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;
import java.util.regex.Pattern;

/**
 * Works out which client a request comes from, for per-IP rate limits.
 *
 * <p>Requests normally arrive through the Next.js server (a trusted proxy), which forwards the browser's
 * headers untouched. So the real address can only come from a header that the outermost proxy
 * (Cloudflare, nginx...) always <b>overwrites</b>, named in {@code app.client-ip.header}:
 * {@code CF-Connecting-IP} behind Cloudflare, {@code X-Real-IP} behind nginx/Caddy. That header is read
 * only when the request comes from a trusted proxy; a direct caller is identified by its own address.
 *
 * <p>Returns {@code null} ("unknown") when the client can't be told apart safely, and the per-IP limits
 * are then skipped. Grouping every customer under the proxy's address would block them all together.
 *
 * <p>IPv6 clients are grouped by /64, since one connection usually gets a whole /64 to rotate through.
 */
@Slf4j
@Component
public class ClientIps {

    private static final Pattern IPV4 =
            Pattern.compile("^((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\.){3}(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)$");
    private static final Pattern IPV6_CHARS = Pattern.compile("^[0-9a-fA-F:.]{2,45}$");

    private final String header;
    private final List<InetAddress> trustedProxies;

    public ClientIps(@Value("${app.client-ip.header:}") String header,
                     @Value("${app.client-ip.trusted-proxies:127.0.0.1,::1}") List<String> trustedProxies) {
        this.header = header == null ? "" : header.trim();
        this.trustedProxies = trustedProxies.stream()
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> {
                    InetAddress a = parse(s);
                    if (a == null) {
                        throw new IllegalStateException("app.client-ip.trusted-proxies: not an IP address: " + s);
                    }
                    return a;
                })
                .toList();
    }

    @PostConstruct
    void warnIfOff() {
        if (header.isEmpty()) {
            log.warn("app.client-ip.header is not set: per-IP limits on login, order lookup and checkout are OFF. "
                    + "Set CLIENT_IP_HEADER once the site runs behind its HTTPS proxy.");
        }
    }

    /** The rate-limit key of the client behind the current HTTP request, or null if unknown / no request. */
    public String current() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            return of(attrs.getRequest());
        }
        return null;
    }

    /** The rate-limit key of the client behind this request, or null if it can't be known safely. */
    public String of(HttpServletRequest request) {
        InetAddress peer = parse(request.getRemoteAddr());
        if (peer == null) {
            return null;
        }
        if (!trustedProxies.contains(peer)) {
            return bucket(peer); // talking to us directly: its own address can't be faked
        }
        if (header.isEmpty()) {
            return null;
        }
        String value = request.getHeader(header);
        if (value == null || value.isBlank()) {
            return null;
        }
        // a list ("a, b") is read from the right: the last entry was written by the proxy closest to us
        String[] parts = value.split(",");
        InetAddress client = parse(parts[parts.length - 1].trim());
        return client == null ? null : bucket(client);
    }

    /** Parses an IP literal only (never a DNS lookup). Null if it isn't one. */
    static InetAddress parse(String raw) {
        if (raw == null) {
            return null;
        }
        String s = raw.trim();
        if (s.startsWith("[") && s.endsWith("]")) {
            s = s.substring(1, s.length() - 1);
        }
        int zone = s.indexOf('%');
        if (zone >= 0) {
            s = s.substring(0, zone);
        }
        boolean literal = IPV4.matcher(s).matches() || (s.contains(":") && IPV6_CHARS.matcher(s).matches());
        if (!literal) {
            return null;
        }
        try {
            return InetAddress.getByName(s); // a literal: parsed, not looked up
        } catch (UnknownHostException e) {
            return null;
        }
    }

    static String bucket(InetAddress address) {
        if (address instanceof Inet6Address) {
            byte[] b = address.getAddress();
            HexFormat hex = HexFormat.of();
            return hex.formatHex(b, 0, 2) + ":" + hex.formatHex(b, 2, 4) + ":"
                    + hex.formatHex(b, 4, 6) + ":" + hex.formatHex(b, 6, 8) + "::/64";
        }
        return Objects.requireNonNull(address).getHostAddress();
    }
}
