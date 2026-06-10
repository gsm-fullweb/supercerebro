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
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const database_1 = __importDefault(require("../services/database"));
const logger_1 = __importDefault(require("../utils/logger"));
const encryption_1 = require("../utils/encryption");
const campaignSender_1 = require("../services/campaignSender");
const chatwootDatabase_1 = __importDefault(require("../services/chatwootDatabase"));
const router = (0, express_1.Router)();
// Multer para upload de CSV
const csvStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        const dir = '/tmp/campaign-csv';
        fs_1.default.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        cb(null, `${Date.now()}-${crypto_1.default.randomBytes(6).toString('hex')}${path_1.default.extname(file.originalname)}`);
    },
});
const uploadCsv = (0, multer_1.default)({
    storage: csvStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_req, file, cb) => {
        if (['.csv', '.txt'].includes(path_1.default.extname(file.originalname).toLowerCase())) {
            cb(null, true);
        }
        else {
            cb(new Error('Somente arquivos .csv ou .txt são aceitos'));
        }
    },
});
/** Parseia CSV e retorna linhas como objetos */
function parseCsv(content) {
    const lines = content.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0)
        return { headers: [], rows: [] };
    // Detecta separador
    const firstLine = lines[0];
    const sep = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';
    const headers = firstLine.split(sep).map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());
    const rows = lines.slice(1).map((line) => {
        const values = line.split(sep).map((v) => v.trim().replace(/^"|"$/g, ''));
        const row = {};
        headers.forEach((h, i) => { row[h] = values[i] || ''; });
        return row;
    }).filter((r) => Object.values(r).some((v) => v));
    return { headers, rows };
}
/** Normaliza telefone para somente dígitos */
function normalizePhone(phone) {
    return phone.replace(/\D/g, '');
}
// ═══════════════════════════════════════════════════════
// ROTAS DE CAMPANHAS
// ═══════════════════════════════════════════════════════
/** GET /api/campaigns — Lista campanhas da conta */
router.get('/campaigns', async (req, res) => {
    const authReq = req;
    const accountId = authReq.user.account_id;
    const { status, page = '1', limit = '20', search } = req.query;
    try {
        const where = { accountId };
        if (status)
            where.status = status;
        if (search)
            where.name = { contains: search, mode: 'insensitive' };
        const [campaigns, total] = await Promise.all([
            database_1.default.campaign.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (parseInt(page) - 1) * parseInt(limit),
                take: parseInt(limit),
                select: {
                    id: true, name: true, description: true, status: true,
                    sourceType: true, totalContacts: true, sentCount: true,
                    failedCount: true, skippedCount: true, replyCount: true,
                    clickCount: true, scheduledAt: true, startedAt: true,
                    completedAt: true, createdAt: true, createdBy: true,
                },
            }),
            database_1.default.campaign.count({ where }),
        ]);
        res.json({ data: campaigns, total, page: parseInt(page), limit: parseInt(limit) });
    }
    catch (error) {
        logger_1.default.error('Error listing campaigns:', error);
        res.status(500).json({ error: 'Erro ao listar campanhas' });
    }
});
/** POST /api/campaigns — Criar campanha */
router.post('/campaigns', async (req, res) => {
    const authReq = req;
    const accountId = authReq.user.account_id;
    const { name, description, sourceType, sourceConfig, messages, inboxIds, rotationMode, inboxWeights, delayMinSeconds, delayMaxSeconds, pauseEveryN, pauseForSeconds, windowStart, windowEnd, allowedDays, maxPerHourPerInbox, simulateTyping, verifyNumbers, enableSpintax, enableLinkTracking, linkTrackingDomain, followUpEnabled, followUpConfig, abTestEnabled, abTestConfig, scheduledAt, isRecurring, recurringIntervalDays, recurringEndDate, } = req.body;
    if (!name || !sourceType || !messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'name, sourceType e messages são obrigatórios' });
    }
    try {
        const campaign = await database_1.default.campaign.create({
            data: {
                accountId,
                name,
                description: description || null,
                status: scheduledAt ? 'scheduled' : 'draft',
                sourceType,
                sourceConfig: sourceConfig || {},
                messages,
                inboxIds: inboxIds || [],
                rotationMode: rotationMode || 'round_robin',
                inboxWeights: inboxWeights || null,
                delayMinSeconds: delayMinSeconds ?? 5,
                delayMaxSeconds: delayMaxSeconds ?? 20,
                pauseEveryN: pauseEveryN || null,
                pauseForSeconds: pauseForSeconds || null,
                windowStart: windowStart || null,
                windowEnd: windowEnd || null,
                allowedDays: allowedDays || null,
                maxPerHourPerInbox: maxPerHourPerInbox || null,
                simulateTyping: simulateTyping ?? false,
                verifyNumbers: verifyNumbers ?? false,
                enableSpintax: enableSpintax ?? false,
                enableLinkTracking: enableLinkTracking ?? false,
                linkTrackingDomain: linkTrackingDomain || null,
                followUpEnabled: followUpEnabled ?? false,
                followUpConfig: followUpConfig || null,
                abTestEnabled: abTestEnabled ?? false,
                abTestConfig: abTestConfig || null,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
                isRecurring: isRecurring ?? false,
                recurringIntervalDays: isRecurring ? (recurringIntervalDays ?? null) : null,
                recurringEndDate: isRecurring && recurringEndDate ? new Date(recurringEndDate) : null,
                apiToken: authReq.apiToken ? (0, encryption_1.encryptOptional)(authReq.apiToken) : null,
                createdBy: authReq.user.id,
            },
        });
        res.status(201).json({ data: campaign });
    }
    catch (error) {
        logger_1.default.error('Error creating campaign:', error);
        res.status(500).json({ error: 'Erro ao criar campanha' });
    }
});
// ═══════════════════════════════════════════════════════
// BLACKLIST (deve ficar ANTES de /campaigns/:id para evitar conflito de rota)
// ═══════════════════════════════════════════════════════
/** GET /api/campaigns/blacklist — Listar blacklist */
router.get('/campaigns/blacklist', async (req, res) => {
    const authReq = req;
    const accountId = authReq.user.account_id;
    const { search, page = '1', limit = '50' } = req.query;
    try {
        const where = { accountId };
        if (search)
            where.phone = { contains: search };
        const [items, total] = await Promise.all([
            database_1.default.campaignBlacklist.findMany({
                where,
                orderBy: { addedAt: 'desc' },
                skip: (parseInt(page) - 1) * parseInt(limit),
                take: parseInt(limit),
            }),
            database_1.default.campaignBlacklist.count({ where }),
        ]);
        res.json({ data: items, total });
    }
    catch (error) {
        logger_1.default.error('Error listing blacklist:', error);
        res.status(500).json({ error: 'Erro ao listar blacklist' });
    }
});
/** GET /api/campaigns/blacklist/export — Exportar blacklist CSV */
router.get('/campaigns/blacklist/export', async (req, res) => {
    const authReq = req;
    const accountId = authReq.user.account_id;
    try {
        const items = await database_1.default.campaignBlacklist.findMany({
            where: { accountId },
            orderBy: { addedAt: 'desc' },
        });
        const csv = 'Telefone,Motivo,Data\n' +
            items.map((i) => `${i.phone},${(i.reason || '').replace(/,/g, ';')},${i.addedAt.toISOString()}`).join('\n');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="blacklist.csv"');
        res.send('\uFEFF' + csv);
    }
    catch (error) {
        logger_1.default.error('Error exporting blacklist:', error);
        res.status(500).json({ error: 'Erro ao exportar blacklist' });
    }
});
/** POST /api/campaigns/blacklist — Adicionar número(s) à blacklist */
router.post('/campaigns/blacklist', async (req, res) => {
    const authReq = req;
    const accountId = authReq.user.account_id;
    const { phones, reason } = req.body;
    const list = Array.isArray(phones) ? phones : [phones].filter(Boolean);
    if (list.length === 0)
        return res.status(400).json({ error: 'phones é obrigatório' });
    try {
        await database_1.default.campaignBlacklist.createMany({
            data: list.map((p) => ({
                accountId,
                phone: normalizePhone(p),
                reason: reason || null,
                addedBy: authReq.user.id,
            })),
            skipDuplicates: true,
        });
        res.json({ success: true, added: list.length });
    }
    catch (error) {
        logger_1.default.error('Error adding to blacklist:', error);
        res.status(500).json({ error: 'Erro ao adicionar à blacklist' });
    }
});
/** DELETE /api/campaigns/blacklist/:id — Remover da blacklist */
router.delete('/campaigns/blacklist/:id', async (req, res) => {
    const authReq = req;
    const accountId = authReq.user.account_id;
    const id = parseInt(req.params.id);
    try {
        const item = await database_1.default.campaignBlacklist.findFirst({ where: { id, accountId } });
        if (!item)
            return res.status(404).json({ error: 'Item não encontrado na blacklist' });
        await database_1.default.campaignBlacklist.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (error) {
        logger_1.default.error('Error removing from blacklist:', error);
        res.status(500).json({ error: 'Erro ao remover da blacklist' });
    }
});
/** GET /api/campaigns/:id — Detalhes da campanha */
router.get('/campaigns/:id', async (req, res) => {
    const authReq = req;
    const accountId = authReq.user.account_id;
    const campaignId = parseInt(req.params.id);
    try {
        const [campaign, deliveredCount, readCount] = await Promise.all([
            database_1.default.campaign.findFirst({ where: { id: campaignId, accountId } }),
            database_1.default.campaignContact.count({ where: { campaignId, deliveredAt: { not: null } } }),
            database_1.default.campaignContact.count({ where: { campaignId, readAt: { not: null } } }),
        ]);
        if (!campaign)
            return res.status(404).json({ error: 'Campanha não encontrada' });
        // Remove apiToken da resposta
        const { apiToken: _token, ...safe } = campaign;
        res.json({ data: { ...safe, deliveredCount, readCount } });
    }
    catch (error) {
        logger_1.default.error('Error fetching campaign:', error);
        res.status(500).json({ error: 'Erro ao buscar campanha' });
    }
});
/** PUT /api/campaigns/:id — Editar campanha (somente rascunho) */
router.put('/campaigns/:id', async (req, res) => {
    const authReq = req;
    const accountId = authReq.user.account_id;
    const campaignId = parseInt(req.params.id);
    try {
        const campaign = await database_1.default.campaign.findFirst({ where: { id: campaignId, accountId } });
        if (!campaign)
            return res.status(404).json({ error: 'Campanha não encontrada' });
        if (!['draft', 'scheduled'].includes(campaign.status)) {
            return res.status(400).json({ error: 'Somente campanhas em rascunho ou agendadas podem ser editadas' });
        }
        const allowed = [
            'name', 'description', 'sourceType', 'sourceConfig', 'messages', 'inboxIds',
            'rotationMode', 'inboxWeights', 'delayMinSeconds', 'delayMaxSeconds',
            'pauseEveryN', 'pauseForSeconds', 'windowStart', 'windowEnd', 'allowedDays',
            'maxPerHourPerInbox', 'simulateTyping', 'verifyNumbers', 'enableSpintax',
            'enableLinkTracking', 'linkTrackingDomain', 'followUpEnabled', 'followUpConfig',
            'abTestEnabled', 'abTestConfig', 'scheduledAt',
            'isRecurring', 'recurringIntervalDays', 'recurringEndDate',
        ];
        const data = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined)
                data[key] = req.body[key];
        }
        if (data.scheduledAt)
            data.scheduledAt = new Date(data.scheduledAt);
        if (data.recurringEndDate)
            data.recurringEndDate = new Date(data.recurringEndDate);
        if (data.isRecurring === false) {
            data.recurringIntervalDays = null;
            data.recurringEndDate = null;
        }
        const updated = await database_1.default.campaign.update({ where: { id: campaignId }, data });
        const { apiToken: _token, ...safe } = updated;
        res.json({ data: safe });
    }
    catch (error) {
        logger_1.default.error('Error updating campaign:', error);
        res.status(500).json({ error: 'Erro ao atualizar campanha' });
    }
});
/** DELETE /api/campaigns/:id — Deletar campanha (somente rascunho) */
router.delete('/campaigns/:id', async (req, res) => {
    const authReq = req;
    const accountId = authReq.user.account_id;
    const campaignId = parseInt(req.params.id);
    try {
        const campaign = await database_1.default.campaign.findFirst({ where: { id: campaignId, accountId } });
        if (!campaign)
            return res.status(404).json({ error: 'Campanha não encontrada' });
        if (!['draft', 'scheduled', 'completed', 'cancelled'].includes(campaign.status)) {
            return res.status(400).json({ error: 'Não é possível deletar campanha em execução' });
        }
        await database_1.default.campaign.delete({ where: { id: campaignId } });
        res.json({ success: true });
    }
    catch (error) {
        logger_1.default.error('Error deleting campaign:', error);
        res.status(500).json({ error: 'Erro ao deletar campanha' });
    }
});
/** POST /api/campaigns/:id/start — Iniciar campanha */
router.post('/campaigns/:id/start', async (req, res) => {
    const authReq = req;
    const accountId = authReq.user.account_id;
    const campaignId = parseInt(req.params.id);
    try {
        // Quando o usuário autenticou via JWT, authReq.apiToken é undefined.
        // Busca o token de API do Chatwoot DB para garantir autenticação nas chamadas à API.
        let resolvedApiToken = authReq.apiToken;
        if (!resolvedApiToken) {
            try {
                resolvedApiToken = await chatwootDatabase_1.default.getUserAccessToken(authReq.user.id) ?? undefined;
            }
            catch { }
        }
        // A campanha pode ter sido criada com accountId errado (SuperAdmin com múltiplas contas).
        // Tenta a conta do usuário; se não achar, verifica as outras contas.
        let campaign = await database_1.default.campaign.findFirst({ where: { id: campaignId, accountId } });
        let effectiveAccountId = accountId;
        if (!campaign) {
            // Tenta encontrar a campanha nas outras contas do usuário
            const allAccounts = await chatwootDatabase_1.default.getUserAccountIds(authReq.user.id);
            for (const altId of allAccounts) {
                if (altId === accountId)
                    continue;
                campaign = await database_1.default.campaign.findFirst({ where: { id: campaignId, accountId: altId } });
                if (campaign) {
                    effectiveAccountId = altId;
                    break;
                }
            }
        }
        if (!campaign)
            return res.status(404).json({ error: 'Campanha não encontrada' });
        const sender = new campaignSender_1.CampaignSender();
        await sender.startCampaign(campaignId, effectiveAccountId, resolvedApiToken);
        res.json({ success: true, message: 'Campanha iniciada' });
    }
    catch (error) {
        logger_1.default.error('Error starting campaign:', error);
        res.status(400).json({ error: error?.message || 'Erro ao iniciar campanha' });
    }
});
/** POST /api/campaigns/:id/pause — Pausar campanha */
router.post('/campaigns/:id/pause', async (req, res) => {
    const authReq = req;
    const accountId = authReq.user.account_id;
    const campaignId = parseInt(req.params.id);
    try {
        const campaign = await database_1.default.campaign.findFirst({ where: { id: campaignId, accountId } });
        if (!campaign)
            return res.status(404).json({ error: 'Campanha não encontrada' });
        if (campaign.status !== 'running')
            return res.status(400).json({ error: 'Campanha não está em execução' });
        await database_1.default.campaign.update({ where: { id: campaignId }, data: { status: 'paused' } });
        res.json({ success: true });
    }
    catch (error) {
        logger_1.default.error('Error pausing campaign:', error);
        res.status(500).json({ error: 'Erro ao pausar campanha' });
    }
});
/** POST /api/campaigns/:id/cancel — Cancelar campanha */
router.post('/campaigns/:id/cancel', async (req, res) => {
    const authReq = req;
    const accountId = authReq.user.account_id;
    const campaignId = parseInt(req.params.id);
    try {
        const campaign = await database_1.default.campaign.findFirst({ where: { id: campaignId, accountId } });
        if (!campaign)
            return res.status(404).json({ error: 'Campanha não encontrada' });
        if (['completed', 'cancelled'].includes(campaign.status)) {
            return res.status(400).json({ error: 'Campanha já finalizada' });
        }
        await database_1.default.campaign.update({ where: { id: campaignId }, data: { status: 'cancelled' } });
        res.json({ success: true });
    }
    catch (error) {
        logger_1.default.error('Error cancelling campaign:', error);
        res.status(500).json({ error: 'Erro ao cancelar campanha' });
    }
});
/** POST /api/campaigns/:id/retry-failed — Reenviar contatos falhos (e opcionalmente enviados) */
router.post('/campaigns/:id/retry-failed', async (req, res) => {
    const authReq = req;
    const accountId = authReq.user.account_id;
    const campaignId = parseInt(req.params.id);
    const incluirEnviados = req.body.incluirEnviados === true;
    try {
        const campaign = await database_1.default.campaign.findFirst({ where: { id: campaignId, accountId } });
        if (!campaign)
            return res.status(404).json({ error: 'Campanha não encontrada' });
        const statusToReset = incluirEnviados ? { in: ['failed', 'sent'] } : 'failed';
        const result = await database_1.default.campaignContact.updateMany({
            where: { campaignId, status: statusToReset },
            data: { status: 'pending', errorMessage: null },
        });
        if (result.count === 0) {
            return res.json({ success: true, message: incluirEnviados ? 'Nenhum contato para reenviar' : 'Nenhum contato falho para reenviar' });
        }
        await database_1.default.campaign.update({
            where: { id: campaignId },
            data: {
                status: 'running',
                startedAt: campaign.startedAt ?? new Date(),
                completedAt: null,
                sentCount: incluirEnviados ? { decrement: result.count } : campaign.sentCount,
                failedCount: { set: 0 },
                totalContacts: { increment: incluirEnviados ? 0 : result.count },
            },
        });
        const pendingContacts = await database_1.default.campaignContact.findMany({
            where: { campaignId, status: 'pending' },
            select: { id: true },
        });
        const { enqueueCampaignContact: enqueue } = await Promise.resolve().then(() => __importStar(require('../queues/campaignQueue')));
        let delay = 0;
        for (const contact of pendingContacts) {
            await enqueue(campaignId, contact.id, accountId, delay);
            delay += (campaign.delayMinSeconds + campaign.delayMaxSeconds) * 500;
        }
        res.json({ success: true, message: `${result.count} contatos reenfileirados` });
    }
    catch (error) {
        logger_1.default.error('Error retrying failed contacts:', error);
        res.status(500).json({ error: 'Erro ao reenviar contatos falhos' });
    }
});
/** POST /api/campaigns/:id/duplicate — Duplicar campanha */
router.post('/campaigns/:id/duplicate', async (req, res) => {
    const authReq = req;
    const accountId = authReq.user.account_id;
    const campaignId = parseInt(req.params.id);
    try {
        const original = await database_1.default.campaign.findFirst({ where: { id: campaignId, accountId } });
        if (!original)
            return res.status(404).json({ error: 'Campanha não encontrada' });
        const { id: _id, createdAt: _ca, updatedAt: _ua, startedAt: _sa, completedAt: _coa, sentCount: _sc, failedCount: _fc, skippedCount: _sk, clickCount: _cc, replyCount: _rc, totalContacts: _tc, apiToken: _at, ...rest } = original;
        const copy = await database_1.default.campaign.create({
            data: {
                ...rest,
                name: `${original.name} (cópia)`,
                status: 'draft',
                scheduledAt: null,
                totalContacts: 0,
                apiToken: authReq.apiToken ? (0, encryption_1.encryptOptional)(authReq.apiToken) : null,
                createdBy: authReq.user.id,
            },
        });
        // Para campanhas CSV, copia os contatos como pending para a campanha nova
        if (original.sourceType === 'csv') {
            const originalContacts = await database_1.default.campaignContact.findMany({
                where: { campaignId: original.id },
                select: { phone: true, name: true, extraData: true },
            });
            if (originalContacts.length > 0) {
                await database_1.default.campaignContact.createMany({
                    data: originalContacts.map((c) => ({
                        campaignId: copy.id,
                        phone: c.phone,
                        name: c.name ?? undefined,
                        extraData: c.extraData ?? undefined,
                        status: 'pending',
                    })),
                    skipDuplicates: true,
                });
                await database_1.default.campaign.update({
                    where: { id: copy.id },
                    data: { totalContacts: originalContacts.length },
                });
            }
        }
        const { apiToken: _token, ...safe } = copy;
        res.status(201).json({ data: safe });
    }
    catch (error) {
        logger_1.default.error('Error duplicating campaign:', error);
        res.status(500).json({ error: 'Erro ao duplicar campanha' });
    }
});
// ═══════════════════════════════════════════════════════
// CONTATOS
// ═══════════════════════════════════════════════════════
/** GET /api/campaigns/:id/contacts — Lista contatos da campanha */
router.get('/campaigns/:id/contacts', async (req, res) => {
    const authReq = req;
    const accountId = authReq.user.account_id;
    const campaignId = parseInt(req.params.id);
    const { status, search, page = '1', limit = '50' } = req.query;
    try {
        const campaign = await database_1.default.campaign.findFirst({ where: { id: campaignId, accountId } });
        if (!campaign)
            return res.status(404).json({ error: 'Campanha não encontrada' });
        const where = { campaignId };
        if (status)
            where.status = status;
        if (search)
            where.OR = [
                { phone: { contains: search } },
                { name: { contains: search, mode: 'insensitive' } },
            ];
        const [contacts, total] = await Promise.all([
            database_1.default.campaignContact.findMany({
                where,
                orderBy: { id: 'asc' },
                skip: (parseInt(page) - 1) * parseInt(limit),
                take: parseInt(limit),
                select: {
                    id: true, phone: true, name: true, status: true,
                    inboxId: true, sentAt: true, repliedAt: true,
                    errorMessage: true, retryCount: true, followUpStatus: true,
                    abVariant: true, engagementScore: true,
                    deliveredAt: true, readAt: true,
                },
            }),
            database_1.default.campaignContact.count({ where }),
        ]);
        res.json({ data: contacts, total, page: parseInt(page), limit: parseInt(limit) });
    }
    catch (error) {
        logger_1.default.error('Error listing campaign contacts:', error);
        res.status(500).json({ error: 'Erro ao listar contatos' });
    }
});
/** GET /api/campaigns/:id/report/export — Exportar relatório CSV */
router.get('/campaigns/:id/report/export', async (req, res) => {
    const authReq = req;
    const accountId = authReq.user.account_id;
    const campaignId = parseInt(req.params.id);
    try {
        const campaign = await database_1.default.campaign.findFirst({ where: { id: campaignId, accountId } });
        if (!campaign)
            return res.status(404).json({ error: 'Campanha não encontrada' });
        const contacts = await database_1.default.campaignContact.findMany({
            where: { campaignId },
            orderBy: { id: 'asc' },
        });
        const header = 'Telefone,Nome,Status,Inbox,Enviado em,Entregue em,Lido em,Respondeu em,Erro,Follow-up,Variante A/B\n';
        const rows = contacts.map((c) => [
            c.phone, c.name || '', c.status,
            c.inboxId || '', c.sentAt?.toISOString() || '',
            c.deliveredAt?.toISOString() || '',
            c.readAt?.toISOString() || '',
            c.repliedAt?.toISOString() || '', (c.errorMessage || '').replace(/,/g, ';'),
            c.followUpStatus, c.abVariant || '',
        ].join(',')).join('\n');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="campanha-${campaignId}-relatorio.csv"`);
        res.send('\uFEFF' + header + rows);
    }
    catch (error) {
        logger_1.default.error('Error exporting campaign report:', error);
        res.status(500).json({ error: 'Erro ao exportar relatório' });
    }
});
/** GET /api/campaigns/:id/clicks — Lista cliques em links */
router.get('/campaigns/:id/clicks', async (req, res) => {
    const authReq = req;
    const accountId = authReq.user.account_id;
    const campaignId = parseInt(req.params.id);
    try {
        const campaign = await database_1.default.campaign.findFirst({ where: { id: campaignId, accountId } });
        if (!campaign)
            return res.status(404).json({ error: 'Campanha não encontrada' });
        const clicks = await database_1.default.campaignLinkClick.findMany({
            where: { campaignId },
            include: { contact: { select: { phone: true, name: true } } },
            orderBy: { clickedAt: 'desc' },
        });
        res.json({ data: clicks });
    }
    catch (error) {
        logger_1.default.error('Error listing clicks:', error);
        res.status(500).json({ error: 'Erro ao listar cliques' });
    }
});
// ═══════════════════════════════════════════════════════
// PRÉ-CAMPANHA
// ═══════════════════════════════════════════════════════
/** POST /api/campaigns/preview-contacts — Preview de contatos antes de criar */
router.post('/campaigns/preview-contacts', async (req, res) => {
    const authReq = req;
    const accountId = authReq.user.account_id;
    const { sourceType, sourceConfig } = req.body;
    if (!sourceType)
        return res.status(400).json({ error: 'sourceType é obrigatório' });
    try {
        if (sourceType === 'kanban_stage') {
            const stageIds = sourceConfig?.stageIds || [];
            const count = await database_1.default.card.count({
                where: { stageId: { in: stageIds }, accountId },
            });
            return res.json({ count, preview: [] });
        }
        res.json({ count: 0, preview: [], message: 'Preview disponível somente para Kanban Stage nesta versão' });
    }
    catch (error) {
        logger_1.default.error('Error previewing contacts:', error);
        res.status(500).json({ error: 'Erro ao fazer preview' });
    }
});
/** POST /api/campaigns/upload-csv — Upload e parse de CSV */
router.post('/campaigns/upload-csv', uploadCsv.single('file'), async (req, res) => {
    if (!req.file)
        return res.status(400).json({ error: 'Arquivo não enviado' });
    try {
        const content = fs_1.default.readFileSync(req.file.path, 'utf-8');
        fs_1.default.unlinkSync(req.file.path);
        const { headers, rows } = parseCsv(content);
        // Identifica coluna de telefone — pelo nome primeiro, depois por conteúdo
        let phoneCol = headers.find((h) => ['telefone', 'phone', 'tel', 'celular', 'numero', 'número'].includes(h));
        // Fallback: detecta pelo conteúdo — coluna cuja maioria dos valores parece número de telefone
        if (!phoneCol) {
            const looksLikePhone = (v) => /^\+?[\d\s\-().]{7,}$/.test(v) && v.replace(/\D/g, '').length >= 7;
            phoneCol = headers.find((h) => rows.length > 0 && rows.filter((r) => looksLikePhone(r[h] || '')).length >= Math.ceil(rows.length * 0.5));
        }
        if (!phoneCol) {
            return res.status(400).json({ error: 'Coluna de telefone não encontrada. Use o cabeçalho "telefone" ou "phone".' });
        }
        // Coluna de nome: a que não é telefone e tem valores alfanuméricos (não só dígitos)
        const nameColByHeader = headers.find((h) => ['nome', 'name', 'contato', 'cliente'].includes(h) && h !== phoneCol);
        const nameColByContent = !nameColByHeader
            ? headers.find((h) => h !== phoneCol && rows.some((r) => /[a-zA-ZÀ-ú]/.test(r[h] || '')))
            : undefined;
        const nameCol = nameColByHeader || nameColByContent;
        // Normaliza e deduplica
        const seen = new Set();
        const contacts = rows
            .map((row) => {
            const phone = normalizePhone(row[phoneCol] || '');
            const name = nameCol ? (row[nameCol] || null) : null;
            const extraData = {};
            for (const h of headers) {
                if (h !== phoneCol && h !== nameCol) {
                    extraData[h] = row[h] || '';
                }
            }
            return { phone, name, extraData };
        })
            .filter((c) => {
            if (!c.phone || c.phone.length < 8)
                return false;
            if (seen.has(c.phone))
                return false;
            seen.add(c.phone);
            return true;
        });
        // Preview das primeiras 5 linhas
        const preview = contacts.slice(0, 5);
        res.json({
            total: contacts.length,
            headers,
            preview,
            contacts, // todos os contatos parseados — frontend salva para enviar ao criar campanha
        });
    }
    catch (error) {
        logger_1.default.error('Error parsing CSV:', error);
        res.status(500).json({ error: 'Erro ao processar CSV' });
    }
});
/** POST /api/campaigns/:id/import-contacts — Importa contatos CSV para campanha existente */
router.post('/campaigns/:id/import-contacts', async (req, res) => {
    const authReq = req;
    const accountId = authReq.user.account_id;
    const campaignId = parseInt(req.params.id);
    const { contacts } = req.body;
    if (!Array.isArray(contacts) || contacts.length === 0) {
        return res.status(400).json({ error: 'contacts é obrigatório e deve ser um array' });
    }
    try {
        const campaign = await database_1.default.campaign.findFirst({ where: { id: campaignId, accountId } });
        if (!campaign)
            return res.status(404).json({ error: 'Campanha não encontrada' });
        if (!['draft', 'scheduled'].includes(campaign.status)) {
            return res.status(400).json({ error: 'Somente campanhas em rascunho aceitam importação' });
        }
        // Filtra blacklist
        const phones = contacts.map((c) => normalizePhone(c.phone || ''));
        const blacklisted = await database_1.default.campaignBlacklist.findMany({
            where: { accountId, phone: { in: phones } },
            select: { phone: true },
        });
        const blacklistSet = new Set(blacklisted.map((b) => b.phone));
        const toInsert = contacts
            .map((c) => ({
            campaignId,
            phone: normalizePhone(c.phone || ''),
            name: c.name || null,
            extraData: c.extraData || null,
        }))
            .filter((c) => c.phone.length >= 8 && !blacklistSet.has(c.phone));
        await database_1.default.campaignContact.createMany({ data: toInsert, skipDuplicates: true });
        const total = await database_1.default.campaignContact.count({ where: { campaignId } });
        await database_1.default.campaign.update({ where: { id: campaignId }, data: { totalContacts: total } });
        res.json({ imported: toInsert.length, skipped: contacts.length - toInsert.length, total });
    }
    catch (error) {
        logger_1.default.error('Error importing contacts:', error);
        res.status(500).json({ error: 'Erro ao importar contatos' });
    }
});
exports.default = router;
//# sourceMappingURL=campaigns.js.map