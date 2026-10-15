package com.lunelle.backend.products.service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Iterator;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class ProductImageValidator {

    private static final long MAX_FILE_SIZE = 5L * 1024 * 1024;
    private static final int MAX_DIMENSION = 6000;
    private static final long MAX_PIXELS = 24_000_000L;

    public byte[] validateAndRead(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException(
                "Please select an image to upload."
            );
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException(
                "The image must not exceed 5 MB."
            );
        }

        try {
            byte[] bytes = file.getBytes();
            String expectedFormat = detectFormat(bytes);

            try (ImageInputStream input =
                     ImageIO.createImageInputStream(
                         new ByteArrayInputStream(bytes)
                     )) {

                if (input == null) {
                    throw new IllegalArgumentException(
                        "The uploaded file is not a valid image."
                    );
                }

                Iterator<ImageReader> readers =
                    ImageIO.getImageReaders(input);

                if (!readers.hasNext()) {
                    throw new IllegalArgumentException(
                        "This image format is not supported."
                    );
                }

                ImageReader reader = readers.next();

                try {
                    reader.setInput(input, true, true);

                    String actualFormat =
                        reader.getFormatName().toLowerCase();

                    if (!actualFormat.equals(expectedFormat)) {
                        throw new IllegalArgumentException(
                            "The image content does not match its format."
                        );
                    }

                    int width = reader.getWidth(0);
                    int height = reader.getHeight(0);

                    if (width <= 0 || height <= 0
                        || width > MAX_DIMENSION
                        || height > MAX_DIMENSION
                        || (long) width * height > MAX_PIXELS) {
                        throw new IllegalArgumentException(
                            "Image dimensions exceed the allowed limits."
                        );
                    }
                } finally {
                    reader.dispose();
                }
            }

            return bytes;

        } catch (IOException exception) {
            throw new IllegalArgumentException(
                "The uploaded file could not be read as an image.",
                exception
            );
        }
    }

    private String detectFormat(byte[] bytes) {
        if (bytes.length >= 3
            && (bytes[0] & 0xFF) == 0xFF
            && (bytes[1] & 0xFF) == 0xD8
            && (bytes[2] & 0xFF) == 0xFF) {
            return "jpeg";
        }

        byte[] pngSignature = {
            (byte) 0x89, 0x50, 0x4E, 0x47,
            0x0D, 0x0A, 0x1A, 0x0A
        };

        if (bytes.length >= 8) {
            boolean matches = true;

            for (int i = 0; i < pngSignature.length; i++) {
                if (bytes[i] != pngSignature[i]) {
                    matches = false;
                    break;
                }
            }

            if (matches) {
                return "png";
            }
        }

        if (bytes.length >= 12
            && bytes[0] == 'R'
            && bytes[1] == 'I'
            && bytes[2] == 'F'
            && bytes[3] == 'F'
            && bytes[8] == 'W'
            && bytes[9] == 'E'
            && bytes[10] == 'B'
            && bytes[11] == 'P') {
            return "webp";
        }

        throw new IllegalArgumentException(
            "Only JPEG, PNG, and WebP images are accepted."
        );
    }
}
