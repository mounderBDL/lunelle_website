package com.lunelle.backend.shipping;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.json.JsonParser;
import org.springframework.boot.json.JsonParserFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Talks to the Yalidine API. The id and token travel in headers and are never logged; exceptions are logged
 * by class name only. Creating a parcel is tried exactly once, because a second try could create a second parcel.
 */
@Slf4j
@Service
public class YalidineClient {

    /** What Yalidine needs to know about one parcel. */
    public record ParcelData(String orderId, String firstname, String familyname, String phone, String address,
                             String toCommune, String toWilaya, String products, int price, boolean stopDesk) {
    }

    private static final Pattern SUCCESS = Pattern.compile("\"success\"\\s*:\\s*(true|false)");
    private static final Pattern TRACKING = Pattern.compile("\"tracking\"\\s*:\\s*\"([^\"]+)\"");
    private static final Pattern MESSAGE = Pattern.compile("\"message\"\\s*:\\s*\"((?:[^\"\\\\]|\\\\.)*)\"");
    private static final Pattern CENTER_ID = Pattern.compile("\"center_id\"\\s*:\\s*(\\d+)");

    private static final JsonParser JSON = JsonParserFactory.getJsonParser();

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    @Value("${app.yalidine.api-id:}")
    private String apiId;

    @Value("${app.yalidine.api-token:}")
    private String apiToken;

    @Value("${app.yalidine.from-wilaya:}")
    private String fromWilaya;

    @Value("${app.yalidine.base-url:https://api.yalidine.app/v1}")
    private String baseUrl;

    public boolean enabled() {
        return notBlank(apiId) && notBlank(apiToken) && notBlank(fromWilaya);
    }

    public String fromWilaya() {
        return fromWilaya == null ? "" : fromWilaya.trim();
    }

    /** GETs a path (for example "wilayas/") and parses the JSON object that comes back. */
    public Map<String, Object> getJson(String path) {
        HttpResponse<String> res = send(get(path), false);
        try {
            return JSON.parseMap(res.body());
        } catch (RuntimeException e) {
            throw new YalidineException(HttpStatus.BAD_GATEWAY, "Yalidine sent an answer we could not read");
        }
    }

    /** Every item of a paged list, following "has_more" page after page. */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getAll(String path) {
        List<Map<String, Object>> all = new ArrayList<>();
        for (int page = 1; page <= 100; page++) {
            Map<String, Object> body =
                    getJson(path + (path.contains("?") ? "&" : "?") + "page_size=500&page=" + page);
            if (body.get("data") instanceof List<?> items) {
                for (Object item : items) {
                    if (item instanceof Map<?, ?> map) {
                        all.add((Map<String, Object>) map);
                    }
                }
            }
            if (!Boolean.TRUE.equals(body.get("has_more"))) {
                break;
            }
        }
        return all;
    }

    /** The delivery fees from one wilaya to another, per commune. */
    public Map<String, Object> fees(int fromWilayaId, int toWilayaId) {
        return getJson("fees/?from_wilaya_id=" + fromWilayaId + "&to_wilaya_id=" + toWilayaId);
    }

    /** The id of the Yalidine office that serves a commune (needed for stop-desk parcels). */
    public int centerFor(int communeExternalId) {
        HttpResponse<String> res = send(get("centers/?commune_id=" + communeExternalId), false);
        Matcher m = CENTER_ID.matcher(res.body());
        if (!m.find()) {
            throw new YalidineException(HttpStatus.CONFLICT, "Yalidine has no office listed for this commune");
        }
        return Integer.parseInt(m.group(1));
    }

    /** Creates the parcel and returns its tracking number. */
    public String createParcel(ParcelData d, Integer stopDeskId) {
        String body = "[" + json(d, stopDeskId) + "]";
        HttpRequest request = request("parcels/")
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        HttpResponse<String> res = send(request, true);

        String text = res.body();
        Matcher success = SUCCESS.matcher(text);
        if (success.find() && "false".equals(success.group(1))) {
            Matcher message = MESSAGE.matcher(text);
            throw new YalidineException(HttpStatus.BAD_REQUEST,
                    "Yalidine refused the parcel" + (message.find() ? ": " + unescape(message.group(1)) : ""));
        }
        Matcher tracking = TRACKING.matcher(text);
        if (!tracking.find()) {
            log.warn("Yalidine accepted a parcel request but returned no tracking number");
            throw new YalidineException(HttpStatus.BAD_GATEWAY,
                    "Yalidine did not return a tracking number. Check the Yalidine panel before trying again.");
        }
        return tracking.group(1);
    }

    // ───────────── plumbing ─────────────

    private HttpRequest get(String path) {
        return request(path).GET().build();
    }

    private HttpRequest.Builder request(String path) {
        String base = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
        return HttpRequest.newBuilder(URI.create(base + path))
                .timeout(Duration.ofSeconds(20))
                .header("X-API-ID", apiId.trim())
                .header("X-API-TOKEN", apiToken.trim());
    }

    private HttpResponse<String> send(HttpRequest request, boolean mayHaveCreatedSomething) {
        if (!enabled()) {
            throw new YalidineException(HttpStatus.CONFLICT, "Yalidine is not set up on the server yet");
        }
        HttpResponse<String> res;
        try {
            res = http.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new YalidineException(HttpStatus.BAD_GATEWAY, "The request to Yalidine was interrupted");
        } catch (HttpTimeoutException e) {
            throw unanswered(mayHaveCreatedSomething);
        } catch (IOException e) {
            log.warn("Yalidine request failed ({})", e.getClass().getSimpleName());
            throw unanswered(mayHaveCreatedSomething);
        }

        int status = res.statusCode();
        if (status / 100 == 2) {
            return res;
        }
        log.warn("Yalidine answered HTTP {}", status);
        if (status == 401 || status == 403) {
            throw new YalidineException(HttpStatus.BAD_GATEWAY,
                    "Yalidine refused the API id or token. Check them in the server settings.");
        }
        if (status == 429) {
            throw new YalidineException(HttpStatus.TOO_MANY_REQUESTS,
                    "Yalidine is receiving too many requests. Wait a minute and try again.");
        }
        Matcher message = MESSAGE.matcher(res.body());
        throw new YalidineException(status / 100 == 4 ? HttpStatus.BAD_REQUEST : HttpStatus.BAD_GATEWAY,
                "Yalidine said no" + (message.find() ? ": " + unescape(message.group(1)) : " (HTTP " + status + ")"));
    }

    private static YalidineException unanswered(boolean mayHaveCreatedSomething) {
        return new YalidineException(HttpStatus.BAD_GATEWAY, mayHaveCreatedSomething
                ? "Yalidine did not answer. Check the Yalidine panel to see whether the parcel was created before trying again."
                : "Yalidine did not answer. Please try again in a moment.");
    }

    private String json(ParcelData d, Integer stopDeskId) {
        StringBuilder sb = new StringBuilder("{");
        field(sb, "order_id", d.orderId());
        field(sb, "from_wilaya_name", fromWilaya.trim());
        field(sb, "firstname", d.firstname());
        field(sb, "familyname", d.familyname());
        field(sb, "contact_phone", d.phone());
        field(sb, "address", d.address());
        field(sb, "to_commune_name", d.toCommune());
        field(sb, "to_wilaya_name", d.toWilaya());
        field(sb, "product_list", d.products());
        sb.append("\"price\":").append(d.price()).append(',');
        sb.append("\"do_insurance\":false,");
        sb.append("\"declared_value\":").append(d.price()).append(',');
        sb.append("\"length\":15,\"width\":15,\"height\":10,\"weight\":1,");
        sb.append("\"freeshipping\":false,");
        sb.append("\"is_stopdesk\":").append(d.stopDesk()).append(',');
        if (d.stopDesk() && stopDeskId != null) {
            sb.append("\"stopdesk_id\":").append(stopDeskId).append(',');
        }
        sb.append("\"has_exchange\":false}");
        return sb.toString();
    }

    private static void field(StringBuilder sb, String name, String value) {
        sb.append('"').append(name).append("\":\"").append(escape(value)).append("\",");
    }

    static String escape(String s) {
        StringBuilder out = new StringBuilder();
        for (char c : (s == null ? "" : s).toCharArray()) {
            switch (c) {
                case '"' -> out.append("\\\"");
                case '\\' -> out.append("\\\\");
                case '\n' -> out.append("\\n");
                case '\r' -> out.append("\\r");
                case '\t' -> out.append("\\t");
                default -> {
                    if (c < 0x20) {
                        out.append(String.format("\\u%04x", (int) c));
                    } else {
                        out.append(c);
                    }
                }
            }
        }
        return out.toString();
    }

    private static String unescape(String s) {
        return s.replace("\\\"", "\"").replace("\\n", " ").replace("\\\\", "\\");
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
