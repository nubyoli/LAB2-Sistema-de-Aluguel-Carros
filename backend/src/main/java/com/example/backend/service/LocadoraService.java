package com.example.backend.service;

import com.example.backend.controller.Requests.*;
import com.example.backend.model.Models.*;
import com.example.backend.repository.LocadoraRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.*;
import static com.example.backend.repository.LocadoraRepository.*;

@Service
@Transactional(readOnly=true)
public class LocadoraService {
    private final LocadoraRepository db;
    public LocadoraService(LocadoraRepository db) { this.db=db; }
    private static String id() { return UUID.randomUUID().toString(); }
    private static void require(boolean condition, int status, String message) {
        if (!condition) throw new RegraException(status,message);
    }
    private static boolean aberto(Pedido p) { return !Set.of("CANCELADO","CONTRATADO").contains(p.status()); }
    private void revisao(Pedido p,Integer revision) { require(revision!=null && p.revisao()==revision,409,"O pedido foi alterado. Atualize a página e tente novamente."); }
    public List<Conta> agentes() { return db.list(Conta.class,"SELECT id,usuario,nome,perfil FROM momentcar.usuarios WHERE perfil<>'CLIENTE' ORDER BY nome"); }
    public List<Cliente> clientes(Usuario u) {
        if (u.cliente()) return db.cliente(u.id()).map(List::of).orElse(List.of());
        return db.list(Cliente.class,"SELECT c.* FROM momentcar.clientes c WHERE EXISTS (SELECT 1 FROM momentcar.pedidos p WHERE p.cliente_id=c.id AND p.agente_id=?) ORDER BY c.nome",u.id());
    }
    public Map<String,Object> cliente(Usuario u,String id) {
        boolean allowed=u.id().equals(id) || (!u.cliente() && db.count("SELECT COUNT(*) FROM momentcar.pedidos WHERE cliente_id=? AND agente_id=?",id,u.id())>0);
        require(allowed,404,"Cliente não encontrado.");
        return Map.of("cliente",db.cliente(id).orElseThrow(() -> new RegraException(404,"Cliente não encontrado.")),"empregos",db.empregos(id));
    }
    @Transactional
    public Map<String,Object> salvarCliente(Usuario u,String target,ClienteInput c,boolean create) {
        require(u.cliente() && u.id().equals(target),403,"Você só pode alterar seu próprio cadastro.");
        db.lockUsuario(u.id());
        boolean exists=db.cliente(u.id()).isPresent();
        require(create!=exists,create?409:404,create?"Seu cadastro já existe.":"Cliente não encontrado.");
        require(cpfValido(c.cpf()),400,"CPF inválido. Confira os dígitos verificadores.");
        if (create) db.execute("INSERT INTO momentcar.clientes(id,rg,cpf,nome,endereco,profissao) VALUES (?,?,?,?,?,?)",u.id(),c.rg().trim(),c.cpf(),c.nome().trim(),c.endereco().trim(),c.profissao().trim());
        else db.execute("UPDATE momentcar.clientes SET rg=?,cpf=?,nome=?,endereco=?,profissao=? WHERE id=?",c.rg().trim(),c.cpf(),c.nome().trim(),c.endereco().trim(),c.profissao().trim(),u.id());
        db.execute("UPDATE momentcar.usuarios SET nome=? WHERE id=?",c.nome().trim(),u.id());
        db.execute("DELETE FROM momentcar.empregos WHERE cliente_id=?",u.id());
        int index=0;
        for (Renda renda:c.empregos()) db.execute("INSERT INTO momentcar.empregos(cliente_id,posicao,entidade,rendimento) VALUES (?,?,?,?)",u.id(),++index,renda.entidade().trim(),renda.rendimento());
        return cliente(u,u.id());
    }
    @Transactional
    public void excluirCliente(Usuario u,String target) {
        require(u.cliente() && u.id().equals(target),403,"Você só pode excluir seu próprio cadastro.");
        db.lockUsuario(u.id());
        require(db.count("SELECT COUNT(*) FROM momentcar.pedidos WHERE cliente_id=?",target)==0,409,"Não é possível excluir um cliente com pedidos vinculados, inclusive cancelados.");
        require(db.execute("DELETE FROM momentcar.clientes WHERE id=?",target)>0,404,"Cliente não encontrado.");
    }
    public List<Automovel> automoveis(Usuario u) {
        return db.list(Automovel.class,AUTOS+" WHERE u.perfil<>'CLIENTE' OR a.proprietario_id=? OR EXISTS (SELECT 1 FROM momentcar.pedidos p WHERE p.automovel_id=a.id AND p.agente_id=?) ORDER BY a.marca,a.modelo",u.id(),u.id());
    }
    @Transactional
    public Automovel salvarAutomovel(Usuario u,AutomovelInput a) {
        String id=id();
        db.execute("INSERT INTO momentcar.automoveis(id,matricula,ano,marca,modelo,placa,proprietario_id) VALUES (?,?,?,?,?,?,?)",id,a.matricula().trim(),a.ano(),a.marca().trim(),a.modelo().trim(),a.placa(),u.id());
        return db.automovel(id).orElseThrow();
    }
    public List<Pedido> pedidos(Usuario u) {
        return db.list(Pedido.class,PEDIDOS+(u.cliente()?" WHERE p.cliente_id=?":" WHERE p.agente_id=?")+" ORDER BY p.numero DESC",u.id());
    }
    public Pedido pedido(Usuario u,String id) {
        Pedido p=db.pedido(id).orElseThrow(() -> new RegraException(404,"Pedido não encontrado."));
        require(u.cliente()?p.clienteId().equals(u.id()):p.agenteId().equals(u.id()),404,"Pedido não encontrado.");
        return p;
    }
    public Map<String,Object> detalhe(Usuario u,String id) {
        Pedido p=pedido(u,id);
        Map<String,Object> result=new LinkedHashMap<>();
        result.put("pedido",p); result.put("automovel",db.automovel(p.automovelId()).orElseThrow());
        result.put("avaliacoes",db.list(Avaliacao.class,"SELECT a.id,u.nome agente_nome,a.revisao,a.aprovado,a.parecer,a.criado_em FROM momentcar.avaliacoes a JOIN momentcar.usuarios u ON u.id=a.agente_id WHERE a.pedido_id=? ORDER BY a.criado_em,a.id",id));
        result.put("contrato",db.one(Contrato.class,"SELECT * FROM momentcar.contratos WHERE pedido_id=?",id).orElse(null));
        return result;
    }
    private void validarPedido(PedidoInput input,String clienteId) {
        require(!input.fim().isBefore(input.inicio()),400,"A data final deve ser igual ou posterior à inicial.");
        require(!input.inicio().isBefore(LocalDate.now()),400,"A data inicial não pode estar no passado.");
        Usuario agent=db.usuarioId(input.agenteId()).orElseThrow(() -> new RegraException(400,"Agente não encontrado."));
        require(!agent.cliente(),400,"O responsável deve ser empresa ou banco.");
        Automovel a=db.automovel(input.automovelId()).orElseThrow(() -> new RegraException(400,"Automóvel não encontrado."));
        require(!a.proprietarioTipo().equals("CLIENTE") || a.proprietarioId().equals(clienteId),403,"O veículo pertence a outro cliente.");
        require(a.proprietarioTipo().equals(input.tipoContrato()),400,"O tipo de contrato deve corresponder ao tipo do proprietário do automóvel.");
        if (input.bancoId()!=null) require(db.usuarioId(input.bancoId()).map(b -> b.perfil().equals("BANCO")).orElse(false),400,"Selecione um banco agente cadastrado.");
    }
    @Transactional
    public Pedido criarPedido(Usuario u,PedidoInput input) {
        require(u.cliente(),403,"Somente clientes criam pedidos.");
        db.lockUsuario(u.id());
        require(db.cliente(u.id()).isPresent(),409,"Complete seu cadastro de cliente antes de criar um pedido.");
        validarPedido(input,u.id());
        String id=id();
        db.execute("INSERT INTO momentcar.pedidos(id,cliente_id,agente_id,automovel_id,inicio,fim,tipo_contrato,banco_id,status) VALUES (?,?,?,?,?,?,?,?, 'EM_ANALISE')",id,u.id(),input.agenteId(),input.automovelId(),input.inicio(),input.fim(),input.tipoContrato(),input.bancoId());
        return pedido(u,id);
    }
    @Transactional
    public Pedido editarPedido(Usuario u,String id,PedidoInput input) {
        db.lockPedido(id);
        Pedido p=pedido(u,id); require(aberto(p),409,"Pedido cancelado ou contratado não pode ser alterado."); revisao(p,input.revisao());
        require(p.agenteId().equals(input.agenteId()),400,"O agente responsável não pode ser trocado. Cancele e crie outro pedido.");
        validarPedido(input,p.clienteId());
        db.execute("UPDATE momentcar.pedidos SET automovel_id=?,inicio=?,fim=?,tipo_contrato=?,banco_id=?,status='EM_ANALISE',revisao=revisao+1 WHERE id=?",input.automovelId(),input.inicio(),input.fim(),input.tipoContrato(),input.bancoId(),id);
        return pedido(u,id);
    }
    @Transactional
    public Pedido cancelar(Usuario u,String id) {
        db.lockPedido(id); Pedido p=pedido(u,id);
        require(u.cliente(),403,"Somente o cliente cancela o pedido.");
        require(aberto(p),409,"Pedido cancelado ou contratado não pode ser cancelado.");
        db.execute("UPDATE momentcar.pedidos SET status='CANCELADO',revisao=revisao+1 WHERE id=?",id);
        return pedido(u,id);
    }
    @Transactional
    public Pedido avaliar(Usuario u,String id,Parecer input) {
        db.lockPedido(id); Pedido p=pedido(u,id);
        require(!u.cliente(),403,"Somente agentes emitem pareceres.");
        require(aberto(p),409,"Pedido encerrado não pode ser avaliado."); revisao(p,input.revisao());
        db.execute("INSERT INTO momentcar.avaliacoes(id,pedido_id,agente_id,revisao,aprovado,parecer) VALUES (?,?,?,?,?,?)",id(),id,u.id(),p.revisao(),input.aprovado(),input.parecer().trim());
        // A avaliação pertence à revisão anterior; qualquer nova mutação exige reler o pedido.
        db.execute("UPDATE momentcar.pedidos SET status=?,revisao=revisao+1 WHERE id=?",input.aprovado()?"APROVADO":"REPROVADO",id);
        return pedido(u,id);
    }
    @Transactional
    public Map<String,Object> contratar(Usuario u,String id,Executar input) {
        db.lockPedido(id); Pedido p=pedido(u,id);
        require(!u.cliente(),403,"Somente agentes executam contratos.");
        require(p.status().equals("APROVADO"),409,"É necessário um parecer positivo vigente para executar o contrato."); revisao(p,input.revisao());
        require(!p.inicio().isBefore(LocalDate.now()),409,"Atualize o período do pedido antes de contratar.");
        String ref=input.creditoReferencia()==null?null:input.creditoReferencia().trim();
        require(p.bancoId()==null ? ref==null || ref.isEmpty() : ref!=null && !ref.isEmpty(),400,"Informe a referência do crédito concedido pelo banco selecionado, ou remova o crédito do pedido.");
        db.lockAutomovel(p.automovelId());
        require(db.count("SELECT COUNT(*) FROM momentcar.pedidos WHERE automovel_id=? AND status='CONTRATADO' AND inicio<=? AND fim>=?",p.automovelId(),p.fim(),p.inicio())==0,409,"O automóvel já está contratado nesse período.");
        db.execute("INSERT INTO momentcar.contratos(id,pedido_id,agente_id,banco_id,credito_referencia) VALUES (?,?,?,?,?)",id(),id,u.id(),p.bancoId(),p.bancoId()==null?null:ref);
        db.execute("UPDATE momentcar.pedidos SET status='CONTRATADO',revisao=revisao+1 WHERE id=?",id);
        return detalhe(u,id);
    }
    static boolean cpfValido(String cpf) {
        if (cpf==null || !cpf.matches("[0-9]{11}") || cpf.chars().distinct().count()==1) return false;
        for (int size=9;size<=10;size++) {
            int sum=0;
            for (int i=0;i<size;i++) sum+=(cpf.charAt(i)-'0')*(size+1-i);
            int digit=(sum*10)%11; if (digit==10) digit=0;
            if (digit!=cpf.charAt(size)-'0') return false;
        }
        return true;
    }
}
