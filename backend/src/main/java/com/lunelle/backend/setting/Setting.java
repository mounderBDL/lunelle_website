package com.lunelle.backend.setting;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "setting")
@Getter
@Setter
@NoArgsConstructor
public class Setting {

    public Setting(String key, String value) {
        this.key = key;
        this.value = value;
    }
    @Id
    @Column(name = "key", length = 100)
    private String key;

    @Column(name = "value", nullable = false)
    private String value;
}
