package com.bradesco.securebank.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.security.Key;
import java.util.Date;
import java.util.Map;

@Component
public class JwtUtil {
    private final Key key;
    private final String issuer;
    private final long expirationMillis;

    public JwtUtil(
        @Value("${app.jwt.secret}") String secret,
        @Value("${app.jwt.issuer}") String issuer,
        @Value("${app.jwt.expirationMinutes}") long expirationMinutes
    ){
        this.key = Keys.hmacShaKeyFor(secret.getBytes());
        this.issuer = issuer;
        this.expirationMillis = expirationMinutes * 60 * 1000;
    }

    public String generate(Map<String,Object> claims, String subject){
        final Date now = new Date();
        final Date exp = new Date(now.getTime() + expirationMillis);
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuer(issuer)
                .setIssuedAt(now)
                .setExpiration(exp)
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    public Jws<Claims> parse(String token){
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
    }
}
