package com.example.backend;

import com.example.backend.controller.Requests.*;
import com.example.backend.model.Models.*;
import com.example.backend.repository.LocadoraRepository;
import com.example.backend.service.ContaService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class FluxoIntegracaoTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired ContaService accounts;
    @Autowired LocadoraRepository db;
    Conta cliente, outro, agente, banco;
    @BeforeEach void setup() {
        for (String table:List.of("contratos","avaliacoes","pedidos","automoveis","empregos","clientes","usuarios")) db.execute("DELETE FROM momentcar."+table);
        cliente=accounts.cadastrar(new Cadastro("cliente","Senha123!","Cliente Teste","CLIENTE",null));
        outro=accounts.cadastrar(new Cadastro("outro","Senha123!","Outro Cliente","CLIENTE",null));
        agente=accounts.cadastrar(new Cadastro("empresa","Senha123!","Empresa Teste","EMPRESA","test-only-agent-code"));
        banco=accounts.cadastrar(new Cadastro("banco","Senha123!","Banco Teste","BANCO","test-only-agent-code"));
    }
    ResultActions request(MockHttpServletRequestBuilder req,Conta u,Object body) throws Exception {
        req.with(user(u.usuario())).with(csrf());
        if (body!=null) req.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
        return mvc.perform(req);
    }
    JsonNode body(ResultActions response) throws Exception { return json.readTree(response.andReturn().getResponse().getContentAsString()); }
    Map<String,Object> clientData() { return new HashMap<>(Map.of("rg","MG123456","cpf","52998224725","nome","Cliente Teste","endereco","Rua A, 1, Belo Horizonte - MG","profissao","Engenheiro","empregos",List.of(Map.of("entidade","Empregador","rendimento",3500)))); }
    void profile() throws Exception { request(post("/api/clientes"),cliente,clientData()).andExpect(status().isCreated()); }
    String car(Conta owner,String plate) throws Exception {
        return body(request(post("/api/automoveis"),owner,Map.of("matricula",UUID.randomUUID().toString(),"ano",2026,"marca","Fiat","modelo","Argo","placa",plate)).andExpect(status().isCreated())).get("id").asText();
    }
    Map<String,Object> orderData(String car,String type) {
        return new HashMap<>(Map.of("automovelId",car,"agenteId",agente.id(),"inicio",LocalDate.now().plusDays(3).toString(),"fim",LocalDate.now().plusDays(7).toString(),"tipoContrato",type));
    }
    JsonNode order(Map<String,Object> input) throws Exception { return body(request(post("/api/pedidos"),cliente,input).andExpect(status().isCreated())); }
    @Test void authenticationSessionCsrfAndLogout() throws Exception {
        mvc.perform(get("/api/pedidos")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("{\"usuario\":\"cliente\",\"senha\":\"Senha123!\"}")).andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"usuario\":\"cliente\",\"senha\":\"errada\"}")).andExpect(status().isUnauthorized());
        var result=mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"usuario\":\"cliente\",\"senha\":\"Senha123!\"}")).andExpect(status().isOk()).andExpect(jsonPath("$.senha").doesNotExist()).andReturn();
        MockHttpSession session=(MockHttpSession) result.getRequest().getSession();
        mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(cliente.id()));
        mvc.perform(post("/api/auth/logout").session(session).with(csrf())).andExpect(status().isNoContent());
        assertTrue(session.isInvalid());
        assertTrue(db.usuario("cliente").orElseThrow().senha().startsWith("$2"));
    }
    @Test void cannotSelfPromoteToAgent() throws Exception {
        mvc.perform(post("/api/auth/cadastro").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(new Cadastro("fraude","Senha123!","Fraude","BANCO",null)))).andExpect(status().isForbidden());
    }
    @Test void clientCrudAndOwnership() throws Exception {
        profile();
        request(get("/api/clientes/"+cliente.id()),outro,null).andExpect(status().isNotFound());
        request(get("/api/clientes"),outro,null).andExpect(jsonPath("$.length()").value(0));
        var input=clientData(); input.put("profissao","Arquiteto");
        request(put("/api/clientes/"+cliente.id()),cliente,input).andExpect(status().isOk()).andExpect(jsonPath("$.cliente.profissao").value("Arquiteto"));
        request(put("/api/clientes/"+cliente.id()),outro,input).andExpect(status().isForbidden());
        request(delete("/api/clientes/"+cliente.id()),cliente,null).andExpect(status().isNoContent());
        request(get("/api/clientes"),cliente,null).andExpect(jsonPath("$.length()").value(0));
    }
    @Test void rejectsInvalidCpfAndFourthEmployer() throws Exception {
        var input=clientData(); input.put("cpf","11111111111");
        request(post("/api/clientes"),cliente,input).andExpect(status().isBadRequest());
        input=clientData(); input.put("empregos",Collections.nCopies(4,Map.of("entidade","Empregador","rendimento",1000)));
        request(post("/api/clientes"),cliente,input).andExpect(status().isBadRequest());
        input.put("empregos",List.of(Map.of("entidade","Empregador","rendimento",-1)));
        request(post("/api/clientes"),cliente,input).andExpect(status().isBadRequest());
    }
    @Test void fullFlowInvalidatesApprovalAndPreservesHistory() throws Exception {
        profile(); var input=orderData(car(agente,"ABC1D23"),"EMPRESA"); var p=order(input); String url="/api/pedidos/"+p.get("id").asText();
        request(get(url),outro,null).andExpect(status().isNotFound());
        request(get(url),banco,null).andExpect(status().isNotFound());
        request(post(url+"/avaliacoes"),cliente,Map.of("aprovado",true,"parecer","Ok","revisao",1)).andExpect(status().isForbidden());
        request(post(url+"/contrato"),agente,Map.of("revisao",1)).andExpect(status().isConflict());
        request(post(url+"/avaliacoes"),agente,Map.of("aprovado",true,"parecer","Renda compatível","revisao",1)).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("APROVADO"));
        input.put("revisao",2);
        request(put(url),cliente,input).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("EM_ANALISE"));
        request(get(url),cliente,null).andExpect(jsonPath("$.avaliacoes.length()").value(1));
        request(post(url+"/contrato"),agente,Map.of("revisao",3)).andExpect(status().isConflict());
        request(post(url+"/avaliacoes"),agente,Map.of("aprovado",true,"parecer","Nova análise","revisao",3)).andExpect(status().isOk());
        request(post(url+"/contrato"),agente,Map.of("revisao",4)).andExpect(status().isCreated()).andExpect(jsonPath("$.pedido.status").value("CONTRATADO"));
        request(post(url+"/contrato"),agente,Map.of("revisao",5)).andExpect(status().isConflict());
        request(post(url+"/cancelar"),cliente,null).andExpect(status().isConflict());
        request(put(url),cliente,input).andExpect(status().isConflict());
        request(delete("/api/clientes/"+cliente.id()),cliente,null).andExpect(status().isConflict());
    }
    @Test void cancellationIsTerminal() throws Exception {
        profile(); var input=orderData(car(cliente,"ABC1234"),"CLIENTE"); var p=order(input); String url="/api/pedidos/"+p.get("id").asText();
        request(post(url+"/cancelar"),agente,null).andExpect(status().isForbidden());
        request(post(url+"/cancelar"),cliente,null).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELADO"));
        request(post(url+"/avaliacoes"),agente,Map.of("aprovado",true,"parecer","Ok","revisao",2)).andExpect(status().isConflict());
        request(put(url),cliente,input).andExpect(status().isConflict());
    }
    @Test void validatesDatesOwnershipAndBank() throws Exception {
        profile(); var input=orderData(car(agente,"DEF1G23"),"CLIENTE");
        request(post("/api/pedidos"),cliente,input).andExpect(status().isBadRequest());
        input.put("tipoContrato","EMPRESA"); input.put("bancoId",agente.id());
        request(post("/api/pedidos"),cliente,input).andExpect(status().isBadRequest());
        input.remove("bancoId"); input.put("fim",LocalDate.now().toString());
        request(post("/api/pedidos"),cliente,input).andExpect(status().isBadRequest());
        var foreign=orderData(car(outro,"XYZ1A23"),"CLIENTE");
        request(post("/api/pedidos"),cliente,foreign).andExpect(status().isForbidden());
    }
    @Test void creditReferenceAndVehicleOverlapAreEnforced() throws Exception {
        profile(); String auto=car(banco,"HIJ1K23"); var input=orderData(auto,"BANCO"); input.put("bancoId",banco.id());
        var p=order(input); String url="/api/pedidos/"+p.get("id").asText();
        request(post(url+"/avaliacoes"),agente,Map.of("aprovado",true,"parecer","Ok","revisao",1)).andExpect(status().isOk());
        request(post(url+"/contrato"),agente,Map.of("revisao",2)).andExpect(status().isBadRequest());
        request(post(url+"/contrato"),agente,Map.of("revisao",2,"creditoReferencia","CRED-001")).andExpect(status().isCreated()).andExpect(jsonPath("$.contrato.creditoReferencia").value("CRED-001"));
        p=order(input); url="/api/pedidos/"+p.get("id").asText();
        request(post(url+"/avaliacoes"),agente,Map.of("aprovado",true,"parecer","Ok","revisao",1)).andExpect(status().isOk());
        request(post(url+"/contrato"),agente,Map.of("revisao",2,"creditoReferencia","CRED-002")).andExpect(status().isConflict());
    }
    @Test void staleRevisionCannotOverrideDecision() throws Exception {
        profile(); var p=order(orderData(car(agente,"LMN1O23"),"EMPRESA")); String url="/api/pedidos/"+p.get("id").asText();
        request(post(url+"/avaliacoes"),agente,Map.of("aprovado",false,"parecer","Renda insuficiente","revisao",1)).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("REPROVADO"));
        request(post(url+"/avaliacoes"),agente,Map.of("aprovado",true,"parecer","Desatualizado","revisao",1)).andExpect(status().isConflict());
        request(get(url),cliente,null).andExpect(jsonPath("$.pedido.status").value("REPROVADO"));
    }
}
