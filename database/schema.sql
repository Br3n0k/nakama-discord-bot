-- Esquema do Banco de Dados para o Projeto Nakama

-- Extensão para UUIDs se não estiver habilitada por padrão (específico do PostgreSQL)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de Usuários
-- Armazena informações dos usuários que se autenticam via Discord.
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- ID interno único para o usuário (PostgreSQL)
    -- Para SQLite, usar: id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16)))
    discord_id VARCHAR(255) NOT NULL UNIQUE,    -- ID do usuário no Discord (snowflake)
    username TEXT NOT NULL,                     -- Username#discriminator completo do Discord
    avatar_url TEXT,                            -- URL do avatar do usuário no Discord (pode ser nulo)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- Data de criação do registro
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP  -- Data da última atualização
);

-- Trigger para atualizar 'updated_at' automaticamente (exemplo para PostgreSQL)
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_user_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();


-- Tabela de Sessões
-- Armazena as sessões de áudio criadas pelos usuários.
CREATE TABLE sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- ID único para a sessão de áudio (PostgreSQL)
    -- Para SQLite, usar: session_id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16)))
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Chave estrangeira para a tabela de usuários
    is_active BOOLEAN DEFAULT TRUE,             -- Indica se a sessão está atualmente ativa para streaming
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- Data de criação da sessão
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- Data e hora em que a sessão expira
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- Última vez que a sessão foi usada/verificada
    metadata JSONB                             -- Campo opcional para armazenar metadados adicionais (ex: configurações de áudio da sessão)
                                                -- Para SQLite, pode usar TEXT e armazenar JSON como string.
);

-- Trigger para atualizar 'last_accessed_at' (exemplo para PostgreSQL)
-- Pode ser mais complexo dependendo da lógica de acesso.
-- CREATE TRIGGER set_session_last_accessed_at
-- BEFORE UPDATE ON sessions
-- FOR EACH ROW
-- EXECUTE FUNCTION trigger_set_timestamp(); 
-- Nota: 'updated_at' pode ser mais apropriado se 'last_accessed_at' tiver um significado específico.


-- Índices para otimizar consultas comuns
CREATE INDEX idx_users_discord_id ON users(discord_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_is_active ON sessions(is_active);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Comentários sobre as tabelas e colunas (específico do PostgreSQL)
COMMENT ON TABLE users IS 'Armazena informações dos usuários autenticados via Discord.';
COMMENT ON COLUMN users.id IS 'ID interno único do usuário (UUID).';
COMMENT ON COLUMN users.discord_id IS 'ID do usuário fornecido pelo Discord (snowflake).';
COMMENT ON COLUMN users.username IS 'Nome de usuário completo do Discord (ex: "NakamaUser#1234").';

COMMENT ON TABLE sessions IS 'Armazena as sessões de streaming de áudio criadas pelos usuários.';
COMMENT ON COLUMN sessions.session_id IS 'ID único da sessão de áudio (UUID).';
COMMENT ON COLUMN sessions.user_id IS 'ID do usuário (da tabela users) que criou esta sessão.';
COMMENT ON COLUMN sessions.is_active IS 'True se a sessão pode ser usada para streaming, False caso contrário.';
COMMENT ON COLUMN sessions.expires_at IS 'Timestamp de quando a sessão se torna inválida.';

-- Adicionar mais tabelas conforme necessário (ex: logs, configurações de guild, etc.)

-- Exemplo de como seria a criação de ID para SQLite:
-- users.id: TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16))))
-- sessions.session_id: TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16))))
-- E remover DEFAULT gen_random_uuid() e WITH TIME ZONE para SQLite.
-- Timestamps em SQLite geralmente são armazenados como TEXT (ISO8601) ou INTEGER (Unix epoch).
-- SQLite não tem JSONB, então metadata seria TEXT.
-- SQLite não tem triggers de função complexos como `trigger_set_timestamp()` diretamente,
-- a lógica de `updated_at` geralmente é gerenciada pela aplicação ou por triggers mais simples.
/*
Exemplo de tabela 'users' para SQLite:
CREATE TABLE users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    discord_id TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    avatar_url TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ', 'now')),
    updated_at TEXT DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ', 'now'))
);

CREATE TRIGGER users_updated_at_trigger
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    UPDATE users SET updated_at = strftime('%Y-%m-%d %H:%M:%fZ', 'now') WHERE id = OLD.id;
END;
*/
