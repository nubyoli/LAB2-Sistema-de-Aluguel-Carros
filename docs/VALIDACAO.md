# Validação realizada

Ambiente: Windows, JDK 25.0.4, Spring Boot 4.0.9 e dependências do front fornecidas pelo projeto base.

- `mvnw.cmd test`: 10 testes passaram (1 teste de inicialização e 9 cenários de integração).
- `npm run build`: TypeScript e build Vite concluídos.
- Empacotamento Maven: JAR executável gerado em `backend/target/`.
- `backend/scripts/smoke-http.mjs`: cadastro, login, cookies, CSRF, cliente/rendimento, automóvel, pedido, parecer, execução de contrato e consulta do cliente passaram usando requisições HTTP através do proxy do front.
- Navegador: cadastro e login de agente/cliente, cadastro de automóvel, cadastro de cliente com renda, criação do pedido com datas, parecer positivo, confirmação e execução do contrato. A captura em `screenshots/dashboard.png` contém somente dados sintéticos.
- Uma falha de captura da data inicial foi encontrada no formulário e corrigida: o envio usa o campo `inicio` do FormData. A criação foi verificada novamente no navegador.
- Um erro de integridade apareceu na instância de desenvolvimento anterior. Não se reproduziu depois de reiniciar a API recompilada: o teste HTTP completo e a avaliação/contratação pelo navegador passaram. Os detalhes SQL permanecem disponíveis apenas em logs DEBUG do servidor para diagnóstico, sem exposição na resposta HTTP.

Todos os testes foram executados com H2 em modo PostgreSQL, incluindo banco temporário em memória para a verificação pelo navegador. Não foram usadas credenciais reais nem acessado o projeto Supabase do usuário. O Docker instalado estava sem daemon disponível, portanto não foi feita validação adicional contra PostgreSQL local. A aplicação está preparada para a conexão JDBC ao Supabase, mas essa conexão precisa ser confirmada após configurar `backend/.env`.

Não houve publicação, commit ou push. Os diagramas originais foram preservados; os modelos revisados são fontes PlantUML editáveis.
