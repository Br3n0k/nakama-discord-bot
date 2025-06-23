// backend/src/routes/user.js

// Mock de banco de dados (deveria ser compartilhado ou acessado via services)
// Estas são as mesmas mocks de auth.js. Em uma app real, use um módulo de serviço de dados.
const mockUsers = new Map(); // discord_id -> user object (preenchido em auth.js)
const mockSessions = new Map(); // session_id -> session object (preenchido em auth.js)


async function userRoutes(fastify, options) {
  // Middleware de autenticação será aplicado a todas as rotas neste plugin
  // ou em rotas específicas usando { onRequest: [fastify.authenticate] }
  // Exemplo: fastify.addHook('onRequest', fastify.authenticate);

  // GET /user/session - Retorna a sessão ativa do usuário
  // Requer autenticação (o token JWT deve ser enviado pelo cliente)
  fastify.get('/user/session', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    // O decorator `fastify.authenticate` (a ser criado em um plugin)
    // deve verificar o JWT e adicionar `request.user` com os dados decodificados.
    const { sessionId, userId, discordId } = request.user; // Dados do payload do JWT

    const session = mockSessions.get(sessionId);
    const user = Array.from(mockUsers.values()).find(u => u.id === userId); // Encontra usuário pelo ID interno

    if (!session || !session.is_active || new Date(session.expires_at) < new Date()) {
      fastify.log.warn(`Sessão inválida ou expirada para sessionId: ${sessionId}`);
      // Limpar cookie se a sessão for inválida no backend mas o token ainda existir no cliente
      reply.clearCookie('nakama_token', { path: '/' });
      return reply.code(401).send({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
    }

    if (!user) {
      fastify.log.error(`Usuário não encontrado para userId: ${userId} (sessão ${sessionId})`);
      return reply.code(404).send({ error: 'Usuário não encontrado.' });
    }
    
    fastify.log.info(`Retornando sessão para usuário ${user.username} (sessão: ${sessionId})`);
    reply.send({
      session_id: session.session_id,
      user: {
        id: user.id,
        discord_id: user.discord_id,
        username: user.username,
        avatar_url: user.avatar_url,
      },
      is_active: session.is_active,
      created_at: session.created_at,
      expires_at: session.expires_at,
    });
  });

  // Outras rotas relacionadas ao usuário poderiam ser adicionadas aqui
  // Ex: PUT /user/profile (para atualizar perfil)
  // Ex: GET /user/history (para histórico de sessões, etc.)
}

// Expor as mocks para que auth.js possa preenchê-las (solução temporária para placeholders)
// Em uma aplicação real, isso seria gerenciado por serviços e um banco de dados.
userRoutes.mockUsers = mockUsers;
userRoutes.mockSessions = mockSessions;


export default userRoutes;
