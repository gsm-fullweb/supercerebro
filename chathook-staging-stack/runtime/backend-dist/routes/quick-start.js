"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const database_1 = __importDefault(require("../services/database"));
const chatwoot_1 = __importDefault(require("../services/chatwoot"));
const chatwootDatabase_1 = __importDefault(require("../services/chatwootDatabase"));
const systemSettings_1 = require("../services/systemSettings");
const uazapi_1 = require("../services/uazapi");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
// GET /api/quick-start/inboxes
router.get('/quick-start/inboxes', async (req, res) => {
    const accountId = req.accountId;
    const jwt = req.jwt;
    const apiToken = req.apiToken;
    try {
        // Sempre busca todas as inboxes da conta via admin token para que
        // inboxes de API oficial (Channel::Whatsapp) apareçam mesmo quando
        // não estão atribuídas ao agente logado.
        const adminToken = await chatwootDatabase_1.default.getAdminApiTokenForAccount(accountId).catch(() => null);
        if (adminToken) {
            const allInboxes = await chatwoot_1.default.getInboxes(accountId, undefined, adminToken).catch(() => null);
            if (allInboxes && allInboxes.length > 0) {
                logger_1.default.info('quick-start/inboxes: usando admin token (lista completa)', { accountId, count: allInboxes.length });
                return res.json({ data: allInboxes });
            }
        }
        // Fallback: inboxes visíveis pelo token do agente
        const inboxes = await chatwoot_1.default.getInboxes(accountId, jwt, apiToken);
        return res.json({ data: inboxes || [] });
    }
    catch (error) {
        return res.status(500).json({ error: error.message || 'Erro ao listar inboxes' });
    }
});
// Identifica o provider da caixa e resolve o número canônico consultando o endpoint correto
async function resolveCanonicalPhone(accountId, inboxId, inboxName, rawPhone) {
    const settings = await (0, systemSettings_1.getSystemSettings)(accountId);
    const phoneFormatted = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
    // EvoGo — sem endpoint de validação, retorna sem modificar
    const evoGoInst = await database_1.default.evolutionGoInstance.findFirst({ where: { accountId, inboxId } }).catch(() => null);
    if (evoGoInst)
        return { phone: rawPhone, jid: null, provider: 'evogo' };
    // UAZAPI — record por inbox no banco
    const uazapiInst = await database_1.default.uazapiInstance.findFirst({ where: { accountId, inboxId } }).catch(() => null);
    if (uazapiInst && settings.uazapiBaseUrl) {
        try {
            const r = await axios_1.default.get(`${settings.uazapiBaseUrl}/instance/${uazapiInst.instanceName}/wa/${phoneFormatted}`, {
                headers: { token: uazapiInst.instanceToken },
                timeout: 8000,
            });
            const chatId = r.data?.chatId || r.data?.id || '';
            if (chatId) {
                // Usa phoneFormatted: JID do UAZAPI pode diferir dos webhooks de entrada (9° dígito BR)
                logger_1.default.info('quick-start: uazapi número existe', { phoneFormatted, chatId });
                return { phone: phoneFormatted, jid: chatId, provider: 'uazapi' };
            }
        }
        catch (e) {
            logger_1.default.warn('quick-start: uazapi number check falhou', { error: e.message });
        }
        return { phone: rawPhone, jid: null, provider: 'uazapi' };
    }
    // WAHA — detectado via API de sessões (não há registro por inbox no banco)
    if (settings.wahaApiUrl && inboxName) {
        const sessionName = `Whatsapp_${inboxName}_CWID_${accountId}`;
        try {
            const chk = await axios_1.default.get(`${settings.wahaApiUrl}/api/sessions/${sessionName}`, {
                headers: { 'X-Api-Key': settings.wahaApiKey || '' },
                timeout: 5000,
            });
            if (chk.status === 200) {
                const r = await axios_1.default.get(`${settings.wahaApiUrl}/api/contacts/check-exists`, {
                    params: { phone: phoneFormatted, session: sessionName },
                    headers: { 'X-Api-Key': settings.wahaApiKey || '' },
                    timeout: 8000,
                });
                if (r.data?.numberExists) {
                    const chatId = r.data.chatId || '';
                    logger_1.default.info('quick-start: waha número existe', { phoneFormatted, chatId, sessionName });
                    // Retorna o JID exato do WAHA — usado para envio direto, garante source_id correto
                    return { phone: phoneFormatted, jid: chatId || null, provider: 'waha', wahaSession: sessionName };
                }
                // Tenta variante BR (com/sem 9° dígito)
                const altPhone = phoneFormatted.startsWith('55') && phoneFormatted.length === 13
                    ? '55' + phoneFormatted.slice(4) // 5561996... → 556196...
                    : phoneFormatted.length === 12
                        ? '55' + phoneFormatted[2] + phoneFormatted[3] + '9' + phoneFormatted.slice(4)
                        : null;
                if (altPhone) {
                    const r2 = await axios_1.default.get(`${settings.wahaApiUrl}/api/contacts/check-exists`, {
                        params: { phone: altPhone, session: sessionName },
                        headers: { 'X-Api-Key': settings.wahaApiKey || '' },
                        timeout: 8000,
                    }).catch(() => null);
                    if (r2?.data?.numberExists) {
                        const chatId2 = r2.data.chatId || '';
                        logger_1.default.info('quick-start: waha número existe na variante alt', { altPhone, chatId: chatId2, sessionName });
                        return { phone: altPhone, jid: chatId2 || null, provider: 'waha', wahaSession: sessionName };
                    }
                }
                return { phone: rawPhone, jid: null, provider: 'waha', wahaSession: sessionName };
            }
        }
        catch (e) {
            logger_1.default.warn('quick-start: waha number check falhou', { error: e.message });
        }
    }
    // Evolution (fallback — inboxName = nome da instância)
    if (settings.evolutionApiUrl && inboxName) {
        try {
            const r = await axios_1.default.post(`${settings.evolutionApiUrl}/chat/whatsappNumbers/${inboxName}`, { numbers: [phoneFormatted] }, { headers: { apikey: settings.evolutionApiKey || '' }, timeout: 8000 });
            const items = Array.isArray(r.data) ? r.data : [];
            const item = items.find((i) => i.exists);
            if (item) {
                const jid = item.jid || '';
                const real = jid.replace(/@.*/, '').replace(/\D/g, '');
                return { phone: real || rawPhone, jid, provider: 'evolution' };
            }
        }
        catch (e) {
            logger_1.default.warn('quick-start: evolution number check falhou', { error: e.message });
        }
    }
    return { phone: rawPhone, jid: null, provider: 'unknown' };
}
// POST /api/quick-start
router.post('/quick-start', async (req, res) => {
    const { phone, inboxId, initialMessage } = req.body;
    const accountId = req.accountId;
    const jwt = req.jwt;
    const apiToken = req.apiToken;
    if (!phone || !inboxId) {
        return res.status(400).json({ error: 'phone e inboxId são obrigatórios' });
    }
    const rawPhone = String(phone).replace(/\D/g, '');
    if (rawPhone.length < 8) {
        return res.status(400).json({ error: 'Número de telefone inválido' });
    }
    try {
        // 1. Obtém o nome da caixa selecionada
        const inboxes = await chatwoot_1.default.getInboxes(accountId, jwt, apiToken);
        const inbox = (inboxes || []).find((i) => String(i.id) === String(inboxId));
        const inboxName = inbox?.name || '';
        // 2. Identifica provider e resolve número canônico
        const { phone: canonicalPhone, jid, provider, wahaSession } = await resolveCanonicalPhone(accountId, Number(inboxId), inboxName, rawPhone);
        logger_1.default.info('quick-start: provider e número resolvidos', { accountId, rawPhone, canonicalPhone, jid, provider, inboxId, inboxName });
        // ── WAHA com mensagem: envia direto pela WAHA API ──────────────────────────
        // O JID retornado pelo check-exists é exatamente o mesmo que a WAHA usa nos
        // webhooks de entrada. Enviar por aqui garante que o source_id do contact_inbox
        // seja definido pela própria WAHA — elimina o mismatch do 9° dígito BR.
        const settings = await (0, systemSettings_1.getSystemSettings)(accountId);
        if (provider === 'waha' && jid && wahaSession && initialMessage?.trim()) {
            try {
                await axios_1.default.post(`${settings.wahaApiUrl}/api/sendText`, { session: wahaSession, chatId: jid, text: initialMessage.trim() }, { headers: { 'X-Api-Key': settings.wahaApiKey || '', 'Content-Type': 'application/json' }, timeout: 10000 });
                logger_1.default.info('quick-start: mensagem enviada via WAHA diretamente', { accountId, jid, wahaSession });
            }
            catch (e) {
                logger_1.default.error('quick-start: falha ao enviar via WAHA', { error: e.message, jid, wahaSession });
                return res.status(502).json({ error: 'Falha ao enviar mensagem via WAHA: ' + e.message });
            }
            // Webhook da WAHA cria contato + conversa no Chatwoot automaticamente.
            // Retorna sucesso imediatamente sem esperar — o frontend fecha o popover.
            return res.json({
                success: true,
                provider: 'waha',
                phoneUsed: canonicalPhone,
                jid,
            });
        }
        // ── UAZAPI com mensagem: envia direto via UAZAPI API ──────────────────────
        if (provider === 'uazapi' && jid && initialMessage?.trim()) {
            const uazapiInst = await database_1.default.uazapiInstance.findFirst({ where: { accountId, inboxId: Number(inboxId) } }).catch(() => null);
            if (uazapiInst && settings.uazapiBaseUrl) {
                try {
                    await (0, uazapi_1.sendUazapiText)(settings.uazapiBaseUrl, uazapiInst.instanceToken, canonicalPhone, initialMessage.trim());
                    logger_1.default.info('quick-start: mensagem enviada via UAZAPI diretamente', { accountId, canonicalPhone, jid });
                }
                catch (e) {
                    logger_1.default.error('quick-start: falha ao enviar via UAZAPI', { error: e.message, canonicalPhone });
                    return res.status(502).json({ error: 'Falha ao enviar mensagem via UAZAPI: ' + e.message });
                }
                return res.json({ success: true, provider: 'uazapi', phoneUsed: canonicalPhone, jid });
            }
        }
        // ── Evolution com mensagem: envia direto via Evolution API ────────────────
        if (provider === 'evolution' && jid && inboxName && initialMessage?.trim()) {
            try {
                await axios_1.default.post(`${settings.evolutionApiUrl}/message/sendText/${inboxName}`, { number: canonicalPhone, textMessage: { text: initialMessage.trim() } }, { headers: { apikey: settings.evolutionApiKey || '' }, timeout: 10000 });
                logger_1.default.info('quick-start: mensagem enviada via Evolution diretamente', { accountId, canonicalPhone, jid, inboxName });
            }
            catch (e) {
                logger_1.default.error('quick-start: falha ao enviar via Evolution', { error: e.message, canonicalPhone, inboxName });
                return res.status(502).json({ error: 'Falha ao enviar mensagem via Evolution: ' + e.message });
            }
            return res.json({ success: true, provider: 'evolution', phoneUsed: canonicalPhone, jid });
        }
        // ── Demais providers (ou provider sem jid/mensagem): via Chatwoot API ─────
        const phoneFormatted = '+' + canonicalPhone;
        // 3. Busca contato existente no Chatwoot
        let contactId = null;
        for (const searchPhone of Array.from(new Set([canonicalPhone, rawPhone]))) {
            const found = await chatwoot_1.default.searchContacts(accountId, searchPhone, jwt, apiToken);
            const match = (Array.isArray(found) ? found : []).find((c) => {
                const p = String(c.phone_number || '').replace(/\D/g, '');
                return p === canonicalPhone || p === rawPhone
                    || p.endsWith(canonicalPhone.slice(-10)) || canonicalPhone.endsWith(p.slice(-10));
            });
            if (match) {
                contactId = match.id;
                logger_1.default.info('quick-start: contato encontrado', { accountId, contactId, searchPhone });
                break;
            }
        }
        // 4. Cria contato se não encontrado
        if (!contactId) {
            const created = await chatwoot_1.default.createContact(accountId, {
                name: phoneFormatted,
                phone_number: phoneFormatted,
            }, jwt, apiToken);
            if (!created?.id) {
                return res.status(500).json({ error: 'Falha ao criar contato no Chatwoot' });
            }
            contactId = created.id;
            logger_1.default.info('quick-start: contato criado', { accountId, contactId, phone: canonicalPhone });
        }
        // 5. Cria a conversa via Chatwoot API
        const conversation = await chatwoot_1.default.createConversation(accountId, {
            inbox_id: Number(inboxId),
            contact_id: contactId,
        }, jwt, apiToken);
        if (!conversation?.id) {
            return res.status(500).json({ error: 'Falha ao criar conversa no Chatwoot' });
        }
        logger_1.default.info('quick-start: conversa criada', { accountId, conversationId: conversation.id, contactId, canonicalPhone, provider });
        // 6. Envia mensagem inicial via Chatwoot (entrega pelo provider da caixa)
        if (initialMessage?.trim()) {
            await chatwoot_1.default.sendMessage(accountId, conversation.id, initialMessage.trim(), jwt, apiToken);
            logger_1.default.info('quick-start: mensagem enviada via Chatwoot', { accountId, conversationId: conversation.id });
        }
        return res.json({
            success: true,
            provider,
            conversationId: conversation.id,
            contactId,
            accountId,
            phoneUsed: canonicalPhone,
            jid: jid || undefined,
        });
    }
    catch (error) {
        logger_1.default.error('Erro no quick-start', { error: error.message, phone, inboxId, accountId });
        return res.status(500).json({ error: error.message || 'Erro ao iniciar conversa' });
    }
});
exports.default = router;
//# sourceMappingURL=quick-start.js.map