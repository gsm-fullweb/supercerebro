"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const chatwootDatabase_1 = __importDefault(require("../services/chatwootDatabase"));
const logger_1 = __importDefault(require("../utils/logger"));
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 16 * 1024 * 1024 },
});
const router = (0, express_1.Router)();
const META_GRAPH_URL = 'https://graph.facebook.com/v20.0';
// Helper: dispara sync de templates no Chatwoot (fire-and-forget)
async function syncChatwootTemplates(accountId, inboxId, jwt, apiToken) {
    const chatwootUrl = process.env.CHATWOOT_API_URL ||
        (process.env.CHATWOOT_DOMAIN ? `https://${process.env.CHATWOOT_DOMAIN}` : null);
    if (!chatwootUrl)
        return;
    const url = `${chatwootUrl}/api/v1/accounts/${accountId}/inboxes/${inboxId}/sync_templates`;
    const headers = { 'Content-Type': 'application/json' };
    if (apiToken) {
        headers['api_access_token'] = apiToken;
    }
    else if (jwt['access-token'] && jwt.client && jwt.uid) {
        headers['access-token'] = jwt['access-token'];
        headers['client'] = jwt.client;
        headers['uid'] = jwt.uid;
        headers['expiry'] = jwt.expiry || '';
        headers['token-type'] = jwt['token-type'] || 'Bearer';
    }
    else {
        return;
    }
    try {
        const res = await fetch(url, { method: 'POST', headers });
        logger_1.default.info('Chatwoot sync_templates', { accountId, inboxId, status: res.status });
    }
    catch (err) {
        logger_1.default.warn('Chatwoot sync_templates failed', { accountId, inboxId, error: err.message });
    }
}
// Helper: chama a API da Meta com tratamento de erros
async function metaRequest(method, path, accessToken, body) {
    try {
        const url = `${META_GRAPH_URL}${path}`;
        const headers = {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        };
        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
        const data = await response.json();
        if (!response.ok || data.error) {
            const err = data.error || {};
            logger_1.default.error('Meta API raw error', {
                status: response.status,
                code: err.code,
                subcode: err.error_subcode,
                message: err.message,
                error_user_msg: err.error_user_msg,
                fbtrace_id: err.fbtrace_id,
                path,
            });
            const msg = err.error_user_msg || err.message || `HTTP ${response.status}`;
            return { ok: false, error: msg };
        }
        return { ok: true, data };
    }
    catch (err) {
        return { ok: false, error: err.message || 'Erro de conexão com a API da Meta' };
    }
}
// GET /api/whatsapp-templates/inbox/:inboxId
// Retorna info da inbox (valida que é WhatsApp Cloud)
router.get('/inbox/:inboxId', async (req, res) => {
    const authReq = req;
    const accountId = authReq.user.account_id;
    const isSuperAdmin = authReq.user.type === 'SuperAdmin';
    const inboxId = parseInt(req.params.inboxId);
    if (!inboxId) {
        return res.status(400).json({ error: 'ID de inbox inválido' });
    }
    // Tenta com o accountId resolvido; se falhar e for SuperAdmin, busca sem filtro de conta
    let config = await chatwootDatabase_1.default.getWhatsappInboxConfig(inboxId, accountId);
    logger_1.default.info('getWhatsappInboxConfig result (with account)', { inboxId, accountId, isSuperAdmin, found: !!config });
    if (!config && isSuperAdmin) {
        config = await chatwootDatabase_1.default.getWhatsappInboxConfig(inboxId, null);
        logger_1.default.info('getWhatsappInboxConfig result (no account filter)', { inboxId, found: !!config, config: config ? { provider: config.provider, hasProviderConfig: !!config.providerConfig } : null });
    }
    if (!config) {
        return res.status(404).json({ error: 'Inbox não encontrada ou não é WhatsApp Cloud' });
    }
    // Não expor a api_key completa — só indicar se está configurada
    return res.json({
        data: {
            inboxId: config.inboxId,
            inboxName: config.inboxName,
            phoneNumber: config.phoneNumber,
            hasCredentials: !!(config.providerConfig.api_key && config.providerConfig.business_account_id),
            businessAccountId: config.providerConfig.business_account_id || null,
            phoneNumberId: config.providerConfig.phone_number_id || null,
        }
    });
});
// GET /api/whatsapp-templates/inbox/:inboxId/templates
// Lista templates da Meta
router.get('/inbox/:inboxId/templates', async (req, res) => {
    const authReq = req;
    const accountId = authReq.user.account_id;
    const isSuperAdmin = authReq.user.type === 'SuperAdmin';
    const inboxId = parseInt(req.params.inboxId);
    const { status, search, limit = '50' } = req.query;
    if (!inboxId) {
        return res.status(400).json({ error: 'ID de inbox inválido' });
    }
    let config = await chatwootDatabase_1.default.getWhatsappInboxConfig(inboxId, accountId);
    if (!config && isSuperAdmin) {
        config = await chatwootDatabase_1.default.getWhatsappInboxConfig(inboxId, null);
    }
    if (!config) {
        return res.status(404).json({ error: 'Inbox não encontrada ou não é WhatsApp Cloud' });
    }
    const { api_key, business_account_id } = config.providerConfig;
    if (!api_key || !business_account_id) {
        return res.status(422).json({ error: 'Credenciais da Meta não configuradas nesta inbox' });
    }
    const fields = 'id,name,status,category,language,components,quality_score,rejected_reason';
    let apiPath = `/${business_account_id}/message_templates?fields=${fields}&limit=${limit}`;
    if (status)
        apiPath += `&status=${status.toUpperCase()}`;
    const result = await metaRequest('GET', apiPath, api_key);
    if (!result.ok) {
        logger_1.default.error('Meta API error listing templates', { error: result.error, inboxId, accountId });
        return res.status(502).json({ error: result.error || 'Erro ao buscar templates' });
    }
    let templates = result.data?.data || [];
    // Filtro de busca por nome (client-side)
    if (search) {
        const q = search.toLowerCase();
        templates = templates.filter((t) => t.name.toLowerCase().includes(q));
    }
    return res.json({ data: templates, total: templates.length });
});
// POST /api/whatsapp-templates/inbox/:inboxId/templates
// Cria um novo template
router.post('/inbox/:inboxId/templates', async (req, res) => {
    const authReq = req;
    const accountId = authReq.user.account_id;
    const inboxId = parseInt(req.params.inboxId);
    if (!inboxId) {
        return res.status(400).json({ error: 'ID de inbox inválido' });
    }
    const config = await chatwootDatabase_1.default.getWhatsappInboxConfig(inboxId, accountId);
    if (!config) {
        return res.status(404).json({ error: 'Inbox não encontrada ou não é WhatsApp Cloud' });
    }
    const { api_key, business_account_id } = config.providerConfig;
    if (!api_key || !business_account_id) {
        return res.status(422).json({ error: 'Credenciais da Meta não configuradas nesta inbox' });
    }
    const { name, category, language, components } = req.body;
    if (!name || !category || !language || !components) {
        return res.status(400).json({ error: 'Campos obrigatórios: name, category, language, components' });
    }
    // Valida nome: apenas minúsculas, números e underscores
    if (!/^[a-z0-9_]+$/.test(name)) {
        return res.status(400).json({ error: 'Nome do template: apenas letras minúsculas, números e underscores' });
    }
    const payload = { name, category, language, components };
    logger_1.default.info('Creating template — payload to Meta', { inboxId, accountId, name, payload: JSON.stringify(payload) });
    const result = await metaRequest('POST', `/${business_account_id}/message_templates`, api_key, payload);
    if (!result.ok) {
        logger_1.default.error('Meta API error creating template', { error: result.error, inboxId, accountId, name });
        return res.status(502).json({ error: result.error || 'Erro ao criar template' });
    }
    logger_1.default.info('WhatsApp template created', { inboxId, accountId, name, templateId: result.data?.id });
    // Sincroniza templates no Chatwoot em background (fire-and-forget)
    syncChatwootTemplates(accountId, inboxId, authReq.jwt, authReq.apiToken).catch(() => { });
    return res.status(201).json({ data: result.data });
});
// DELETE /api/whatsapp-templates/inbox/:inboxId/templates/:templateId
// Exclui um template pelo ID (usa nome + id conforme exigido pela Meta)
router.delete('/inbox/:inboxId/templates/:templateId', async (req, res) => {
    const authReq = req;
    const accountId = authReq.user.account_id;
    const inboxId = parseInt(req.params.inboxId);
    const { templateId } = req.params;
    const { name } = req.query;
    if (!inboxId) {
        return res.status(400).json({ error: 'ID de inbox inválido' });
    }
    if (!name) {
        return res.status(400).json({ error: 'Parâmetro name é obrigatório' });
    }
    const config = await chatwootDatabase_1.default.getWhatsappInboxConfig(inboxId, accountId);
    if (!config) {
        return res.status(404).json({ error: 'Inbox não encontrada ou não é WhatsApp Cloud' });
    }
    const { api_key, business_account_id } = config.providerConfig;
    if (!api_key || !business_account_id) {
        return res.status(422).json({ error: 'Credenciais da Meta não configuradas nesta inbox' });
    }
    // Meta exige name + hsm_id para deletar template específico (evita deletar todas as línguas)
    const result = await metaRequest('DELETE', `/${business_account_id}/message_templates?name=${encodeURIComponent(name)}&hsm_id=${templateId}`, api_key);
    if (!result.ok) {
        logger_1.default.error('Meta API error deleting template', { error: result.error, inboxId, accountId, templateId, name });
        return res.status(502).json({ error: result.error || 'Erro ao excluir template' });
    }
    logger_1.default.info('WhatsApp template deleted', { inboxId, accountId, name, templateId });
    // Sincroniza templates no Chatwoot em background (fire-and-forget)
    syncChatwootTemplates(accountId, inboxId, authReq.jwt, authReq.apiToken).catch(() => { });
    return res.json({ success: true });
});
// POST /api/whatsapp-templates/inbox/:inboxId/upload-media
// Faz upload via Resumable Upload API da Meta e retorna o handle (4::AbXXX...)
// O handle é necessário no example.header_handle para templates com cabeçalho de mídia
router.post('/inbox/:inboxId/upload-media', upload.single('file'), async (req, res) => {
    const authReq = req;
    const accountId = authReq.user.account_id;
    const isSuperAdmin = authReq.user.type === 'SuperAdmin';
    const inboxId = parseInt(req.params.inboxId);
    if (!inboxId)
        return res.status(400).json({ error: 'ID de inbox inválido' });
    if (!req.file)
        return res.status(400).json({ error: 'Arquivo não enviado' });
    let config = await chatwootDatabase_1.default.getWhatsappInboxConfig(inboxId, accountId);
    if (!config && isSuperAdmin)
        config = await chatwootDatabase_1.default.getWhatsappInboxConfig(inboxId, null);
    if (!config)
        return res.status(404).json({ error: 'Inbox não encontrada ou não é WhatsApp Cloud' });
    const { api_key, phone_number_id, business_account_id } = config.providerConfig;
    if (!api_key || !phone_number_id) {
        return res.status(422).json({ error: 'Credenciais da Meta não configuradas nesta inbox' });
    }
    const fileBuffer = req.file.buffer;
    const fileSize = fileBuffer.length;
    const mimeType = req.file.mimetype;
    const fileName = req.file.originalname;
    // Passo 0: Obter App ID via GET /app (o endpoint /uploads exige App ID, não WABA/phone)
    let appId = null;
    try {
        const appRes = await fetch(`${META_GRAPH_URL}/app`, {
            headers: { Authorization: `Bearer ${api_key}` },
        });
        const appData = (await appRes.json());
        appId = appData?.id || null;
        logger_1.default.info('App ID from /app', { inboxId, accountId, appId, appName: appData?.name });
    }
    catch (err) {
        logger_1.default.warn('Failed to fetch /app', { inboxId, accountId, error: err.message });
    }
    if (!appId) {
        logger_1.default.warn('App ID not found, upload cannot proceed', { inboxId, accountId });
        return res.status(502).json({ error: 'Não foi possível obter o App ID da Meta para esta inbox.' });
    }
    try {
        // Passo 1: Criar sessão de upload com App ID (body form-urlencoded)
        const qParams = `file_name=${encodeURIComponent(fileName)}&file_length=${fileSize}&file_type=${encodeURIComponent(mimeType)}`;
        const sessionRes = await fetch(`${META_GRAPH_URL}/${appId}/uploads`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${api_key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: qParams,
        });
        const sessionData = (await sessionRes.json());
        if (!sessionRes.ok || sessionData.error || !sessionData.id) {
            logger_1.default.error('Upload session creation failed', {
                inboxId, accountId, appId,
                error: sessionData.error?.message,
                errorCode: sessionData.error?.code,
                status: sessionRes.status,
            });
            return res.status(502).json({ error: sessionData.error?.message || 'Erro ao criar sessão de upload na Meta' });
        }
        // sessionData.id = "upload:{session_id}" — usar o id completo no path do Graph API
        const fullSessionId = sessionData.id; // mantém o "upload:" prefix
        logger_1.default.info('Upload session created', { inboxId, accountId, appId, fullSessionId });
        // Passo 2: Upload binário via Graph API (graph.facebook.com/v20.0/{upload:{id}})
        // Não usar rupload.facebook.com/whatsapp-business-media — só funciona com sessões WABA
        const uploadRes = await fetch(`${META_GRAPH_URL}/${fullSessionId}`, {
            method: 'POST',
            headers: {
                Authorization: `OAuth ${api_key}`,
                'file_offset': '0',
                'Content-Type': mimeType,
            },
            body: fileBuffer,
        });
        const uploadData = (await uploadRes.json());
        if (!uploadRes.ok || uploadData.error || !uploadData.h) {
            logger_1.default.error('Upload binary failed', {
                inboxId, accountId, appId,
                error: uploadData.error?.message,
                status: uploadRes.status,
            });
            return res.status(502).json({ error: uploadData.error?.message || 'Erro ao enviar arquivo para a Meta' });
        }
        logger_1.default.info('Media handle obtained', { inboxId, accountId, appId, handle: uploadData.h.substring(0, 20) + '...' });
        return res.json({ handle: uploadData.h });
    }
    catch (err) {
        logger_1.default.error('Upload exception', { inboxId, accountId, error: err.message });
        return res.status(502).json({ error: 'Não foi possível fazer upload da mídia na Meta. Verifique as credenciais da inbox.' });
    }
});
// POST /api/whatsapp-templates/inbox/:inboxId/sync-chatwoot
// Força sincronização dos templates no Chatwoot (para o botão manual na UI)
router.post('/inbox/:inboxId/sync-chatwoot', async (req, res) => {
    const authReq = req;
    const accountId = authReq.user.account_id;
    const inboxId = parseInt(req.params.inboxId);
    if (!inboxId) {
        return res.status(400).json({ error: 'ID de inbox inválido' });
    }
    const config = await chatwootDatabase_1.default.getWhatsappInboxConfig(inboxId, accountId);
    if (!config) {
        return res.status(404).json({ error: 'Inbox não encontrada ou não é WhatsApp Cloud' });
    }
    await syncChatwootTemplates(accountId, inboxId, authReq.jwt, authReq.apiToken);
    return res.json({ success: true });
});
// GET /api/whatsapp-templates/all
// Lista todos os templates de todas as inboxes de API Oficial da conta
router.get('/all', async (req, res) => {
    const authReq = req;
    const accountId = authReq.user.account_id;
    const inboxes = await chatwootDatabase_1.default.getAllWhatsappInboxes(accountId);
    if (inboxes.length === 0) {
        return res.json({ data: { inboxes: [], allTemplates: [] } });
    }
    const fields = 'id,name,status,category,language,components,quality_score,rejected_reason';
    const results = await Promise.all(inboxes.map(async (inbox) => {
        const { api_key, business_account_id } = inbox.providerConfig;
        if (!api_key || !business_account_id) {
            return { inboxId: inbox.inboxId, inboxName: inbox.inboxName, phoneNumber: inbox.phoneNumber, templates: [], error: 'Credenciais não configuradas' };
        }
        const r = await metaRequest('GET', `/${business_account_id}/message_templates?fields=${fields}&limit=200`, api_key);
        if (!r.ok) {
            return { inboxId: inbox.inboxId, inboxName: inbox.inboxName, phoneNumber: inbox.phoneNumber, templates: [], error: r.error };
        }
        const templates = (r.data?.data || []).map((t) => ({ ...t, inboxId: inbox.inboxId, inboxName: inbox.inboxName }));
        return { inboxId: inbox.inboxId, inboxName: inbox.inboxName, phoneNumber: inbox.phoneNumber, templates };
    }));
    const allTemplates = results.flatMap(r => r.templates);
    return res.json({ data: { inboxes: results, allTemplates } });
});
// POST /api/whatsapp-templates/bulk-delete
// Exclui múltiplos templates (possivelmente de inboxes diferentes)
router.post('/bulk-delete', async (req, res) => {
    const authReq = req;
    const accountId = authReq.user.account_id;
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'items deve ser um array não vazio' });
    }
    const allInboxes = await chatwootDatabase_1.default.getAllWhatsappInboxes(accountId);
    const inboxMap = new Map(allInboxes.map(i => [i.inboxId, i]));
    const results = await Promise.all(items.map(async ({ inboxId, templateId, name }) => {
        const inbox = inboxMap.get(Number(inboxId));
        if (!inbox)
            return { inboxId, templateId, name, success: false, error: 'Inbox não encontrada' };
        const { api_key, business_account_id } = inbox.providerConfig;
        if (!api_key || !business_account_id) {
            return { inboxId, templateId, name, success: false, error: 'Credenciais não configuradas' };
        }
        const result = await metaRequest('DELETE', `/${business_account_id}/message_templates?name=${encodeURIComponent(name)}&hsm_id=${templateId}`, api_key);
        if (!result.ok) {
            return { inboxId, templateId, name, success: false, error: result.error || 'Erro da Meta API' };
        }
        syncChatwootTemplates(accountId, Number(inboxId), authReq.jwt, authReq.apiToken).catch(() => { });
        return { inboxId, templateId, name, success: true };
    }));
    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
        logger_1.default.warn('Some templates failed bulk-delete', { accountId, failed });
    }
    return res.json({ data: results });
});
// POST /api/whatsapp-templates/bulk-create
// Cria o mesmo template em múltiplas inboxes de API Oficial
router.post('/bulk-create', async (req, res) => {
    const authReq = req;
    const accountId = authReq.user.account_id;
    const { inboxIds, name, category, language, components } = req.body;
    if (!Array.isArray(inboxIds) || inboxIds.length === 0) {
        return res.status(400).json({ error: 'inboxIds deve ser um array não vazio' });
    }
    if (!name || !category || !language || !components) {
        return res.status(400).json({ error: 'Campos obrigatórios: name, category, language, components' });
    }
    if (!/^[a-z0-9_]+$/.test(name)) {
        return res.status(400).json({ error: 'Nome do template: apenas letras minúsculas, números e underscores' });
    }
    const allInboxes = await chatwootDatabase_1.default.getAllWhatsappInboxes(accountId);
    const targetInboxes = allInboxes.filter(i => inboxIds.map(Number).includes(i.inboxId));
    if (targetInboxes.length === 0) {
        return res.status(404).json({ error: 'Nenhuma inbox válida encontrada nos IDs fornecidos' });
    }
    const payload = { name, category, language, components };
    const results = await Promise.all(targetInboxes.map(async (inbox) => {
        const { api_key, business_account_id } = inbox.providerConfig;
        if (!api_key || !business_account_id) {
            return { inboxId: inbox.inboxId, inboxName: inbox.inboxName, success: false, error: 'Credenciais não configuradas' };
        }
        const r = await metaRequest('POST', `/${business_account_id}/message_templates`, api_key, payload);
        if (!r.ok) {
            return { inboxId: inbox.inboxId, inboxName: inbox.inboxName, success: false, error: r.error };
        }
        syncChatwootTemplates(accountId, inbox.inboxId, authReq.jwt, authReq.apiToken).catch(() => { });
        return { inboxId: inbox.inboxId, inboxName: inbox.inboxName, success: true, templateId: r.data?.id };
    }));
    logger_1.default.info('Bulk template create', { accountId, name, total: targetInboxes.length, ok: results.filter(r => r.success).length });
    return res.json({ data: results });
});
exports.default = router;
//# sourceMappingURL=whatsappTemplates.js.map