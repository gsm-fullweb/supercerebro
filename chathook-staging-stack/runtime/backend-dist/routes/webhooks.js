"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setSocketIO = setSocketIO;
const express_1 = require("express");
const logger_1 = __importDefault(require("../utils/logger"));
const database_1 = __importDefault(require("../services/database"));
const flowQueue_1 = require("../queues/flowQueue");
const cwapp_push_1 = require("./cwapp-push");
const evolutionGo_1 = require("../services/evolutionGo");
const encryption_1 = require("../utils/encryption");
const chatwoot_1 = __importDefault(require("../services/chatwoot"));
const kanban_1 = require("./kanban");
const chatwootDatabase_1 = __importDefault(require("../services/chatwootDatabase"));
const router = (0, express_1.Router)();
let io = null;
function setSocketIO(socketIO) {
    io = socketIO;
}
// POST /webhooks/chatwoot - Recebe webhooks do Chatwoot
router.post('/chatwoot', async (req, res) => {
    const payload = req.body;
    const flowId = req.query.flowId ? parseInt(req.query.flowId) : null;
    logger_1.default.info('Webhook received', {
        event: payload.event,
        accountId: payload.account?.id,
        conversationId: payload.conversation?.id,
        flowId
    });
    // Log completo do payload para debug
    logger_1.default.info('Webhook payload structure', {
        hasEvent: !!payload.event,
        hasMessage: !!payload.message,
        hasConversation: !!payload.conversation,
        hasAccount: !!payload.account,
        eventValue: payload.event,
        payloadKeys: Object.keys(payload)
    });
    // Responde imediatamente para o Chatwoot
    res.json({ success: true });
    // Processa webhooks de forma assíncrona
    try {
        // === CHATBOT FLOW TRIGGERS ===
        // Agent Bot webhooks enviam os dados diretamente no payload, sem nested "message"
        if (payload.event === 'message_created' && payload.conversation && payload.account) {
            // Compatibilidade: Agent Bot envia dados direto no payload, webhooks normais enviam em "message"
            const message = payload.message || payload;
            const { conversation, account } = payload;
            // Detecta se a mensagem tem anexo de áudio (para transcrição no AI Agent)
            const audioAttachment = message.attachments?.find((a) => a?.file_type && (String(a.file_type).startsWith('audio') || String(a.file_type).includes('ogg')));
            const audioContext = audioAttachment
                ? { _audioUrl: audioAttachment.data_url, _audioMimeType: audioAttachment.file_type || 'audio/ogg' }
                : {};
            logger_1.default.info('message_created event detected', {
                messageType: message.message_type,
                isPrivate: message.private,
                hasFlowId: !!flowId,
                isAgentBotWebhook: !payload.message
            });
            // Apenas mensagens incoming (do cliente)
            if (message.message_type === 'incoming' && !message.private) {
                logger_1.default.info('Processing incoming message', {
                    accountId: account.id,
                    conversationId: conversation.id,
                    flowId
                });
                // Envia push notification para o agente responsável
                try {
                    const assigneeId = conversation.meta?.assignee?.id || null;
                    const senderName = message.sender?.name || 'Cliente';
                    const preview = (message.content || '').substring(0, 120) || '(nova mensagem)';
                    await (0, cwapp_push_1.sendPushToAccount)(account.id, assigneeId, {
                        title: senderName,
                        body: preview,
                        url: `/conversations/${conversation.id}`,
                    });
                }
                catch (pushErr) {
                    logger_1.default.warn('Push notification failed (non-critical):', pushErr);
                }
                const accountId = account.id;
                const conversationId = conversation.id;
                // === CAMPANHA: marca contato como respondido e cancela follow-up pendente ===
                try {
                    const senderPhone = (message.sender?.phone_number ||
                        conversation.meta?.sender?.phone_number ||
                        '').replace(/\D/g, '');
                    if (senderPhone) {
                        // Busca CampaignContact ativo desta conta com este telefone que ainda não respondeu
                        const campaignContact = await database_1.default.campaignContact.findFirst({
                            where: {
                                campaign: { accountId },
                                phone: { endsWith: senderPhone.slice(-8) }, // match pelos últimos 8 dígitos
                                repliedAt: null,
                                followUpStatus: { in: ['waiting', 'sent1', 'sent2'] },
                            },
                            orderBy: { sentAt: 'desc' },
                        });
                        if (campaignContact) {
                            await database_1.default.campaignContact.update({
                                where: { id: campaignContact.id },
                                data: {
                                    repliedAt: new Date(),
                                    followUpStatus: 'replied',
                                },
                            });
                            logger_1.default.info(`Campaign contact ${campaignContact.id} marked as replied (phone ${senderPhone})`);
                        }
                    }
                }
                catch (campaignErr) {
                    logger_1.default.warn('Erro ao marcar contato de campanha como respondido (non-critical):', campaignErr);
                }
                // === AUTOMAÇÃO: newTicket — cria card na etapa configurada ===
                // Roda para TODA mensagem incoming; a função verifica se já existe card
                // (evita duplicatas) e só age se a inbox corresponde a uma etapa configurada.
                try {
                    await createCardByNewTicketAutomation(accountId, conversationId, conversation.inbox_id, io, payload);
                }
                catch (newTicketErr) {
                    logger_1.default.warn('Erro na automação newTicket (message_created)', { error: newTicketErr });
                }
                // Verifica se há execução pausada aguardando resposta (waitForResponse)
                const waitingExecution = await database_1.default.flowExecution.findFirst({
                    where: {
                        accountId,
                        conversationId,
                        status: 'waiting',
                    },
                    orderBy: { startedAt: 'desc' },
                });
                // Verifica se há sequência pausada aguardando resposta
                const waitingSequence = await database_1.default.sequenceExecution.findFirst({
                    where: {
                        accountId,
                        conversationId,
                        status: 'waiting',
                    },
                    orderBy: { startedAt: 'desc' },
                });
                logger_1.default.info('Waiting execution check', {
                    found: !!waitingExecution,
                    foundSequence: !!waitingSequence,
                    flowId
                });
                // Se a conversa foi atribuída a um agente, cancela execuções waiting e não retoma o bot
                const isAssignedNow = conversation.meta?.assignee;
                if (waitingSequence) {
                    if (isAssignedNow) {
                        logger_1.default.info(`Cancelling waiting sequence ${waitingSequence.id} - conversation ${conversationId} is now assigned to an agent`);
                        await database_1.default.sequenceExecution.update({
                            where: { id: waitingSequence.id },
                            data: { status: 'canceled', completedAt: new Date() },
                        });
                    }
                    else {
                        const sequenceExecutor = (await Promise.resolve().then(() => __importStar(require('../services/sequenceExecutor')))).default;
                        // Descobre se a sequência está aguardando um delay ou um waitForResponse
                        const lastStep = await database_1.default.sequenceStep.findFirst({
                            where: { executionId: waitingSequence.id, status: { in: ['scheduled', 'executing', 'completed'] } },
                            orderBy: { id: 'desc' },
                        });
                        const isWaitingForDelay = lastStep?.nodeType === 'sequenceDelay' || lastStep?.nodeType === 'delay';
                        if (isWaitingForDelay) {
                            // Apenas marca userReplied no contexto; o delay continuará até disparar normalmente
                            const currentCtx = JSON.parse(waitingSequence.context || '{}');
                            await database_1.default.sequenceExecution.update({
                                where: { id: waitingSequence.id },
                                data: {
                                    context: JSON.stringify({
                                        ...currentCtx,
                                        userReplied: true,
                                        userReplyMessage: message.content,
                                    }),
                                },
                            });
                            logger_1.default.info(`Marked userReplied=true in sequence execution ${waitingSequence.id} (delay waiting)`);
                        }
                        else {
                            // waitForResponse — retoma imediatamente com a resposta
                            logger_1.default.info(`Resuming sequence execution ${waitingSequence.id} after waitForResponse`);
                            await sequenceExecutor.resumeExecution(waitingSequence.id, { response: message.content, userReplied: true, ...audioContext });
                        }
                    }
                }
                else if (waitingExecution) {
                    if (isAssignedNow) {
                        logger_1.default.info(`Cancelling waiting flow execution ${waitingExecution.id} - conversation ${conversationId} is now assigned to an agent`);
                        await database_1.default.flowExecution.update({
                            where: { id: waitingExecution.id },
                            data: { status: 'cancelled', errorMessage: 'Conversa atribuída a agente', completedAt: new Date() },
                        });
                    }
                    else {
                        // Retoma execução com a resposta do usuário
                        logger_1.default.info(`Resuming flow execution ${waitingExecution.id} with user response`);
                        await (0, flowQueue_1.resumeFlow)(waitingExecution.id, waitingExecution.flowId, conversationId, accountId, {
                            response: message.content,
                            _resumeExecutionId: waitingExecution.id,
                            ...audioContext,
                        });
                    }
                }
                else {
                    // Verifica se há execução ativa (queued ou running) - evita reiniciar o bot
                    const activeExecution = await database_1.default.flowExecution.findFirst({
                        where: {
                            accountId,
                            conversationId,
                            status: {
                                in: ['queued', 'running'],
                            },
                        },
                        orderBy: { startedAt: 'desc' },
                    });
                    if (activeExecution) {
                        // Verifica se é uma sequência com "parar ao responder" ativado
                        const flow = await database_1.default.chatbotFlow.findUnique({
                            where: { id: activeExecution.flowId },
                        });
                        if (flow && flow.type === 'sequence') {
                            const flowData = JSON.parse(flow.flowData);
                            const startNode = flowData.nodes?.find((node) => node.type === 'start');
                            if (startNode?.data?.stopOnUserReply) {
                                logger_1.default.info(`User replied during sequence ${flow.id} with stopOnUserReply enabled, cancelling execution ${activeExecution.id}`);
                                // Cancela a execução
                                await database_1.default.flowExecution.update({
                                    where: { id: activeExecution.id },
                                    data: {
                                        status: 'cancelled',
                                        errorMessage: 'Usuário respondeu durante a sequência',
                                        completedAt: new Date(),
                                    },
                                });
                                // Remove jobs da fila relacionados a esta execução
                                const jobs = await flowQueue_1.flowQueue.getJobs(['waiting', 'active', 'delayed']);
                                const jobsToRemove = jobs.filter((job) => job.data.executionId === activeExecution.id);
                                for (const job of jobsToRemove) {
                                    await job.remove();
                                    logger_1.default.info(`Removed job ${job.id} for cancelled execution ${activeExecution.id}`);
                                }
                                logger_1.default.info(`Sequence execution ${activeExecution.id} cancelled due to user reply`);
                                return; // Para o processamento aqui
                            }
                            else {
                                // Marca que o usuário respondeu no contexto da execução (para checkResponse node)
                                const currentContext = JSON.parse(activeExecution.context || '{}');
                                await database_1.default.flowExecution.update({
                                    where: { id: activeExecution.id },
                                    data: {
                                        context: JSON.stringify({
                                            ...currentContext,
                                            userReplied: true,
                                            userReplyMessage: message.content,
                                        }),
                                    },
                                });
                                logger_1.default.info(`Marked user reply in execution ${activeExecution.id} context`);
                            }
                            logger_1.default.info(`Sequence execution ${activeExecution.id} is already active, ignoring new message`);
                            return;
                        }
                        // Chatbot flow em execução — race condition: o flow pode estar chegando no
                        // waitForResponse node neste exato momento e ainda não salvou status='waiting'.
                        // Aguarda até 2s em polling para não descartar a resposta do usuário.
                        logger_1.default.info(`Chatbot flow execution ${activeExecution.id} is running — polling for waitForResponse (up to 2s)`, { conversationId });
                        let resumedByPolling = false;
                        for (let attempt = 0; attempt < 10; attempt++) {
                            await new Promise(resolve => setTimeout(resolve, 200));
                            const refreshed = await database_1.default.flowExecution.findUnique({
                                where: { id: activeExecution.id },
                            });
                            if (refreshed?.status === 'waiting') {
                                logger_1.default.info(`Execution ${activeExecution.id} transitioned to waiting during polling — resuming with user message`);
                                await (0, flowQueue_1.resumeFlow)(refreshed.id, refreshed.flowId, conversationId, accountId, {
                                    response: message.content,
                                    _resumeExecutionId: refreshed.id,
                                    ...audioContext,
                                });
                                resumedByPolling = true;
                                break;
                            }
                            if (refreshed?.status === 'completed' || refreshed?.status === 'cancelled' || refreshed?.status === 'failed') {
                                logger_1.default.info(`Execution ${activeExecution.id} finished (${refreshed.status}) during polling — will trigger new flow if applicable`);
                                break;
                            }
                        }
                        if (resumedByPolling)
                            return;
                        logger_1.default.info(`Flow execution ${activeExecution.id} still active after polling, ignoring message to prevent restart`);
                        return; // Ignora a mensagem para não reiniciar o flow
                    }
                    // Verifica se já existe execução completa (com node end) para evitar repetir mensagens
                    const completedExecution = await database_1.default.flowExecution.findFirst({
                        where: {
                            accountId,
                            conversationId,
                            status: 'completed',
                        },
                        orderBy: { completedAt: 'desc' },
                    });
                    // Se existe execução completada (Agent Bot path: flowId na URL), verifica se o flow contém AI Agent
                    if (completedExecution && flowId && completedExecution.flowId === flowId) {
                        // Busca o flow para verificar se contém AI Agent
                        const flow = await database_1.default.chatbotFlow.findUnique({
                            where: { id: flowId },
                        });
                        if (flow) {
                            const flowData = JSON.parse(flow.flowData);
                            const hasAIAgent = flowData.nodes?.some((node) => node.type === 'aiAgent' || node.type === 'aiSchedulingAgent');
                            // Se o flow contém AI Agent, permite re-execução para manter conversação
                            if (hasAIAgent) {
                                logger_1.default.info(`Flow ${flowId} contains AI Agent, allowing re-execution for conversation ${conversationId}`);
                            }
                            else {
                                logger_1.default.info(`Flow ${flowId} already completed for conversation ${conversationId}, skipping re-execution`);
                                return; // Não executa novamente
                            }
                        }
                    }
                    // Se flowId foi fornecido na URL (via Agent Bot), processa apenas esse flow
                    if (flowId) {
                        logger_1.default.info(`Agent Bot webhook: looking for flow ${flowId} for account ${accountId}`);
                        const flow = await database_1.default.chatbotFlow.findFirst({
                            where: {
                                id: flowId,
                                accountId,
                                isActive: true,
                            },
                        });
                        logger_1.default.info(`Flow query result:`, {
                            flowId,
                            accountId,
                            found: !!flow,
                            flowData: flow ? { id: flow.id, name: flow.name, isActive: flow.isActive } : null
                        });
                        if (flow) {
                            const isAssigned = conversation.meta?.assignee;
                            if (isAssigned) {
                                logger_1.default.info(`Skipping flow ${flow.id} - conversation ${conversationId} is already assigned to an agent`);
                            }
                            else {
                                logger_1.default.info(`Triggering flow ${flow.id} (${flow.name}) via Agent Bot for conversation ${conversationId}`);
                                try {
                                    await (0, flowQueue_1.enqueueFlow)(flow.id, conversationId, accountId, {
                                        message: message.content,
                                        senderName: message.sender?.name,
                                        contactEmail: message.sender?.email,
                                        inboxId: conversation.inbox_id,
                                        ...audioContext,
                                    });
                                    logger_1.default.info(`Flow ${flow.id} successfully enqueued for conversation ${conversationId}`);
                                }
                                catch (error) {
                                    logger_1.default.error(`Failed to enqueue flow ${flow.id}:`, error);
                                }
                            }
                        }
                        else {
                            logger_1.default.warn(`Flow ${flowId} not found or inactive for account ${accountId}`);
                        }
                    }
                    else {
                        // Fallback: busca flows ativos que correspondem aos triggers (backwards compatibility)
                        // IMPORTANTE: Apenas flows de chatbot são disparados automaticamente
                        // Flows de sequência só devem ser disparados manualmente
                        const activeFlows = await database_1.default.chatbotFlow.findMany({
                            where: {
                                accountId,
                                isActive: true,
                                type: 'chatbot', // Exclui flows de sequência do disparo automático
                            },
                        });
                        // Para Agent Bot webhooks, inbox_id pode estar no root (payload.inbox.id)
                        // ao invés de conversation.inbox_id — normaliza antes de checar triggers
                        const resolvedInboxId = conversation.inbox_id || payload.inbox?.id;
                        const conversationForTrigger = resolvedInboxId
                            ? { ...conversation, inbox_id: resolvedInboxId }
                            : conversation;
                        logger_1.default.info('Fallback flow search', {
                            accountId,
                            conversationId,
                            activeFlowsCount: activeFlows.length,
                            resolvedInboxId,
                            conversationInboxId: conversation.inbox_id,
                            payloadInboxId: payload.inbox?.id,
                        });
                        const isAssigned = conversation.meta?.assignee;
                        if (isAssigned) {
                            logger_1.default.info(`Skipping flows - conversation ${conversationId} is already assigned to an agent`);
                        }
                        else {
                            for (const flow of activeFlows) {
                                const trigger = JSON.parse(flow.trigger);
                                const flowData = JSON.parse(flow.flowData);
                                const triggerResult = shouldTriggerFlow(trigger, flowData, message, conversationForTrigger);
                                logger_1.default.info('Flow trigger check', {
                                    flowId: flow.id,
                                    flowName: flow.name,
                                    triggerType: trigger.type,
                                    triggerValue: trigger.value,
                                    resolvedInboxId,
                                    result: triggerResult,
                                });
                                if (triggerResult) {
                                    // Flows com palavra-chave explícita (startRule) sempre permitem re-disparo:
                                    // o usuário enviou intencionalmente a keyword para reiniciar o bot.
                                    // Flows sem keyword (catch-all) respeitam completedForFlow para não
                                    // re-disparar a cada mensagem após o flow ter sido concluído.
                                    const startNode = flowData.nodes?.find((n) => n.type === 'start');
                                    const hasKeyword = !!(startNode?.data?.startRule);
                                    const completedForFlow = hasKeyword ? null : await database_1.default.flowExecution.findFirst({
                                        where: {
                                            accountId,
                                            conversationId,
                                            flowId: flow.id,
                                            status: 'completed',
                                        },
                                        orderBy: { completedAt: 'desc' },
                                    });
                                    if (completedForFlow) {
                                        const hasAIAgent = flowData.nodes?.some((node) => node.type === 'aiAgent' || node.type === 'aiSchedulingAgent');
                                        if (!hasAIAgent) {
                                            logger_1.default.info(`Flow ${flow.id} already completed for conversation ${conversationId}, skipping re-trigger`);
                                            continue;
                                        }
                                        logger_1.default.info(`Flow ${flow.id} contains AI Agent, allowing re-execution for conversation ${conversationId}`);
                                    }
                                    logger_1.default.info(`Triggering flow ${flow.id} (${flow.name}) for conversation ${conversationId}`);
                                    // Enfileira flow
                                    await (0, flowQueue_1.enqueueFlow)(flow.id, conversationId, accountId, {
                                        message: message.content,
                                        senderName: message.sender?.name,
                                        contactEmail: message.sender?.email,
                                        inboxId: conversation.inbox_id,
                                        ...audioContext,
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
        // === CONVERSATION_CREATED (webhook normal do Chatwoot) ===
        // Complementa o handler de message_created para casos onde o evento chega
        // antes da primeira mensagem (webhooks regulares, não apenas Agent Bot).
        if (payload.event === 'conversation_created' && payload.conversation && payload.account) {
            try {
                await createCardByNewTicketAutomation(payload.account.id, payload.conversation.id, payload.conversation.inbox_id, io, payload);
            }
            catch (err) {
                logger_1.default.warn('Erro na automação newTicket (conversation_created)', { error: err });
            }
        }
        // === MESSAGE DELETADO — apaga no WhatsApp via Evolution Go ===
        // Chatwoot não emite 'message_deleted' — emite 'message_updated' com deleted:true
        // Agent Bot webhooks enviam dados na raiz do payload (sem payload.message)
        const msgDataForDelete = payload.message || payload;
        const isMessageDeleted = (payload.event === 'message_deleted' || payload.event === 'message_updated') &&
            msgDataForDelete?.deleted === true;
        if (isMessageDeleted && payload.account && payload.conversation) {
            try {
                const accountId = payload.account.id;
                const inboxId = payload.conversation.inbox_id;
                const sourceId = msgDataForDelete.source_id || '';
                if (sourceId && inboxId) {
                    // Busca instância Evolution Go vinculada ao inbox
                    const evoInst = await database_1.default.evolutionGoInstance.findFirst({
                        where: { accountId, inboxId },
                    });
                    if (evoInst && evoInst.instanceToken && evoInst.evoInstanceName) {
                        const config = await database_1.default.evolutionGoConfig.findUnique({ where: { accountId } });
                        if (config) {
                            const evolutionUrl = config.evolutionUrl;
                            const instanceToken = (0, encryption_1.decryptOptional)(evoInst.instanceToken) ?? evoInst.instanceToken;
                            // Monta remoteJid a partir do telefone do contato
                            const senderPhone = payload.conversation.meta?.sender?.phone_number || '';
                            const rawPhone = senderPhone.replace(/\D/g, '');
                            const remoteJid = rawPhone ? `${rawPhone}@s.whatsapp.net` : '';
                            if (remoteJid) {
                                await (0, evolutionGo_1.deleteEvoGoMessage)(evolutionUrl, instanceToken, evoInst.evoInstanceName, sourceId, remoteJid);
                                logger_1.default.info('Mensagem apagada no WhatsApp via Evolution Go', { accountId, inboxId, sourceId });
                            }
                            else {
                                logger_1.default.warn('message_deleted: telefone do contato não encontrado, não foi possível apagar no WhatsApp', { accountId, inboxId });
                            }
                        }
                    }
                }
            }
            catch (err) {
                logger_1.default.error('Erro ao apagar mensagem no Evolution Go via webhook', { error: err.message });
            }
        }
        // === STATUS DE ENTREGA/LEITURA DE MENSAGENS DE CAMPANHA ===
        // Chatwoot emite message_updated quando o WhatsApp informa entrega/leitura.
        // API Oficial nativa: status em content_attributes.whatsapp_message_status ('delivered'|'read')
        // Evolution/WAHA: status no campo status da mensagem (1=delivered, 2=read, ou string 'delivered'|'read')
        if (payload.event === 'message_updated' && !(payload.message?.deleted)) {
            try {
                const msgData = payload.message || payload;
                const chatwootMsgId = msgData?.id;
                // DEBUG: log payload completo para entender formato do Chatwoot
                logger_1.default.info('[DEBUG] message_updated payload', {
                    chatwootMsgId,
                    msgDataKeys: Object.keys(msgData || {}),
                    contentAttributes: msgData?.content_attributes,
                    statusField: msgData?.status,
                    whatsappStatus: msgData?.content_attributes?.whatsapp_message_status,
                    hasNestedMessage: !!payload.message,
                    accountId: payload.account?.id,
                });
                if (chatwootMsgId) {
                    // Normaliza o status independente do formato (API Oficial ou Evolution/WAHA)
                    const rawStatus = msgData?.content_attributes?.whatsapp_message_status
                        ?? msgData?.status;
                    let waStatus = null;
                    if (rawStatus === 'delivered' || rawStatus === 1 || rawStatus === '1') {
                        waStatus = 'delivered';
                    }
                    else if (rawStatus === 'read' || rawStatus === 2 || rawStatus === '2') {
                        waStatus = 'read';
                    }
                    if (waStatus) {
                        const campaignContact = await database_1.default.campaignContact.findFirst({
                            where: { chatwootMessageId: chatwootMsgId },
                            select: { id: true, deliveredAt: true, readAt: true },
                        });
                        if (campaignContact) {
                            const updateData = {};
                            if (waStatus === 'delivered' && !campaignContact.deliveredAt) {
                                updateData.deliveredAt = new Date();
                            }
                            if (waStatus === 'read' && !campaignContact.readAt) {
                                updateData.readAt = new Date();
                                if (!campaignContact.deliveredAt)
                                    updateData.deliveredAt = new Date();
                            }
                            if (Object.keys(updateData).length > 0) {
                                await database_1.default.campaignContact.update({
                                    where: { id: campaignContact.id },
                                    data: updateData,
                                });
                                logger_1.default.info('Campaign contact message status updated', {
                                    contactId: campaignContact.id,
                                    chatwootMsgId,
                                    waStatus,
                                    rawStatus,
                                });
                            }
                        }
                        else {
                            // Não é mensagem de campanha — log resumido para não poluir
                            logger_1.default.debug('[DEBUG] message_updated: not a campaign message', { chatwootMsgId });
                        }
                    }
                }
            }
            catch (err) {
                logger_1.default.error('Erro ao atualizar status de entrega/leitura da campanha', { error: err.message });
            }
        }
        // === INVALIDAÇÃO DE CACHE ===
        // Quando o Chatwoot notifica qualquer mudança em uma conversa, invalida os caches locais
        // para que a próxima leitura busque dados frescos da API
        if (payload.conversation && payload.account) {
            chatwoot_1.default.invalidateConversationCache(payload.account.id, payload.conversation.id);
            // Invalida o cache do board de funil da conta (sem saber qual funil — invalida todos)
            (0, kanban_1.invalidateFunnelBoardCache)(payload.account.id);
        }
        // === SOCKET.IO EVENTS ===
        // Emite evento via Socket.IO para atualizar o frontend
        if (io && payload.conversation) {
            const eventData = {
                event: payload.event,
                conversation: {
                    id: payload.conversation.id,
                    status: payload.conversation.status,
                    unread_count: payload.conversation.unread_count,
                    updated_at: payload.conversation.updated_at
                }
            };
            const accountRoom = `account_${payload.account?.id}`;
            io.to(accountRoom).emit('conversation_update', eventData);
            logger_1.default.info('Socket event emitted', { event: 'conversation_update', room: accountRoom });
        }
    }
    catch (error) {
        logger_1.default.error('Error processing webhook:', error);
    }
});
/**
 * Verifica se o flow deve ser disparado baseado no trigger e na regra de início
 */
function shouldTriggerFlow(trigger, flowData, message, conversation) {
    // Primeiro verifica se o trigger do flow corresponde (inbox ou label)
    let triggerMatches = false;
    switch (trigger.type) {
        case 'inbox':
            if (Array.isArray(trigger.value)) {
                // Array vazio = todas as inboxes
                triggerMatches = trigger.value.length === 0 || trigger.value.some(id => conversation.inbox_id === Number(id));
            }
            else {
                triggerMatches = conversation.inbox_id === Number(trigger.value);
            }
            break;
        case 'label':
            // Verifica se a conversa possui uma label específica
            const labels = conversation.labels || [];
            triggerMatches = labels.some((label) => label === trigger.value);
            break;
        case 'keyword':
            // Backwards compatibility: se trigger é keyword, verifica diretamente
            const keyword = String(trigger.value).toLowerCase();
            const content = (message.content || '').toLowerCase();
            return content.includes(keyword);
        default:
            logger_1.default.warn(`Unknown trigger type: ${trigger.type}`);
            return false;
    }
    // Se o trigger não corresponde, não dispara
    if (!triggerMatches) {
        return false;
    }
    // Agora verifica a regra de início (startRule) do primeiro node
    const startNode = flowData.nodes.find((node) => node.type === 'start');
    logger_1.default.info('Checking startRule', {
        hasStartNode: !!startNode,
        startNodeData: startNode?.data,
        startRule: startNode?.data?.startRule
    });
    if (!startNode || !startNode.data.startRule) {
        // Se não tem startRule, dispara para qualquer mensagem (apenas pelo trigger)
        logger_1.default.info('No startRule defined, triggering flow');
        return true;
    }
    // Verifica se a mensagem contém alguma das palavras-chave do startRule
    const startRule = String(startNode.data.startRule).toLowerCase();
    const messageContent = (message.content || '').toLowerCase();
    // Suporta múltiplas palavras separadas por vírgula
    const keywords = startRule.split(',').map((k) => k.trim());
    const matches = keywords.some((keyword) => messageContent.includes(keyword));
    logger_1.default.info('StartRule check result', {
        startRule,
        messageContent,
        keywords,
        matches
    });
    return matches;
}
/**
 * Verifica se deve criar card automaticamente na etapa configurada com "newTicket".
 * Chamado tanto em conversation_created quanto em message_created (primeira mensagem).
 * Não cria duplicata graças à constraint @@unique([conversationId, accountId]).
 */
async function createCardByNewTicketAutomation(accountId, conversationId, inboxId, ioInstance = null, webhookPayload) {
    // Se já existe card para esta conversa, nada a fazer
    const existingCard = await database_1.default.card.findFirst({
        where: { conversationId, accountId },
    });
    if (existingCard)
        return;
    // Busca todas as etapas de funis ativos da conta
    const stages = await database_1.default.stage.findMany({
        where: { funnel: { accountId, isActive: true } },
        include: { funnel: { select: { id: true, name: true } } },
        orderBy: { order: 'asc' },
    });
    const inboxIdNum = inboxId != null ? Number(inboxId) : null;
    logger_1.default.info('newTicket automation check', {
        accountId,
        conversationId,
        inboxId,
        inboxIdNum,
        stagesWithNewTicket: stages.filter(s => {
            try {
                return s.automations && JSON.parse(s.automations).newTicket;
            }
            catch {
                return false;
            }
        }).length,
    });
    for (const stage of stages) {
        if (!stage.automations)
            continue;
        let automation;
        try {
            automation = JSON.parse(stage.automations);
        }
        catch {
            continue;
        }
        if (!automation.newTicket)
            continue;
        // Filtra por inboxIds se configurado
        // Usa Number() para garantir comparação type-safe (string vs number do webhook)
        if (Array.isArray(automation.inboxIds) && automation.inboxIds.length > 0) {
            const configuredIds = automation.inboxIds.map(Number);
            const matches = inboxIdNum != null && configuredIds.includes(inboxIdNum);
            logger_1.default.info('newTicket inbox filter', {
                accountId,
                conversationId,
                stageId: stage.id,
                inboxIdNum,
                configuredIds,
                matches,
            });
            if (!matches)
                continue;
        }
        else {
            logger_1.default.info('newTicket inbox filter', {
                accountId,
                conversationId,
                stageId: stage.id,
                inboxIdNum,
                configuredIds: automation.inboxIds,
                matches: 'all_inboxes',
            });
        }
        try {
            await database_1.default.card.create({
                data: { conversationId, stageId: stage.id, accountId },
            });
            logger_1.default.info('Card criado pela automação newTicket', {
                conversationId,
                stageId: stage.id,
                funnelId: stage.funnelId,
                funnelName: stage.funnel.name,
                accountId,
                inboxId,
            });
            // Notifica o frontend imediatamente via Socket.IO (evita esperar polling de 30s)
            if (ioInstance) {
                ioInstance.to(`account_${accountId}`).emit('kanban_card_added', {
                    conversationId,
                    stageId: stage.id,
                    funnelId: stage.funnelId,
                });
            }
            // Dispara sequência configurada na etapa (best-effort)
            if (automation.sequenceId) {
                try {
                    const contactId = webhookPayload?.conversation?.meta?.sender?.id
                        || webhookPayload?.meta?.sender?.id
                        || webhookPayload?.contact?.id;
                    if (contactId) {
                        const sequenceExecutor = (await Promise.resolve().then(() => __importStar(require('../services/sequenceExecutor')))).default;
                        sequenceExecutor.startSequence(automation.sequenceId, contactId, accountId, conversationId, {}).then((execId) => {
                            logger_1.default.info('newTicket sequence triggered', { stageId: stage.id, sequenceId: automation.sequenceId, conversationId, contactId, executionId: execId });
                        }).catch((err) => {
                            logger_1.default.warn('newTicket sequence start failed (non-blocking)', { stageId: stage.id, sequenceId: automation.sequenceId, error: err?.message });
                        });
                    }
                }
                catch (seqErr) {
                    logger_1.default.warn('newTicket sequence dispatch error', { error: seqErr?.message });
                }
            }
        }
        catch (createErr) {
            // Unique constraint = card já foi criado em outra chamada concorrente, ignora
            if (createErr.code === 'P2002')
                return;
            throw createErr;
        }
        // Primeira etapa correspondente vence — para aqui
        break;
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// Webhook UazAPI — recebe eventos de mensagens enviadas para capturar source_id
// Isso permite que "Editar mensagem" funcione para mensagens enviadas via UazAPI
// ─────────────────────────────────────────────────────────────────────────────
router.post('/uazapi', async (req, res) => {
    res.status(200).json({ received: true });
    const body = req.body;
    if (!body)
        return;
    logger_1.default.debug('UazAPI webhook recebido', {
        event: body.event || body.type || 'unknown',
        keys: Object.keys(body),
    });
    processUazapiWebhookEvent(body).catch((e) => logger_1.default.error('UazAPI webhook: erro no processamento', { error: e.message }));
});
async function processUazapiWebhookEvent(body) {
    // Extrai mensagens de diferentes formatos possíveis do UazAPI/Baileys
    let messages = [];
    if (body.event === 'messages.upsert') {
        const data = body.data;
        messages = Array.isArray(data) ? data : data ? [data] : [];
    }
    else if (Array.isArray(body.messages)) {
        messages = body.messages;
    }
    else if (body.key && typeof body.key === 'object') {
        messages = [body];
    }
    else if (Array.isArray(body)) {
        messages = body;
    }
    for (const msg of messages) {
        const fromMe = msg?.key?.fromMe ?? msg?.fromMe ?? false;
        if (!fromMe)
            continue;
        const waId = msg?.key?.id ?? msg?.id ?? msg?.messageId ?? '';
        const remoteJid = msg?.key?.remoteJid ?? msg?.to ?? msg?.chatId ?? '';
        const content = msg?.message?.conversation ??
            msg?.message?.extendedTextMessage?.text ??
            msg?.body ?? msg?.text ?? '';
        const ts = Number(msg?.messageTimestamp ?? msg?.timestamp ?? 0);
        if (!waId || !remoteJid)
            continue;
        const phone = remoteJid.replace(/@[sc]\.whatsapp\.net|@c\.us/g, '').replace(/\D/g, '');
        logger_1.default.info('UazAPI webhook: mensagem outgoing capturada', {
            waId,
            phone: phone.substring(0, 6) + '****',
            contentLen: content.length,
            ts,
        });
        // Busca todas as instâncias UazAPI para encontrar a correta
        const instances = await database_1.default.uazapiInstance.findMany({ where: { inboxId: { not: null } } });
        for (const inst of instances) {
            const updated = await tryUpdateSourceId(inst.accountId, inst.inboxId, phone, content, ts, waId);
            if (updated)
                break;
        }
    }
}
async function tryUpdateSourceId(accountId, inboxId, phone, content, ts, waId) {
    try {
        const conversations = await chatwootDatabase_1.default.findConversationsByPhone(accountId, inboxId, phone);
        if (!conversations.length)
            return false;
        for (const conv of conversations) {
            const msgs = await chatwootDatabase_1.default.findOutgoingMessagesWithoutSourceId(conv.id, 5, ts || undefined);
            if (!msgs.length)
                continue;
            // Seleciona mensagem mais próxima no tempo (e com conteúdo correspondente se disponível)
            const candidate = msgs.find(m => {
                const timeDiff = ts ? Math.abs(m.created_at - ts) : 120;
                const contentOk = !content || !m.content || m.content.trim() === content.trim() || timeDiff < 15;
                return timeDiff < 120 && contentOk;
            }) ?? msgs[0];
            if (!candidate)
                continue;
            const ok = await chatwootDatabase_1.default.updateMessageSourceId(candidate.id, waId);
            if (ok) {
                logger_1.default.info('UazAPI: source_id atualizado via webhook', {
                    accountId, convId: conv.id, messageId: candidate.id, waId,
                });
                return true;
            }
        }
    }
    catch (e) {
        logger_1.default.warn('UazAPI tryUpdateSourceId falhou', { error: e.message, accountId, phone: phone.substring(0, 6) });
    }
    return false;
}
exports.default = router;
//# sourceMappingURL=webhooks.js.map