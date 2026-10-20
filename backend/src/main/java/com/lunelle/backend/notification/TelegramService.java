package com.lunelle.backend.notification;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Talks to the Telegram Bot API. The token is part of every request URL, so exceptions are
 * logged by class name only: their messages could contain the URL (and therefore the token).
 */
@Slf4j
@Service
public class TelegramService {

    public record ChatInfo(String id, String type, String name) {
    }

    private static final String API = "https://api.telegram.org";
    private static final Pattern CHAT_OBJECT = Pattern.compile("\"chat\":(\\{[^{}]*\\})");
    private static final Pattern ID = Pattern.compile("\"id\":(-?\\d+)");
    private static final Pattern TYPE = Pattern.compile("\"type\":\"(\\w+)\"");
    private static final Pattern TITLE = Pattern.compile("\"title\":\"((?:[^\"\\\\]|\\\\.)*)\"");
    private static final Pattern FIRST_NAME = Pattern.compile("\"first_name\":\"((?:[^\"\\\\]|\\\\.)*)\"");
    private static final Pattern USERNAME = Pattern.compile("\"username\":\"((?:[^\"\\\\]|\\\\.)*)\"");

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    @Value("${app.telegram.bot-token:}")
    private String token;

    public boolean enabled() {
        return token != null && !token.isBlank();
    }

    /** Sends an HTML-formatted message. Retries temporary failures; returns whether it was delivered. */
    public boolean send(String chatId, String htmlText) {
        if (!enabled()) {
            return false;
        }
        String text = htmlText.length() > 3800 ? htmlText.substring(0, 3800) : htmlText;
        for (int attempt = 1; attempt <= 3; attempt++) {
            try {
                HttpResponse<String> res = call("sendMessage", Map.of(
                        "chat_id", chatId,
                        "text", text,
                        "parse_mode", "HTML",
                        "disable_web_page_preview", "true"));
                int status = res.statusCode();
                if (status / 100 == 2) {
                    return true;
                }
                if (status != 429 && status / 100 == 4) {
                    log.warn("Telegram rejected the message (HTTP {}): check the bot token and the chat id", status);
                    return false;
                }
                log.warn("Telegram temporary failure (HTTP {}), attempt {}", status, attempt);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return false;
            } catch (Exception e) {
                log.warn("Telegram request failed ({}), attempt {}", e.getClass().getSimpleName(), attempt);
            }
            if (attempt < 3) {
                try {
                    Thread.sleep(attempt * 2000L);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    return false;
                }
            }
        }
        return false;
    }

    /** Lists the chats that recently wrote to the bot, so the admin can find the chat id to save. */
    public List<ChatInfo> detectChats() {
        if (!enabled()) {
            return List.of();
        }
        try {
            HttpResponse<String> res = call("getUpdates", Map.of("limit", "100"));
            if (res.statusCode() / 100 != 2) {
                log.warn("Telegram getUpdates failed (HTTP {})", res.statusCode());
                return List.of();
            }
            Map<String, ChatInfo> chats = new LinkedHashMap<>();
            Matcher m = CHAT_OBJECT.matcher(res.body());
            while (m.find()) {
                String obj = m.group(1);
                String id = first(ID, obj);
                if (id == null) {
                    continue;
                }
                String name = first(TITLE, obj);
                if (name == null) {
                    name = first(FIRST_NAME, obj);
                    String username = first(USERNAME, obj);
                    if (username != null) {
                        name = (name == null ? "" : name + " ") + "@" + username;
                    }
                }
                chats.put(id, new ChatInfo(id, first(TYPE, obj), name));
            }
            return new ArrayList<>(chats.values());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return List.of();
        } catch (Exception e) {
            log.warn("Telegram getUpdates failed ({})", e.getClass().getSimpleName());
            return List.of();
        }
    }

    private HttpResponse<String> call(String method, Map<String, String> params) throws Exception {
        String body = params.entrySet().stream()
                .map(e -> enc(e.getKey()) + "=" + enc(e.getValue()))
                .collect(Collectors.joining("&"));
        HttpRequest request = HttpRequest.newBuilder(URI.create(API + "/bot" + token.trim() + "/" + method))
                .timeout(Duration.ofSeconds(10))
                .header("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        return http.send(request, HttpResponse.BodyHandlers.ofString());
    }

    private static String first(Pattern pattern, String text) {
        Matcher m = pattern.matcher(text);
        return m.find() ? m.group(1) : null;
    }

    private static String enc(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }
}