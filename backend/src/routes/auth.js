// backend/src/routes/auth.js
import { randomUUID } from 'crypto';

// Mock de URLs do Discord e credenciais (substituir por variáveis de ambiente)
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || 'your_discord_client_id';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || 'your_discord_client_secret';
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/api/auth/callback'; // URL do backend
const FRONTEND_CALLBACK_URL = process.env.FRONTEND_CALLBACK_URL || 'http://localhost:4321/auth/callback'; // URL do frontend Astro

// Mock de banco de dados de usuários e sessões (substituir por um banco real)
const mockUsers = new Map(); // discord_id -> user object
const mockSessions = new Map(); // session_id -> session object

async function authRoutes(fastify, options) {
  // Rota para iniciar o login com Discord
  // O frontend pode chamar esta rota (ex: via um <form POST> ou fetch)
  // ou o frontend pode construir a URL de autorização do Discord diretamente.
  // Se o frontend chamar esta rota, o backend redireciona para o Discord.
  fastify.post('/auth/discord', async (request, reply) => {
    // POST /auth/discord (inicia login com Discord)
    // Esta rota é chamada pelo frontend (ex: LoginButton)
    // Ela redireciona o usuário para a página de autorização do Discord.
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&response_type=code&scope=identify%20email%20guilds.join`; // Adicione os escopos necessários
    
    // fastify.log.info(`Redirecionando para Discord: ${discordAuthUrl}`);
    // reply.redirect(discordAuthUrl);
    // Alternativamente, se o frontend não puder lidar com o redirect de um POST,
    // podemos retornar a URL para o frontend redirecionar:
    reply.send({ redirectUrl: discordAuthUrl });
  });

  // Rota de callback do Discord (onde o Discord redireciona após autorização)
  // GET /auth/callback (recebe token de autorização, cria sessão)
  fastify.get('/auth/callback', async (request, reply) => {
    const { code, error } = request.query;

    if (error) {
      fastify.log.error(`Erro no callback do Discord: ${error}`);
      // Redirecionar para o frontend com mensagem de erro
      return reply.redirect(`${FRONTEND_CALLBACK_URL}?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      fastify.log.error('Nenhum código de autorização recebido do Discord.');
      return reply.redirect(`${FRONTEND_CALLBACK_URL}?error=missing_code`);
    }

    try {
      // 1. Trocar o código de autorização por um token de acesso do Discord
      const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: DISCORD_CLIENT_ID,
          client_secret: DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: DISCORD_REDIRECT_URI,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        fastify.log.error('Falha ao trocar código por token:', errorData);
        throw new Error(errorData.error_description || 'Falha ao obter token do Discord');
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // 2. Usar o token de acesso para obter informações do usuário do Discord
      const userResponse = await fetch('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        fastify.log.error('Falha ao obter informações do usuário do Discord:', errorData);
        throw new Error(errorData.message || 'Falha ao obter dados do usuário');
      }

      const discordUser = await userResponse.json();
      fastify.log.info(`Usuário do Discord autenticado: ${discordUser.username}#${discordUser.discriminator} (ID: ${discordUser.id})`);

      // 3. Lógica de usuário e sessão (salvar/atualizar usuário no DB, criar sessão)
      let user = mockUsers.get(discordUser.id);
      if (!user) {
        user = {
          id: randomUUID(), // ID interno do usuário
          discord_id: discordUser.id,
          username: `${discordUser.username}#${discordUser.discriminator}`,
          avatar_url: discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : null,
          created_at: new Date().toISOString(),
        };
        mockUsers.set(discordUser.id, user);
        // Em um DB real: await db.users.create(user);
      } else {
        // Atualizar dados se necessário
        user.username = `${discordUser.username}#${discordUser.discriminator}`;
        user.avatar_url = discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : null;
        // Em um DB real: await db.users.update(user.id, { username: user.username, avatar_url: user.avatar_url });
      }
      
      const sessionId = randomUUID();
      const sessionTTL = 3600 * 1000 * 24; // 24 horas em ms
      const expiresAt = new Date(Date.now() + sessionTTL);
      
      const session = {
        session_id: sessionId,
        user_id: user.id,
        is_active: true,
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        // Armazenar o access_token e refresh_token do Discord se for necessário para futuras chamadas API
        // discord_access_token: accessToken,
        // discord_refresh_token: tokenData.refresh_token,
      };
      mockSessions.set(sessionId, session);
      // Em um DB real: await db.sessions.create(session);

      // 4. Gerar um token JWT para o frontend
      // O token JWT conteria informações como session_id e user_id.
      // Este JWT seria usado para autenticar requisições subsequentes do frontend.
      const jwtToken = fastify.jwt.sign({ 
        sessionId: session.session_id,
        userId: user.id,
        discordId: user.discord_id 
      });
      
      // 5. Definir o token JWT em um cookie HttpOnly e redirecionar para o frontend
      reply.setCookie('nakama_token', jwtToken, {
        path: '/',
        httpOnly: true, // Importante para segurança (impede acesso via JS no cliente)
        secure: process.env.NODE_ENV === 'production', // true em produção (HTTPS)
        sameSite: 'lax', // Ou 'strict'
        maxAge: sessionTTL / 1000, // maxAge em segundos
      });

      fastify.log.info(`Sessão ${sessionId} criada para o usuário ${user.username}. Redirecionando para o frontend.`);
      return reply.redirect(`${FRONTEND_CALLBACK_URL}?success=true`); // Ou passar o token na URL se não usar cookies

    } catch (err) {
      fastify.log.error('Erro durante o processo de callback OAuth:', err);
      return reply.redirect(`${FRONTEND_CALLBACK_URL}?error=${encodeURIComponent(err.message || 'internal_server_error')}`);
    }
  });

  // Rota para logout (exemplo)
  fastify.post('/auth/logout', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    // onRequest: [fastify.authenticate] garante que apenas usuários logados podem fazer logout
    const { sessionId } = request.user; // Obtido do JWT decodificado pelo plugin de autenticação

    if (sessionId) {
      const session = mockSessions.get(sessionId);
      if (session) {
        session.is_active = false;
        session.expires_at = new Date().toISOString(); // Expirar imediatamente
        // Em um DB real: await db.sessions.update(sessionId, { is_active: false, expires_at: new Date() });
        fastify.log.info(`Sessão ${sessionId} invalidada (logout).`);
      }
    }
    
    reply.clearCookie('nakama_token', { path: '/' });
    reply.send({ message: 'Logout bem-sucedido' });
  });
}

export default authRoutes;
