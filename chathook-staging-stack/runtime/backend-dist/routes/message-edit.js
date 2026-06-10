"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../services/database"));
const chatwoot_1 = __importDefault(require("../services/chatwoot"));
const systemSettings_1 = require("../services/systemSettings");
const uazapi_1 = require("../services/uazapi");
const waha_1 = require("../services/waha");
const evolution_1 = __importDefault(require("../services/evolution"));
const evolutionGo_1 = require("../services/evolutionGo");
const logger_1 = __importDefault(require("../utils/logger"));
const chatwootDatabase_1 = __importDefault(require("../services/chatwootDatabase"));
const router = (0, express_1.Router)();
// PATCH /api/message/edit
router.patch('/message/edit', async (req, res) => {
    const { chatwootMessageId, conversationId, newContent } = req.body;
    const accountId = req.accountId;
    const jwt = req.jwt;
    const apiToken = req.apiToken;
    if (!chatwootMessageId || !conversationId || !newContent?.trim()) {
        return res.status(400).json({ error: 'chatwootMessageId, conversationId e newContent são obrigatórios' });
    }
    try {
        // 1. Busca tudo em paralelo
        // Usa before=chatwootMessageId+1 para garantir que a mensagem alvo esteja no resultado,
        // mesmo sendo antiga e fora da última página padrão do Chatwoot (~25 msgs)
        const [messages, conversation, inboxes, settings] = await Promise.all([
            chatwoot_1.default.getConversationMessages(accountId, Number(conversationId), jwt, apiToken, { before: Number(chatwootMessageId) + 1 }),
            chatwoot_1.default.getConversation(accountId, Number(conversationId), jwt, apiToken),
            chatwoot_1.default.getInboxes(accountId, jwt, apiToken),
            (0, systemSettings_1.getSystemSettings)(accountId),
        ]);
        if (!conversation)
            return res.status(404).json({ error: 'Conversa não encontrada' });
        const message = messages.find((m) => String(m.id) === String(chatwootMessageId));
        if (!message)
            return res.status(404).json({ error: 'Mensagem não encontrada' });
        if (message.private === true)
            return res.status(422).json({ error: 'Notas privadas não são enviadas ao WhatsApp — não podem ser editadas' });
        if (message.message_type === 0)
            return res.status(422).json({ error: 'Mensagens recebidas do contato não podem ser editadas' });
        const inboxId = conversation.inbox_id;
        const inboxName = inboxes?.find((i) => i.id === inboxId)?.name || '';
        let contactPhone = conversation.meta?.sender?.phone_number || '';
        // Fallback: busca telefone direto no objeto do contato quando meta.sender.phone_number está vazio
        if (!contactPhone) {
            const contactId = conversation.meta?.sender?.id;
            if (contactId) {
                try {
                    const contact = await chatwoot_1.default.getContact(accountId, contactId, jwt, apiToken);
                    contactPhone = contact?.phone_number || '';
                    if (contactPhone)
                        logger_1.default.info('Telefone recuperado via getContact', { contactId, contactPhone });
                }
                catch (e) {
                    logger_1.default.warn('Falha ao buscar contato para telefone', { contactId, error: e.message });
                }
            }
        }
        const rawPhone = contactPhone.replace(/\D/g, '');
        let provider = null;
        let uazapiInst = null;
        let wahaSession = null;
        let evoGoInst = null;
        logger_1.default.info('Editando mensagem — contexto', {
            chatwootMessageId, conversationId, inboxId, inboxName, rawPhone,
            sourceId: message.source_id,
            wahaApiUrl: settings.wahaApiUrl ? 'configurado' : 'não configurado',
            evolutionApiUrl: settings.evolutionApiUrl ? 'configurado' : 'não configurado',
        });
        // Evolution Go: tem inboxId salvo no banco (verificar antes dos outros providers)
        evoGoInst = await database_1.default.evolutionGoInstance.findFirst({ where: { accountId, inboxId } });
        if (evoGoInst) {
            provider = 'evolutionGo';
        }
        // UAZAPI: tem inboxId salvo no banco
        if (!provider) {
            uazapiInst = await database_1.default.uazapiInstance.findFirst({ where: { accountId, inboxId } });
            if (uazapiInst && settings.uazapiBaseUrl) {
                provider = 'uazapi';
            }
        }
        // WAHA: session com padrão de nome específico
        if (!provider && settings.wahaApiUrl && inboxName) {
            const sessionName = `Whatsapp_${inboxName}_CWID_${accountId}`;
            try {
                const check = await fetch(`${settings.wahaApiUrl}/api/sessions/${sessionName}`, {
                    headers: { 'X-Api-Key': settings.wahaApiKey || '' },
                });
                logger_1.default.info('WAHA session check', { sessionName, status: check.status, ok: check.ok });
                if (check.ok) {
                    provider = 'waha';
                    wahaSession = sessionName;
                }
            }
            catch (e) {
                logger_1.default.warn('WAHA session check falhou', { sessionName, error: e.message });
            }
        }
        // Evolution: fallback
        if (!provider && settings.evolutionApiUrl && inboxName) {
            provider = 'evolution';
        }
        logger_1.default.info('Provider identificado', { provider, wahaSession, inboxName });
        if (!provider) {
            return res.status(422).json({ error: 'Provider não identificado para este inbox' });
        }
        // Evolution Go: delega ao conector (tem mapa interno cwMsgToWaId), não precisa de source_id
        if (provider === 'evolutionGo') {
            const connectorUrl = process.env.EVO_GO_CONNECTOR_URL || 'http://evo-go-connector:3100';
            try {
                await (0, evolutionGo_1.editEvoGoMessage)(connectorUrl, chatwootMessageId, inboxId, rawPhone, newContent.trim());
                logger_1.default.info('Mensagem editada via Evolution Go', { conversationId, chatwootMessageId });
                await chatwoot_1.default.sendPrivateNote(accountId, Number(conversationId), `✏️ Mensagem editada no WhatsApp:\n${newContent.trim()}`, jwt, apiToken);
                return res.json({ success: true, provider: 'evolutionGo' });
            }
            catch (err) {
                logger_1.default.error('Erro ao editar via Evolution Go', { error: err.message, chatwootMessageId });
                return res.status(422).json({ error: err.message || 'Erro ao editar mensagem no WhatsApp via Evolution Go' });
            }
        }
        // 3. Resolve source_id — usa o provider identificado para buscar se estiver vazio
        let sourceId = message.source_id || message.external_source_id || '';
        if (!sourceId && rawPhone) {
            const createdAt = Math.floor(message.created_at);
            const msgContent = message.content || '';
            if (provider === 'waha' && wahaSession) {
                const chatId = `${rawPhone}@c.us`;
                const found = await (0, waha_1.findWahaMessageId)(accountId, wahaSession, chatId, msgContent, createdAt);
                if (found) {
                    sourceId = found;
                    logger_1.default.info('source_id recuperado via WAHA', { chatwootMessageId, sourceId });
                }
            }
            else if (provider === 'evolution') {
                try {
                    const found = await evolution_1.default.findMessageId(accountId, inboxName, rawPhone, msgContent, createdAt);
                    if (found) {
                        sourceId = found;
                        logger_1.default.info('source_id recuperado via Evolution', { chatwootMessageId, sourceId });
                    }
                }
                catch (evoErr) {
                    // Propaga erros de configuração (URL inválida) com mensagem clara
                    return res.status(422).json({ error: evoErr.message });
                }
            }
            if (provider === 'uazapi' && uazapiInst) {
                try {
                    const found = await (0, uazapi_1.findUazapiMessageId)(settings.uazapiBaseUrl, uazapiInst.instanceToken, rawPhone, msgContent, createdAt);
                    if (found) {
                        sourceId = found;
                        logger_1.default.info('source_id recuperado via UazAPI /message/find', { chatwootMessageId, sourceId });
                        // Persiste para futuras edições
                        await chatwootDatabase_1.default.updateMessageSourceId(Number(chatwootMessageId), found).catch(() => null);
                    }
                }
                catch (uazErr) {
                    logger_1.default.warn('UAZAPI: findUazapiMessageId falhou', { error: uazErr.message });
                }
            }
        }
        if (!sourceId) {
            // Fallback para UazAPI: edita apenas no Chatwoot (WA message ID não disponível)
            if (provider === 'uazapi') {
                const updated = await chatwootDatabase_1.default.updateMessageContent(Number(chatwootMessageId), newContent.trim());
                if (updated) {
                    logger_1.default.info('Mensagem editada apenas no Chatwoot (UazAPI sem source_id)', { conversationId, chatwootMessageId });
                    return res.json({
                        success: true,
                        provider: 'chatwoot_only',
                        warning: 'Mensagem atualizada apenas no Chatwoot. O WhatsApp ID desta mensagem não está disponível, por isso não foi possível editar no WhatsApp.',
                    });
                }
                return res.status(422).json({ error: 'Não foi possível atualizar a mensagem' });
            }
            if (!rawPhone) {
                return res.status(422).json({ error: 'Contato sem número de telefone cadastrado — não é possível localizar a mensagem no WhatsApp' });
            }
            return res.status(422).json({ error: 'ID WhatsApp não encontrado para esta mensagem — pode ser muito antiga ou enviada sem integração ativa' });
        }
        // 4. Edita via provider identificado
        if (provider === 'uazapi') {
            await (0, uazapi_1.editUazapiMessage)(settings.uazapiBaseUrl, uazapiInst.instanceToken, sourceId, newContent.trim());
            logger_1.default.info('Mensagem editada via UAZAPI', { conversationId, chatwootMessageId });
            await chatwoot_1.default.sendPrivateNote(accountId, Number(conversationId), `✏️ Mensagem editada no WhatsApp:\n${newContent.trim()}`, jwt, apiToken);
            return res.json({ success: true, provider: 'uazapi' });
        }
        if (provider === 'waha' && wahaSession) {
            // WAHA embute o chatId no sourceId: "true_{chatId}_{msgId}" — usar esse chatId é mais confiável
            // do que reconstruir pelo telefone (evita problema de formato BR 9 dígitos vs 8 dígitos)
            let chatId = rawPhone ? `${rawPhone}@c.us` : '';
            if (sourceId && (sourceId.startsWith('true_') || sourceId.startsWith('false_'))) {
                const parts = sourceId.split('_');
                if (parts.length >= 3)
                    chatId = parts[1];
            }
            if (!chatId)
                return res.status(422).json({ error: 'Não foi possível determinar chatId do contato' });
            await (0, waha_1.editWahaMessage)(accountId, wahaSession, chatId, sourceId, newContent.trim());
            logger_1.default.info('Mensagem editada via WAHA', { conversationId, chatwootMessageId, wahaSession });
            await chatwoot_1.default.sendPrivateNote(accountId, Number(conversationId), `✏️ Mensagem editada no WhatsApp:\n${newContent.trim()}`, jwt, apiToken);
            return res.json({ success: true, provider: 'waha' });
        }
        if (provider === 'evolution') {
            await evolution_1.default.editMessage(accountId, inboxName, sourceId, rawPhone, newContent.trim());
            logger_1.default.info('Mensagem editada via Evolution', { conversationId, chatwootMessageId, inboxName });
            await chatwoot_1.default.sendPrivateNote(accountId, Number(conversationId), `✏️ Mensagem editada no WhatsApp:\n${newContent.trim()}`, jwt, apiToken);
            return res.json({ success: true, provider: 'evolution' });
        }
        return res.status(422).json({ error: 'Provider não identificado para este inbox' });
    }
    catch (error) {
        logger_1.default.error('Erro ao editar mensagem', { error: error.message, conversationId, chatwootMessageId });
        return res.status(500).json({ error: error.message || 'Erro interno ao editar mensagem' });
    }
});
exports.default = router;
//# sourceMappingURL=message-edit.js.map