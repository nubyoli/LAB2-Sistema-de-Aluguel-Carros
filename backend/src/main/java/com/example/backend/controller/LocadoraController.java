package com.example.backend.controller;

import com.example.backend.controller.Requests.*;
import com.example.backend.model.Models.*;
import com.example.backend.service.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.*;

@RestController
@RequestMapping("/api")
public class LocadoraController {
    private final LocadoraService service;
    private final ContaService accounts;
    public LocadoraController(LocadoraService service,ContaService accounts) { this.service=service; this.accounts=accounts; }
    private Usuario user(Principal p) { return accounts.atual(p.getName()); }
    @GetMapping("/agentes") public List<Conta> agents() { return service.agentes(); }
    @GetMapping("/clientes") public List<Cliente> clients(Principal p) { return service.clientes(user(p)); }
    @GetMapping("/clientes/{id}") public Map<String,Object> client(Principal p,@PathVariable String id) { return service.cliente(user(p),id); }
    @PostMapping("/clientes") @ResponseStatus(HttpStatus.CREATED)
    public Map<String,Object> createClient(Principal p,@Valid @RequestBody ClienteInput input) { Usuario u=user(p); return service.salvarCliente(u,u.id(),input,true); }
    @PutMapping("/clientes/{id}") public Map<String,Object> editClient(Principal p,@PathVariable String id,@Valid @RequestBody ClienteInput input) { return service.salvarCliente(user(p),id,input,false); }
    @DeleteMapping("/clientes/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteClient(Principal p,@PathVariable String id) { service.excluirCliente(user(p),id); }
    @GetMapping("/automoveis") public List<Automovel> cars(Principal p) { return service.automoveis(user(p)); }
    @PostMapping("/automoveis") @ResponseStatus(HttpStatus.CREATED)
    public Automovel createCar(Principal p,@Valid @RequestBody AutomovelInput input) { return service.salvarAutomovel(user(p),input); }
    @GetMapping("/pedidos") public List<Pedido> orders(Principal p) { return service.pedidos(user(p)); }
    @GetMapping("/pedidos/{id}") public Map<String,Object> order(Principal p,@PathVariable String id) { return service.detalhe(user(p),id); }
    @PostMapping("/pedidos") @ResponseStatus(HttpStatus.CREATED)
    public Pedido createOrder(Principal p,@Valid @RequestBody PedidoInput input) { return service.criarPedido(user(p),input); }
    @PutMapping("/pedidos/{id}") public Pedido editOrder(Principal p,@PathVariable String id,@Valid @RequestBody PedidoInput input) { return service.editarPedido(user(p),id,input); }
    @PostMapping("/pedidos/{id}/cancelar") public Pedido cancel(Principal p,@PathVariable String id) { return service.cancelar(user(p),id); }
    @PostMapping("/pedidos/{id}/avaliacoes") public Pedido evaluate(Principal p,@PathVariable String id,@Valid @RequestBody Parecer input) { return service.avaliar(user(p),id,input); }
    @PostMapping("/pedidos/{id}/contrato") @ResponseStatus(HttpStatus.CREATED)
    public Map<String,Object> contract(Principal p,@PathVariable String id,@Valid @RequestBody Executar input) { return service.contratar(user(p),id,input); }
}
