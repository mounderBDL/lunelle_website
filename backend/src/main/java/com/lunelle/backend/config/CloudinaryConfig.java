package com.lunelle.backend.config;

import com.cloudinary.Cloudinary;
import java.util.HashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CloudinaryConfig {

    @Bean
    public Cloudinary cloudinary(
        @Value("${cloudinary.cloud-name}") String cloudName,
        @Value("${cloudinary.api-key}") String apiKey,
        @Value("${cloudinary.api-secret}") String apiSecret
    ) {
        Map<String, String> configuration = new HashMap<>();
        configuration.put("cloud_name", cloudName);
        configuration.put("api_key", apiKey);
        configuration.put("api_secret", apiSecret);
        configuration.put("secure", "true");

        return new Cloudinary(configuration);
    }
}