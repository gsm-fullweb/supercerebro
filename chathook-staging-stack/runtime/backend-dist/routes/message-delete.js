"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../services/database"));
const chatwoot_1 = __importDefault(require("../services/chatwoot"));
const evolutionGo_1 = require("../services/evolutionGo");
const encryption_1 = require("../utils/encryption");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
// POST /api/message/delete-wa
// Chamado pelo Dashboard Script quando o Chatwoot executa um DELETE nativo de mensagem.
// Busca o source_id da mensagem, encontra a instância Evolution Go do inbox e apaga no WhatsApp.
router.post('/message/delete-wa', async (req, res) => {
    const { chatwootMessageId, conversationId } = req.body;
    const accountId = req.accountId;
    const jwt = req.jwt;
    const apiToken = req.apiToken;
    if (!chatwootMessageId || !conversationId) {
        return res.status(400).json({ error: 'chatwootMessageId e conversationId são obrigatórios' });
    }
    // Responde imediatamente — processamento é feito de forma assíncrona
    res.json({ success: true });
    try {
        // Busca mensagem e conversa em paralelo
        const [messages, conversation] = await Promise.all([
            chatwoot_1.default.getConversationMessages(accountId, Number(conversationId), jwt, apiToken),
            chatwoot_1.default.getConversation(accountId, Number(conversationId), jwt, apiToken),
        ]);
        const message = (messages || []).find((m) => String(m.id) === String(chatwootMessageId));
        if (!message) {
            // Mensagem já deletada — tenta pegar source_id do payload original se vier
            logger_1.default.warn('message/delete-wa: mensagem não encontrada (já deletada?)', { chatwootMessageId, conversationId });
            return;
        }
        const sourceId = message.source_id || message.external_source_id || '';
        if (!sourceId) {
            logger_1.default.warn('message/delete-wa: source_id não encontrado na mensagem', { chatwootMessageId });
            return;
        }
        const inboxId = conversation?.inbox_id;
        if (!inboxId) {
            logger_1.default.warn('message/delete-wa: inboxId não encontrado', { conversationId });
            return;
        }
        // Busca instância Evolution Go vinculada ao inbox
        const evoInst = await database_1.default.evolutionGoInstance.findFirst({
            where: { accountId, inboxId },
        });
        if (!evoInst || !evoInst.instanceToken || !evoInst.evoInstanceName) {
            // Inbox não é Evolution Go — ignora silenciosamente
            return;
        }
        const config = await database_1.default.evolutionGoConfig.findUnique({ where: { accountId } });
        if (!config) {
            logger_1.default.warn('message/delete-wa: EvolutionGoConfig não encontrado', { accountId });
            return;
        }
        const instanceToken = (0, encryption_1.decryptOptional)(evoInst.instanceToken) ?? evoInst.instanceToken;
        const senderPhone = conversation?.meta?.sender?.phone_number || '';
        const rawPhone = senderPhone.replace(/\D/g, '');
        if (!rawPhone) {
            logger_1.default.warn('message/delete-wa: telefone do contato não encontrado', { conversationId });
            return;
        }
        await (0, evolutionGo_1.deleteEvoGoMessage)(config.evolutionUrl, instanceToken, evoInst.evoInstanceName, sourceId, rawPhone);
        logger_1.default.info('message/delete-wa: mensagem apagada no WhatsApp via Evolution Go', {
            accountId, inboxId, chatwootMessageId, sourceId,
        });
    }
    catch (err) {
        logger_1.default.error('message/delete-wa: erro ao apagar no Evolution Go', { error: err.message, chatwootMessageId });
    }
});
exports.default = router;
//# sourceMappingURL=message-delete.js.map