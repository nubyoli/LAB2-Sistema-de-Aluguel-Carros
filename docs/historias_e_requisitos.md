# Sistema de Aluguel de Carros: histórias e requisitos

## Requisitos rastreados

| ID | Requisito | 
|---|---|
| R1 | Cadastro prévio e autenticação obrigatória por usuário e senha; clientes e agentes acessam o sistema. | 
| R2 | Clientes introduzem, modificam, consultam e cancelam pedidos; o protótipo permite criar pedidos e visualizar seu status. | 
| R3 | Agentes, que são empresas ou bancos, modificam e avaliam financeiramente pedidos; parecer positivo permite encaminhar à consideração para executar contrato. | 
| R4 | Armazenar RG, CPF, nome, endereço, profissão e até três entidades empregadoras com respectivos rendimentos. | 
| R5 | Registrar matrícula, ano, marca, modelo e placa dos automóveis; a propriedade pode ser de cliente, empresa ou banco, conforme o tipo de contrato. | 
| R6 | O aluguel pode estar associado a contrato de crédito concedido por um banco agente. | 
| R7 | Admite-se divisão em gestão de pedidos/contratos e construção dinâmica das páginas web. | 
| R8 | Java JDK 25, Spring Boot 4.0.x, Maven, React + Vite, Supabase/PostgreSQL e arquitetura MVC. | 
| R9 | Implementar CRUD de cliente, produzir os modelos e revisá-los conforme a implementação e o feedback. | 

## Histórias de usuário e critérios de aceitação


### HU01 - Cadastro e autenticação 

Como usuário, quero ter um cadastro e entrar com usuário e senha para acessar as funções permitidas ao meu perfil.

- Credenciais válidas de conta cadastrada permitem acesso; credenciais inválidas não permitem.
- Sem autenticação, operações de negócio são recusadas; cadastro inicial e login permanecem acessíveis.
- Senhas são armazenadas como hash; usuário de acesso é único.


### HU02 - Gerenciar cadastro do cliente 

Como cliente, quero cadastrar, consultar, atualizar e solicitar exclusão de meus dados para manter meu cadastro.

- O cadastro contém RG, CPF, nome, endereço e profissão.
- O cliente consulta e altera apenas seus próprios dados.
- A exclusão é possível quando não há vínculos impeditivos. Para o protótipo, impedir exclusão física com pedidos/contratos vinculados, até definir retenção e eventual desativação.

### HU03 - Informar vínculos e rendimentos 

Como cliente, quero informar minhas entidades empregadoras e os rendimentos respectivos para subsidiar a análise financeira.

- Cada vínculo informa entidade empregadora e rendimento.
- O sistema aceita até três vínculos e recusa a inclusão do quarto.
- A multiplicidade mínima zero é uma decisão: o PDF não exige vínculo obrigatório.

### HU04 - Criar pedido 

Como cliente autenticado, quero criar um pedido de aluguel para submetê-lo à análise.

- O pedido fica associado ao cliente que o criou.
- O sistema atribui identificador e status EM_ANÁLISE.
- O pedido passa a aparecer na consulta do cliente; campos comerciais obrigatórios ainda precisam ser definidos.

### HU05 - Consultar pedido e status 

Como cliente, quero consultar meus pedidos e seus status para acompanhar o andamento do aluguel.

- A consulta mostra o pedido e o status atual.
- Um cliente não consulta pedidos de outro cliente.

### HU06 - Modificar pedido 

Como cliente ou agente autorizado, quero modificar um pedido para corrigir as informações da solicitação.

- Clientes modificam seus próprios pedidos; agentes atuam no escopo autorizado.
- Para o protótipo, pedido contratado ou cancelado não pode ser alterado.
- Alteração relevante invalida o parecer vigente e retorna o pedido a EM_ANÁLISE, preservando avaliações anteriores.

### HU07 - Cancelar pedido 

Como cliente, quero cancelar meu pedido para desistir da solicitação.

- Um pedido ainda não contratado pode ser marcado CANCELADO.
- Pedido cancelado deixa de ser elegível à execução do contrato.
- Cancelamento de pedido não é rescisão de contrato; rescisão não foi especificada.

### HU08 - Avaliar financeiramente 

Como agente, empresa ou banco, quero registrar um parecer financeiro para decidir se um pedido pode avançar para contratação.

- A avaliação registra pedido, agente emissor, data e parecer.
- Parecer positivo leva a APROVADO; negativo leva a REPROVADO.
- Cliente não emite avaliação financeira; avaliações anteriores permanecem no histórico.
- Aprovação habilita consideração para contratação; não cria contrato automaticamente.

### HU09 - Executar contrato 

Como agente, quero executar um contrato de aluguel aprovado para formalizar a contratação.

- Sem parecer vigente positivo, a execução é recusada.
- A execução cria um contrato vinculado ao pedido, com um automóvel e tipo de contrato, e muda o pedido para CONTRATADO.
- Não é criado um segundo contrato para o mesmo pedido.
- A categoria do proprietário deve ser compatível com o tipo de contrato. A correspondência entre tipos e categorias precisa ser fornecida, não inferida.

### HU10 - Registrar automóvel e propriedade 

Como agente que prepara o contrato, quero identificar o automóvel e seu proprietário para registrar corretamente o objeto do aluguel.

- O automóvel registra matrícula, ano, marca, modelo e placa; matrícula e placa são campos distintos.
- O proprietário é cliente, empresa ou banco.
- Esta história detalha a preparação de “Executar contrato”; não pressupõe um módulo de gestão de frota completo. A atribuição ao agente é proposta.

### HU11 - Associar crédito concedido 

Como agente que prepara o contrato, quero associar, quando houver, um contrato de crédito concedido por um banco agente para registrar o financiamento do aluguel.

- É possível executar um contrato sem crédito associado.
- Se houver crédito, o banco concedente deve ser um Banco agente cadastrado.
- Um crédito não é associado a dois contratos de aluguel nesta proposta.
- O registro não realiza nem simula a decisão de concessão de crédito bancário.




