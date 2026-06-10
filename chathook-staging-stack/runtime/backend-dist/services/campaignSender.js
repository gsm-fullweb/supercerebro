"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignSender = void 0;
exports.setCampaignSenderSocketIO = setCampaignSenderSocketIO;
const database_1 = __importDefault(require("./database"));
const chatwoot_1 = __importDefault(require("./chatwoot"));
const chatwootDatabase_1 = __importDefault(require("./chatwootDatabase"));
const logger_1 = __importDefault(require("../utils/logger"));
const encryption_1 = require("../utils/encryption");
const campaignQueue_1 = require("../queues/campaignQueue");
const globalWebhook_1 = require("./globalWebhook");
const crypto_1 = __importDefault(require("crypto"));
let io = null;
function setCampaignSenderSocketIO(socketIO) {
    io = socketIO;
}
/** Processa spintax: {opção1|opção2|opção3} */
function processSpintax(text) {
    return text.replace(/\{([^{}]*)\}/g, (_, options) => {
        const choices = options.split('|');
        return choices[Math.floor(Math.random() * choices.length)];
    });
}
/** Interpola variáveis {{campo}} com dados do contato */
function interpolate(template, contact) {
    let result = template;
    result = result.replace(/\{\{nome\}\}/gi, contact.name || '');
    result = result.replace(/\{\{telefone\}\}/gi, contact.phone);
    if (contact.extraData && typeof contact.extraData === 'object') {
        for (const [key, value] of Object.entries(contact.extraData)) {
            result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), String(value ?? ''));
        }
    }
    return result;
}
/** Gera delay aleatório em ms entre min e max segundos */
function randomDelayMs(minSec, maxSec) {
    const diff = Math.max(0, maxSec - minSec);
    return (minSec + Math.random() * diff) * 1000;
}
/** Verifica se o horário atual está dentro da janela permitida */
function isWithinWindow(windowStart, windowEnd, allowedDays) {
    if (!windowStart || !windowEnd)
        return true;
    const now = new Date();
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const currentDay = dayNames[now.getDay()];
    if (Array.isArray(allowedDays) && allowedDays.length > 0) {
        if (!allowedDays.includes(currentDay))
            return false;
    }
    const [startH, startM] = windowStart.split(':').map(Number);
    const [endH, endM] = windowEnd.split(':').map(Number);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}
/** Escolhe inbox por rotação round_robin / random / weighted */
async function chooseInbox(campaign, currentIndex) {
    const raw = Array.isArray(campaign.inboxIds) ? campaign.inboxIds : [];
    const inboxIds = raw.map(Number).filter((n) => !isNaN(n));
    if (inboxIds.length === 0)
        return null;
    if (campaign.rotationMode === 'random') {
        return inboxIds[Math.floor(Math.random() * inboxIds.length)];
    }
    if (campaign.rotationMode === 'weighted' && campaign.inboxWeights && typeof campaign.inboxWeights === 'object') {
        const weights = campaign.inboxWeights;
        const totalWeight = inboxIds.reduce((sum, id) => sum + (weights[String(id)] || 1), 0);
        let rand = Math.random() * totalWeight;
        for (const id of inboxIds) {
            rand -= weights[String(id)] || 1;
            if (rand <= 0)
                return id;
        }
        return inboxIds[0];
    }
    // round_robin (padrão)
    return inboxIds[currentIndex % inboxIds.length];
}
/** Remove caracteres não numéricos do telefone, preservando o número exato do CSV */
function normalizePhone(phone) {
    return phone.replace(/\D/g, '');
}
class CampaignSender {
    botToken;
    constructor() {
        this.botToken = process.env.CHATWOOT_BOT_TOKEN;
    }
    /** Resolve o API token da campanha */
    resolveApiToken(campaign) {
        if (campaign.apiToken) {
            return (0, encryption_1.decryptOptional)(campaign.apiToken) ?? this.botToken;
        }
        return this.botToken;
    }
    /** Encontra ou cria contato Chatwoot por telefone */
    async findOrCreateContact(accountId, phone, name, inboxId, apiToken) {
        try {
            // Busca contato existente
            const contacts = await chatwoot_1.default.searchContacts(accountId, phone, undefined, apiToken);
            if (contacts && contacts.length > 0) {
                return contacts[0].id;
            }
            // Cria contato novo
            const contact = await chatwoot_1.default.createContact(accountId, { name: name || phone, phone_number: `+${phone}`, inbox_id: inboxId || 0 }, undefined, apiToken);
            if (contact?.id)
                return contact.id;
            // Se createContact retornou sem ID (race condition ou formato inesperado da API),
            // busca novamente — o contato pode ter sido criado com sucesso mas o ID veio em formato diferente
            const retry = await chatwoot_1.default.searchContacts(accountId, phone, undefined, apiToken);
            if (retry && retry.length > 0) {
                logger_1.default.info('findOrCreateContact: found contact on retry search', { phone, contactId: retry[0].id });
                return retry[0].id;
            }
            return null;
        }
        catch (error) {
            logger_1.default.error('findOrCreateContact failed', {
                phone,
                error: error?.message,
                responseStatus: error?.response?.status,
                responseData: JSON.stringify(error?.response?.data),
            });
            return null;
        }
    }
    /** Encontra conversa existente aberta do contato na inbox, ou cria uma nova */
    async findOrCreateConversation(accountId, contactId, inboxId, apiToken, phone) {
        try {
            // Verifica se já existe conversa aberta
            const convs = await chatwoot_1.default.getContactConversations(accountId, contactId, apiToken);
            if (convs && convs.length > 0) {
                const open = convs.find((c) => c.status === 'open' && c.inbox_id === inboxId);
                if (open)
                    return open.id;
                const pending = convs.find((c) => c.status === 'pending' && c.inbox_id === inboxId);
                if (pending)
                    return pending.id;
                // Se só existe conversa resolvida, reabri-la para que o agente consiga ver a mensagem
                const resolved = convs.find((c) => c.status === 'resolved' && c.inbox_id === inboxId);
                if (resolved) {
                    logger_1.default.info('findOrCreateConversation: reopening resolved conversation for campaign', {
                        conversationId: resolved.id, contactId, inboxId,
                    });
                    await chatwoot_1.default.updateConversationStatus(accountId, resolved.id, 'open', undefined, apiToken);
                    return resolved.id;
                }
                // NÃO usar conversa de inbox diferente — isso envia mensagem pela inbox errada
                // Se não existe conversa nessa inbox, cria uma nova abaixo
            }
            // Cria nova conversa — para inboxes WhatsApp o source_id deve ser SOMENTE dígitos (regex ^\d{1,15}$)
            // Chatwoot rejeita 422 com source_id aleatório ou com prefixo '+'
            const sourceId = phone ? phone.replace(/\D/g, '') : `${Date.now()}`;
            const conv = await chatwoot_1.default.createConversation(accountId, {
                source_id: sourceId,
                inbox_id: inboxId,
                contact_id: contactId,
                status: 'open',
            }, undefined, apiToken);
            return conv?.id ?? null;
        }
        catch (error) {
            logger_1.default.error('findOrCreateConversation failed', {
                contactId, inboxId,
                error: error?.message,
                responseStatus: error?.response?.status,
                responseData: JSON.stringify(error?.response?.data),
            });
            return null;
        }
    }
    /** Processa envio de uma mensagem da campanha para um contato */
    async processSendMessage(campaignId, contactId, accountId) {
        const [campaign, contact] = await Promise.all([
            database_1.default.campaign.findUnique({ where: { id: campaignId } }),
            database_1.default.campaignContact.findUnique({ where: { id: contactId } }),
        ]);
        if (!campaign || !contact) {
            logger_1.default.warn(`Campaign or contact not found: campaign=${campaignId}, contact=${contactId}`);
            return;
        }
        if (campaign.status === 'cancelled' || campaign.status === 'paused') {
            logger_1.default.info(`Campaign ${campaignId} is ${campaign.status}, skipping contact ${contactId}`);
            return;
        }
        if (contact.status !== 'pending') {
            logger_1.default.info(`Contact ${contactId} already processed: ${contact.status}`);
            return;
        }
        // Verifica janela de horário
        if (!isWithinWindow(campaign.windowStart, campaign.windowEnd, campaign.allowedDays)) {
            const now = new Date();
            const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
            const currentDay = dayNames[now.getDay()];
            const allowedDays = Array.isArray(campaign.allowedDays) ? campaign.allowedDays : [];
            const hasAllowedDays = allowedDays.length > 0;
            const todayIsAllowed = !hasAllowedDays || allowedDays.includes(currentDay);
            if (!todayIsAllowed) {
                // Dia da semana não permitido: calcula delay até a próxima janela no próximo dia permitido
                // Em vez de re-agendar a cada 15 min (loop infinito), espera até o próximo dia elegível
                let daysUntilNext = 1;
                for (let d = 1; d <= 7; d++) {
                    const candidateDay = dayNames[(now.getDay() + d) % 7];
                    if (allowedDays.includes(candidateDay)) {
                        daysUntilNext = d;
                        break;
                    }
                }
                // Delay: próximo dia elegível às windowStart (ou mínimo 1 hora para não spammar)
                const [startH, startM] = (campaign.windowStart ?? '00:00').split(':').map(Number);
                const nextWindow = new Date(now);
                nextWindow.setDate(nextWindow.getDate() + daysUntilNext);
                nextWindow.setHours(startH, startM, 0, 0);
                const delayMs = Math.max(nextWindow.getTime() - now.getTime(), 60 * 60 * 1000);
                await (0, campaignQueue_1.enqueueCampaignContact)(campaignId, contactId, accountId, delayMs);
                logger_1.default.info(`Campaign ${campaignId}: dia não permitido (${currentDay}), re-agendando contact ${contactId} para daqui ${Math.round(delayMs / 3600000)}h`);
            }
            else {
                // Dia certo, mas fora do horário — re-agenda para daqui a 15 min
                await (0, campaignQueue_1.enqueueCampaignContact)(campaignId, contactId, accountId, 15 * 60 * 1000);
                logger_1.default.info(`Campaign ${campaignId}: fora do horário, re-agendando contact ${contactId} para +15 min`);
            }
            return;
        }
        let apiToken = this.resolveApiToken(campaign);
        if (!apiToken) {
            try {
                apiToken = await chatwootDatabase_1.default.getAdminApiTokenForAccount(accountId) ?? undefined;
                if (apiToken)
                    logger_1.default.info(`Campaign ${campaignId}: using admin token from DB for account ${accountId}`);
            }
            catch { }
        }
        const messages = Array.isArray(campaign.messages) ? campaign.messages : [];
        if (messages.length === 0) {
            await database_1.default.campaignContact.update({
                where: { id: contactId },
                data: { status: 'failed', errorMessage: 'Campanha sem mensagens configuradas' },
            });
            return;
        }
        // Escolhe inbox por rotação (usa sentCount como índice)
        const inboxId = await chooseInbox(campaign, campaign.sentCount);
        if (!inboxId) {
            await database_1.default.campaignContact.update({
                where: { id: contactId },
                data: { status: 'failed', errorMessage: 'Nenhuma caixa configurada na campanha' },
            });
            await this.updateCampaignCounts(campaignId, 'failed');
            return;
        }
        const phone = normalizePhone(contact.phone);
        try {
            // Encontra ou cria contato e conversa no Chatwoot
            const chatwootContactId = await this.findOrCreateContact(accountId, phone, contact.name, inboxId, apiToken);
            if (!chatwootContactId) {
                throw new Error('Não foi possível encontrar ou criar contato no Chatwoot');
            }
            const conversationId = await this.findOrCreateConversation(accountId, chatwootContactId, inboxId, apiToken, phone);
            if (!conversationId) {
                throw new Error('Não foi possível encontrar ou criar conversa no Chatwoot');
            }
            // Envia cada mensagem da campanha com delay entre elas
            let chatwootMessageId = null;
            for (let i = 0; i < messages.length; i++) {
                const msg = messages[i];
                // Delay entre mensagens (exceto antes da primeira)
                if (i > 0 && msg.delayAfterSeconds && msg.delayAfterSeconds > 0) {
                    await new Promise((r) => setTimeout(r, msg.delayAfterSeconds * 1000));
                }
                logger_1.default.info('Processando mensagem da campanha', {
                    campaignId,
                    contactId,
                    msgIndex: i,
                    msgType: msg.type || 'text',
                    hasParams: Array.isArray(msg.params) ? msg.params.length : 'n/a',
                    contentPreview: String(msg.content || '').slice(0, 40),
                });
                let content = msg.content || '';
                // Interpolação de variáveis
                content = interpolate(content, {
                    name: contact.name,
                    phone: contact.phone,
                    extraData: contact.extraData,
                });
                // Spintax
                if (campaign.enableSpintax) {
                    content = processSpintax(content);
                }
                // Envia via Chatwoot API
                let sent;
                if (msg.type === 'template') {
                    // Template WhatsApp (API Oficial) — usa sendWhatsAppTemplate
                    // msg.params: string[] com os valores de cada variável do template ({{1}}, {{2}}, ...)
                    // Cada parâmetro também passa pela interpolação de variáveis do contato
                    const rawParams = Array.isArray(msg.params) ? msg.params : [];
                    const processedParams = rawParams.map((p) => interpolate(String(p), { name: contact.name, phone: contact.phone, extraData: contact.extraData }));
                    // Renderiza o body do template para registrar o conteúdo real no Chatwoot
                    let renderedContent;
                    if (msg.body) {
                        renderedContent = String(msg.body);
                        processedParams.forEach((val, idx) => {
                            renderedContent = renderedContent.replace(new RegExp(`\\{\\{${idx + 1}\\}\\}`, 'g'), val);
                        });
                    }
                    sent = await chatwoot_1.default.sendWhatsAppTemplate(accountId, conversationId, content, // content = templateName
                    msg.language || 'pt_BR', processedParams, apiToken, undefined, msg.headerUrl || undefined, msg.headerType || undefined, renderedContent);
                }
                else {
                    const sendResult = await chatwoot_1.default.sendMessage(accountId, conversationId, content, undefined, apiToken, msg.mediaUrl || undefined);
                    sent = sendResult;
                    // Captura ID da mensagem para rastrear entrega/leitura (apenas na última mensagem)
                    if (typeof sendResult === 'number' && sendResult > 1 && i === messages.length - 1) {
                        chatwootMessageId = sendResult;
                    }
                }
                if (!sent) {
                    throw new Error(`Falha ao enviar mensagem ${i + 1} via Chatwoot`);
                }
            }
            // Marca como enviado
            await database_1.default.campaignContact.update({
                where: { id: contactId },
                data: {
                    status: 'sent',
                    inboxId,
                    sentAt: new Date(),
                    retryCount: { increment: 0 },
                    ...(chatwootMessageId ? { chatwootMessageId } : {}),
                },
            });
            await this.updateCampaignCounts(campaignId, 'sent');
            // Emite progresso via Socket.IO
            this.emitProgress(accountId, campaignId);
            // Agenda follow-up se configurado
            if (campaign.followUpEnabled && campaign.followUpConfig) {
                const config = campaign.followUpConfig;
                if (config.waitHours > 0) {
                    await (0, campaignQueue_1.enqueueCampaignFollowUp)(campaignId, contactId, accountId, 1, config.waitHours * 60 * 60 * 1000);
                    await database_1.default.campaignContact.update({
                        where: { id: contactId },
                        data: { followUpStatus: 'waiting' },
                    });
                }
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger_1.default.error(`Failed to send campaign message to contact ${contactId}`, { error: errorMessage });
            await database_1.default.campaignContact.update({
                where: { id: contactId },
                data: {
                    status: 'failed',
                    errorMessage: errorMessage.substring(0, 500),
                    retryCount: { increment: 1 },
                },
            });
            await this.updateCampaignCounts(campaignId, 'failed');
            this.emitProgress(accountId, campaignId);
        }
    }
    /** Processa follow-up para contato que não respondeu */
    async processFollowUp(campaignId, contactId, accountId, attemptNumber) {
        const [campaign, contact] = await Promise.all([
            database_1.default.campaign.findUnique({ where: { id: campaignId } }),
            database_1.default.campaignContact.findUnique({ where: { id: contactId } }),
        ]);
        if (!campaign || !contact)
            return;
        if (campaign.status === 'cancelled')
            return;
        // Se contato já respondeu, não envia follow-up
        if (contact.repliedAt || contact.followUpStatus === 'replied') {
            logger_1.default.info(`Contact ${contactId} already replied, skipping follow-up`);
            return;
        }
        const config = campaign.followUpConfig;
        if (!config || !Array.isArray(config.messages) || config.messages.length === 0)
            return;
        const maxAttempts = config.maxAttempts || 1;
        if (attemptNumber > maxAttempts) {
            await database_1.default.campaignContact.update({
                where: { id: contactId },
                data: { followUpStatus: 'none' },
            });
            return;
        }
        const msgTemplate = config.messages[attemptNumber - 1] || config.messages[0];
        const content = interpolate(msgTemplate, {
            name: contact.name,
            phone: contact.phone,
            extraData: contact.extraData,
        });
        let apiToken = this.resolveApiToken(campaign);
        if (!apiToken) {
            try {
                apiToken = await chatwootDatabase_1.default.getAdminApiTokenForAccount(accountId) ?? undefined;
            }
            catch { }
        }
        try {
            // Usa mesma inbox do envio original
            const campaignInboxIds = Array.isArray(campaign.inboxIds) ? campaign.inboxIds : [];
            const inboxId = contact.inboxId || (campaignInboxIds.length > 0 ? Number(campaignInboxIds[0]) : null);
            if (!inboxId)
                return;
            const phone = normalizePhone(contact.phone);
            const chatwootContactId = await this.findOrCreateContact(accountId, phone, contact.name, inboxId, apiToken);
            if (!chatwootContactId)
                return;
            const conversationId = await this.findOrCreateConversation(accountId, chatwootContactId, inboxId, apiToken, phone);
            if (!conversationId)
                return;
            await chatwoot_1.default.sendMessage(accountId, conversationId, content, undefined, apiToken);
            const nextStatus = attemptNumber === 1 ? 'sent1' : 'sent2';
            await database_1.default.campaignContact.update({
                where: { id: contactId },
                data: { followUpStatus: nextStatus },
            });
            // Agenda próximo follow-up se houver
            if (attemptNumber < maxAttempts && config.waitHours > 0) {
                await (0, campaignQueue_1.enqueueCampaignFollowUp)(campaignId, contactId, accountId, attemptNumber + 1, config.waitHours * 60 * 60 * 1000);
            }
        }
        catch (error) {
            logger_1.default.error(`Follow-up failed for contact ${contactId}:`, error);
        }
    }
    /** Processa lote de verificação de números */
    async processVerifyBatch(campaignId, accountId, phones) {
        // Marca contatos sem WhatsApp (simulado — provider real precisaria endpoint de verificação)
        // Por ora apenas normaliza os telefones e os mantém como pending
        logger_1.default.info(`processVerifyBatch: campaign ${campaignId}, ${phones.length} phones (verification is provider-dependent)`);
    }
    /** Inicia uma campanha: resolve contatos, cria CampaignContacts e enfileira jobs */
    async startCampaign(campaignId, accountId, apiToken) {
        const campaign = await database_1.default.campaign.findUnique({ where: { id: campaignId } });
        if (!campaign)
            throw new Error('Campanha não encontrada');
        if (!['draft', 'paused', 'scheduled'].includes(campaign.status)) {
            throw new Error(`Campanha não pode ser iniciada no status atual: ${campaign.status}`);
        }
        // Verifica janela de horário ANTES de iniciar — se fora da janela, aborta sem alterar status
        // (o scheduler retentará no próximo tick, quando a janela puder estar aberta)
        if (campaign.windowStart && campaign.windowEnd) {
            if (!isWithinWindow(campaign.windowStart, campaign.windowEnd, campaign.allowedDays)) {
                logger_1.default.info(`Campaign ${campaignId}: fora da janela configurada, aguardando próximo ciclo`, {
                    windowStart: campaign.windowStart,
                    windowEnd: campaign.windowEnd,
                    allowedDays: campaign.allowedDays,
                    status: campaign.status,
                });
                return;
            }
        }
        // Garante webhook do Chatwoot com message_created + message_updated (não bloqueia se falhar)
        (0, globalWebhook_1.ensureGlobalWebhook)(accountId, apiToken).catch((err) => logger_1.default.warn('ensureGlobalWebhook falhou ao iniciar campanha', { accountId, error: err?.message }));
        // Resolve contatos da fonte
        const contacts = await this.resolveContacts(campaign, accountId, apiToken);
        // Filtra blacklist
        const filtered = await this.filterBlacklist(contacts, accountId);
        // Remove contatos já existentes (retry só dos pending)
        const existingPending = await database_1.default.campaignContact.findMany({
            where: { campaignId, status: 'pending' },
            select: { id: true, phone: true },
        });
        const existingPhones = new Set(existingPending.map((c) => c.phone));
        const newContacts = filtered.filter((c) => !existingPhones.has(c.phone));
        // Cria CampaignContacts para os novos
        if (newContacts.length > 0) {
            await database_1.default.campaignContact.createMany({
                data: newContacts.map((c, i) => ({
                    campaignId,
                    phone: c.phone,
                    name: c.name || null,
                    extraData: c.extraData || null,
                    abVariant: campaign.abTestEnabled ? (i % 2 === 0 ? 'A' : 'B') : null,
                    trackingToken: campaign.enableLinkTracking
                        ? crypto_1.default.randomBytes(12).toString('hex')
                        : null,
                })),
                skipDuplicates: true,
            });
        }
        // Conta o total de contatos desta campanha (inclui sent + pending + failed)
        // Não usar só pending: evita subcontagem quando contacts são inseridos concorrentemente
        const totalAll = await database_1.default.campaignContact.count({ where: { campaignId } });
        // Atualiza campanha para running
        await database_1.default.campaign.update({
            where: { id: campaignId },
            data: {
                status: 'running',
                startedAt: campaign.startedAt ?? new Date(),
                totalContacts: totalAll,
                apiToken: apiToken ? (0, encryption_1.encryptOptional)(apiToken) : campaign.apiToken,
            },
        });
        // Enfileira jobs com delay aleatório entre cada um
        const allPending = await database_1.default.campaignContact.findMany({
            where: { campaignId, status: 'pending' },
            select: { id: true },
        });
        let cumulativeDelayMs = 0;
        for (let i = 0; i < allPending.length; i++) {
            const contact = allPending[i];
            // Pausa a cada N envios
            if (campaign.pauseEveryN && campaign.pauseForSeconds && i > 0 && i % campaign.pauseEveryN === 0) {
                cumulativeDelayMs += campaign.pauseForSeconds * 1000;
            }
            await (0, campaignQueue_1.enqueueCampaignContact)(campaignId, contact.id, accountId, cumulativeDelayMs);
            // Incrementa delay aleatório para o próximo
            cumulativeDelayMs += randomDelayMs(campaign.delayMinSeconds, campaign.delayMaxSeconds);
        }
        logger_1.default.info(`Campaign ${campaignId} started: ${allPending.length} contacts enqueued`);
        if (allPending.length === 0) {
            // Diagnóstico: conta contatos por status para logar causa
            const sentCount = await database_1.default.campaignContact.count({ where: { campaignId, status: 'sent' } });
            const failedCount = await database_1.default.campaignContact.count({ where: { campaignId, status: 'failed' } });
            const totalCount = await database_1.default.campaignContact.count({ where: { campaignId } });
            if (totalCount === 0) {
                logger_1.default.warn(`Campaign ${campaignId}: sem contatos — fonte vazia ou CSV não importado`, { campaignId, sourceType: campaign.sourceType });
            }
            else {
                logger_1.default.warn(`Campaign ${campaignId}: todos contatos já processados (sent:${sentCount} failed:${failedCount}) — use "re-enviar todos" para reprocessar`, { campaignId, sentCount, failedCount });
            }
            // Não deixar presa em 'running' sem contatos
            await database_1.default.campaign.update({
                where: { id: campaignId },
                data: { status: 'completed', completedAt: new Date() },
            });
        }
    }
    /** Resolve lista de contatos da fonte configurada */
    async resolveContacts(campaign, accountId, apiToken) {
        const config = campaign.sourceConfig;
        if (campaign.sourceType === 'csv') {
            // CSV já foi processado e os contatos estão no banco — retorna vazio aqui
            return [];
        }
        if (campaign.sourceType === 'tags') {
            return this.resolveFromTags(accountId, config.tags || [], apiToken);
        }
        if (campaign.sourceType === 'kanban_stage') {
            return this.resolveFromKanbanStages(accountId, config.stageIds || [], apiToken);
        }
        if (campaign.sourceType === 'kanban_status') {
            return this.resolveFromChatwootStatus(accountId, config.status, config.inboxIds, apiToken);
        }
        return [];
    }
    async resolveFromTags(accountId, tags, apiToken) {
        const results = [];
        try {
            for (const tag of tags) {
                // 1) Contatos com essa label de contato
                const contactsByLabel = await chatwoot_1.default.getContactsByLabel(accountId, tag, apiToken);
                for (const c of contactsByLabel) {
                    if (c.phone_number) {
                        results.push({ phone: c.phone_number.replace(/\D/g, ''), name: c.name });
                    }
                }
                // 2) Conversas com essa label de conversa → extrai contato
                try {
                    const conversations = await chatwoot_1.default.getConversations(accountId, undefined, apiToken, { labels: [tag] });
                    for (const conv of conversations || []) {
                        const phone = conv.meta?.sender?.phone_number;
                        if (phone) {
                            results.push({ phone: phone.replace(/\D/g, ''), name: conv.meta?.sender?.name });
                        }
                    }
                }
                catch (convErr) {
                    logger_1.default.warn('resolveFromTags: conversation label lookup failed', { tag, error: String(convErr) });
                }
            }
        }
        catch (error) {
            logger_1.default.error('resolveFromTags failed', { error });
        }
        return this.deduplicateContacts(results);
    }
    async resolveFromKanbanStages(accountId, stageIds, apiToken) {
        const results = [];
        try {
            const cards = await database_1.default.card.findMany({
                where: { stageId: { in: stageIds }, accountId },
                include: { stage: { include: { funnel: true } } },
            });
            for (const card of cards) {
                // Busca conversa no Chatwoot para pegar o telefone do contato
                // O conversationId do card == id da conversa Chatwoot
                if (card.conversationId) {
                    const conv = await chatwoot_1.default.getConversation(accountId, card.conversationId, undefined, apiToken);
                    if (conv?.meta?.sender?.phone_number) {
                        results.push({
                            phone: conv.meta.sender.phone_number.replace(/\D/g, ''),
                            name: card.customName || conv.meta.sender.name,
                        });
                    }
                }
            }
        }
        catch (error) {
            logger_1.default.error('resolveFromKanbanStages failed', { error });
        }
        return this.deduplicateContacts(results);
    }
    async resolveFromChatwootStatus(accountId, status, inboxIds, apiToken) {
        const results = [];
        try {
            // Busca conversas por status no Chatwoot
            const conversations = await chatwoot_1.default.getConversations(accountId, undefined, apiToken, { status });
            for (const conv of conversations || []) {
                if (inboxIds && inboxIds.length > 0 && !inboxIds.includes(conv.inbox_id))
                    continue;
                if (conv.meta?.sender?.phone_number) {
                    results.push({
                        phone: conv.meta.sender.phone_number.replace(/\D/g, ''),
                        name: conv.meta.sender.name,
                    });
                }
            }
        }
        catch (error) {
            logger_1.default.error('resolveFromChatwootStatus failed', { error });
        }
        return this.deduplicateContacts(results);
    }
    deduplicateContacts(contacts) {
        const seen = new Set();
        return contacts.filter((c) => {
            const normalized = c.phone.replace(/\D/g, '');
            if (seen.has(normalized))
                return false;
            seen.add(normalized);
            c.phone = normalized;
            return true;
        });
    }
    async filterBlacklist(contacts, accountId) {
        const phones = contacts.map((c) => c.phone.replace(/\D/g, ''));
        const blacklisted = await database_1.default.campaignBlacklist.findMany({
            where: { accountId, phone: { in: phones } },
            select: { phone: true },
        });
        const blacklistSet = new Set(blacklisted.map((b) => b.phone));
        return contacts.filter((c) => !blacklistSet.has(c.phone.replace(/\D/g, '')));
    }
    async updateCampaignCounts(campaignId, result) {
        const data = result === 'sent' ? { sentCount: { increment: 1 } } : { failedCount: { increment: 1 } };
        await database_1.default.campaign.update({ where: { id: campaignId }, data });
        // Verifica se a campanha terminou
        const campaign = await database_1.default.campaign.findUnique({
            where: { id: campaignId },
            select: {
                totalContacts: true, sentCount: true, failedCount: true, skippedCount: true, status: true,
                isRecurring: true, recurringIntervalDays: true, recurringEndDate: true, recurringRunCount: true, accountId: true,
            },
        });
        if (!campaign || campaign.status !== 'running')
            return;
        const processed = campaign.sentCount + campaign.failedCount + campaign.skippedCount;
        if (processed >= campaign.totalContacts && campaign.totalContacts > 0) {
            // Antes de marcar como concluída, verifica se ainda há contatos pendentes
            // (pode ocorrer se totalContacts foi salvo incorretamente por race condition no import)
            const pendingCount = await database_1.default.campaignContact.count({
                where: { campaignId, status: 'pending' },
            });
            if (pendingCount > 0) {
                const realTotal = await database_1.default.campaignContact.count({ where: { campaignId } });
                logger_1.default.warn(`Campaign ${campaignId}: totalContacts inconsistente detectado`, {
                    sentCount: campaign.sentCount,
                    failedCount: campaign.failedCount,
                    skippedCount: campaign.skippedCount,
                    totalContactsSalvo: campaign.totalContacts,
                    totalContactsReal: realTotal,
                    pendingRestantes: pendingCount,
                });
                // Corrige totalContacts para o valor real e continua processando
                await database_1.default.campaign.update({
                    where: { id: campaignId },
                    data: { totalContacts: realTotal },
                });
                return;
            }
            const now = new Date();
            const updateData = { status: 'completed', completedAt: now };
            if (campaign.isRecurring && campaign.recurringIntervalDays) {
                const nextRun = new Date(now.getTime() + campaign.recurringIntervalDays * 24 * 60 * 60 * 1000);
                const endDatePassed = campaign.recurringEndDate && nextRun > campaign.recurringEndDate;
                if (!endDatePassed) {
                    updateData.recurringNextRun = nextRun;
                    updateData.recurringRunCount = { increment: 1 };
                    logger_1.default.info(`Campaign ${campaignId} is recurring — next run scheduled for ${nextRun.toISOString()}`);
                }
                else {
                    updateData.recurringRunCount = { increment: 1 };
                    logger_1.default.info(`Campaign ${campaignId} recurring ended (end date passed)`);
                }
            }
            await database_1.default.campaign.update({ where: { id: campaignId }, data: updateData });
            logger_1.default.info(`Campaign ${campaignId} completed`);
        }
    }
    /** Reinicia uma campanha recorrente: limpa contatos antigos e re-executa */
    async restartRecurringCampaign(campaignId) {
        const campaign = await database_1.default.campaign.findUnique({ where: { id: campaignId } });
        if (!campaign || !campaign.isRecurring)
            return;
        // Verifica se a data limite não passou
        if (campaign.recurringEndDate && new Date() > campaign.recurringEndDate) {
            logger_1.default.info(`Campaign ${campaignId} recurring skipped — end date passed`);
            return;
        }
        logger_1.default.info(`Restarting recurring campaign ${campaignId}`);
        // Limpa contatos da execução anterior
        await database_1.default.campaignContact.deleteMany({ where: { campaignId } });
        // Reseta contadores e status
        await database_1.default.campaign.update({
            where: { id: campaignId },
            data: {
                status: 'running',
                startedAt: new Date(),
                completedAt: null,
                recurringNextRun: null,
                totalContacts: 0,
                sentCount: 0,
                failedCount: 0,
                skippedCount: 0,
            },
        });
        // Re-executa a campanha
        const apiToken = campaign.apiToken ? (0, encryption_1.decryptOptional)(campaign.apiToken) : undefined;
        await this.startCampaign(campaignId, campaign.accountId, apiToken || '');
    }
    emitProgress(accountId, campaignId) {
        if (!io)
            return;
        // Emite para sala da conta
        io.to(`account:${accountId}`).emit('campaign.progress', { campaignId, accountId });
    }
}
exports.CampaignSender = CampaignSender;
//# sourceMappingURL=campaignSender.js.map