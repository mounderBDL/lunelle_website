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
@AllArgsConstructor
public class Setting {

    @Id
    @Column(name = "key", length = 100)
    private String key;

    @Column(name = "value", nullable = false)
    private String value;
}
