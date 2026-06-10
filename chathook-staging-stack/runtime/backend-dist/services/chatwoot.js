"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const logger_1 = __importDefault(require("../utils/logger"));
const chatwootDatabase_1 = __importDefault(require("./chatwootDatabase"));
const form_data_1 = __importDefault(require("form-data"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const stream_1 = require("stream");
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const dns_1 = __importDefault(require("dns"));
// Cache em memória para getConversation — evita milhares de chamadas individuais à API do Chatwoot
// Chave: "accountId:conversationId" | TTL: 30s | null = conversa deletada (404)
const conversationCache = new Map();
const CONV_CACHE_TTL_MS = 30_000; // 30 segundos
function convCacheGet(key) {
    const entry = conversationCache.get(key);
    if (!entry)
        return { hit: false };
    if (Date.now() > entry.expiresAt) {
        conversationCache.delete(key);
        return { hit: false };
    }
    return { hit: true, data: entry.data };
}
function convCacheSet(key, data) {
    conversationCache.set(key, { data, expiresAt: Date.now() + CONV_CACHE_TTL_MS });
}
// Limpeza periódica para evitar vazamento de memória (roda a cada 5 minutos)
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of conversationCache) {
        if (now > entry.expiresAt)
            conversationCache.delete(key);
    }
}, 5 * 60_000).unref();
// Função de lookup DNS customizada que usa servidores DNS públicos com timeout de segurança
const customLookup = (hostname, options, callback) => {
    const resolver = new dns_1.default.Resolver();
    resolver.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
    // Timeout de 5s para evitar travamento em redes restritas
    let settled = false;
    const fallbackTimer = setTimeout(() => {
        if (settled)
            return;
        settled = true;
        logger_1.default.warn('Custom DNS resolver timed out, falling back to default', { hostname });
        dns_1.default.lookup(hostname, options, callback);
    }, 5000);
    resolver.resolve4(hostname, (err, addresses) => {
        if (settled)
            return;
        if (!err && addresses && addresses.length > 0) {
            settled = true;
            clearTimeout(fallbackTimer);
            callback(null, addresses[0], 4);
            return;
        }
        // Se falhar com IPv4, tentar IPv6
        resolver.resolve6(hostname, (err6, addresses6) => {
            if (settled)
                return;
            if (!err6 && addresses6 && addresses6.length > 0) {
                settled = true;
                clearTimeout(fallbackTimer);
                callback(null, addresses6[0], 6);
                return;
            }
            // Se ambos falharem, usar dns.lookup padrão como fallback
            settled = true;
            clearTimeout(fallbackTimer);
            logger_1.default.warn('Custom DNS resolver failed, falling back to default', {
                hostname,
                err4: err?.message,
                err6: err6?.message
            });
            dns_1.default.lookup(hostname, options, callback);
        });
    });
};
class ChatwootAPI {
    client;
    baseURL;
    constructor() {
        // Deriva a URL do Chatwoot das variáveis de ambiente
        let chatwootUrl = process.env.CHATWOOT_API_URL;
        // Se CHATWOOT_API_URL não estiver definida, deriva de CHATWOOT_DOMAIN
        if (!chatwootUrl && process.env.CHATWOOT_DOMAIN) {
            const domain = process.env.CHATWOOT_DOMAIN;
            chatwootUrl = domain.startsWith('http') ? domain : `https://${domain}`;
            logger_1.default.info('Derived CHATWOOT_API_URL from CHATWOOT_DOMAIN', {
                domain: process.env.CHATWOOT_DOMAIN,
                derivedUrl: chatwootUrl
            });
        }
        if (!chatwootUrl) {
            throw new Error('CHATWOOT_API_URL ou CHATWOOT_DOMAIN não definida! Configure no docker-compose.swarm.yml');
        }
        this.baseURL = chatwootUrl;
        logger_1.default.info('Chatwoot API initialized', { baseURL: this.baseURL });
        // Configurar HTTP agents sem lookup customizado
        // Usar configuração padrão do Node.js
        const httpAgent = new http_1.default.Agent({
            keepAlive: true,
            keepAliveMsecs: 30000,
        });
        const httpsAgent = new https_1.default.Agent({
            keepAlive: true,
            keepAliveMsecs: 30000,
            // Aceitar certificados auto-assinados em desenvolvimento
            rejectUnauthorized: process.env.NODE_ENV === 'production',
        });
        this.client = axios_1.default.create({
            baseURL: this.baseURL,
            timeout: 30000, // Aumentar timeout para 30s
            httpAgent,
            httpsAgent,
        });
    }
    buildHeaders(jwt, apiToken) {
        if (apiToken) {
            return {
                'api_access_token': apiToken,
                'access-token': undefined,
                'token-type': undefined,
                'client': undefined,
                'expiry': undefined,
                'uid': undefined,
            };
        }
        if (jwt) {
            return {
                'access-token': jwt['access-token'],
                'token-type': jwt['token-type'],
                'client': jwt.client,
                'expiry': jwt.expiry,
                'uid': jwt.uid,
            };
        }
        return {};
    }
    async validateJWT(jwt) {
        try {
            logger_1.default.info('Validating JWT', {
                uid: jwt.uid,
                hasAccessToken: !!jwt['access-token'],
                hasClient: !!jwt.client,
                accessTokenPrefix: jwt['access-token']?.substring(0, 10),
                method: 'attempting_database_first'
            });
            // PRIORIDADE 1: Validação direta no banco (muito mais rápido)
            const userFromDB = await chatwootDatabase_1.default.validateJWTDirect(jwt['access-token'], jwt.client, jwt.uid);
            if (userFromDB) {
                logger_1.default.info('JWT validated via database (fast path)', {
                    userId: userFromDB.id,
                    uid: userFromDB.uid
                });
                return userFromDB;
            }
            // FALLBACK: Se falhar no banco, tenta via API (método antigo)
            logger_1.default.info('Database validation failed, trying API fallback', { uid: jwt.uid });
            const response = await this.client.get('/api/v1/profile', {
                headers: this.buildHeaders(jwt),
            });
            logger_1.default.info('JWT validated via API (slow fallback)', {
                userId: response.data.id
            });
            // Normaliza o formato de accounts: Chatwoot API retorna [{id, name, role}]
            // mas resolveAccountId espera [{account_id, role}]
            const rawData = response.data;
            if (Array.isArray(rawData.accounts)) {
                rawData.accounts = rawData.accounts.map((a) => ({
                    account_id: a.account_id ?? a.id,
                    role: a.role,
                }));
            }
            return rawData;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const axiosError = error.response ? {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data
            } : null;
            logger_1.default.error('JWT validation failed (both methods)', {
                error: errorMessage,
                axiosError,
                uid: jwt.uid,
                chatwootUrl: this.baseURL
            });
            return null;
        }
    }
    async validateAPIToken(apiToken) {
        try {
            logger_1.default.info('Validating API token', {
                tokenPrefix: apiToken.substring(0, 10),
                method: 'attempting_database_first'
            });
            // PRIORIDADE 1: Validação direta no banco (muito mais rápido)
            const userFromDB = await chatwootDatabase_1.default.validateAPITokenDirect(apiToken);
            if (userFromDB) {
                logger_1.default.info('API token validated via database (fast path)', {
                    userId: userFromDB.id
                });
                return userFromDB;
            }
            // FALLBACK: Se falhar no banco, tenta via API (método antigo)
            logger_1.default.info('Database validation failed, trying API fallback');
            const response = await this.client.get('/api/v1/profile', {
                headers: {
                    'api_access_token': apiToken
                }
            });
            logger_1.default.info('API token validated via API (slow fallback)', {
                userId: response.data.id
            });
            // Normaliza accounts: Chatwoot API retorna [{id, name, role}]
            // mas resolveAccountId espera [{account_id, role}]
            const rawData = response.data;
            if (Array.isArray(rawData.accounts)) {
                rawData.accounts = rawData.accounts.map((a) => ({
                    account_id: a.account_id ?? a.id,
                    role: a.role,
                }));
            }
            return rawData;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.error('API token validation failed (both methods)', {
                error: errorMessage
            });
            return null;
        }
    }
    async getUserAccessToken(jwt, apiToken) {
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            const response = await this.client.get('/api/v1/profile', {
                headers,
            });
            // Log completo da resposta para verificar estrutura
            logger_1.default.info('Profile response received', {
                userId: response.data.id,
                hasAccessToken: !!response.data.access_token,
                responseKeys: Object.keys(response.data)
            });
            const userAccessToken = response.data.access_token;
            if (!userAccessToken) {
                logger_1.default.warn('No access_token in profile response', { responseData: response.data });
            }
            return userAccessToken || null;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.error('Failed to get user access token', { error: errorMessage });
            return null;
        }
    }
    async getConversations(accountId, jwt, apiToken, params) {
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            // Se fetchAll=true, busca todas as páginas em paralelo
            if (params?.fetchAll) {
                const pageLimit = params.maxPages ?? 20;
                const baseQuery = {
                    status: params?.status || 'all',
                    page: 1,
                };
                if (params?.assignee_type)
                    baseQuery.assignee_type = params.assignee_type;
                if (params?.inbox_id)
                    baseQuery.inbox_id = params.inbox_id;
                if (params?.team_id)
                    baseQuery.team_id = params.team_id;
                if (params?.sort)
                    baseQuery.sort = params.sort;
                if (params?.q)
                    baseQuery.q = params.q;
                if (params?.labels?.length)
                    baseQuery['labels[]'] = params.labels;
                // Busca página 1 para descobrir o total
                const firstResponse = await this.client.get(`/api/v1/accounts/${accountId}/conversations`, {
                    headers,
                    params: baseQuery,
                });
                const firstConvs = firstResponse.data.data?.payload || [];
                const meta = firstResponse.data.data?.meta;
                const totalCount = meta?.all_count || 0;
                const PAGE_SIZE = 25;
                const totalPages = Math.min(Math.ceil(totalCount / PAGE_SIZE), pageLimit);
                if (totalPages <= 1) {
                    logger_1.default.info('All conversations fetched', { accountId, count: firstConvs.length, pages: 1, status: params?.status });
                    return firstConvs;
                }
                // Busca as páginas restantes em paralelo
                const remainingPageNums = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
                const remainingResults = await Promise.all(remainingPageNums.map(page => this.client.get(`/api/v1/accounts/${accountId}/conversations`, {
                    headers,
                    params: { ...baseQuery, page },
                }).then(r => r.data.data?.payload || []).catch(() => [])));
                const allConversations = [firstConvs, ...remainingResults].flat();
                logger_1.default.info('All conversations fetched', { accountId, count: allConversations.length, pages: totalPages, status: params?.status });
                return allConversations;
            }
            // Comportamento original: busca apenas uma página
            const queryParams = {
                status: params?.status || 'all',
                page: params?.page || 1,
            };
            if (params?.assignee_type)
                queryParams.assignee_type = params.assignee_type;
            if (params?.inbox_id)
                queryParams.inbox_id = params.inbox_id;
            if (params?.team_id)
                queryParams.team_id = params.team_id;
            if (params?.sort)
                queryParams.sort = params.sort;
            if (params?.q)
                queryParams.q = params.q;
            if (params?.labels?.length)
                queryParams['labels[]'] = params.labels;
            const response = await this.client.get(`/api/v1/accounts/${accountId}/conversations`, {
                headers,
                params: queryParams,
            });
            const conversations = response.data.data?.payload || [];
            logger_1.default.info('Conversations fetched', { accountId, count: conversations.length });
            return conversations;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.error('Failed to fetch conversations', { accountId, error: errorMessage });
            throw error;
        }
    }
    // Busca uma página de conversas e retorna também o total da conta (para paginação)
    async getConversationsPage(accountId, jwt, apiToken, params) {
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            const queryParams = {
                status: params?.status || 'all',
                page: params?.page || 1,
            };
            if (params?.inbox_id)
                queryParams.inbox_id = params.inbox_id;
            const response = await this.client.get(`/api/v1/accounts/${accountId}/conversations`, {
                headers,
                params: queryParams,
            });
            const conversations = response.data.data?.payload || [];
            const totalCount = response.data.data?.meta?.all_count || conversations.length;
            return { conversations, totalCount };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.error('Failed to fetch conversations page', { accountId, error: errorMessage });
            throw error;
        }
    }
    async updateConversationStatus(accountId, conversationId, status, jwt, apiToken) {
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            await this.client.post(`/api/v1/accounts/${accountId}/conversations/${conversationId}/toggle_status`, { status }, { headers });
            logger_1.default.info('Conversation status updated', { conversationId, status });
            return true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.error('Failed to update status', { conversationId, error: errorMessage });
            return false;
        }
    }
    async getAccountAgents(accountId, jwt, apiToken) {
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            const response = await this.client.get(`/api/v1/accounts/${accountId}/agents`, {
                headers,
            });
            const agents = response.data || [];
            logger_1.default.info('Account agents fetched', { accountId, count: agents.length });
            return agents;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.error('Failed to fetch account agents', { accountId, error: errorMessage });
            return [];
        }
    }
    // Busca labels da conta
    async getAccountLabels(accountId, jwt, apiToken) {
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            const response = await this.client.get(`/api/v1/accounts/${accountId}/labels`, {
                headers,
            });
            const labels = response.data?.payload || response.data || [];
            logger_1.default.info('Account labels fetched', { accountId, count: labels.length });
            return labels;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.error('Failed to fetch account labels', { accountId, error: errorMessage });
            return [];
        }
    }
    // Busca times da conta
    async getAccountTeams(accountId, jwt, apiToken) {
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            const response = await this.client.get(`/api/v1/accounts/${accountId}/teams`, {
                headers,
            });
            const teams = response.data || [];
            logger_1.default.info('Account teams fetched', { accountId, count: teams.length });
            return teams;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.error('Failed to fetch account teams', { accountId, error: errorMessage });
            return [];
        }
    }
    // Busca detalhes de uma conversa específica
    // Retorna null quando conversa foi deletada (404)
    // Lança erro para falhas transitórias (403, 5xx, timeout) — o chamador decide o que fazer
    async getConversation(accountId, conversationId, jwt, apiToken) {
        const cacheKey = `${accountId}:${conversationId}`;
        const cached = convCacheGet(cacheKey);
        if (cached.hit)
            return cached.data;
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            const response = await this.client.get(`/api/v1/accounts/${accountId}/conversations/${conversationId}`, { headers });
            convCacheSet(cacheKey, response.data);
            return response.data;
        }
        catch (error) {
            // 404 = conversa realmente deletada no Chatwoot — cacheia null para não bater de novo
            if (axios_1.default.isAxiosError(error) && error.response?.status === 404) {
                logger_1.default.info('Conversation not found in Chatwoot (404 — deleted)', { conversationId });
                convCacheSet(cacheKey, null);
                return null;
            }
            // Outros erros (timeout, 403, 5xx) = falha transitória — NÃO cacheia, relança
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.warn('Transient error fetching conversation details', { conversationId, error: errorMessage });
            throw error;
        }
    }
    /** Invalida o cache de uma conversa específica (ex: quando recebe webhook de atualização) */
    invalidateConversationCache(accountId, conversationId) {
        conversationCache.delete(`${accountId}:${conversationId}`);
    }
    // Retorna o total real de conversas de um status no Chatwoot (usa apenas page=1 para pegar o meta)
    async getConversationCount(accountId, status, jwt, apiToken, params) {
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            const queryParams = { status, page: 1 };
            if (params?.inbox_id)
                queryParams.inbox_id = params.inbox_id;
            if (params?.team_id)
                queryParams.team_id = params.team_id;
            const response = await this.client.get(`/api/v1/accounts/${accountId}/conversations`, {
                headers,
                params: queryParams,
            });
            return response.data.data?.meta?.all_count || 0;
        }
        catch {
            return 0;
        }
    }
    // Marca mensagens de uma conversa como lidas (update_last_seen)
    async markConversationAsRead(accountId, conversationId, jwt, apiToken) {
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            await this.client.post(`/api/v1/accounts/${accountId}/conversations/${conversationId}/update_last_seen`, {}, { headers });
            logger_1.default.info('Conversation marked as read', { accountId, conversationId });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.error('Failed to mark conversation as read', { accountId, conversationId, error: errorMessage });
        }
    }
    // Busca mensagens de uma conversa
    async getConversationMessages(accountId, conversationId, jwt, apiToken, params) {
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            const response = await this.client.get(`/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`, {
                headers,
                params: params
            });
            const messages = response.data.payload || response.data || [];
            logger_1.default.info('Messages fetched', { conversationId, count: messages.length });
            return messages;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.error('Failed to fetch messages', { conversationId, error: errorMessage });
            return [];
        }
    }
    // Helper para baixar arquivo de URL temporariamente
    async downloadFile(url) {
        try {
            const tempDir = path_1.default.join(process.cwd(), 'temp');
            // Cria diretório temp se não existir
            if (!fs_1.default.existsSync(tempDir)) {
                fs_1.default.mkdirSync(tempDir, { recursive: true });
            }
            // Gera nome de arquivo único
            const fileName = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}${path_1.default.extname(url.split('?')[0])}`;
            const filePath = path_1.default.join(tempDir, fileName);
            // Baixa o arquivo
            const response = await axios_1.default.get(url, { responseType: 'stream' });
            const streamPipeline = (0, util_1.promisify)(stream_1.pipeline);
            await streamPipeline(response.data, fs_1.default.createWriteStream(filePath));
            logger_1.default.info('File downloaded temporarily', { url, filePath });
            return filePath;
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.error('Failed to download file', { url, error: errorMsg });
            return null;
        }
    }
    // Envia mensagem para uma conversa
    async sendWhatsAppTemplate(accountId, conversationId, templateName, language, processedParams, apiToken, jwt, headerUrl, headerType, renderedContent) {
        try {
            const headers = {};
            if (apiToken) {
                headers['api_access_token'] = apiToken;
            }
            else if (jwt) {
                headers['access-token'] = jwt['access-token'];
                headers['token-type'] = jwt['token-type'] || 'Bearer';
                headers['client'] = jwt.client;
                headers['expiry'] = jwt.expiry;
                headers['uid'] = jwt.uid;
            }
            // Chatwoot v4.x usa "enhanced format" para processed_params:
            // { "body": {"1": "val1"}, "header": {"media_url": "...", "media_type": "image"} }
            // O "legacy format" (objeto plano {"1":"val1"}) é convertido internamente pelo Chatwoot
            // mas NÃO suporta header de mídia — só o enhanced format suporta.
            const enhancedParams = {};
            // Body params (variáveis do texto)
            const bodyParams = {};
            processedParams.forEach((val, idx) => {
                bodyParams[String(idx + 1)] = val;
            });
            if (Object.keys(bodyParams).length > 0) {
                enhancedParams.body = bodyParams;
            }
            // Header de mídia (IMAGE, DOCUMENT, VIDEO)
            if (headerUrl) {
                // Normaliza URLs do Imgur: converte página (imgur.com/abc) para URL direta (i.imgur.com/abc.jpg)
                // O WhatsApp Cloud API exige URL direta da imagem (não pode ser página HTML)
                let normalizedUrl = headerUrl;
                const imgurPageMatch = headerUrl.match(/^https?:\/\/(?:www\.)?imgur\.com\/([a-zA-Z0-9]+)(?:\.[a-zA-Z]+)?$/);
                if (imgurPageMatch) {
                    normalizedUrl = `https://i.imgur.com/${imgurPageMatch[1]}.jpg`;
                    logger_1.default.info('Imgur URL normalizada para URL direta', { original: headerUrl, normalized: normalizedUrl });
                }
                enhancedParams.header = {
                    media_url: normalizedUrl,
                    media_type: (headerType || 'IMAGE').toLowerCase(),
                };
            }
            const templateParams = {
                name: templateName,
                language: language,
                processed_params: enhancedParams,
            };
            // template_params deve ficar no nível RAIZ (não dentro de content_attributes)
            // O MessageBuilder do Chatwoot lê @params[:template_params] diretamente
            logger_1.default.info('Sending WhatsApp template to Chatwoot', {
                accountId, conversationId, templateName,
                templateParams: JSON.stringify(templateParams),
            });
            const response = await this.client.post(`/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`, {
                content: renderedContent || templateName,
                message_type: 'outgoing',
                content_type: 'text',
                template_params: templateParams,
            }, { headers: Object.keys(headers).length > 0 ? headers : undefined });
            logger_1.default.info('WhatsApp template sent', {
                accountId, conversationId, templateName,
                responseStatus: response.status,
                responseContentAttributes: JSON.stringify(response.data?.content_attributes),
            });
            return true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const responseData = error?.response?.data;
            const responseStatus = error?.response?.status;
            logger_1.default.error('Failed to send WhatsApp template', {
                accountId, conversationId, templateName,
                error: errorMessage,
                responseStatus,
                responseData: JSON.stringify(responseData),
            });
            throw error;
        }
    }
    async sendWhatsAppInteractive(accountId, conversationId, bodyText, items, apiToken, jwt, options) {
        try {
            const headers = {};
            if (apiToken) {
                headers['api_access_token'] = apiToken;
            }
            else if (jwt) {
                headers['access-token'] = jwt['access-token'];
                headers['token-type'] = jwt['token-type'] || 'Bearer';
                headers['client'] = jwt.client;
                headers['expiry'] = jwt.expiry;
                headers['uid'] = jwt.uid;
            }
            const contentAttributes = {
                items: items.map(item => ({ title: item.title, value: item.id })),
            };
            if (options?.header)
                contentAttributes['header'] = options.header;
            if (options?.footer)
                contentAttributes['footer'] = options.footer;
            if (options?.buttonText)
                contentAttributes['button_text'] = options.buttonText;
            if (options?.sectionTitle)
                contentAttributes['section_title'] = options.sectionTitle;
            const response = await this.client.post(`/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`, {
                content: bodyText,
                message_type: 'outgoing',
                content_type: 'input_select',
                content_attributes: contentAttributes,
            }, { headers: Object.keys(headers).length > 0 ? headers : undefined });
            logger_1.default.info('WhatsApp interactive message sent', {
                accountId,
                conversationId,
                itemCount: items.length,
                type: items.length <= 3 ? 'buttons' : 'list',
                responseStatus: response.status,
            });
            return true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const responseData = error?.response?.data;
            logger_1.default.error('Failed to send WhatsApp interactive message', {
                accountId,
                conversationId,
                error: errorMessage,
                responseData: JSON.stringify(responseData),
            });
            return false;
        }
    }
    async sendMessage(accountId, conversationId, message, jwt, apiToken, attachmentPath) {
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            if (apiToken) {
                logger_1.default.info('Sending message with API token', {
                    conversationId,
                    tokenPrefix: apiToken.substring(0, 8),
                    tokenLength: apiToken.length,
                    hasAttachment: !!attachmentPath
                });
            }
            else if (jwt) {
                logger_1.default.info('Sending message with JWT', {
                    conversationId,
                    hasAttachment: !!attachmentPath
                });
            }
            else {
                logger_1.default.warn('Sending message without authentication', { conversationId });
            }
            // Se houver anexo, usa FormData
            if (attachmentPath) {
                let localFilePath = attachmentPath;
                let tempFile = false;
                // Se for path relativo de upload (/uploads/arquivo), resolve para caminho absoluto no disco
                if (attachmentPath.startsWith('/uploads/')) {
                    const uploadDir = process.env.UPLOAD_DIR || path_1.default.join(process.cwd(), 'uploads');
                    localFilePath = path_1.default.join(uploadDir, path_1.default.basename(attachmentPath));
                    logger_1.default.info('Attachment resolved from uploads dir', { attachmentPath, localFilePath });
                }
                // Se for URL externa, baixa temporariamente
                else if (attachmentPath.startsWith('http://') || attachmentPath.startsWith('https://')) {
                    logger_1.default.info('Attachment is URL, downloading...', { url: attachmentPath });
                    const downloaded = await this.downloadFile(attachmentPath);
                    if (downloaded) {
                        localFilePath = downloaded;
                        tempFile = true;
                    }
                    else {
                        logger_1.default.warn('Failed to download attachment, sending message without attachment', { url: attachmentPath });
                        // Continua sem anexo
                        localFilePath = '';
                    }
                }
                // Verifica se o arquivo existe (seja original ou baixado)
                if (localFilePath && fs_1.default.existsSync(localFilePath)) {
                    try {
                        const formData = new form_data_1.default();
                        formData.append('content', message || '');
                        formData.append('message_type', 'outgoing');
                        formData.append('private', 'false');
                        // Detecta MIME type pela extensão para garantir classificação correta no Chatwoot.
                        // Sem isso, form-data usa video/webm para .webm, fazendo Chatwoot tratar áudio como vídeo.
                        const fileExt = path_1.default.extname(localFilePath).toLowerCase();
                        const audioMimeMap = {
                            '.ogg': 'audio/ogg', '.oga': 'audio/ogg',
                            '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4',
                            '.wav': 'audio/wav', '.aac': 'audio/aac',
                            '.webm': 'audio/webm', // força audio/webm em vez de video/webm
                        };
                        const explicitMime = audioMimeMap[fileExt];
                        const appendOptions = explicitMime
                            ? { filename: path_1.default.basename(localFilePath), contentType: explicitMime }
                            : { filename: path_1.default.basename(localFilePath) };
                        formData.append('attachments[]', fs_1.default.createReadStream(localFilePath), appendOptions);
                        await this.client.post(`/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`, formData, {
                            headers: {
                                ...headers,
                                ...formData.getHeaders()
                            }
                        });
                        logger_1.default.info('Message with attachment sent successfully', { conversationId });
                        // Remove arquivo temporário se foi baixado
                        if (tempFile && localFilePath) {
                            try {
                                fs_1.default.unlinkSync(localFilePath);
                                logger_1.default.info('Temporary file deleted', { filePath: localFilePath });
                            }
                            catch (unlinkError) {
                                logger_1.default.warn('Failed to delete temporary file', { filePath: localFilePath });
                            }
                        }
                        return 1;
                    }
                    catch (sendError) {
                        // Remove arquivo temporário em caso de erro
                        if (tempFile && localFilePath) {
                            try {
                                fs_1.default.unlinkSync(localFilePath);
                            }
                            catch { }
                        }
                        throw sendError;
                    }
                }
            }
            // Sem anexo ou falha no download, envia JSON normal
            {
                // Sem anexo, envia JSON normal
                const msgResp = await this.client.post(`/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`, {
                    content: message,
                    message_type: 'outgoing',
                    private: false
                }, { headers });
                // Verifica se a mensagem foi aceita pelo provedor (ex: WhatsApp Cloud rejeita texto fora da janela de 24h)
                const msgStatus = msgResp.data?.status;
                if (msgStatus === 'failed') {
                    const errMsg = msgResp.data?.error || 'Mensagem rejeitada pelo provedor WhatsApp (status: failed). Para WhatsApp Cloud API, use templates aprovados para iniciar conversas.';
                    logger_1.default.error('Message delivery failed (provider rejected)', {
                        conversationId,
                        accountId,
                        msgStatus,
                        error: errMsg,
                    });
                    throw new Error(errMsg);
                }
                logger_1.default.info('Message sent successfully', { conversationId, msgStatus });
                return msgResp.data?.id || 1;
            }
            return 1;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const httpStatus = error?.response?.status;
            const httpData = error?.response?.data;
            logger_1.default.error('Failed to send message', {
                conversationId,
                accountId,
                error: errorMessage,
                httpStatus,
                httpData: httpData ? JSON.stringify(httpData).substring(0, 200) : undefined,
            });
            return false;
        }
    }
    // Envia nota privada (visível apenas para agentes) em uma conversa
    async sendPrivateNote(accountId, conversationId, content, jwt, apiToken) {
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            await this.client.post(`/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`, {
                content,
                message_type: 'outgoing',
                private: true,
            }, { headers });
            logger_1.default.info('Private note sent', { accountId, conversationId });
            return true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.error('Failed to send private note', { conversationId, error: errorMessage });
            return false;
        }
    }
    // Deleta uma conversa
    async deleteConversation(accountId, conversationId, jwt, apiToken) {
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            const response = await this.client.delete(`/api/v1/accounts/${accountId}/conversations/${conversationId}`, { headers });
            logger_1.default.info('Conversation deleted', {
                accountId,
                conversationId,
                status: response.status,
                data: JSON.stringify(response.data).substring(0, 200),
            });
            return true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const status = error.response?.status;
            const data = JSON.stringify(error.response?.data).substring(0, 200);
            logger_1.default.error('Failed to delete conversation', { accountId, conversationId, error: errorMessage, status, data });
            throw error; // repassa o erro para o handler retornar 500
        }
    }
    // Busca dados de um contato específico
    async getContact(accountId, contactId, jwt, apiToken) {
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            const response = await this.client.get(`/api/v1/accounts/${accountId}/contacts/${contactId}`, { headers });
            const raw = response.data;
            // Chatwoot v3+ encapsula em payload
            return raw?.payload ?? raw;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.error('Failed to fetch contact', { accountId, contactId, error: errorMessage });
            return null;
        }
    }
    // Busca todas as conversas de um contato
    async getContactConversations(accountId, contactId, apiToken, jwt) {
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            const response = await this.client.get(`/api/v1/accounts/${accountId}/contacts/${contactId}/conversations`, { headers });
            return response.data.payload || response.data || [];
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.error('Failed to fetch contact conversations', { accountId, contactId, error: errorMessage });
            return [];
        }
    }
    // Lista todas as inboxes (canais) de uma conta
    async getInboxes(accountId, jwt, apiToken) {
        try {
            // Sempre prefere JWT quando disponível (melhor permissão)
            if (jwt) {
                logger_1.default.info('Using JWT for inboxes request', { accountId });
            }
            else if (apiToken) {
                // Fallback para API token se não tiver JWT
                logger_1.default.info('Using API token for inboxes request', { accountId });
            }
            const headers = this.buildHeaders(jwt, apiToken);
            const response = await this.client.get(`/api/v1/accounts/${accountId}/inboxes`, {
                headers,
            });
            const inboxes = response.data.payload || response.data || [];
            logger_1.default.info('Inboxes fetched successfully from Chatwoot', {
                accountId,
                count: inboxes.length,
                usedJWT: !!jwt,
                usedApiToken: !jwt && !!apiToken
            });
            return inboxes;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.error('Failed to fetch inboxes', {
                accountId,
                error: errorMessage,
                hadJWT: !!jwt,
                hadApiToken: !!apiToken
            });
            return [];
        }
    }
    async getWhatsAppTemplates(accountId, inboxId, jwt, apiToken) {
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            // Templates ficam no campo message_templates do próprio objeto de inbox
            // O endpoint /whatsapp_templates não existe no Chatwoot — usar GET /inboxes/:id
            const response = await this.client.get(`/api/v1/accounts/${accountId}/inboxes/${inboxId}`, { headers });
            const templates = response.data?.message_templates || [];
            logger_1.default.info('WhatsApp templates fetched', { accountId, inboxId, count: templates.length });
            return templates;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.warn('Failed to fetch WhatsApp templates', { accountId, inboxId, error: errorMessage });
            return [];
        }
    }
    async getInboxById(accountId, inboxId, jwt, apiToken) {
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            const response = await this.client.get(`/api/v1/accounts/${accountId}/inboxes/${inboxId}`, { headers });
            return response.data || null;
        }
        catch {
            return null;
        }
    }
    // Cria uma nova inbox
    async createInbox(accountId, data, jwt, apiToken) {
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            const response = await this.client.post(`/api/v1/accounts/${accountId}/inboxes`, data, { headers });
            logger_1.default.info('Inbox created', { accountId, inboxId: response.data.id, name: data.name });
            return response.data;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.error('Failed to create inbox', { accountId, error: errorMessage });
            throw error;
        }
    }
    async deleteInbox(accountId, inboxId, jwt, apiToken) {
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            await this.client.delete(`/api/v1/accounts/${accountId}/inboxes/${inboxId}`, { headers });
            logger_1.default.info('Inbox deleted', { accountId, inboxId });
            return true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.error('Failed to delete inbox', { accountId, inboxId, error: errorMessage });
            return false;
        }
    }
    // Lista contatos com paginação (sem query de busca)
    async getContacts(accountId, page = 1, jwt, apiToken) {
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            const response = await this.client.get(`/api/v1/accounts/${accountId}/contacts`, {
                headers,
                params: { page, sort: 'last_activity_at', include_contacts: true },
            });
            const payload = response.data.payload || response.data || [];
            const meta = response.data.meta || {};
            logger_1.default.info('Contacts listed', { accountId, page, count: Array.isArray(payload) ? payload.length : 0 });
            return { payload: Array.isArray(payload) ? payload : [], meta };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.error('Failed to list contacts', { accountId, page, error: errorMessage });
            return { payload: [], meta: {} };
        }
    }
    // Busca contatos pela label/tag atribuída (endpoint correto para filtragem por etiqueta)
    async getContactsByLabel(accountId, label, apiToken, jwt) {
        const results = [];
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            let page = 1;
            while (true) {
                const response = await this.client.get(`/api/v1/accounts/${accountId}/contacts`, {
                    headers,
                    params: { 'labels[]': label, page },
                });
                const payload = response.data.payload || response.data || [];
                const contacts = Array.isArray(payload) ? payload : (payload.contacts || []);
                if (contacts.length === 0)
                    break;
                results.push(...contacts);
                const meta = response.data.meta || {};
                const totalCount = meta.count || 0;
                if (results.length >= totalCount || contacts.length < 15)
                    break;
                page++;
            }
            logger_1.default.info('Contacts fetched by label', { accountId, label, count: results.length });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.error('Failed to fetch contacts by label', { accountId, label, error: errorMessage });
        }
        return results;
    }
    // Busca contatos por identificador (phone_number ou email)
    async searchContacts(accountId, query, jwt, apiToken) {
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            const response = await this.client.get(`/api/v1/accounts/${accountId}/contacts/search`, {
                headers,
                params: { q: query }
            });
            const contacts = response.data.payload || response.data || [];
            logger_1.default.info('Contacts searched', { accountId, query, count: contacts.length });
            return contacts;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.error('Failed to search contacts', { accountId, query, error: errorMessage });
            return [];
        }
    }
    // Cria um novo contato
    async createContact(accountId, data, jwt, apiToken) {
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            const response = await this.client.post(`/api/v1/accounts/${accountId}/contacts`, data, { headers });
            // Chatwoot pode retornar várias estruturas dependendo da versão:
            // { id, name, ... }
            // { contact: { id, ... }, contact_inbox: {...} }
            // { payload: { id, ... } }
            // { payload: { contact: { id, ... }, contact_inbox: {...} } }
            const raw = response.data;
            let contactData = null;
            if (raw?.id) {
                contactData = raw;
            }
            else if (raw?.contact?.id) {
                contactData = raw.contact;
            }
            else if (raw?.payload?.id) {
                contactData = raw.payload;
            }
            else if (raw?.payload?.contact?.id) {
                contactData = raw.payload.contact;
            }
            else if (Array.isArray(raw?.payload) && raw.payload[0]?.id) {
                contactData = raw.payload[0];
            }
            else {
                contactData = raw;
            }
            logger_1.default.info('Contact created', {
                accountId,
                contactId: contactData?.id,
                rawKeys: Object.keys(raw || {}),
                payloadKeys: raw?.payload ? Object.keys(raw.payload) : undefined,
            });
            return contactData;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const responseData = error?.response?.data;
            const responseStatus = error?.response?.status;
            logger_1.default.error('Failed to create contact', { accountId, error: errorMessage, responseStatus, responseData });
            // Propaga o erro para que a rota possa retornar a mensagem do Chatwoot ao cliente
            throw error;
        }
    }
    // Cria uma nova conversa
    async createConversation(accountId, data, jwt, apiToken) {
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            const response = await this.client.post(`/api/v1/accounts/${accountId}/conversations`, data, { headers });
            logger_1.default.info('Conversation created', { accountId, conversationId: response.data.id });
            return response.data;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const responseData = error?.response?.data;
            const responseStatus = error?.response?.status;
            logger_1.default.error('Failed to create conversation', {
                accountId,
                error: errorMessage,
                responseStatus,
                responseData: JSON.stringify(responseData),
            });
            return null;
        }
    }
    // Busca perfil do usuário (suporta JWT e API Token)
    async getUserProfile(jwt, apiToken) {
        try {
            const headers = {};
            if (apiToken) {
                headers['api_access_token'] = apiToken;
            }
            else if (jwt) {
                headers['access-token'] = jwt['access-token'];
                headers['token-type'] = jwt['token-type'];
                headers['client'] = jwt.client;
                headers['expiry'] = jwt.expiry;
                headers['uid'] = jwt.uid;
            }
            else {
                throw new Error('JWT ou API Token é necessário');
            }
            logger_1.default.info('Calling Chatwoot getUserProfile', {
                baseURL: this.baseURL,
                fullURL: `${this.baseURL}/api/v1/profile`,
                hasApiToken: !!apiToken,
                hasJWT: !!jwt
            });
            const response = await this.client.get('/api/v1/profile', { headers });
            return response.data;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.error('Failed to get user profile', {
                error: errorMessage,
                baseURL: this.baseURL,
                fullURL: `${this.baseURL}/api/v1/profile`
            });
            throw error;
        }
    }
    // Envia anexo/imagem para uma conversa (para chatbot flows)
    async sendAttachment(conversationId, imageUrl, caption, accountId, jwt, apiToken) {
        try {
            // Para chatbot flows, usa o primeiro agente admin da conta
            if (!jwt && !apiToken && accountId) {
                const agents = await this.getAccountAgents(accountId);
                const admin = agents.find(a => a.role === 'administrator');
                if (admin) {
                    // Usa access_token do admin
                    const token = await this.getAgentAccessToken(accountId, admin.id);
                    apiToken = token || undefined;
                }
            }
            if (!accountId) {
                throw new Error('accountId is required for sending attachments');
            }
            // Verifica se é URL local (começa com /uploads/)
            if (imageUrl.startsWith('/uploads/')) {
                // Upload real do arquivo
                const filePath = `${process.cwd()}${imageUrl}`;
                // Verifica se arquivo existe
                if (!fs_1.default.existsSync(filePath)) {
                    logger_1.default.error('File not found', { filePath });
                    throw new Error(`File not found: ${filePath}`);
                }
                const formData = new form_data_1.default();
                // Só adiciona content se houver caption (evita duplicação no Chatwoot)
                if (caption && caption.trim()) {
                    formData.append('content', caption);
                }
                formData.append('attachments[]', fs_1.default.createReadStream(filePath));
                const headers = {
                    ...formData.getHeaders(),
                };
                if (apiToken) {
                    headers['api_access_token'] = apiToken;
                }
                const response = await this.client.post(`/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`, formData, { headers });
                logger_1.default.info('Attachment uploaded successfully', {
                    conversationId,
                    filePath,
                    messageId: response.data?.id
                });
                return true;
            }
            else if (imageUrl.startsWith('data:')) {
                // Base64 data URI — converte para buffer e faz upload como attachment
                const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
                if (!matches)
                    throw new Error('Formato de data URI inválido');
                const mimeType = matches[1];
                const buffer = Buffer.from(matches[2], 'base64');
                const ext = mimeType.split('/')[1]?.split('+')[0] || 'jpg';
                const filename = `generated-image-${Date.now()}.${ext}`;
                const formData = new form_data_1.default();
                if (caption && caption.trim()) {
                    formData.append('content', caption);
                }
                formData.append('attachments[]', buffer, { filename, contentType: mimeType });
                const headers = { ...formData.getHeaders() };
                if (apiToken)
                    headers['api_access_token'] = apiToken;
                const response = await this.client.post(`/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`, formData, { headers });
                logger_1.default.info('Base64 image uploaded as attachment', { conversationId, mimeType, messageId: response.data?.id });
                return true;
            }
            else {
                // URL externa — envia como mensagem com link
                const message = caption ? `${caption}\n\n${imageUrl}` : imageUrl;
                await this.sendMessage(accountId, conversationId, message, jwt, apiToken);
                logger_1.default.info('External URL sent as message', { conversationId, imageUrl });
                return true;
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.error('Failed to send attachment', { conversationId, error: errorMessage });
            return false;
        }
    }
    // Adiciona labels a uma conversa
    async addLabels(conversationId, labels, accountId, jwt, apiToken) {
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            await this.client.post(`/api/v1/accounts/${accountId}/conversations/${conversationId}/labels`, { labels }, { headers });
            logger_1.default.info('Labels added to conversation', { conversationId, labels });
            return true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.error('Failed to add labels', { conversationId, error: errorMessage });
            return false;
        }
    }
    // Remove labels de uma conversa
    async removeLabels(conversationId, labelsToRemove, accountId, jwt, apiToken) {
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            // Chatwoot não suporta DELETE de labels individuais.
            // Busca labels atuais e faz POST com a lista sem as labels a remover.
            const currentResp = await this.client.get(`/api/v1/accounts/${accountId}/conversations/${conversationId}/labels`, { headers });
            const currentLabels = currentResp.data?.payload || [];
            const toRemoveSet = new Set(labelsToRemove.map(l => l.toLowerCase()));
            const newLabels = currentLabels.filter(l => !toRemoveSet.has(l.toLowerCase()));
            await this.client.post(`/api/v1/accounts/${accountId}/conversations/${conversationId}/labels`, { labels: newLabels }, { headers });
            logger_1.default.info('Labels removed from conversation', { conversationId, removed: labelsToRemove, remaining: newLabels });
            return true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.error('Failed to remove labels', { conversationId, error: errorMessage });
            return false;
        }
    }
    // Atribui um agente ou time a uma conversa
    async assign(conversationId, assignType, assignId, accountId, jwt, apiToken) {
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            if (assignType === 'agent') {
                // Atribui agente
                await this.client.post(`/api/v1/accounts/${accountId}/conversations/${conversationId}/assignments`, { assignee_id: assignId }, { headers });
                logger_1.default.info('Agent assigned to conversation', { conversationId, agentId: assignId });
            }
            else {
                // Atribui time
                await this.client.post(`/api/v1/accounts/${accountId}/conversations/${conversationId}/assignments`, { team_id: assignId }, { headers });
                logger_1.default.info('Team assigned to conversation', { conversationId, teamId: assignId });
            }
            return true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.error('Failed to assign', { conversationId, assignType, assignId, error: errorMessage });
            return false;
        }
    }
    // Backwards compatibility: manter assignAgent como alias
    async assignAgent(conversationId, agentId, accountId, jwt, apiToken) {
        return this.assign(conversationId, 'agent', agentId, accountId, jwt, apiToken);
    }
    // Busca access token de um agente (helper para chatbot flows)
    async getAgentAccessToken(accountId, agentId) {
        try {
            // Este método pode não existir na API do Chatwoot
            // Por enquanto, retorna null e será necessário configurar um token fixo
            logger_1.default.warn('getAgentAccessToken not implemented, returning null');
            return null;
        }
        catch (error) {
            logger_1.default.error('Failed to get agent access token');
            return null;
        }
    }
    // Atualiza a webhook_url de uma inbox (para integração Waha)
    async updateInboxWebhookUrl(accountId, inboxId, webhookUrl, jwt, apiToken) {
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            await this.client.patch(`/api/v1/accounts/${accountId}/inboxes/${inboxId}`, {
                channel: {
                    webhook_url: webhookUrl,
                },
            }, { headers });
            logger_1.default.info('Inbox webhook URL updated', { accountId, inboxId, webhookUrl });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.error('Failed to update inbox webhook URL', {
                accountId,
                inboxId,
                error: errorMessage,
            });
            throw error;
        }
    }
    /**
     * Lista webhooks de uma conta no Chatwoot
     */
    async listWebhooks(accountId, jwt, apiToken) {
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            const response = await this.client.get(`/api/v1/accounts/${accountId}/webhooks`, { headers });
            // Chatwoot pode retornar: { payload: { webhooks: [...] } } ou { payload: [...] } ou [...]
            const data = response.data;
            const raw = data?.payload?.webhooks ?? // { payload: { webhooks: [...] } }
                data?.payloads ?? // { payloads: [...] }
                (Array.isArray(data?.payload) ? data.payload : null) ?? // { payload: [...] }
                (Array.isArray(data) ? data : []);
            const list = Array.isArray(raw) ? raw : [];
            // Normaliza objetos aninhados como { webhook: {...} } → {...}
            return list.map((item) => item?.webhook ?? item);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.error('Failed to list webhooks', { accountId, error: errorMessage });
            return [];
        }
    }
    /**
     * Atualiza subscriptions de um webhook existente
     */
    async updateWebhook(accountId, webhookId, subscriptions, jwt, apiToken) {
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            await this.client.patch(`/api/v1/accounts/${accountId}/webhooks/${webhookId}`, { subscriptions }, { headers });
            logger_1.default.info('Webhook updated', { accountId, webhookId, subscriptions });
            return true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.error('Failed to update webhook', { accountId, webhookId, error: errorMessage });
            return false;
        }
    }
    /**
     * Cria um webhook global no Chatwoot
     */
    async createWebhook(accountId, url, subscriptions, jwt, apiToken) {
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            const response = await this.client.post(`/api/v1/accounts/${accountId}/webhooks`, { url, subscriptions }, { headers });
            // Chatwoot pode retornar { payload: { webhook: {...} } } ou diretamente o objeto
            const data = response.data?.payload?.webhook ?? response.data?.payload ?? response.data;
            logger_1.default.info('Webhook created', { accountId, webhookId: data?.id, url });
            return data;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.error('Failed to create webhook', { accountId, error: errorMessage });
            throw error;
        }
    }
    /**
     * Remove um webhook global do Chatwoot
     */
    async deleteWebhook(accountId, webhookId, jwt, apiToken) {
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            await this.client.delete(`/api/v1/accounts/${accountId}/webhooks/${webhookId}`, { headers });
            logger_1.default.info('Webhook deleted', { accountId, webhookId });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.error('Failed to delete webhook', { accountId, webhookId, error: errorMessage });
            throw error;
        }
    }
    // Busca o conversationId mais recente associado a um número de telefone
    async findLatestConversationByPhone(accountId, phone, jwt, apiToken) {
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            // 1. Buscar contato pelo telefone
            const searchResp = await this.client.get(`/api/v1/accounts/${accountId}/contacts/search`, {
                headers,
                params: { q: phone, include_contacts: true },
            });
            const contacts = searchResp.data.payload || searchResp.data || [];
            if (!contacts.length)
                return null;
            const contactId = contacts[0].id;
            // 2. Buscar conversas do contato
            const convResp = await this.client.get(`/api/v1/accounts/${accountId}/contacts/${contactId}/conversations`, { headers });
            const convPayload = convResp.data.payload || convResp.data || {};
            const conversations = convPayload.conversations || convPayload || [];
            if (!Array.isArray(conversations) || !conversations.length)
                return null;
            // Preferir conversa aberta mais recente, senão a mais recente em geral
            const sorted = [...conversations].sort((a, b) => b.id - a.id);
            const openConv = sorted.find((c) => c.status === 'open');
            const chosen = openConv || sorted[0];
            return chosen?.id || null;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.warn('findLatestConversationByPhone failed', { accountId, phone, error: errorMessage });
            return null;
        }
    }
    // Busca SLA policies da conta
    async getSLAPolicies(accountId, jwt, apiToken) {
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            const response = await this.client.get(`/api/v1/accounts/${accountId}/sla_policies`, {
                headers,
            });
            const raw = response.data;
            const policies = Array.isArray(raw) ? raw : (raw?.payload || raw?.data || []);
            logger_1.default.info('SLA policies fetched', { accountId, count: policies.length });
            return policies;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.error('Failed to fetch SLA policies', { accountId, error: errorMessage });
            return [];
        }
    }
    // Aplica SLA policy a uma conversa
    async applySLA(conversationId, slaId, accountId, jwt, apiToken) {
        try {
            const headers = this.buildHeaders(jwt, apiToken);
            await this.client.patch(`/api/v1/accounts/${accountId}/conversations/${conversationId}`, { sla_policy_id: slaId }, { headers });
            logger_1.default.info('SLA applied to conversation', { conversationId, slaId });
            return true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.default.error('Failed to apply SLA', { conversationId, slaId, error: errorMessage });
            return false;
        }
    }
}
exports.default = new ChatwootAPI();
//# sourceMappingURL=chatwoot.js.map