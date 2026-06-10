"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Cliente PostgreSQL para consultas READ-ONLY no banco do Chatwoot
 * Usado apenas para validação de JWT sem sobrecarregar a API
 */
class ChatwootDatabase {
    connectionString;
    constructor() {
        this.connectionString = process.env.CHATWOOT_DATABASE_URL || '';
        if (!this.connectionString) {
            logger_1.default.warn('CHATWOOT_DATABASE_URL not configured - JWT validation will use API fallback');
        }
    }
    /**
     * Valida JWT consultando diretamente a tabela users do Chatwoot
     * Muito mais rápido que fazer HTTP request para /api/v1/profile
     */
    async validateJWTDirect(accessToken, client, uid) {
        if (!this.connectionString) {
            logger_1.default.warn('Cannot validate JWT directly - no database connection');
            return null;
        }
        const pgClient = new pg_1.Client({ connectionString: this.connectionString });
        try {
            await pgClient.connect();
            // Consulta a tabela users do Chatwoot + TODAS as contas do usuário
            const query = `
        SELECT
          u.id,
          u.email as uid,
          u.name,
          u.type,
          u.custom_attributes,
          json_agg(json_build_object('account_id', acu.account_id, 'role', acu.role) ORDER BY acu.account_id ASC) as accounts
        FROM users u
        LEFT JOIN account_users acu ON acu.user_id = u.id
        WHERE u.email = $1
          AND u.tokens IS NOT NULL
        GROUP BY u.id, u.email, u.name, u.type, u.custom_attributes
        LIMIT 1
      `;
            const result = await pgClient.query(query, [uid]);
            if (result.rows.length === 0) {
                logger_1.default.info('JWT validation: user not found in database', { uid });
                return null;
            }
            const user = result.rows[0];
            const accounts = (user.accounts || [])
                .filter((a) => a.account_id !== null)
                .map((a) => ({ account_id: parseInt(a.account_id, 10), role: a.role }));
            const firstAccount = accounts[0];
            // SuperAdmin sem account_users: retorna null para forçar fallback via API
            // (preserva comportamento 0.0.7 com INNER JOIN que retornava null nesse caso)
            if ((user.type === 'SuperAdmin') && accounts.length === 0) {
                logger_1.default.info('SuperAdmin with no account_users — falling back to API for correct account_id', { uid: user.uid });
                return null;
            }
            logger_1.default.info('JWT validated via database', {
                userId: user.id,
                uid: user.uid,
                type: user.type,
                accountCount: accounts.length,
                method: 'database_direct'
            });
            return {
                id: parseInt(user.id, 10),
                uid: user.uid,
                email: user.uid,
                name: user.name,
                type: user.type || null,
                account_id: firstAccount ? firstAccount.account_id : 0,
                role: firstAccount ? firstAccount.role : 'agent',
                accounts,
                custom_attributes: user.custom_attributes
            };
        }
        catch (error) {
            logger_1.default.error('Failed to validate JWT via database', {
                error: error.message,
                uid
            });
            return null;
        }
        finally {
            await pgClient.end();
        }
    }
    /**
     * Valida API token consultando diretamente a tabela access_tokens do Chatwoot
     */
    async validateAPITokenDirect(apiToken) {
        if (!this.connectionString) {
            logger_1.default.warn('Cannot validate API token directly - no database connection');
            return null;
        }
        const pgClient = new pg_1.Client({ connectionString: this.connectionString });
        try {
            await pgClient.connect();
            // Consulta a tabela access_tokens + TODAS as contas do usuário
            const query = `
        SELECT
          u.id,
          u.email as uid,
          u.name,
          u.type,
          u.custom_attributes,
          json_agg(json_build_object('account_id', acu.account_id, 'role', acu.role) ORDER BY acu.account_id ASC) as accounts
        FROM access_tokens at
        INNER JOIN users u ON u.id = at.owner_id
        LEFT JOIN account_users acu ON acu.user_id = u.id
        WHERE at.token = $1
          AND at.owner_type = 'User'
        GROUP BY u.id, u.email, u.name, u.type, u.custom_attributes
        LIMIT 1
      `;
            const result = await pgClient.query(query, [apiToken]);
            if (result.rows.length === 0) {
                logger_1.default.info('API token validation: token not found in database');
                return null;
            }
            const user = result.rows[0];
            const accounts = (user.accounts || [])
                .filter((a) => a.account_id !== null)
                .map((a) => ({ account_id: parseInt(a.account_id, 10), role: a.role }));
            const firstAccount = accounts[0];
            // SuperAdmin sem account_users: retorna null para forçar fallback via API
            if ((user.type === 'SuperAdmin') && accounts.length === 0) {
                logger_1.default.info('SuperAdmin with no account_users (API token) — falling back to API for correct account_id', { userId: user.id });
                return null;
            }
            logger_1.default.info('API token validated via database', {
                userId: user.id,
                type: user.type,
                accountCount: accounts.length,
                method: 'database_direct'
            });
            return {
                id: parseInt(user.id, 10),
                uid: user.uid,
                email: user.uid,
                name: user.name,
                type: user.type || null,
                account_id: firstAccount ? firstAccount.account_id : 0,
                role: firstAccount ? firstAccount.role : 'agent',
                accounts,
                custom_attributes: user.custom_attributes
            };
        }
        catch (error) {
            logger_1.default.error('Failed to validate API token via database', {
                error: error.message
            });
            return null;
        }
        finally {
            await pgClient.end();
        }
    }
    /**
     * Busca o access_token do Chatwoot de um usuário pelo seu ID
     * Usado para autenticar chamadas API em nome do usuário
     */
    async getUserAccessToken(userId) {
        if (!this.connectionString) {
            logger_1.default.warn('Cannot get user access token - no database connection');
            return null;
        }
        const pgClient = new pg_1.Client({ connectionString: this.connectionString });
        try {
            await pgClient.connect();
            const query = `
        SELECT at.token
        FROM access_tokens at
        WHERE at.owner_id = $1
          AND at.owner_type = 'User'
        ORDER BY at.created_at DESC
        LIMIT 1
      `;
            const result = await pgClient.query(query, [userId]);
            if (result.rows.length === 0) {
                logger_1.default.warn('No access token found for user', { userId });
                return null;
            }
            return result.rows[0].token;
        }
        catch (error) {
            logger_1.default.error('Failed to get user access token from database', {
                error: error.message,
                userId
            });
            return null;
        }
        finally {
            await pgClient.end();
        }
    }
    /**
     * Retorna o access_token de qualquer admin da conta no Chatwoot.
     * Usado como fallback pelo ensureGlobalWebhook quando não há apiToken/jwt disponível.
     */
    async getAccountAdminToken(accountId) {
        if (!this.connectionString)
            return null;
        const pgClient = new pg_1.Client({ connectionString: this.connectionString });
        try {
            await pgClient.connect();
            const result = await pgClient.query(`SELECT at.token
         FROM access_tokens at
         JOIN account_users au ON au.user_id = at.owner_id
         WHERE at.owner_type = 'User'
           AND au.account_id = $1
         ORDER BY au.role DESC, at.created_at DESC
         LIMIT 1`, [accountId]);
            return result.rows[0]?.token ?? null;
        }
        catch {
            return null;
        }
        finally {
            await pgClient.end();
        }
    }
    /**
     * Retorna todos os account_ids associados a um usuário Chatwoot (via account_users).
     * Usado pelo scheduler para tentar contas alternativas quando a conta padrão retorna 404.
     */
    async getUserAccountIds(userId) {
        if (!this.connectionString)
            return [];
        const pgClient = new pg_1.Client({ connectionString: this.connectionString });
        try {
            await pgClient.connect();
            const result = await pgClient.query(`SELECT account_id FROM account_users WHERE user_id = $1 ORDER BY account_id ASC`, [userId]);
            return result.rows.map((r) => parseInt(r.account_id, 10));
        }
        catch (error) {
            logger_1.default.error('Failed to get user account IDs', { error: error.message, userId });
            return [];
        }
        finally {
            await pgClient.end();
        }
    }
    /**
     * Verifica se um usuário Chatwoot tem acesso a uma conta específica.
     * SuperAdmins têm acesso a qualquer conta; demais precisam estar em account_users.
     * Usado para validar X-Account-ID no middleware de API token.
     */
    async canUserAccessAccount(chatwootUserId, accountId) {
        if (!this.connectionString) {
            // Lança exceção para que o caller possa fazer fail-open (usar conta do token)
            // em vez de bloquear a requisição com 403
            throw new Error('CHATWOOT_DATABASE_URL not configured — cannot verify account access');
        }
        const pgClient = new pg_1.Client({ connectionString: this.connectionString });
        try {
            await pgClient.connect();
            const query = `
        SELECT u.type, acu.account_id as has_account
        FROM users u
        LEFT JOIN account_users acu ON acu.user_id = u.id AND acu.account_id = $2
        WHERE u.id = $1
        LIMIT 1
      `;
            const result = await pgClient.query(query, [chatwootUserId, accountId]);
            if (result.rows.length === 0)
                return false;
            const row = result.rows[0];
            // SuperAdmin pode acessar qualquer conta
            if (row.type === 'SuperAdmin')
                return true;
            // Usuário regular: precisa ter entrada em account_users
            return row.has_account !== null;
        }
        catch (error) {
            logger_1.default.error('Failed to check account access', { error: error.message, chatwootUserId, accountId });
            return false;
        }
        finally {
            await pgClient.end();
        }
    }
    /**
     * Busca conversas de um contato diretamente no banco do Chatwoot
     */
    async getContactConversations(accountId, contactId) {
        if (!this.connectionString) {
            logger_1.default.warn('Cannot get contact conversations - no database connection');
            return [];
        }
        const pgClient = new pg_1.Client({ connectionString: this.connectionString });
        try {
            await pgClient.connect();
            const query = `
        SELECT c.id
        FROM conversations c
        WHERE c.account_id = $1
          AND c.contact_id = $2
        ORDER BY c.created_at DESC
      `;
            const result = await pgClient.query(query, [accountId, contactId]);
            return result.rows.map((row) => ({ id: parseInt(row.id, 10) }));
        }
        catch (error) {
            logger_1.default.error('Failed to get contact conversations from database', {
                error: error.message,
                accountId,
                contactId
            });
            return [];
        }
        finally {
            await pgClient.end();
        }
    }
    /**
     * Retorna configuração de uma inbox WhatsApp Cloud pelo ID.
     * Busca direto nas tabelas inboxes + channel_whatsapp do Chatwoot.
     */
    async getWhatsappInboxConfig(inboxId, accountId) {
        if (!this.connectionString) {
            logger_1.default.warn('Cannot get whatsapp inbox config - no database connection');
            return null;
        }
        const pgClient = new pg_1.Client({ connectionString: this.connectionString });
        try {
            await pgClient.connect();
            // accountId=null → SuperAdmin sem conta resolvida corretamente; busca sem filtro de conta
            const query = accountId !== null ? `
        SELECT
          i.id AS inbox_id,
          i.name AS inbox_name,
          cw.phone_number,
          cw.provider,
          cw.provider_config
        FROM inboxes i
        INNER JOIN channel_whatsapp cw ON cw.id = i.channel_id
        WHERE i.id = $1
          AND i.account_id = $2
          AND i.channel_type = 'Channel::Whatsapp'
        LIMIT 1
      ` : `
        SELECT
          i.id AS inbox_id,
          i.name AS inbox_name,
          cw.phone_number,
          cw.provider,
          cw.provider_config
        FROM inboxes i
        INNER JOIN channel_whatsapp cw ON cw.id = i.channel_id
        WHERE i.id = $1
          AND i.channel_type = 'Channel::Whatsapp'
        LIMIT 1
      `;
            const result = accountId !== null
                ? await pgClient.query(query, [inboxId, accountId])
                : await pgClient.query(query, [inboxId]);
            if (result.rows.length === 0) {
                return null;
            }
            const row = result.rows[0];
            return {
                inboxId: row.inbox_id,
                inboxName: row.inbox_name,
                phoneNumber: row.phone_number,
                provider: row.provider,
                providerConfig: row.provider_config || {},
            };
        }
        catch (error) {
            logger_1.default.error('Failed to get whatsapp inbox config', {
                error: error.message,
                inboxId,
                accountId,
            });
            return null;
        }
        finally {
            await pgClient.end();
        }
    }
    /**
     * Retorna todas as inboxes de API Oficial WhatsApp (Channel::Whatsapp) da conta.
     */
    async getAllWhatsappInboxes(accountId) {
        if (!this.connectionString)
            return [];
        const pgClient = new pg_1.Client({ connectionString: this.connectionString });
        try {
            await pgClient.connect();
            const result = await pgClient.query(`
        SELECT i.id AS inbox_id, i.name AS inbox_name, cw.phone_number, cw.provider_config
        FROM inboxes i
        INNER JOIN channel_whatsapp cw ON cw.id = i.channel_id
        WHERE i.account_id = $1 AND i.channel_type = 'Channel::Whatsapp'
        ORDER BY i.name
      `, [accountId]);
            return result.rows.map(r => ({
                inboxId: r.inbox_id,
                inboxName: r.inbox_name,
                phoneNumber: r.phone_number,
                providerConfig: r.provider_config || {},
            }));
        }
        catch (err) {
            logger_1.default.error('Failed to get all whatsapp inboxes', { error: err.message, accountId });
            return [];
        }
        finally {
            await pgClient.end();
        }
    }
    /**
     * Retorna o API access token de um administrador da conta.
     * Usado para buscar conversas sem restrição de visibilidade do agente.
     */
    async getAdminApiTokenForAccount(accountId) {
        if (!this.connectionString) {
            logger_1.default.warn('Cannot get admin token - no database connection');
            return null;
        }
        const pgClient = new pg_1.Client({ connectionString: this.connectionString });
        try {
            await pgClient.connect();
            // Busca admin da conta (role=1 em account_users) OU SuperAdmin global
            // SuperAdmins não têm entrada em account_users — têm acesso via users.type='SuperAdmin'
            const query = `
        SELECT at.token
        FROM access_tokens at
        INNER JOIN users u ON u.id = at.owner_id
        WHERE at.owner_type = 'User'
          AND (
            EXISTS (
              SELECT 1 FROM account_users acu
              WHERE acu.user_id = u.id
                AND acu.account_id = $1
                AND acu.role = 1
            )
            OR u.type = 'SuperAdmin'
          )
        ORDER BY
          CASE WHEN EXISTS (
            SELECT 1 FROM account_users acu
            WHERE acu.user_id = u.id AND acu.account_id = $1 AND acu.role = 1
          ) THEN 0 ELSE 1 END,
          u.id ASC
        LIMIT 1
      `;
            const result = await pgClient.query(query, [accountId]);
            if (result.rows.length === 0) {
                logger_1.default.warn('No admin token found for account', { accountId });
                return null;
            }
            return result.rows[0].token;
        }
        catch (error) {
            logger_1.default.error('Failed to get admin token for account', {
                error: error.message,
                accountId
            });
            return null;
        }
        finally {
            await pgClient.end();
        }
    }
    /**
     * Retorna o status de entrega de uma mensagem do Chatwoot.
     * status: 0=sent, 1=delivered, 2=read, 3=failed
     * Usado pelo polling de status de campanhas quando o webhook não inclui o campo status.
     */
    async getMessageDeliveryStatus(messageId) {
        if (!this.connectionString)
            return null;
        const pgClient = new pg_1.Client({ connectionString: this.connectionString });
        try {
            await pgClient.connect();
            const result = await pgClient.query('SELECT status, content_attributes FROM messages WHERE id = $1 LIMIT 1', [messageId]);
            if (result.rows.length === 0)
                return null;
            const row = result.rows[0];
            return {
                status: row.status ?? 0,
                contentAttributes: row.content_attributes ?? {},
            };
        }
        catch {
            return null;
        }
        finally {
            await pgClient.end();
        }
    }
    /**
     * Retorna o channel_type de uma inbox pelo ID.
     * Ex: 'Channel::Whatsapp', 'Channel::Api', 'Channel::Email', etc.
     */
    async getInboxChannelType(inboxId) {
        if (!this.connectionString)
            return null;
        const pgClient = new pg_1.Client({ connectionString: this.connectionString });
        try {
            await pgClient.connect();
            const result = await pgClient.query('SELECT channel_type FROM inboxes WHERE id = $1 LIMIT 1', [inboxId]);
            return result.rows[0]?.channel_type || null;
        }
        catch {
            return null;
        }
        finally {
            await pgClient.end();
        }
    }
    /**
     * Atualiza source_id de uma mensagem do Chatwoot (somente se ainda não tiver).
     * Usado para registrar o WA message ID em mensagens enviadas via UazAPI.
     */
    async updateMessageSourceId(chatwootMessageId, sourceId) {
        if (!this.connectionString)
            return false;
        const pgClient = new pg_1.Client({ connectionString: this.connectionString });
        try {
            await pgClient.connect();
            const result = await pgClient.query(`UPDATE messages SET source_id = $1 WHERE id = $2 AND source_id IS NULL`, [sourceId, chatwootMessageId]);
            return (result.rowCount ?? 0) > 0;
        }
        catch (e) {
            logger_1.default.warn('updateMessageSourceId failed', { error: e.message, chatwootMessageId });
            return false;
        }
        finally {
            await pgClient.end();
        }
    }
    /**
     * Busca mensagens outgoing (message_type=1) sem source_id em uma conversa.
     * Retorna as N mais recentes para matching com evento UazAPI.
     */
    async findOutgoingMessagesWithoutSourceId(conversationId, limit = 5, sinceTs) {
        if (!this.connectionString)
            return [];
        const pgClient = new pg_1.Client({ connectionString: this.connectionString });
        try {
            await pgClient.connect();
            const params = [conversationId, limit];
            let extra = '';
            if (sinceTs) {
                extra = ' AND created_at >= $3';
                params.push(sinceTs - 60);
            }
            const result = await pgClient.query(`SELECT id, content, EXTRACT(EPOCH FROM created_at)::int AS created_at
         FROM messages
         WHERE conversation_id = $1
           AND message_type = 1
           AND source_id IS NULL
           ${extra}
         ORDER BY created_at DESC
         LIMIT $2`, params);
            return result.rows;
        }
        catch {
            return [];
        }
        finally {
            await pgClient.end();
        }
    }
    /**
     * Busca conversas de um inbox pelo número de telefone do contato.
     */
    async findConversationsByPhone(accountId, inboxId, phone) {
        if (!this.connectionString)
            return [];
        const pgClient = new pg_1.Client({ connectionString: this.connectionString });
        try {
            await pgClient.connect();
            const normalized = phone.replace(/\D/g, '');
            const result = await pgClient.query(`SELECT c.id FROM conversations c
         INNER JOIN contacts ct ON ct.id = c.contact_id
         WHERE c.account_id = $1
           AND c.inbox_id = $2
           AND ct.phone_number LIKE $3
         ORDER BY c.id DESC
         LIMIT 5`, [accountId, inboxId, '%' + normalized.slice(-9)]);
            return result.rows;
        }
        catch {
            return [];
        }
        finally {
            await pgClient.end();
        }
    }
    /**
     * Atualiza o conteúdo de uma mensagem do Chatwoot diretamente no banco.
     * Usado como fallback quando não é possível editar no WhatsApp (source_id ausente).
     */
    async updateMessageContent(chatwootMessageId, newContent) {
        if (!this.connectionString)
            return false;
        const pgClient = new pg_1.Client({ connectionString: this.connectionString });
        try {
            await pgClient.connect();
            const result = await pgClient.query(`UPDATE messages SET content = $1, processed_message_content = $1, updated_at = NOW() WHERE id = $2`, [newContent, chatwootMessageId]);
            return (result.rowCount ?? 0) > 0;
        }
        catch (e) {
            logger_1.default.warn('updateMessageContent failed', { error: e.message, chatwootMessageId });
            return false;
        }
        finally {
            await pgClient.end();
        }
    }
}
exports.default = new ChatwootDatabase();
//# sourceMappingURL=chatwootDatabase.js.map