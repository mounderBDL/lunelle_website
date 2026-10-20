package com.lunelle.backend.common;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.regex.Pattern;

public final class PhoneUtil {

    private static final Pattern LOCAL_MOBILE = Pattern.compile("^0[5-7][0-9]{8}$");

    private PhoneUtil() {
    }

    /** Converts the usual ways of writing an Algerian mobile number to 0XXXXXXXXX, or throws 400. */
    public static String normalize(String raw) {
        if (raw == null) {
            throw invalid();
        }
        StringBuilder digits = new StringBuilder();
        for (char ch : raw.toCharArray()) {
            int d = Character.digit(ch, 10); // also handles Arabic-Indic digits
            if (d >= 0) {
                digits.append(d);
            }
        }
        String s = digits.toString();
        if (s.startsWith("00213")) {
            s = withLeadingZero(s.substring(5));
        } else if (s.startsWith("213")) {
            s = withLeadingZero(s.substring(3));
        } else if (s.length() == 9) {
            s = "0" + s;
        }
        if (!LOCAL_MOBILE.matcher(s).matches()) {
            throw invalid();
        }
        return s;
    }

    public static String mask(String phone) {
        if (phone == null || phone.length() != 10) {
            return "";
        }
        return phone.substring(0, 2) + "******" + phone.substring(8);
    }

    private static String withLeadingZero(String rest) {
        return rest.startsWith("0") ? rest : "0" + rest;
    }

    private static ResponseStatusException invalid() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid phone number");
    }
}