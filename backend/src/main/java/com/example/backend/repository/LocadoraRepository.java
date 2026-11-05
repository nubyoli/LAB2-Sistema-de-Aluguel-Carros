package com.example.backend.repository;

import com.example.backend.model.Models.*;
import org.springframework.jdbc.core.DataClassRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public class LocadoraRepository {
    private final JdbcTemplate jdbc;
    public LocadoraRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public int execute(String sql, Object... args) { return jdbc.update(sql, args); }
    public <T> List<T> list(Class<T> type, String sql, Object... args) {
        return jdbc.query(sql, DataClassRowMapper.newInstance(type), args);
    }
    public <T> Optional<T> one(Class<T> type, String sql, Object... args) { return list(type,sql,args).stream().findFirst(); }
    public Optional<Usuario> usuario(String login) { return one(Usuario.class,"SELECT * FROM momentcar.usuarios WHERE usuario=?",login); }
    public Optional<Usuario> usuarioId(String id) { return one(Usuario.class,"SELECT * FROM momentcar.usuarios WHERE id=?",id); }
    public Optional<Cliente> cliente(String id) { return one(Cliente.class,"SELECT * FROM momentcar.clientes WHERE id=?",id); }
    public List<Emprego> empregos(String id) { return list(Emprego.class,"SELECT entidade,rendimento FROM momentcar.empregos WHERE cliente_id=? ORDER BY posicao",id); }
    public static final String AUTOS = """
        SELECT a.*,u.nome proprietario_nome,u.perfil proprietario_tipo FROM momentcar.automoveis a
        JOIN momentcar.usuarios u ON u.id=a.proprietario_id
        """;
    public static final String PEDIDOS = """
        SELECT p.*,c.nome cliente_nome,u.nome agente_nome,a.marca || ' ' || a.modelo automovel_nome,
        a.placa,b.nome banco_nome FROM momentcar.pedidos p
        JOIN momentcar.clientes c ON c.id=p.cliente_id
        JOIN momentcar.usuarios u ON u.id=p.agente_id
        JOIN momentcar.automoveis a ON a.id=p.automovel_id
        LEFT JOIN momentcar.usuarios b ON b.id=p.banco_id
        """;
    public Optional<Automovel> automovel(String id) { return one(Automovel.class,AUTOS+" WHERE a.id=?",id); }
    public Optional<Pedido> pedido(String id) { return one(Pedido.class,PEDIDOS+" WHERE p.id=?",id); }
    public void lockPedido(String id) { jdbc.queryForList("SELECT id FROM momentcar.pedidos WHERE id=? FOR UPDATE",id); }
    public void lockUsuario(String id) { jdbc.queryForList("SELECT id FROM momentcar.usuarios WHERE id=? FOR UPDATE",id); }
    public void lockAutomovel(String id) { jdbc.queryForList("SELECT id FROM momentcar.automoveis WHERE id=? FOR UPDATE",id); }
    public long count(String sql,Object... args) { return jdbc.queryForObject(sql,Long.class,args); }
}
