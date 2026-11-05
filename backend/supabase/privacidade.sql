-- Executar no SQL Editor do Supabase após o Flyway criar o schema.
-- Não expor o schema momentcar na Data API. O Spring acessa via JDBC.
REVOKE ALL ON SCHEMA momentcar FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA momentcar FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA momentcar FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA momentcar REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA momentcar REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
