"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startScheduler = startScheduler;
const node_cron_1 = __importDefault(require("node-cron"));
const client_1 = require("@prisma/client");
const chatwoot_1 = __importDefault(require("./chatwoot"));
const logger_1 = __importDefault(require("../utils/logger"));
const sequenceExecutor_1 = __importDefault(require("./sequenceExecutor"));
const encryption_1 = require("../utils/encryption");
const chatwootDatabase_1 = __importDefault(require("./chatwootDatabase"));
const campaignSender_1 = require("./campaignSender");
const prisma = new client_1.PrismaClient();
// Verifica e envia mensagens agendadas a cada minuto
function startScheduler() {
    logger_1.default.info('Starting scheduled message processor...');
    // Executa a cada minuto
    node_cron_1.default.schedule('* * * * *', async () => {
        await processScheduledMessages();
        await processSequenceSteps();
        await processAppointmentReminders();
    });
    // Verifica campanhas recorrentes e agendadas a cada minuto
    node_cron_1.default.schedule('* * * * *', async () => {
        await processScheduledCampaigns();
        await processRecurringCampaigns();
    });
    // Polling de status de entrega/leitura de mensagens de campanha a cada 3 minutos
    // Necessário porque o Chatwoot não inclui o campo 'status' nos webhooks message_updated
    node_cron_1.default.schedule('*/3 * * * *', async () => {
        await pollCampaignMessageStatuses();
    });
    // Executa imediatamente ao iniciar
    processScheduledMessages();
    processSequenceSteps();
    processScheduledCampaigns();
}
async function processScheduledMessages() {
    try {
        const now = new Date();
        // Busca mensagens pendentes que já passaram do horário agendado
        const pendingMessages = await prisma.scheduledMessage.findMany({
            where: {
                status: 'pending',
                scheduledAt: {
                    lte: now,
                },
            },
            take: 10, // Processa 10 por vez para não sobrecarregar
        });
        if (pendingMessages.length === 0) {
            return;
        }
        logger_1.default.info(`Processing ${pendingMessages.length} scheduled messages`);
        for (const msg of pendingMessages) {
            try {
                // Prepara autenticação: usa JWT se disponível, senão API token
                let jwt = undefined;
                let apiToken = undefined;
                if (msg.jwtAccessToken && msg.jwtClient && msg.jwtUid && msg.jwtExpiry && msg.jwtTokenType) {
                    // Reconstrói o objeto JWT descriptografando os dados salvos
                    jwt = {
                        'access-token': (0, encryption_1.decryptOptional)(msg.jwtAccessToken) ?? '',
                        'client': (0, encryption_1.decryptOptional)(msg.jwtClient) ?? '',
                        'uid': (0, encryption_1.decryptOptional)(msg.jwtUid) ?? '',
                        'expiry': (0, encryption_1.decryptOptional)(msg.jwtExpiry) ?? '',
                        'token-type': (0, encryption_1.decryptOptional)(msg.jwtTokenType) ?? 'Bearer'
                    };
                    logger_1.default.info(`Sending scheduled message ${msg.id} with JWT`, {
                        conversationId: msg.conversationId
                    });
                }
                else if (msg.apiToken) {
                    apiToken = (0, encryption_1.decryptOptional)(msg.apiToken) ?? msg.apiToken;
                    logger_1.default.info(`Sending scheduled message ${msg.id} with API token`, {
                        conversationId: msg.conversationId
                    });
                }
                else {
                    // Fallback: tenta recuperar o token do Chatwoot DB pelo userId que criou a mensagem
                    try {
                        const chatwootToken = await chatwootDatabase_1.default.getUserAccessToken(msg.createdBy);
                        if (chatwootToken) {
                            apiToken = chatwootToken;
                            // Persiste o token para evitar nova consulta ao DB nas próximas execuções
                            await prisma.scheduledMessage.update({
                                where: { id: msg.id },
                                data: { apiToken: (0, encryption_1.encryptOptional)(chatwootToken) },
                            });
                            logger_1.default.info(`Recovered Chatwoot token for scheduled message ${msg.id} via DB lookup`, { createdBy: msg.createdBy });
                        }
                        else {
                            await prisma.scheduledMessage.update({
                                where: { id: msg.id },
                                data: {
                                    status: 'failed',
                                    errorMessage: 'No authentication data available — configure o agendamento novamente',
                                },
                            });
                            logger_1.default.error(`Scheduled message ${msg.id} has no authentication data and token lookup failed`);
                            continue;
                        }
                    }
                    catch (lookupErr) {
                        await prisma.scheduledMessage.update({
                            where: { id: msg.id },
                            data: {
                                status: 'failed',
                                errorMessage: 'No authentication data available — configure o agendamento novamente',
                            },
                        });
                        logger_1.default.error(`Scheduled message ${msg.id}: token lookup failed`, { error: lookupErr });
                        continue;
                    }
                }
                // Extrai caminho do anexo se houver
                let attachmentPath = undefined;
                if (msg.attachments) {
                    try {
                        const attachments = JSON.parse(msg.attachments);
                        if (attachments.length > 0 && attachments[0].filePath) {
                            attachmentPath = attachments[0].filePath;
                            logger_1.default.info(`Found attachment for message ${msg.id}`, {
                                filePath: attachmentPath
                            });
                        }
                    }
                    catch (e) {
                        logger_1.default.warn(`Failed to parse attachments for message ${msg.id}`);
                    }
                }
                // Envia a mensagem via API do Chatwoot
                let success = false;
                const msgType = msg.messageType || 'text';
                const templateName = msg.templateName;
                const rawTemplateParams = msg.templateParams;
                if (msgType === 'template' && templateName) {
                    // Envio de template WhatsApp (API Oficial)
                    let tParams = {};
                    if (rawTemplateParams) {
                        try {
                            tParams = JSON.parse(rawTemplateParams);
                        }
                        catch { /* usa padrão */ }
                    }
                    // Renderiza o corpo do template substituindo {{1}}, {{2}}, etc. pelos valores reais
                    let renderedContent;
                    if (tParams.body) {
                        renderedContent = tParams.body;
                        (tParams.params || []).forEach((val, idx) => {
                            renderedContent = renderedContent.replace(new RegExp(`\\{\\{${idx + 1}\\}\\}`, 'g'), val);
                        });
                    }
                    logger_1.default.info(`Sending scheduled template ${templateName} for message ${msg.id}`, {
                        conversationId: msg.conversationId,
                        language: tParams.language,
                        hasRenderedContent: !!renderedContent,
                    });
                    try {
                        success = await chatwoot_1.default.sendWhatsAppTemplate(msg.accountId, msg.conversationId, templateName, tParams.language || 'pt_BR', tParams.params || [], apiToken, jwt, tParams.headerUrl, tParams.headerType, renderedContent);
                    }
                    catch (templateErr) {
                        logger_1.default.error(`Failed to send template for scheduled message ${msg.id}`, { error: String(templateErr) });
                        success = false;
                    }
                    // Retry com contas alternativas (mesmo comportamento do texto)
                    if (!success) {
                        try {
                            const altAccountIds = await chatwootDatabase_1.default.getUserAccountIds(msg.createdBy);
                            for (const altId of altAccountIds) {
                                if (altId === msg.accountId)
                                    continue;
                                logger_1.default.info(`Retrying scheduled template ${msg.id} with account ${altId}`, {
                                    conversationId: msg.conversationId,
                                    originalAccountId: msg.accountId,
                                });
                                success = await chatwoot_1.default.sendWhatsAppTemplate(altId, msg.conversationId, templateName, tParams.language || 'pt_BR', tParams.params || [], apiToken, jwt, tParams.headerUrl, tParams.headerType, renderedContent).catch(() => false);
                                if (success) {
                                    logger_1.default.info(`Scheduled template ${msg.id} sent via account ${altId} (corrected)`, {
                                        conversationId: msg.conversationId,
                                        originalAccountId: msg.accountId,
                                    });
                                    break;
                                }
                            }
                        }
                        catch (retryErr) {
                            logger_1.default.warn(`Account retry failed for scheduled template ${msg.id}`, { error: String(retryErr) });
                        }
                    }
                }
                else {
                    success = await chatwoot_1.default.sendMessage(msg.accountId, msg.conversationId, msg.message, jwt, apiToken, attachmentPath);
                    // Se falhou com a conta padrão, tenta as outras contas do usuário.
                    // Isso resolve o caso onde o accountId armazenado é a conta 1 mas a
                    // conversa pertence a outra conta (ex: SuperAdmin com múltiplas contas).
                    if (!success) {
                        try {
                            const altAccountIds = await chatwootDatabase_1.default.getUserAccountIds(msg.createdBy);
                            for (const altId of altAccountIds) {
                                if (altId === msg.accountId)
                                    continue;
                                logger_1.default.info(`Retrying scheduled message ${msg.id} with account ${altId}`, {
                                    conversationId: msg.conversationId,
                                    originalAccountId: msg.accountId,
                                });
                                success = await chatwoot_1.default.sendMessage(altId, msg.conversationId, msg.message, jwt, apiToken, attachmentPath);
                                if (success) {
                                    logger_1.default.info(`Scheduled message ${msg.id} sent via account ${altId} (corrected)`, {
                                        conversationId: msg.conversationId,
                                        originalAccountId: msg.accountId,
                                    });
                                    break;
                                }
                            }
                        }
                        catch (retryErr) {
                            logger_1.default.warn(`Account retry failed for scheduled message ${msg.id}`, { error: String(retryErr) });
                        }
                    }
                }
                if (success) {
                    await prisma.scheduledMessage.update({
                        where: { id: msg.id },
                        data: {
                            status: 'sent',
                            sentAt: new Date(),
                        },
                    });
                    logger_1.default.info(`Scheduled message ${msg.id} sent successfully`);
                }
                else {
                    await prisma.scheduledMessage.update({
                        where: { id: msg.id },
                        data: {
                            status: 'failed',
                            errorMessage: 'Failed to send message via Chatwoot API',
                        },
                    });
                    logger_1.default.error(`Failed to send scheduled message ${msg.id}`);
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                await prisma.scheduledMessage.update({
                    where: { id: msg.id },
                    data: {
                        status: 'failed',
                        errorMessage,
                    },
                });
                logger_1.default.error(`Error processing scheduled message ${msg.id}`, { error: errorMessage });
            }
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger_1.default.error('Error in scheduled message processor', { error: errorMessage });
    }
}
async function processSequenceSteps() {
    try {
        await sequenceExecutor_1.default.processScheduledSteps();
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger_1.default.error('Error in sequence step processor', { error: errorMessage });
    }
}
async function processAppointmentReminders() {
    try {
        const now = new Date();
        const reminders = await prisma.appointmentReminder.findMany({
            where: { status: 'pending', scheduledAt: { lte: now } },
            include: {
                appointment: {
                    include: { patient: true, practitioner: true, service: true },
                },
            },
            take: 20,
        });
        if (reminders.length === 0)
            return;
        logger_1.default.info(`Processando ${reminders.length} lembretes de atendimento`);
        // Cache de tokens por accountId para não buscar repetidamente
        const tokenCache = {};
        const getToken = async (accountId) => {
            if (!(accountId in tokenCache)) {
                tokenCache[accountId] = await chatwootDatabase_1.default.getAdminApiTokenForAccount(accountId);
            }
            return tokenCache[accountId];
        };
        for (const reminder of reminders) {
            try {
                const appt = reminder.appointment;
                const apiToken = await getToken(reminder.accountId) ?? undefined;
                let conversationId = appt.chatwootConversationId;
                // Se não há conversa vinculada, tenta buscar pelo telefone do paciente
                if (!conversationId && appt.patient.phone) {
                    try {
                        const phone = appt.patient.phone.replace(/\D/g, '');
                        conversationId = await chatwoot_1.default.findLatestConversationByPhone(reminder.accountId, phone, undefined, apiToken);
                        // Persiste para não precisar buscar novamente
                        if (conversationId) {
                            await prisma.appointment.update({
                                where: { id: appt.id },
                                data: { chatwootConversationId: conversationId },
                            });
                        }
                    }
                    catch (_) { /* silencioso */ }
                }
                if (!conversationId) {
                    await prisma.appointmentReminder.update({
                        where: { id: reminder.id },
                        data: { status: 'failed', errorMessage: 'Nenhuma conversa Chatwoot encontrada para este paciente' },
                    });
                    continue;
                }
                const apptDate = new Date(appt.appointmentAt);
                const dateStr = apptDate.toLocaleDateString('pt-BR');
                const timeStr = apptDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const vars = {
                    '{{nome}}': appt.patient.name,
                    '{{paciente}}': appt.patient.name,
                    '{{data}}': dateStr,
                    '{{hora}}': timeStr,
                    '{{profissional}}': appt.practitioner.name,
                    '{{servico}}': appt.service.name,
                    '{{local}}': appt.location || '',
                    '{{valor}}': appt.price ? `R$ ${Number(appt.price).toFixed(2)}` : '',
                };
                const replaceVars = (text) => Object.entries(vars).reduce((s, [k, v]) => s.replace(k, v), text);
                const waTemplateName = reminder.waTemplateName;
                const waTemplateLang = reminder.waTemplateLang;
                const waTemplateParamsRaw = reminder.waTemplateParams;
                if (waTemplateName && waTemplateLang) {
                    // Resolve variáveis do template ({"1":"{{nome}}","2":"{{data}}"} → ["João","10/05/2026"])
                    let paramsMap = {};
                    if (waTemplateParamsRaw) {
                        try {
                            paramsMap = JSON.parse(waTemplateParamsRaw);
                        }
                        catch { /* ignora */ }
                    }
                    const maxKey = Math.max(0, ...Object.keys(paramsMap).map(Number));
                    const processedParams = Array.from({ length: maxKey }, (_, i) => replaceVars(paramsMap[String(i + 1)] || ''));
                    await chatwoot_1.default.sendWhatsAppTemplate(reminder.accountId, conversationId, waTemplateName, waTemplateLang, processedParams, apiToken);
                }
                else {
                    const message = replaceVars(reminder.message);
                    await chatwoot_1.default.sendMessage(reminder.accountId, conversationId, message, undefined, apiToken);
                }
                await prisma.appointmentReminder.update({
                    where: { id: reminder.id },
                    data: { status: 'sent', sentAt: new Date() },
                });
                logger_1.default.info('Lembrete de atendimento enviado', {
                    reminderId: reminder.id,
                    appointmentId: appt.id,
                    type: reminder.type,
                    patientPhone: appt.patient.phone,
                });
            }
            catch (err) {
                logger_1.default.error('Erro ao enviar lembrete de atendimento', { reminderId: reminder.id, error: err?.message });
                await prisma.appointmentReminder.update({
                    where: { id: reminder.id },
                    data: { status: 'failed', errorMessage: err?.message || 'Unknown error' },
                });
            }
        }
    }
    catch (error) {
        logger_1.default.error('Error in appointment reminder processor', { error });
    }
}
async function processScheduledCampaigns() {
    try {
        const now = new Date();
        const campaigns = await prisma.campaign.findMany({
            where: {
                status: 'scheduled',
                scheduledAt: { lte: now },
            },
            select: { id: true, accountId: true, apiToken: true },
        });
        if (campaigns.length === 0)
            return;
        logger_1.default.info(`Starting ${campaigns.length} scheduled campaign(s)`);
        const sender = new campaignSender_1.CampaignSender();
        for (const campaign of campaigns) {
            try {
                let apiToken = campaign.apiToken ? ((0, encryption_1.decryptOptional)(campaign.apiToken) ?? undefined) : undefined;
                if (!apiToken) {
                    apiToken = await chatwootDatabase_1.default.getAdminApiTokenForAccount(campaign.accountId).catch(() => null) ?? undefined;
                }
                await sender.startCampaign(campaign.id, campaign.accountId, apiToken);
                logger_1.default.info(`Scheduled campaign ${campaign.id} started successfully`);
            }
            catch (err) {
                logger_1.default.error(`Failed to start scheduled campaign ${campaign.id}`, { error: err?.message });
            }
        }
    }
    catch (error) {
        logger_1.default.error('Error in scheduled campaign processor', { error });
    }
}
/**
 * Polling periódico de status de entrega/leitura de mensagens de campanha.
 * O Chatwoot não inclui o campo 'status' nos eventos message_updated do webhook global,
 * então buscamos diretamente no banco do Chatwoot para cada mensagem pendente.
 */
async function pollCampaignMessageStatuses() {
    try {
        // Busca contatos com chatwootMessageId mas sem deliveredAt ou readAt,
        // de campanhas com menos de 7 dias (após 7 dias assume que não vai mais atualizar)
        const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const pending = await prisma.campaignContact.findMany({
            where: {
                chatwootMessageId: { not: null },
                readAt: null, // Só processa se não está totalmente lido
                campaign: { createdAt: { gte: cutoff } },
            },
            select: { id: true, chatwootMessageId: true, deliveredAt: true, readAt: true },
            take: 100, // Máximo 100 por ciclo para não sobrecarregar o banco
        });
        if (pending.length === 0)
            return;
        logger_1.default.debug(`Polling delivery status for ${pending.length} campaign contacts`);
        let updatedCount = 0;
        for (const contact of pending) {
            try {
                const msgStatus = await chatwootDatabase_1.default.getMessageDeliveryStatus(contact.chatwootMessageId);
                if (!msgStatus)
                    continue;
                const updateData = {};
                // status 1=delivered, 2=read (Chatwoot integer enum)
                if (msgStatus.status >= 1 && !contact.deliveredAt) {
                    updateData.deliveredAt = new Date();
                }
                if (msgStatus.status >= 2 && !contact.readAt) {
                    updateData.readAt = new Date();
                    if (!contact.deliveredAt)
                        updateData.deliveredAt = new Date();
                }
                // Também verifica whatsapp_message_status em content_attributes (API Oficial)
                const waStatus = msgStatus.contentAttributes?.whatsapp_message_status;
                if (waStatus === 'delivered' && !contact.deliveredAt) {
                    updateData.deliveredAt = new Date();
                }
                if (waStatus === 'read' && !contact.readAt) {
                    updateData.readAt = new Date();
                    if (!contact.deliveredAt)
                        updateData.deliveredAt = new Date();
                }
                if (Object.keys(updateData).length > 0) {
                    await prisma.campaignContact.update({
                        where: { id: contact.id },
                        data: updateData,
                    });
                    updatedCount++;
                    logger_1.default.info('Campaign contact delivery status updated via polling', {
                        contactId: contact.id,
                        chatwootMessageId: contact.chatwootMessageId,
                        chatwootStatus: msgStatus.status,
                        waStatus,
                        updateData,
                    });
                }
            }
            catch (err) {
                logger_1.default.debug('Failed to poll status for campaign contact', { contactId: contact.id, error: err?.message });
            }
        }
        if (updatedCount > 0) {
            logger_1.default.info(`Polling: updated ${updatedCount}/${pending.length} campaign contact statuses`);
        }
    }
    catch (error) {
        logger_1.default.error('Error in campaign message status polling', { error });
    }
}
async function processRecurringCampaigns() {
    try {
        const now = new Date();
        const campaigns = await prisma.campaign.findMany({
            where: {
                isRecurring: true,
                status: 'completed',
                recurringNextRun: { lte: now },
            },
            select: { id: true, accountId: true },
        });
        if (campaigns.length === 0)
            return;
        logger_1.default.info(`Processing ${campaigns.length} recurring campaign(s)`);
        const sender = new campaignSender_1.CampaignSender();
        for (const campaign of campaigns) {
            try {
                await sender.restartRecurringCampaign(campaign.id);
            }
            catch (err) {
                logger_1.default.error(`Failed to restart recurring campaign ${campaign.id}`, { error: err?.message });
            }
        }
    }
    catch (error) {
        logger_1.default.error('Error in recurring campaign processor', { error });
    }
}
exports.default = { startScheduler };
//# sourceMappingURL=scheduler.js.map