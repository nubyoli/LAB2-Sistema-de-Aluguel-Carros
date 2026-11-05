package com.example.backend.config;

import com.example.backend.repository.LocadoraRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;

@Configuration
public class SecurityConfig {
    @Bean PasswordEncoder encoder() { return new BCryptPasswordEncoder(); }
    @Bean SecurityContextRepository contextRepository() { return new HttpSessionSecurityContextRepository(); }
    @Bean UserDetailsService users(LocadoraRepository repository) {
        return login -> repository.usuario(login).map(u -> User.withUsername(u.usuario())
            .password(u.senha()).roles(u.perfil()).build()).orElseThrow(() -> new UsernameNotFoundException("Credenciais inválidas"));
    }
    @Bean SecurityFilterChain security(HttpSecurity http, SecurityContextRepository contexts) throws Exception {
        return http
            .securityContext(c -> c.securityContextRepository(contexts))
            .authorizeHttpRequests(a -> a
                .requestMatchers(HttpMethod.GET,"/api/auth/csrf","/api/health").permitAll()
                .requestMatchers(HttpMethod.POST,"/api/auth/login","/api/auth/cadastro").permitAll()
                .requestMatchers("/error").permitAll().anyRequest().authenticated())
            .requestCache(c -> c.disable())
            .formLogin(f -> f.disable()).httpBasic(b -> b.disable())
            .logout(l -> l.logoutUrl("/api/auth/logout").deleteCookies("JSESSIONID")
                .logoutSuccessHandler((req,res,auth) -> res.setStatus(204)))
            .exceptionHandling(e -> e
                .authenticationEntryPoint((req,res,ex) -> {
                    res.setStatus(401); res.setContentType("application/json;charset=UTF-8");
                    res.getWriter().write("{\"message\":\"Entre na sua conta para continuar.\"}");
                })
                .accessDeniedHandler((req,res,ex) -> {
                    res.setStatus(403); res.setContentType("application/json;charset=UTF-8");
                    res.getWriter().write("{\"message\":\"Acesso negado ou sessão expirada. Atualize a página.\"}");
                })).build();
    }
}
