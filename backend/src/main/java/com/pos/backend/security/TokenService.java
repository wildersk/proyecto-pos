package com.pos.backend.security;

import com.pos.backend.model.Usuario;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Service
public class TokenService {

    public static final String ISSUER = "proyecto-pos-backend";
    public static final String ROLES_CLAIM = "roles";

    private final JwtEncoder encoder;
    private final Duration expiration;

    public TokenService(JwtEncoder encoder, @Value("${pos.jwt.expiration:8h}") Duration expiration) {
        this.encoder = encoder;
        this.expiration = expiration;
    }

    public String generate(Usuario usuario) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(ISSUER)
                .issuedAt(now)
                .expiresAt(now.plus(expiration))
                .subject(usuario.getUsername())
                .claim("uid", usuario.getId())
                .claim(ROLES_CLAIM, List.of(toAuthorityRole(usuario.getRole())))
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    public Duration getExpiration() {
        return expiration;
    }

    // 'admin' -> ADMIN, '1'..'5' -> ETAPA1..ETAPA5
    static String toAuthorityRole(String role) {
        return "admin".equals(role) ? Roles.ADMIN : "ETAPA" + role;
    }
}
