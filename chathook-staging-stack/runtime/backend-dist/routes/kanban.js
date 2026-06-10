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
exports.invalidateCardsIndexCache = invalidateCardsIndexCache;
exports.invalidateFunnelBoardCache = invalidateFunnelBoardCache;
exports.updateCardsIndexCacheEntry = updateCardsIndexCacheEntry;
const express_1 = require("express");
const chatwoot_1 = __importDefault(require("../services/chatwoot"));
const chatwootDatabase_1 = __importDefault(require("../services/chatwootDatabase"));
const database_1 = __importDefault(require("../services/database"));
const logger_1 = __importDefault(require("../utils/logger"));
const webhookDispatcher_1 = require("../services/webhookDispatcher");
const router = (0, express_1.Router)();
/**
 * Dispara a sequência configurada em uma etapa, se houver.
 * Best-effort: erros não bloqueiam o fluxo principal.
 */
async function triggerStageSequence(stageId, automations, accountId, conversationId, jwt, apiToken) {
    const sequenceId = automations?.sequenceId;
    if (!sequenceId)
        return;
    try {
        // Busca contactId da conversa
        const conv = await chatwoot_1.default.getConversation(accountId, conversationId, jwt, apiToken);
        const contactId = conv?.meta?.sender?.id || conv?.contact_id;
        if (!contactId) {
            logger_1.default.warn('triggerStageSequence: contactId não encontrado na conversa', { conversationId, stageId });
            return;
        }
        const sequenceExecutor = (await Promise.resolve().then(() => __importStar(require('../services/sequenceExecutor')))).default;
        const executionId = await sequenceExecutor.startSequence(sequenceId, contactId, accountId, conversationId, {}, jwt, apiToken);
        logger_1.default.info('Stage sequence triggered', { stageId, sequenceId, conversationId, contactId, executionId });
    }
    catch (err) {
        // Contato já na sequência ou outro erro — não bloqueia o move
        logger_1.default.warn('triggerStageSequence: falha ao iniciar sequência (non-blocking)', {
            stageId, sequenceId, conversationId, error: err?.message,
        });
    }
}
/**
 * Resolve credenciais para chamadas ao Chatwoot.
 * Prefere o admin token da conta para garantir que agentes comuns consigam
 * atualizar status de conversas (o JWT de agente pode ser rejeitado pelo Chatwoot).
 */
async function resolveCredentials(accountId, userJwt, userApiToken) {
    try {
        const adminToken = await chatwootDatabase_1.default.getAdminApiTokenForAccount(accountId);
        if (adminToken)
            return { jwt: undefined, apiToken: adminToken };
    }
    catch {
        // Fallback para credenciais do próprio usuário
    }
    return { jwt: userJwt, apiToken: userApiToken };
}
// Helper: busca estado atual do card + dados da conversa para payload rico de webhook
async function buildCardWebhookData(accountId, conversationId, jwt, apiToken) {
    // Estado atual do card (antes da ação)
    const currentCard = await database_1.default.card.findUnique({
        where: { conversationId_accountId: { conversationId, accountId } },
        include: { stage: { include: { funnel: true } } },
    }).catch(() => null);
    // Dados da conversa/contato via Chatwoot
    let contact = {};
    let conversation = { id: conversationId };
    try {
        const conv = await chatwoot_1.default.getConversation(accountId, conversationId, jwt, apiToken);
        if (conv) {
            conversation = {
                id: conversationId,
                status: conv.status,
                inboxId: conv.inbox_id,
                assigneeId: conv.meta?.assignee?.id ?? null,
                assigneeName: conv.meta?.assignee?.name ?? null,
            };
            if (conv.meta?.sender) {
                contact = {
                    id: conv.meta.sender.id,
                    name: conv.meta.sender.name,
                    phone: conv.meta.sender.phone_number ?? null,
                    email: conv.meta.sender.email ?? null,
                };
            }
        }
    }
    catch { /* Não impede o webhook se Chatwoot falhar */ }
    // Stage de origem (antes da ação)
    let fromColumn = null;
    if (currentCard?.stage) {
        fromColumn = {
            type: 'stage',
            stageId: currentCard.stage.id,
            stageName: currentCard.stage.name,
            funnelId: currentCard.stage.funnel.id,
            funnelName: currentCard.stage.funnel.name,
        };
    }
    const cardData = currentCard ? {
        id: currentCard.id,
        customName: currentCard.customName ?? null,
        leadStatus: currentCard.leadStatus ?? null,
        order: currentCard.order,
    } : null;
    return { contact, conversation, fromColumn, cardData };
}
// Middleware: Verifica se o Kanban está habilitado para a account
async function checkKanbanEnabled(req, res, next) {
    const authReq = req;
    try {
        // Garante que o funil de sistema existe (desativado) na primeira vez
        await ensureSystemFunnelExists(authReq.user.account_id);
        const permissions = await database_1.default.accountPermissions.findUnique({
            where: { accountId: authReq.user.account_id }
        });
        // Se não encontrar permissões, assume habilitado (padrão)
        const kanbanEnabled = permissions?.kanbanEnabled ?? true;
        if (!kanbanEnabled) {
            logger_1.default.warn('Kanban access denied - disabled for account', {
                accountId: authReq.user.account_id,
                userId: authReq.user.id
            });
            return res.status(403).json({
                error: 'Acesso ao Kanban desabilitado para esta empresa. Entre em contato com o administrador.'
            });
        }
        next();
    }
    catch (error) {
        logger_1.default.error('Error checking Kanban permissions', {
            accountId: authReq.user.account_id,
            userId: authReq.user.id,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Em caso de erro, permite acesso (fail-open)
        next();
    }
}
// Aplica o middleware em todas as rotas
router.use(checkKanbanEnabled);
// Cria o funil de sistema (Status Tickets) se não existir - sempre desativado
async function ensureSystemFunnelExists(accountId) {
    let systemFunnel = await database_1.default.funnel.findFirst({
        where: { accountId, isSystem: true },
    });
    // Renomeia funis legados "Status Chatwoot" para "Status Tickets"
    if (systemFunnel && systemFunnel.name === 'Status Chatwoot') {
        await database_1.default.funnel.update({
            where: { id: systemFunnel.id },
            data: { name: 'Status Tickets' }
        });
    }
    if (!systemFunnel) {
        systemFunnel = await database_1.default.funnel.create({
            data: {
                name: 'Status Tickets',
                accountId,
                color: '#6366F1',
                order: -1,
                isPublic: true,
                isSystem: true,
                isActive: false, // Sempre criado desativado
                stages: {
                    create: [
                        { name: 'Aberto', color: '#3B82F6', order: 0, chatwootStatus: 'open' },
                        { name: 'Pendente', color: '#F59E0B', order: 1, chatwootStatus: 'pending' },
                        { name: 'Resolvido', color: '#10B981', order: 2, chatwootStatus: 'resolved' }
                    ]
                }
            }
        });
        logger_1.default.info('System funnel created (inactive)', { accountId, funnelId: systemFunnel.id });
    }
    return systemFunnel;
}
// Cache em memória para cards-index (TTL 60s por account)
const cardsIndexCache = new Map();
function invalidateCardsIndexCache(accountId) {
    cardsIndexCache.delete(accountId);
}
// Cache em memória para o board completo de funil (TTL 60s)
// Chave: "accountId:funnelId:inboxId|all" — compartilhado entre todos os usuários da conta
const funnelBoardCache = new Map();
const FUNNEL_BOARD_CACHE_TTL_MS = 5 * 60_000; // 5 minutos — webhook invalida quando há mudança real
function invalidateFunnelBoardCache(accountId, funnelId) {
    const prefix = funnelId !== undefined ? `${accountId}:${funnelId}:` : `${accountId}:`;
    for (const key of funnelBoardCache.keys()) {
        if (key.startsWith(prefix))
            funnelBoardCache.delete(key);
    }
}
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of funnelBoardCache) {
        if (now > entry.expiresAt)
            funnelBoardCache.delete(key);
    }
}, 5 * 60_000).unref();
function updateCardsIndexCacheEntry(accountId, conversationId, data) {
    const cached = cardsIndexCache.get(accountId);
    if (!cached)
        return; // sem cache — próxima leitura carrega tudo do DB
    if (data === null) {
        delete cached.data[String(conversationId)];
    }
    else {
        cached.data[String(conversationId)] = data;
    }
}
// GET /api/kanban/cards-index - Mapa de conversationId → {funnel, stage} para injeção no listing
router.get('/cards-index', async (req, res) => {
    const authReq = req;
    const accountId = authReq.user?.account_id;
    if (!accountId)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        const cached = cardsIndexCache.get(accountId);
        if (cached && Date.now() < cached.expiresAt) {
            return res.json({ data: cached.data });
        }
        const cards = await database_1.default.card.findMany({
            where: {
                accountId,
                conversationId: { not: null },
                stage: { funnel: { isSystem: false } },
            },
            select: {
                conversationId: true,
                stage: {
                    select: {
                        name: true,
                        color: true,
                        funnel: { select: { name: true, color: true } },
                    },
                },
            },
        });
        const data = {};
        for (const card of cards) {
            if (card.conversationId) {
                data[String(card.conversationId)] = {
                    funnelName: card.stage.funnel.name,
                    funnelColor: card.stage.funnel.color,
                    stageName: card.stage.name,
                    stageColor: card.stage.color,
                };
            }
        }
        cardsIndexCache.set(accountId, { data, expiresAt: Date.now() + 60000 });
        return res.json({ data });
    }
    catch (err) {
        logger_1.default.error('cards-index error', { accountId, error: err.message });
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/kanban/stats - Retorna estatísticas do Kanban
router.get('/stats', async (req, res) => {
    const authReq = req;
    try {
        const jwtStats = authReq.jwt['access-token'] ? authReq.jwt : undefined;
        const tokenStats = authReq.jwt['access-token'] ? undefined : authReq.apiToken;
        const accountId = authReq.user.account_id;
        // ── Fase 1: busca em paralelo — contagens reais do Chatwoot (page=1 apenas para meta)
        //   e todos os dados de funil/lead/valor direto do banco (sem limite de paginação)
        const [openCount, pendingCount, resolvedCount, leadGroups, allCardItems, funnelsWithStages, 
        // Para byInbox ainda precisamos das conversas (limitado, mas aceitável para este breakdown)
        openConvsSample, inboxList] = await Promise.all([
            // Totais reais do Chatwoot — apenas 1 request por status (usa meta.all_count)
            chatwoot_1.default.getConversationCount(accountId, 'open', jwtStats, tokenStats),
            chatwoot_1.default.getConversationCount(accountId, 'pending', jwtStats, tokenStats),
            chatwoot_1.default.getConversationCount(accountId, 'resolved', jwtStats, tokenStats),
            // Lead status direto do banco — conta apenas cards que existem no funil, sem inflar com conversas sem card
            database_1.default.card.groupBy({
                by: ['leadStatus'],
                where: { accountId },
                _count: { _all: true }
            }),
            // Todos os itens de cards para cálculo correto de valor (value * quantity)
            database_1.default.cardItem.findMany({
                where: { accountId },
                select: { value: true, quantity: true, conversationId: true }
            }),
            // Funis customizados com etapas e cards (inclui value + quantity)
            database_1.default.funnel.findMany({
                where: { accountId, isActive: true, isSystem: false },
                include: {
                    stages: {
                        orderBy: { order: 'asc' },
                        include: {
                            cards: {
                                include: { items: { select: { value: true, quantity: true } } }
                            }
                        }
                    }
                }
            }),
            // Amostra de conversas abertas para byInbox (aceita ser parcial — é breakdown auxiliar)
            chatwoot_1.default.getConversations(accountId, jwtStats, tokenStats, { status: 'open', fetchAll: true, maxPages: 5 })
                .catch(() => []),
            chatwoot_1.default.getInboxes(accountId, jwtStats, tokenStats).catch(() => [])
        ]);
        // ── Totais reais do Chatwoot
        const byStatus = { open: openCount, pending: pendingCount, resolved: resolvedCount };
        const totalConversations = openCount + pendingCount + resolvedCount;
        // ── byLeadStatus direto do banco (sem inflar com conversas sem card)
        const byLeadStatus = { won: 0, lost: 0, open: 0 };
        for (const g of leadGroups) {
            const ls = g.leadStatus || 'open';
            if (ls === 'won')
                byLeadStatus.won = g._count._all;
            else if (ls === 'lost')
                byLeadStatus.lost = g._count._all;
            else
                byLeadStatus.open += g._count._all;
        }
        // ── Valor total correto: value * quantity em todos os itens de cards
        const totalValue = allCardItems.reduce((sum, i) => sum + i.value * i.quantity, 0);
        // Mapa conversationId → valor total para uso posterior (byInbox)
        const convValueMap = new Map();
        for (const i of allCardItems) {
            if (i.conversationId) {
                convValueMap.set(i.conversationId, (convValueMap.get(i.conversationId) || 0) + i.value * i.quantity);
            }
        }
        // ── Ticket médio: valor total ÷ número de cards que TÊM itens (não pela base de conversas)
        const cardsWithValueCount = new Set(allCardItems.filter(i => i.value > 0).map(i => i.conversationId).filter(Boolean)).size;
        const averageValue = cardsWithValueCount > 0 ? totalValue / cardsWithValueCount : 0;
        // ── Taxa de conversão (won ÷ (won + lost)) — sobre leads fechados no funil
        const totalClosedLeads = byLeadStatus.won + byLeadStatus.lost;
        const conversionRate = totalClosedLeads > 0 ? (byLeadStatus.won / totalClosedLeads) * 100 : 0;
        // ── byInbox — baseado na amostra de conversas abertas (breakdown auxiliar)
        const inboxCounts = new Map();
        for (const conv of openConvsSample) {
            const inboxId = conv.inbox_id;
            if (!inboxId)
                continue;
            if (!inboxCounts.has(inboxId))
                inboxCounts.set(inboxId, { count: 0, value: 0 });
            const entry = inboxCounts.get(inboxId);
            entry.count++;
            entry.value += convValueMap.get(conv.id) || 0;
        }
        const inboxNameMap = new Map(inboxList.map((i) => [i.id, { name: i.name, channelType: i.channel_type }]));
        const byInbox = Array.from(inboxCounts.entries())
            .map(([inboxId, data]) => ({
            inboxId,
            name: inboxNameMap.get(inboxId)?.name || `Caixa ${inboxId}`,
            channelType: inboxNameMap.get(inboxId)?.channelType || 'unknown',
            count: data.count,
            totalValue: data.value,
        }))
            .sort((a, b) => b.count - a.count);
        // ── funnelBreakdown com value * quantity correto
        const funnelBreakdown = funnelsWithStages.map(funnel => {
            let funnelTotalCards = 0;
            let funnelTotalValue = 0;
            let funnelWon = 0;
            let funnelLost = 0;
            const stageStats = funnel.stages.map(stage => {
                // Bug corrigido: value * quantity (antes era apenas value)
                const stageValue = stage.cards.reduce((sum, c) => sum + c.items.reduce((s2, i) => s2 + i.value * i.quantity, 0), 0);
                const byLS = { open: 0, won: 0, lost: 0 };
                for (const card of stage.cards) {
                    if (card.leadStatus === 'won') {
                        byLS.won++;
                        funnelWon++;
                    }
                    else if (card.leadStatus === 'lost') {
                        byLS.lost++;
                        funnelLost++;
                    }
                    else
                        byLS.open++;
                }
                funnelTotalCards += stage.cards.length;
                funnelTotalValue += stageValue;
                return { stageId: stage.id, stageName: stage.name, order: stage.order, color: stage.color, totalCards: stage.cards.length, totalValue: stageValue, byLeadStatus: byLS };
            });
            // Taxa de drop-off por etapa: % do pipeline que chegou ATÉ esta etapa ou além
            const stagesWithConversion = stageStats.map((stage, idx) => {
                const cardsFromHere = stageStats.slice(idx).reduce((sum, s) => sum + s.totalCards, 0);
                const funnelConversionRate = funnelTotalCards > 0 ? (cardsFromHere / funnelTotalCards) * 100 : 0;
                return { ...stage, funnelConversionRate };
            });
            const closed = funnelWon + funnelLost;
            return {
                funnelId: funnel.id,
                funnelName: funnel.name,
                totalCards: funnelTotalCards,
                totalValue: funnelTotalValue,
                conversionRate: closed > 0 ? (funnelWon / closed) * 100 : 0,
                stages: stagesWithConversion,
            };
        });
        // Razões de ganho/perda e tempo médio de fechamento
        const closedCards = await database_1.default.card.findMany({
            where: {
                accountId: authReq.user.account_id,
                closedAt: { not: null },
                leadStatus: { in: ['won', 'lost'] }
            },
            select: { createdAt: true, closedAt: true, leadStatus: true, closeReason: true }
        });
        const wonReasonMap = new Map();
        const lostReasonMap = new Map();
        let totalCloseDays = 0;
        for (const c of closedCards) {
            if (c.closedAt) {
                totalCloseDays += (c.closedAt.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24);
            }
            if (c.closeReason) {
                const map = c.leadStatus === 'won' ? wonReasonMap : lostReasonMap;
                map.set(c.closeReason, (map.get(c.closeReason) || 0) + 1);
            }
        }
        const averageCloseTimeDays = closedCards.length > 0
            ? Math.round(totalCloseDays / closedCards.length * 10) / 10
            : null;
        const wonReasons = Array.from(wonReasonMap.entries())
            .map(([reason, count]) => ({ reason, count }))
            .sort((a, b) => b.count - a.count);
        const lostReasons = Array.from(lostReasonMap.entries())
            .map(([reason, count]) => ({ reason, count }))
            .sort((a, b) => b.count - a.count);
        res.json({
            totalConversations,
            byStatus,
            byLeadStatus,
            totalValue,
            averageValue,
            conversionRate,
            averageCloseTimeDays,
            wonReasons,
            lostReasons,
            byInbox,
            funnelBreakdown,
        });
    }
    catch (error) {
        logger_1.default.error('Error fetching kanban stats', {
            error,
            accountId: authReq.user.account_id
        });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch kanban statistics'
        });
    }
});
// GET /api/kanban - Retorna o board do funil de sistema (Status Chatwoot)
router.get('/', async (req, res) => {
    const authReq = req;
    try {
        const accountId = authReq.user.account_id;
        const inboxIdRaw = req.query.inboxId ? parseInt(req.query.inboxId, 10) : NaN;
        const inboxId = !isNaN(inboxIdRaw) && inboxIdRaw > 0 ? inboxIdRaw : undefined;
        // Busca o funil de sistema (não cria mais automaticamente)
        let systemFunnel = await database_1.default.funnel.findFirst({
            where: { accountId, isSystem: true, isActive: true },
            include: {
                stages: { orderBy: { order: 'asc' } },
                allowedUsers: true
            }
        });
        // Se não existe funil de sistema ativo, busca o primeiro funil ativo disponível
        if (!systemFunnel) {
            systemFunnel = await database_1.default.funnel.findFirst({
                where: { accountId, isActive: true },
                include: {
                    stages: { orderBy: { order: 'asc' } },
                    allowedUsers: true
                },
                orderBy: { order: 'asc' }
            });
            // Se não existe NENHUM funil ativo, retorna erro informativo
            if (!systemFunnel) {
                logger_1.default.warn('No active funnel found', { accountId, userId: authReq.user.id });
                return res.status(404).json({
                    error: 'Nenhum funil ativo',
                    message: 'Ative um funil em Gerenciar Funis para usar esta visualização'
                });
            }
        }
        // Agentes só enxergam conversas atribuídas a eles via API do Chatwoot.
        // Para o Kanban mostrar todas as conversas do funil, usa token de admin da conta.
        // role pode ser string ('agent'/'administrator') ou inteiro (0/1) dependendo do path de auth
        const isAdminUser = authReq.user.role === 'administrator' || authReq.user.role === 1 || authReq.user.type === 'SuperAdmin';
        const jwtCred = authReq.jwt['access-token'] ? authReq.jwt : undefined;
        const apiTokenCred = authReq.jwt['access-token'] ? undefined : authReq.apiToken;
        let convJwt = jwtCred;
        let convApiToken = apiTokenCred;
        if (!isAdminUser) {
            const adminToken = await chatwootDatabase_1.default.getAdminApiTokenForAccount(accountId);
            if (adminToken) {
                convJwt = undefined;
                convApiToken = adminToken;
                logger_1.default.info('Using admin token for conversations fetch (agent view)', { accountId, userId: authReq.user.id, userRole: authReq.user.role });
            }
        }
        // Busca apenas a primeira página de cada status em paralelo (25 conversas por status)
        // Load-more faz as buscas seguintes sob demanda — evita carregar 700 cards de uma vez
        const [openPage, pendingPage, resolvedPage, snoozedPage, inboxes_status] = await Promise.all([
            chatwoot_1.default.getConversationsPage(accountId, convJwt, convApiToken, { status: 'open', page: 1 }).catch((err) => { logger_1.default.warn('Failed to fetch open conversations', { accountId, error: err?.message }); return { conversations: [], totalCount: 0 }; }),
            chatwoot_1.default.getConversationsPage(accountId, convJwt, convApiToken, { status: 'pending', page: 1 }).catch((err) => { logger_1.default.warn('Failed to fetch pending conversations', { accountId, error: err?.message }); return { conversations: [], totalCount: 0 }; }),
            chatwoot_1.default.getConversationsPage(accountId, convJwt, convApiToken, { status: 'resolved', page: 1 }).catch((err) => { logger_1.default.warn('Failed to fetch resolved conversations', { accountId, error: err?.message }); return { conversations: [], totalCount: 0 }; }),
            chatwoot_1.default.getConversationsPage(accountId, convJwt, convApiToken, { status: 'snoozed', page: 1 }).catch(() => ({ conversations: [], totalCount: 0 })),
            chatwoot_1.default.getInboxes(accountId, jwtCred, apiTokenCred).catch(() => [])
        ]);
        const statusTotals = {
            open: openPage.totalCount,
            pending: pendingPage.totalCount,
            resolved: resolvedPage.totalCount,
        };
        let conversations = [...openPage.conversations, ...pendingPage.conversations, ...resolvedPage.conversations, ...snoozedPage.conversations];
        const inboxMap_status = new Map(inboxes_status.map((i) => [i.id, i]));
        // Filtra por inbox se especificado
        if (inboxId) {
            conversations = conversations.filter((conv) => conv.inbox_id === inboxId);
            logger_1.default.info('Conversations filtered by inbox', { accountId, inboxId, count: conversations.length });
        }
        // Busca cards que estão em colunas extras (sem chatwootStatus)
        const localCards = await database_1.default.card.findMany({
            where: {
                accountId,
                stage: {
                    funnelId: systemFunnel.id,
                    chatwootStatus: null // Apenas colunas extras
                }
            },
            include: { stage: true }
        });
        // Busca TODOS os customNames (independente de stage)
        const allCards = await database_1.default.card.findMany({
            where: { accountId },
            select: { conversationId: true, customName: true, stageId: true, leadStatus: true }
        });
        // Busca TODOS os projetos vinculados às conversas
        const projectConversations = await database_1.default.projectConversation.findMany({
            where: {
                project: { accountId }
            },
            include: {
                project: true
            }
        });
        // Busca TODOS os items das conversas
        const conversationIds = conversations.map(c => c.id);
        const cardItems = await database_1.default.cardItem.findMany({
            where: {
                accountId,
                conversationId: { in: conversationIds }
            },
            orderBy: { order: 'asc' }
        });
        // Cria um mapa de conversationId -> stageId para colunas extras
        const localCardMap = new Map();
        const customNameMap = new Map();
        const leadStatusMap = new Map();
        const projectsMap = new Map();
        const itemsMap = new Map();
        const totalValueMap = new Map();
        for (const card of localCards) {
            if (card.conversationId !== null)
                localCardMap.set(card.conversationId, card.stageId);
        }
        // Preenche customNameMap com TODOS os cards (exceto avulsos)
        for (const card of allCards) {
            if (card.conversationId !== null) {
                customNameMap.set(card.conversationId, card.customName);
                leadStatusMap.set(card.conversationId, card.leadStatus || 'open');
            }
        }
        // Preenche projectsMap com os projetos por conversationId
        for (const pc of projectConversations) {
            const existing = projectsMap.get(pc.conversationId) || [];
            existing.push(pc.project);
            projectsMap.set(pc.conversationId, existing);
        }
        // Preenche itemsMap e totalValueMap
        for (const item of cardItems) {
            const existing = itemsMap.get(item.conversationId) || [];
            existing.push(item);
            itemsMap.set(item.conversationId, existing);
            const currentTotal = totalValueMap.get(item.conversationId) || 0;
            totalValueMap.set(item.conversationId, currentTotal + (item.value * item.quantity));
        }
        // Agrupa conversas por status do Chatwoot OU por coluna extra
        const cardsByStatus = {
            open: [],
            pending: [],
            resolved: []
        };
        const cardsByStage = {};
        // Inicializa cardsByStage para colunas extras
        for (const stage of systemFunnel.stages) {
            if (!stage.chatwootStatus) {
                cardsByStage[stage.id] = [];
            }
        }
        const chatwootBaseUrl = process.env.CHATWOOT_API_URL
            || (process.env.CHATWOOT_DOMAIN ? (process.env.CHATWOOT_DOMAIN.startsWith('http') ? process.env.CHATWOOT_DOMAIN : `https://${process.env.CHATWOOT_DOMAIN}`) : '');
        for (const conv of conversations) {
            const card = {
                id: conv.id,
                status: conv.status,
                priority: conv.priority,
                unread_count: conv.unread_count,
                created_at: new Date(Number(conv.created_at) * 1000).toISOString(),
                updated_at: new Date(Number(conv.updated_at) * 1000).toISOString(),
                contact: conv.meta?.sender || null,
                meta: {
                    assignee: conv.meta?.assignee || null
                },
                inbox: inboxMap_status.get(conv.inbox_id) || null,
                labels: conv.labels || [],
                customName: customNameMap.get(conv.id) || null,
                leadStatus: leadStatusMap.get(conv.id),
                projects: projectsMap.get(conv.id) || [],
                items: itemsMap.get(conv.id) || [],
                totalValue: totalValueMap.get(conv.id) || 0,
                chatwootUrl: chatwootBaseUrl ? `${chatwootBaseUrl}/app/accounts/${accountId}/conversations/${conv.id}` : null,
            };
            // Verifica se está em uma coluna extra
            const localStageId = localCardMap.get(conv.id);
            if (localStageId && cardsByStage[localStageId]) {
                // Card está em coluna extra
                cardsByStage[localStageId].push(card);
            }
            else if (cardsByStatus[conv.status]) {
                // Card está na coluna de status padrão
                cardsByStatus[conv.status].push(card);
            }
        }
        // Fire-and-forget: preserva nome do contato no customName para sobreviver à deleção do ticket
        {
            const nameSaves = [];
            for (const conv of conversations) {
                const contactName = conv.meta?.sender?.name;
                // Só salva se o card existe localmente e ainda não tem customName
                if (contactName && customNameMap.has(conv.id) && !customNameMap.get(conv.id)) {
                    nameSaves.push(database_1.default.card.updateMany({
                        where: { conversationId: conv.id, accountId, customName: null },
                        data: { customName: contactName }
                    }));
                }
            }
            if (nameSaves.length > 0) {
                Promise.all(nameSaves).catch(err => logger_1.default.warn('Failed to preserve contact names in cards', { error: err }));
            }
        }
        // Adiciona cards de colunas extras cujas conversas foram deletadas no Chatwoot
        // O card continua existindo de forma autônoma — sem dados do ticket
        const existingConvIds = new Set(conversations.map((c) => c.id));
        for (const localCard of localCards) {
            if (localCard.conversationId === null)
                continue; // cards avulsos não precisam deste tratamento
            if (!existingConvIds.has(localCard.conversationId) && cardsByStage[localCard.stageId] !== undefined) {
                const convId = localCard.conversationId;
                cardsByStage[localCard.stageId].push({
                    id: convId,
                    status: 'deleted',
                    priority: null,
                    unread_count: 0,
                    created_at: localCard.createdAt.toISOString(),
                    updated_at: localCard.updatedAt.toISOString(),
                    contact: null,
                    meta: { assignee: null },
                    inbox: null,
                    labels: [],
                    customName: localCard.customName || null,
                    leadStatus: (localCard.leadStatus || 'open'),
                    projects: projectsMap.get(convId) || [],
                    items: itemsMap.get(convId) || [],
                    totalValue: totalValueMap.get(convId) || 0
                });
            }
        }
        // Função para ordenar cards
        const sortCards = (cards) => {
            return cards.sort((a, b) => {
                if (b.unread_count !== a.unread_count) {
                    return b.unread_count - a.unread_count;
                }
                return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            });
        };
        // Monta colunas baseadas nos stages do funil de sistema
        // Colunas de status do Chatwoot: retorna TODOS os cards (fetchAll já os trouxe todos)
        // Colunas extras (stages sem chatwootStatus): limita 20 iniciais, usa load-more via DB
        const INITIAL_CARDS_LIMIT = 20;
        const columns = systemFunnel.stages.map(stage => {
            if (stage.chatwootStatus) {
                // Coluna vinculada a status do Chatwoot — primeira página já carregada, load-more busca o restante
                const pageCards = sortCards(cardsByStatus[stage.chatwootStatus] || []);
                const totalCount = statusTotals[stage.chatwootStatus] ?? pageCards.length;
                return {
                    id: stage.chatwootStatus,
                    name: stage.name,
                    color: stage.color,
                    chatwootStatus: stage.chatwootStatus,
                    cards: pageCards,
                    totalCards: totalCount,
                    hasMore: totalCount > pageCards.length
                };
            }
            else {
                // Coluna extra (sem chatwootStatus) — paginação via DB no load-more
                const allCards = sortCards(cardsByStage[stage.id] || []);
                const totalCards = allCards.length;
                return {
                    id: String(stage.id),
                    name: stage.name,
                    color: stage.color,
                    chatwootStatus: stage.chatwootStatus,
                    cards: allCards.slice(0, INITIAL_CARDS_LIMIT),
                    totalCards,
                    hasMore: totalCards > INITIAL_CARDS_LIMIT
                };
            }
        });
        const board = { columns };
        logger_1.default.info('Kanban board loaded', {
            userId: authReq.user.id,
            open: cardsByStatus.open.length,
            pending: cardsByStatus.pending.length,
            resolved: cardsByStatus.resolved.length,
            localCards: localCards.length
        });
        res.json({ success: true, data: board });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger_1.default.error('Error loading kanban', { error: errorMessage });
        res.status(500).json({ error: 'Failed to load kanban board' });
    }
});
// GET /api/kanban/funnel/:funnelId - Retorna o board de um funil específico
router.get('/funnel/:funnelId', async (req, res) => {
    const authReq = req;
    const funnelId = parseInt(req.params.funnelId, 10);
    if (isNaN(funnelId) || funnelId <= 0) {
        return res.status(400).json({ error: 'Invalid funnel ID' });
    }
    try {
        const accountId = authReq.user.account_id;
        const inboxIdRaw = req.query.inboxId ? parseInt(req.query.inboxId, 10) : NaN;
        const inboxId = !isNaN(inboxIdRaw) && inboxIdRaw > 0 ? inboxIdRaw : undefined;
        // Verifica cache do board completo antes de qualquer query ou chamada API
        const funnelCacheKey = `${accountId}:${funnelId}:${inboxId ?? 'all'}`;
        const funnelCached = funnelBoardCache.get(funnelCacheKey);
        if (funnelCached && Date.now() < funnelCached.expiresAt) {
            logger_1.default.info('Funnel board served from cache', { accountId, funnelId, inboxId });
            return res.json({ success: true, data: funnelCached.data });
        }
        // Busca o funil com suas stages e cards
        const funnel = await database_1.default.funnel.findFirst({
            where: { id: funnelId, accountId },
            include: {
                stages: {
                    orderBy: { order: 'asc' },
                    include: {
                        cards: {
                            orderBy: { order: 'asc' }
                        }
                    }
                }
            }
        });
        if (!funnel) {
            return res.status(404).json({ error: 'Funnel not found' });
        }
        // Agentes só enxergam conversas atribuídas a eles via API do Chatwoot.
        // Para o Kanban mostrar todas as conversas do funil, usa token de admin da conta.
        // role pode ser string ('agent'/'administrator') ou inteiro (0/1) dependendo do path de auth
        const isAdminUserF = authReq.user.role === 'administrator' || authReq.user.role === 1 || authReq.user.type === 'SuperAdmin';
        const jwtCredF = authReq.jwt['access-token'] ? authReq.jwt : undefined;
        const apiTokenCredF = authReq.jwt['access-token'] ? undefined : authReq.apiToken;
        let convJwtF = jwtCredF;
        let convApiTokenF = apiTokenCredF;
        if (!isAdminUserF) {
            const adminTokenF = await chatwootDatabase_1.default.getAdminApiTokenForAccount(accountId);
            if (adminTokenF) {
                convJwtF = undefined;
                convApiTokenF = adminTokenF;
                logger_1.default.info('Using admin token for conversations fetch (agent funnel view)', { accountId, userId: authReq.user.id, userRole: authReq.user.role });
            }
        }
        // Busca apenas os conversationIds que pertencem a este funil (evita fetch de todas as conversas)
        const targetConversationIds = [...new Set(funnel.stages
                .flatMap(s => s.cards.map(c => c.conversationId))
                .filter((id) => id !== null))];
        const CONV_BATCH_SIZE = 10;
        const conversationsMap = new Map();
        // IDs confirmados como deletados (404) — distintos de erros transitórios
        const deletedConvIds = new Set();
        const fetchBatch = async (ids) => {
            return Promise.all(ids.map(async (id) => {
                try {
                    const conv = await chatwoot_1.default.getConversation(accountId, id, convJwtF, convApiTokenF);
                    if (conv === null) {
                        // 404 confirmado — conversa realmente deletada
                        deletedConvIds.add(id);
                    }
                    return conv;
                }
                catch {
                    // Erro transitório (timeout, 403, 5xx) — não marca como deletada
                    logger_1.default.warn('Transient error fetching conversation for funnel, skipping', { accountId, conversationId: id });
                    return 'skip';
                }
            }));
        };
        // Executa batches sequencialmente para não sobrecarregar a API do Chatwoot
        const fetchAllConvsSequential = async () => {
            const results = [];
            for (let i = 0; i < targetConversationIds.length; i += CONV_BATCH_SIZE) {
                const batch = await fetchBatch(targetConversationIds.slice(i, i + CONV_BATCH_SIZE));
                results.push(...batch);
            }
            return results;
        };
        const [inboxes_funnel, fetchedConvs] = await Promise.all([
            chatwoot_1.default.getInboxes(accountId, jwtCredF, apiTokenCredF).catch(() => []),
            fetchAllConvsSequential()
        ]);
        for (const conv of fetchedConvs) {
            if (conv && conv !== 'skip' && (!inboxId || conv.inbox_id === inboxId)) {
                conversationsMap.set(conv.id, conv);
            }
        }
        const inboxMap_funnel = new Map(inboxes_funnel.map((i) => [i.id, i]));
        if (inboxId) {
            logger_1.default.info('Conversations filtered by inbox (funnel mode)', { accountId, funnelId, inboxId, count: conversationsMap.size });
        }
        // Busca TODOS os projetos vinculados às conversas
        const projectConversations = await database_1.default.projectConversation.findMany({
            where: {
                project: { accountId }
            },
            include: {
                project: true
            }
        });
        // IDs dos cards avulsos (conversationId = null)
        const standaloneCardIds = funnel.stages
            .flatMap(s => s.cards.filter(c => c.conversationId === null).map(c => c.id));
        // Busca items: conversas normais por conversationId, avulsos por cardId
        const [cardItems, standaloneCardItems] = await Promise.all([
            targetConversationIds.length > 0
                ? database_1.default.cardItem.findMany({ where: { accountId, conversationId: { in: targetConversationIds } }, orderBy: { order: 'asc' } })
                : Promise.resolve([]),
            standaloneCardIds.length > 0
                ? database_1.default.cardItem.findMany({ where: { accountId, cardId: { in: standaloneCardIds } }, orderBy: { order: 'asc' } })
                : Promise.resolve([])
        ]);
        // Cria um mapa de conversationId -> Project[]
        const projectsMap = new Map();
        for (const pc of projectConversations) {
            const existing = projectsMap.get(pc.conversationId) || [];
            existing.push(pc.project);
            projectsMap.set(pc.conversationId, existing);
        }
        // Cria mapas para items e totalValue — por conversationId (normais) e por cardId (avulsos)
        const itemsMap = new Map();
        const totalValueMap = new Map();
        for (const item of cardItems) {
            const existing = itemsMap.get(item.conversationId) || [];
            existing.push(item);
            itemsMap.set(item.conversationId, existing);
            totalValueMap.set(item.conversationId, (totalValueMap.get(item.conversationId) || 0) + (item.value * item.quantity));
        }
        // Mapa separado para items de cards avulsos (keyed por cardId)
        const standaloneItemsMap = new Map();
        const standaloneTotalValueMap = new Map();
        for (const item of standaloneCardItems) {
            const existing = standaloneItemsMap.get(item.cardId) || [];
            existing.push(item);
            standaloneItemsMap.set(item.cardId, existing);
            standaloneTotalValueMap.set(item.cardId, (standaloneTotalValueMap.get(item.cardId) || 0) + (item.value * item.quantity));
        }
        // Monta as colunas baseadas nas stages do funil
        // Limita a 20 cards iniciais por coluna para performance
        const INITIAL_CARDS_LIMIT = 20;
        const columns = funnel.stages.map(stage => {
            const allCards = [];
            for (const card of stage.cards) {
                // Parse transferredFrom se existir
                let transferredFrom = null;
                if (card.transferredFrom) {
                    try {
                        transferredFrom = JSON.parse(card.transferredFrom);
                    }
                    catch {
                        // Ignora erro de parse
                    }
                }
                const chatwootBaseFunnelUrl = process.env.CHATWOOT_API_URL
                    || (process.env.CHATWOOT_DOMAIN ? (process.env.CHATWOOT_DOMAIN.startsWith('http') ? process.env.CHATWOOT_DOMAIN : `https://${process.env.CHATWOOT_DOMAIN}`) : '');
                // Card avulso (sem ticket do Chatwoot) — não pertence a nenhuma inbox, ignorar quando filtro de inbox ativo
                if (card.conversationId === null) {
                    if (inboxId)
                        continue; // filtro de inbox ativo: cards avulsos não têm inbox
                    allCards.push({
                        id: card.id, // usa o id do próprio card
                        status: 'standalone',
                        priority: null,
                        unread_count: 0,
                        created_at: card.createdAt.toISOString(),
                        updated_at: card.updatedAt.toISOString(),
                        contact: null,
                        meta: { assignee: null },
                        inbox: null,
                        labels: [],
                        customName: card.customName || 'Card avulso',
                        leadStatus: card.leadStatus,
                        cardOrder: card.order,
                        transferredFrom,
                        projects: [],
                        items: standaloneItemsMap.get(card.id) || [],
                        totalValue: standaloneTotalValueMap.get(card.id) || 0,
                        isStandalone: true,
                        cardId: card.id,
                    });
                    continue;
                }
                const conv = conversationsMap.get(card.conversationId);
                if (conv) {
                    // Conversa existe no Chatwoot — usa dados completos
                    allCards.push({
                        id: conv.id,
                        status: conv.status,
                        priority: conv.priority,
                        unread_count: conv.unread_count,
                        created_at: new Date(Number(conv.created_at) * 1000).toISOString(),
                        updated_at: new Date(Number(conv.updated_at) * 1000).toISOString(),
                        contact: conv.meta?.sender || null,
                        meta: {
                            assignee: conv.meta?.assignee || null
                        },
                        inbox: inboxMap_funnel.get(conv.inbox_id) || null,
                        labels: conv.labels || [],
                        customName: card.customName || null,
                        leadStatus: card.leadStatus,
                        cardOrder: card.order,
                        transferredFrom,
                        projects: projectsMap.get(conv.id) || [],
                        items: itemsMap.get(conv.id) || [],
                        totalValue: totalValueMap.get(conv.id) || 0,
                        chatwootUrl: chatwootBaseFunnelUrl ? `${chatwootBaseFunnelUrl}/app/accounts/${accountId}/conversations/${conv.id}` : null,
                    });
                }
                else if (deletedConvIds.has(card.conversationId)) {
                    // Conversa foi deletada no Chatwoot (404 confirmado) — card continua existindo de forma autônoma
                    allCards.push({
                        id: card.conversationId,
                        status: 'deleted',
                        priority: null,
                        unread_count: 0,
                        created_at: card.createdAt.toISOString(),
                        updated_at: card.updatedAt.toISOString(),
                        contact: null,
                        meta: { assignee: null },
                        inbox: null,
                        labels: [],
                        customName: card.customName || null,
                        leadStatus: card.leadStatus,
                        cardOrder: card.order,
                        transferredFrom,
                        projects: projectsMap.get(card.conversationId) || [],
                        items: itemsMap.get(card.conversationId) || [],
                        totalValue: totalValueMap.get(card.conversationId) || 0
                    });
                    // Se erro transitório (não está em deletedConvIds nem em conversationsMap): omite o card
                    // temporariamente — será exibido normalmente na próxima atualização
                }
            }
            // Ordena pela posição persistida no card.
            // A bridge grava esta posição conforme a Data/Hora do pedido na Magazord.
            allCards.sort((a, b) => {
                const ao = Number.isFinite(Number(a.cardOrder)) ? Number(a.cardOrder) : 0;
                const bo = Number.isFinite(Number(b.cardOrder)) ? Number(b.cardOrder) : 0;
                if (ao !== bo) return ao - bo;
                return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            });
            const totalCards = allCards.length;
            return {
                id: String(stage.id),
                name: stage.name,
                color: stage.color,
                cards: allCards.slice(0, INITIAL_CARDS_LIMIT),
                totalCards,
                hasMore: totalCards > INITIAL_CARDS_LIMIT
            };
        });
        // Fire-and-forget: preserva nome do contato no customName para sobreviver à deleção do ticket
        {
            const nameSaves = [];
            for (const stage of funnel.stages) {
                for (const card of stage.cards) {
                    if (card.customName)
                        continue; // já tem nome personalizado
                    if (card.conversationId === null)
                        continue; // card avulso — sem conversa
                    const conv = conversationsMap.get(card.conversationId);
                    const contactName = conv?.meta?.sender?.name;
                    if (contactName) {
                        nameSaves.push(database_1.default.card.updateMany({
                            where: { conversationId: card.conversationId, accountId, customName: null },
                            data: { customName: contactName }
                        }));
                    }
                }
            }
            if (nameSaves.length > 0) {
                Promise.all(nameSaves).catch(err => logger_1.default.warn('Failed to preserve contact names in funnel cards', { error: err }));
            }
        }
        const board = { columns };
        // Salva no cache antes de responder
        funnelBoardCache.set(funnelCacheKey, { data: board, expiresAt: Date.now() + FUNNEL_BOARD_CACHE_TTL_MS });
        logger_1.default.info('Funnel board loaded', {
            userId: authReq.user.id,
            funnelId,
            stages: columns.length,
            totalCards: columns.reduce((acc, col) => acc + col.cards.length, 0)
        });
        res.json({ success: true, data: board });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger_1.default.error('Error loading funnel board', { error: errorMessage, funnelId });
        res.status(500).json({ error: 'Failed to load funnel board' });
    }
});
// PATCH /api/kanban/:id/move - Move card entre colunas (status Chatwoot ou coluna extra)
router.patch('/:id/move', async (req, res) => {
    const authReq = req;
    const conversationId = parseInt(req.params.id, 10);
    const { targetColumn } = req.body;
    if (isNaN(conversationId) || conversationId <= 0) {
        return res.status(400).json({ error: 'Invalid conversation ID' });
    }
    if (!targetColumn) {
        return res.status(400).json({ error: 'Invalid target column' });
    }
    try {
        const accountId = authReq.user.account_id;
        // Usa admin token para garantir que agentes comuns consigam mover cards
        const creds = await resolveCredentials(accountId, authReq.jwt, authReq.apiToken);
        // Coleta dados ricos ANTES da ação (stage anterior + dados da conversa)
        const webhookBase = await buildCardWebhookData(accountId, conversationId, creds.jwt, creds.apiToken);
        // Verifica se targetColumn é um status direto ou um ID de stage
        if (['open', 'pending', 'resolved'].includes(targetColumn)) {
            // É um status direto - atualiza no Chatwoot
            const targetStatus = targetColumn;
            const success = await chatwoot_1.default.updateConversationStatus(accountId, conversationId, targetStatus, creds.jwt, creds.apiToken);
            if (!success) {
                return res.status(500).json({ error: 'Failed to update conversation status' });
            }
            // Remove card local se existir (está voltando para coluna de status)
            await database_1.default.card.deleteMany({
                where: { conversationId, accountId }
            });
            logger_1.default.info('Card moved to Chatwoot status', { conversationId, targetStatus, userId: authReq.user.id });
            (0, webhookDispatcher_1.dispatchWebhook)(accountId, 'card.moved', {
                ...webhookBase,
                movedBy: { id: authReq.user.id },
                movedAt: new Date().toISOString(),
                from: webhookBase.fromColumn ?? { type: 'status', status: webhookBase.conversation.status },
                to: { type: 'status', status: targetStatus },
            }).catch(() => { });
            return res.json({ success: true, conversationId, newStatus: targetStatus });
        }
        // É um ID de stage
        const stageId = parseInt(targetColumn);
        if (isNaN(stageId)) {
            return res.status(400).json({ error: 'Invalid target column' });
        }
        const stage = await database_1.default.stage.findFirst({
            where: { id: stageId, funnel: { accountId } },
            include: { funnel: true }
        });
        if (!stage) {
            return res.status(400).json({ error: 'Coluna não encontrada' });
        }
        // Verifica se a etapa tem automação de transferência (antes de qualquer ação)
        let finalStage = stage;
        let transferredFrom = null;
        if (stage.automations) {
            try {
                const automations = JSON.parse(stage.automations);
                if (automations.transferTo?.stageId) {
                    // Verifica se o stage de destino existe e pertence ao account
                    const targetStage = await database_1.default.stage.findFirst({
                        where: { id: automations.transferTo.stageId },
                        include: { funnel: true }
                    });
                    if (targetStage && targetStage.funnel.accountId === accountId) {
                        // Salva a origem da transferência
                        transferredFrom = {
                            funnelId: stage.funnel.id,
                            funnelName: stage.funnel.name,
                            stageId: stage.id,
                            stageName: stage.name,
                            transferredAt: new Date().toISOString()
                        };
                        finalStage = targetStage;
                        logger_1.default.info('Auto-transfer triggered', {
                            conversationId,
                            fromStage: stage.name,
                            fromFunnel: stage.funnel.name,
                            toStage: targetStage.name,
                            toFunnel: targetStage.funnel.name
                        });
                    }
                }
            }
            catch (parseErr) {
                logger_1.default.error('Failed to parse stage automations (move)', {
                    stageId: stage.id,
                    error: parseErr instanceof Error ? parseErr.message : String(parseErr)
                });
            }
        }
        if (finalStage.chatwootStatus) {
            // Coluna com chatwootStatus - atualiza no Chatwoot
            const targetStatus = finalStage.chatwootStatus;
            const success = await chatwoot_1.default.updateConversationStatus(accountId, conversationId, targetStatus, creds.jwt, creds.apiToken);
            if (!success) {
                return res.status(500).json({ error: 'Failed to update conversation status' });
            }
            // Remove card local se existir (está voltando para coluna de status)
            await database_1.default.card.deleteMany({
                where: { conversationId, accountId }
            });
            // Verifica se a etapa tem mensagem automática configurada
            if (finalStage.automations) {
                try {
                    const automations = JSON.parse(finalStage.automations);
                    if (automations.autoMessage?.enabled && automations.autoMessage?.text) {
                        const messageText = automations.autoMessage.text;
                        const attachmentUrl = automations.autoMessage.attachmentUrl;
                        const messageSent = await chatwoot_1.default.sendMessage(accountId, conversationId, messageText, creds.jwt, creds.apiToken);
                        if (messageSent) {
                            logger_1.default.info('Auto-message sent (Chatwoot status)', {
                                conversationId,
                                targetStatus,
                                stageId: finalStage.id,
                                hasAttachment: !!attachmentUrl
                            });
                        }
                    }
                }
                catch (parseError) {
                    logger_1.default.error('Error parsing automations for auto-message (Chatwoot status)', {
                        conversationId,
                        error: parseError instanceof Error ? parseError.message : 'Unknown error'
                    });
                }
            }
            // Dispara sequência configurada na etapa (best-effort)
            if (finalStage.automations) {
                try {
                    triggerStageSequence(finalStage.id, JSON.parse(finalStage.automations), accountId, conversationId, creds.jwt, creds.apiToken).catch(() => { });
                }
                catch { /* parse error — ignora */ }
            }
            logger_1.default.info('Card moved to Chatwoot status via stage', { conversationId, targetStatus, stageId: finalStage.id, userId: authReq.user.id });
            (0, webhookDispatcher_1.dispatchWebhook)(accountId, 'card.moved', {
                ...webhookBase,
                movedBy: { id: authReq.user.id },
                movedAt: new Date().toISOString(),
                from: webhookBase.fromColumn ?? { type: 'status', status: webhookBase.conversation.status },
                to: {
                    type: 'stage',
                    stageId: finalStage.id,
                    stageName: finalStage.name,
                    funnelId: finalStage.funnel.id,
                    funnelName: finalStage.funnel.name,
                    chatwootStatus: targetStatus,
                },
            }).catch(() => { });
            return res.json({ success: true, conversationId, newStatus: targetStatus, transferredFrom });
        }
        // Coluna extra (sem chatwootStatus) - salva localmente
        const finalStageId = finalStage.id;
        const finalStageName = finalStage.name;
        await database_1.default.card.upsert({
            where: {
                conversationId_accountId: { conversationId, accountId }
            },
            create: {
                conversationId,
                accountId,
                stageId: finalStageId,
                order: 0,
                transferredFrom: transferredFrom ? JSON.stringify(transferredFrom) : null
            },
            update: {
                stageId: finalStageId,
                updatedAt: new Date(),
                transferredFrom: transferredFrom ? JSON.stringify(transferredFrom) : undefined
            }
        });
        // Verifica se a etapa final tem mensagem automática configurada
        if (finalStage.automations) {
            try {
                const automations = JSON.parse(finalStage.automations);
                if (automations.autoMessage?.enabled && automations.autoMessage?.text) {
                    // Envia a mensagem automática
                    const messageText = automations.autoMessage.text;
                    const attachmentUrl = automations.autoMessage.attachmentUrl;
                    // attachmentUrl é armazenado mas envio de anexos não está implementado — envia apenas texto
                    const messageSent = await chatwoot_1.default.sendMessage(accountId, conversationId, messageText, creds.jwt, creds.apiToken);
                    if (messageSent) {
                        logger_1.default.info('Auto-message sent', {
                            conversationId,
                            stageId: finalStageId,
                            stageName: finalStageName,
                            hasAttachment: !!attachmentUrl
                        });
                    }
                    else {
                        logger_1.default.warn('Failed to send auto-message', {
                            conversationId,
                            stageId: finalStageId
                        });
                    }
                }
            }
            catch (parseError) {
                logger_1.default.error('Error parsing automations for auto-message', {
                    conversationId,
                    error: parseError instanceof Error ? parseError.message : 'Unknown error'
                });
            }
        }
        // Dispara sequência configurada na etapa (best-effort)
        if (finalStage.automations) {
            try {
                triggerStageSequence(finalStageId, JSON.parse(finalStage.automations), accountId, conversationId, creds.jwt, creds.apiToken).catch(() => { });
            }
            catch { /* parse error — ignora */ }
        }
        logger_1.default.info('Card moved to extra column', { conversationId, stageId: finalStageId, stageName: finalStageName, userId: authReq.user.id, hasTransfer: !!transferredFrom });
        // Mover para coluna extra não gera webhook do Chatwoot — invalida cache manualmente
        invalidateFunnelBoardCache(accountId, finalStage.funnel.id);
        (0, webhookDispatcher_1.dispatchWebhook)(accountId, 'card.moved', {
            ...webhookBase,
            movedBy: { id: authReq.user.id },
            movedAt: new Date().toISOString(),
            from: webhookBase.fromColumn ?? { type: 'status', status: webhookBase.conversation.status },
            to: {
                type: 'stage',
                stageId: finalStageId,
                stageName: finalStageName,
                funnelId: finalStage.funnel.id,
                funnelName: finalStage.funnel.name,
            },
        }).catch(() => { });
        res.json({
            success: true,
            conversationId,
            stageId: finalStageId,
            stageName: finalStageName,
            transferredFrom
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger_1.default.error('Error moving card', { conversationId, error: errorMessage });
        res.status(500).json({ error: 'Failed to move card' });
    }
});
// GET /api/kanban/conversation/:id/stage - Retorna em qual stage a conversa está
router.get('/conversation/:id/stage', async (req, res) => {
    const authReq = req;
    const conversationId = parseInt(req.params.id, 10);
    if (isNaN(conversationId) || conversationId <= 0) {
        return res.status(400).json({ error: 'Invalid conversation ID' });
    }
    try {
        const accountId = authReq.user.account_id;
        // Busca o card da conversa
        const card = await database_1.default.card.findUnique({
            where: {
                conversationId_accountId: {
                    conversationId,
                    accountId
                }
            },
            include: {
                stage: {
                    include: {
                        funnel: true
                    }
                }
            }
        });
        if (!card) {
            return res.json({
                success: true,
                data: null,
                message: 'Conversa não está associada a nenhum funil'
            });
        }
        res.json({
            success: true,
            data: {
                cardId: card.id,
                stageId: card.stage.id,
                stageName: card.stage.name,
                stageColor: card.stage.color,
                funnelId: card.stage.funnel.id,
                funnelName: card.stage.funnel.name,
                funnelColor: card.stage.funnel.color
            }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger_1.default.error('Error getting conversation stage', { conversationId, error: errorMessage });
        res.status(500).json({ error: 'Failed to get conversation stage' });
    }
});
// DELETE /api/kanban/:id/remove - Remove conversa do funil
router.delete('/:id/remove', async (req, res) => {
    const authReq = req;
    const conversationId = parseInt(req.params.id, 10);
    if (isNaN(conversationId) || conversationId <= 0) {
        return res.status(400).json({ error: 'Invalid conversation ID' });
    }
    try {
        const accountId = authReq.user.account_id;
        const creds = await resolveCredentials(accountId, authReq.jwt, authReq.apiToken);
        
        // Encontra o card pelo ID ou conversationId
        const card = await database_1.default.card.findFirst({
            where: {
                OR: [
                    { id: conversationId, accountId },
                    { conversationId, accountId }
                ]
            }
        });
        if (!card) {
            return res.status(404).json({ error: 'Card not found' });
        }
        const actualConversationId = card.conversationId ?? conversationId;
        
        // Coleta dados ricos ANTES de deletar
        const webhookBase = await buildCardWebhookData(accountId, actualConversationId, creds.jwt, creds.apiToken);
        
        // Remove o card da conversa por ID único
        await database_1.default.card.delete({
            where: { id: card.id }
        });
        const deleted = true;
        
        logger_1.default.info('Card removed from funnel', { conversationId: actualConversationId, userId: authReq.user.id });
        updateCardsIndexCacheEntry(accountId, actualConversationId, null);
        (0, webhookDispatcher_1.dispatchWebhook)(accountId, 'card.deleted', {
            ...webhookBase,
            removedBy: { id: authReq.user.id },
            removedAt: new Date().toISOString(),
            stage: webhookBase.fromColumn,
        }).catch(() => { });
        res.json({ success: true, message: 'Conversa removida do funil' });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger_1.default.error('Error removing card', { conversationId, error: errorMessage });
        res.status(500).json({ error: 'Failed to remove card' });
    }
});
// PATCH /api/kanban/:id/move-to-stage - Move card para um stage de funil
router.patch('/:id/move-to-stage', async (req, res) => {
    const authReq = req;
    const conversationId = parseInt(req.params.id, 10);
    const { stageId } = req.body;
    if (isNaN(conversationId) || conversationId <= 0) {
        return res.status(400).json({ error: 'Invalid conversation ID' });
    }
    if (!stageId) {
        return res.status(400).json({ error: 'stageId is required' });
    }
    try {
        const accountId = authReq.user.account_id;
        const targetStageId = parseInt(stageId, 10);
        if (isNaN(targetStageId) || targetStageId <= 0) {
            return res.status(400).json({ error: 'Invalid stageId' });
        }
        // Usa admin token para garantir que agentes comuns consigam mover cards
        const creds = await resolveCredentials(accountId, authReq.jwt, authReq.apiToken);
        // Coleta dados ricos ANTES da ação (stage anterior + dados da conversa)
        const webhookBase = await buildCardWebhookData(accountId, conversationId, creds.jwt, creds.apiToken);
        // Verifica se o stage existe e pertence ao account
        const stage = await database_1.default.stage.findFirst({
            where: { id: targetStageId },
            include: { funnel: true }
        });
        if (!stage || stage.funnel.accountId !== accountId) {
            return res.status(404).json({ error: 'Stage not found' });
        }
        // Verifica se a etapa tem automação de transferência
        let finalStageId = targetStageId;
        let transferredTo = null;
        if (stage.automations) {
            try {
                const automations = JSON.parse(stage.automations);
                if (automations.transferTo?.stageId) {
                    // Verifica se o stage de destino existe e pertence ao account
                    const destStage = await database_1.default.stage.findFirst({
                        where: { id: automations.transferTo.stageId },
                        include: { funnel: true }
                    });
                    if (destStage && destStage.funnel.accountId === accountId) {
                        finalStageId = destStage.id;
                        transferredTo = {
                            funnelId: destStage.funnel.id,
                            funnelName: destStage.funnel.name,
                            stageId: destStage.id,
                            stageName: destStage.name
                        };
                        logger_1.default.info('Auto-transfer triggered (move-to-stage)', {
                            conversationId,
                            fromStage: stage.name,
                            toStage: destStage.name,
                            toFunnel: destStage.funnel.name
                        });
                    }
                }
            }
            catch (parseErr) {
                logger_1.default.error('Failed to parse stage automations (move-to-stage)', {
                    stageId: stage.id,
                    error: parseErr instanceof Error ? parseErr.message : String(parseErr)
                });
            }
        }
        // Upsert do card
        const card = await database_1.default.card.upsert({
            where: {
                conversationId_accountId: {
                    conversationId,
                    accountId
                }
            },
            update: {
                stageId: finalStageId,
                updatedAt: new Date()
            },
            create: {
                conversationId,
                stageId: finalStageId,
                accountId,
                order: 0
            }
        });
        logger_1.default.info('Card moved to stage', { conversationId, stageId: finalStageId, userId: authReq.user.id });
        // Verifica se o stage final (após possível transferência) tem automação de mensagem automática
        const finalStage = await database_1.default.stage.findUnique({
            where: { id: finalStageId },
            include: { funnel: true }
        });
        if (finalStage?.automations) {
            try {
                const automations = JSON.parse(finalStage.automations);
                if (automations.autoMessage?.enabled && automations.autoMessage?.text) {
                    // Envia a mensagem automática
                    const messageText = automations.autoMessage.text;
                    const attachmentUrl = automations.autoMessage.attachmentUrl;
                    logger_1.default.info('Sending automatic message', {
                        conversationId,
                        stageId: finalStageId,
                        stageName: finalStage.name,
                        hasAttachment: !!attachmentUrl
                    });
                    try {
                        await chatwoot_1.default.sendMessage(accountId, conversationId, messageText, creds.jwt, creds.apiToken, attachmentUrl);
                        logger_1.default.info('Automatic message sent successfully', {
                            conversationId,
                            stageId: finalStageId
                        });
                    }
                    catch (msgError) {
                        const errorMsg = msgError instanceof Error ? msgError.message : 'Unknown error';
                        logger_1.default.error('Failed to send automatic message', {
                            conversationId,
                            stageId: finalStageId,
                            error: errorMsg
                        });
                    }
                }
            }
            catch (parseError) {
                // Ignora erros de parse das automações
            }
        }
        // Dispara sequência configurada na etapa final (best-effort)
        if (finalStage?.automations) {
            try {
                const automations = JSON.parse(finalStage.automations);
                if (automations.sequenceId) {
                    triggerStageSequence(finalStageId, automations, accountId, conversationId, creds.jwt, creds.apiToken).catch(() => { });
                }
            }
            catch { /* parse error — ignora */ }
        }
        const stageInfo = {
            name: finalStage?.name ?? stage.name,
            color: finalStage?.color ?? stage.color,
            funnelName: finalStage?.funnel.name ?? stage.funnel.name,
            funnelColor: finalStage?.funnel.color ?? stage.funnel.color,
        };
        updateCardsIndexCacheEntry(accountId, conversationId, {
            stageName: stageInfo.name,
            stageColor: stageInfo.color,
            funnelName: stageInfo.funnelName,
            funnelColor: stageInfo.funnelColor,
        });
        // Invalida cache do funil afetado (move-to-stage não gera webhook do Chatwoot)
        invalidateFunnelBoardCache(accountId, finalStage?.funnel.id ?? stage.funnel.id);
        (0, webhookDispatcher_1.dispatchWebhook)(accountId, 'card.moved', {
            ...webhookBase,
            movedBy: { id: authReq.user.id },
            movedAt: new Date().toISOString(),
            from: webhookBase.fromColumn ?? { type: 'status', status: webhookBase.conversation.status },
            to: {
                type: 'stage',
                stageId: finalStageId,
                stageName: stageInfo.name,
                funnelId: finalStage?.funnel.id ?? stage.funnel.id,
                funnelName: stageInfo.funnelName,
            },
            transferredTo: transferredTo ?? undefined,
        }).catch(() => { });
        res.json({ success: true, conversationId, stageId: finalStageId, card, transferredTo, stage: stageInfo });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger_1.default.error('Error moving card to stage', { conversationId, error: errorMessage });
        res.status(500).json({ error: 'Failed to move card to stage' });
    }
});
// PATCH /api/kanban/standalone/:cardId/move-to-stage - Move card AVULSO para outra etapa
router.patch('/standalone/:cardId/move-to-stage', async (req, res) => {
    const authReq = req;
    const cardId = parseInt(req.params.cardId, 10);
    const { stageId } = req.body;
    if (isNaN(cardId) || cardId <= 0) {
        return res.status(400).json({ error: 'Invalid card ID' });
    }
    if (!stageId) {
        return res.status(400).json({ error: 'stageId is required' });
    }
    try {
        const accountId = authReq.user.account_id;
        const targetStageId = parseInt(stageId, 10);
        if (isNaN(targetStageId) || targetStageId <= 0) {
            return res.status(400).json({ error: 'Invalid stageId' });
        }
        const stage = await database_1.default.stage.findFirst({
            where: { id: targetStageId },
            include: { funnel: true }
        });
        if (!stage || stage.funnel.accountId !== accountId) {
            return res.status(404).json({ error: 'Stage not found' });
        }
        // Garante que o card existe, é avulso (conversationId IS NULL) e pertence ao account
        const card = await database_1.default.card.findFirst({
            where: { id: cardId, conversationId: null, accountId }
        });
        if (!card) {
            return res.status(404).json({ error: 'Standalone card not found' });
        }
        const updated = await database_1.default.card.update({
            where: { id: cardId },
            data: { stageId: targetStageId, updatedAt: new Date() }
        });
        invalidateFunnelBoardCache(accountId, stage.funnel.id);
        logger_1.default.info('Standalone card moved to stage', { cardId, stageId: targetStageId, funnelId: stage.funnel.id, userId: authReq.user.id });
        return res.json({ success: true, cardId, stageId: targetStageId, card: updated });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger_1.default.error('Error moving standalone card to stage', { cardId, error: errorMessage });
        res.status(500).json({ error: 'Failed to move standalone card to stage' });
    }
});
// GET /api/kanban/column/:columnId/load-more - Carrega mais cards de uma coluna
router.get('/column/:columnId/load-more', async (req, res) => {
    const authReq = req;
    const columnId = req.params.columnId;
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 20;
    try {
        const accountId = authReq.user.account_id;
        // Verifica se é uma coluna de status (open, pending, resolved) ou de stage (número)
        if (['open', 'pending', 'resolved'].includes(columnId)) {
            // É uma coluna de status - busca conversas do Chatwoot com paginação
            // Chatwoot usa paginação baseada em page (não offset)
            // Por padrão retorna 25 conversas por página
            const perPage = 25; // Chatwoot default
            const page = Math.floor(offset / perPage) + 1;
            // Busca a página específica do Chatwoot
            const conversations = await chatwoot_1.default.getConversations(accountId, authReq.jwt['access-token'] ? authReq.jwt : undefined, authReq.jwt['access-token'] ? undefined : authReq.apiToken, {
                status: columnId, // Filtra por status direto na API
                page: page
            });
            // Busca customNames e items em paralelo
            const conversationIds = conversations.map(c => c.id);
            const [cardsWithNames, cardItems] = await Promise.all([
                database_1.default.card.findMany({
                    where: { accountId, conversationId: { in: conversationIds } },
                    select: { conversationId: true, customName: true, leadStatus: true }
                }),
                database_1.default.cardItem.findMany({
                    where: { accountId, conversationId: { in: conversationIds } },
                    orderBy: { order: 'asc' }
                })
            ]);
            const customNameMap = new Map();
            const leadStatusMap = new Map();
            const itemsMap = new Map();
            const totalValueMap = new Map();
            for (const card of cardsWithNames) {
                if (card.conversationId !== null) {
                    customNameMap.set(card.conversationId, card.customName);
                    leadStatusMap.set(card.conversationId, card.leadStatus || 'open');
                }
            }
            for (const item of cardItems) {
                const existing = itemsMap.get(item.conversationId) || [];
                existing.push(item);
                itemsMap.set(item.conversationId, existing);
                const currentTotal = totalValueMap.get(item.conversationId) || 0;
                totalValueMap.set(item.conversationId, currentTotal + (item.value * item.quantity));
            }
            // Ordena (Chatwoot já filtra por status, só precisamos ordenar)
            const sorted = conversations.sort((a, b) => {
                if (b.unread_count !== a.unread_count) {
                    return b.unread_count - a.unread_count;
                }
                return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            });
            // Calcula índices dentro da página
            const pageOffset = offset % perPage;
            const paginated = sorted.slice(pageOffset, pageOffset + limit);
            // Formata
            const cards = paginated.map(conv => ({
                id: conv.id,
                status: conv.status,
                priority: conv.priority,
                unread_count: conv.unread_count,
                created_at: new Date(Number(conv.created_at) * 1000).toISOString(),
                updated_at: new Date(Number(conv.updated_at) * 1000).toISOString(),
                contact: conv.meta?.sender || null,
                meta: {
                    assignee: conv.meta?.assignee || null
                },
                inbox: null,
                labels: conv.labels || [],
                customName: customNameMap.get(conv.id) || null,
                leadStatus: leadStatusMap.get(conv.id),
                items: itemsMap.get(conv.id) || [],
                totalValue: totalValueMap.get(conv.id) || 0
            }));
            // hasMore é true se retornou o número máximo de conversas (indica que pode haver mais)
            const hasMore = conversations.length === perPage;
            return res.json({
                success: true,
                data: {
                    cards,
                    hasMore,
                    total: null // Não temos total quando usando paginação da API
                }
            });
        }
        // É uma coluna de stage (ID numérico)
        const stageId = parseInt(columnId);
        if (isNaN(stageId)) {
            return res.status(400).json({ error: 'Invalid column ID' });
        }
        // Verifica se o stage existe e pertence ao account
        const stage = await database_1.default.stage.findFirst({
            where: { id: stageId },
            include: {
                funnel: true,
                cards: {
                    orderBy: { order: 'asc' },
                    skip: offset,
                    take: limit
                }
            }
        });
        if (!stage || stage.funnel.accountId !== accountId) {
            return res.status(404).json({ error: 'Column not found' });
        }
        // Busca cada conversa individualmente pelo ID — evita perder cards além da página 1 do Chatwoot
        const conversationIds = stage.cards
            .map(c => c.conversationId)
            .filter((id) => id !== null);
        const jwt = authReq.jwt['access-token'] ? authReq.jwt : undefined;
        const apiToken = authReq.jwt['access-token'] ? undefined : authReq.apiToken;
        const fetchedConversations = await Promise.all(conversationIds.map(id => chatwoot_1.default.getConversation(accountId, id, jwt, apiToken).catch(() => null)));
        const conversationsMap = new Map(fetchedConversations
            .filter((c) => c !== null)
            .map(c => [c.id, c]));
        // Busca items dos cards
        const cardItems = await database_1.default.cardItem.findMany({
            where: {
                accountId,
                conversationId: { in: conversationIds }
            },
            orderBy: { order: 'asc' }
        });
        const itemsMap = new Map();
        const totalValueMap = new Map();
        for (const item of cardItems) {
            const existing = itemsMap.get(item.conversationId) || [];
            existing.push(item);
            itemsMap.set(item.conversationId, existing);
            const currentTotal = totalValueMap.get(item.conversationId) || 0;
            totalValueMap.set(item.conversationId, currentTotal + (item.value * item.quantity));
        }
        // Monta os cards
        const cards = stage.cards
            .map(card => {
            if (card.conversationId === null)
                return null; // avulsos não aparecem no load-more
            const conv = conversationsMap.get(card.conversationId);
            if (!conv)
                return null;
            let transferredFrom = null;
            if (card.transferredFrom) {
                try {
                    transferredFrom = JSON.parse(card.transferredFrom);
                }
                catch {
                    // Ignora
                }
            }
            return {
                id: conv.id,
                status: conv.status,
                priority: conv.priority,
                unread_count: conv.unread_count,
                created_at: new Date(Number(conv.created_at) * 1000).toISOString(),
                updated_at: new Date(Number(conv.updated_at) * 1000).toISOString(),
                contact: conv.meta?.sender || null,
                meta: {
                    assignee: conv.meta?.assignee || null
                },
                inbox: null,
                labels: conv.labels || [],
                customName: card.customName || null,
                leadStatus: card.leadStatus,
                        cardOrder: card.order,
                transferredFrom,
                items: itemsMap.get(conv.id) || [],
                totalValue: totalValueMap.get(conv.id) || 0
            };
        })
            .filter(c => c !== null);
        // Ordena
        cards.sort((a, b) => {
            if (b.unread_count !== a.unread_count) {
                return b.unread_count - a.unread_count;
            }
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });
        // Conta total
        const totalCards = await database_1.default.card.count({
            where: { stageId }
        });
        res.json({
            success: true,
            data: {
                cards,
                hasMore: offset + limit < totalCards,
                total: totalCards
            }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger_1.default.error('Error loading more cards', { columnId, error: errorMessage });
        res.status(500).json({ error: 'Failed to load more cards' });
    }
});
// PATCH /api/kanban/:id/update-name - Atualiza o nome customizado do card
router.patch('/:id/update-name', async (req, res) => {
    const authReq = req;
    const conversationId = parseInt(req.params.id);
    const { customName } = req.body;
    if (customName === undefined) {
        return res.status(400).json({ error: 'customName is required' });
    }
    try {
        const accountId = authReq.user.account_id;
        // Verifica se existe um card para esta conversa
        let existingCard = await database_1.default.card.findFirst({
            where: { conversationId, accountId }
        });
        if (!existingCard) {
            // Se não existe, cria um card no funil de sistema
            // Busca a conversa no Chatwoot para saber o status
            const conversations = await chatwoot_1.default.getConversations(accountId, authReq.jwt['access-token'] ? authReq.jwt : undefined, authReq.jwt['access-token'] ? undefined : authReq.apiToken, { status: 'all' });
            const conversation = conversations.find(c => c.id === conversationId);
            if (!conversation) {
                return res.status(404).json({ error: 'Conversation not found' });
            }
            // Busca o funil de sistema (não cria mais automaticamente)
            const systemFunnel = await database_1.default.funnel.findFirst({
                where: { accountId, isSystem: true, isActive: true },
                include: {
                    stages: { orderBy: { order: 'asc' } },
                    allowedUsers: true
                }
            });
            if (!systemFunnel) {
                return res.status(404).json({
                    error: 'Funil de sistema não está ativo',
                    message: 'Ative o funil "Status Tickets" em Gerenciar Funis'
                });
            }
            // Encontra o stage correspondente ao status da conversa
            const stage = systemFunnel.stages.find(s => s.chatwootStatus === conversation.status);
            if (!stage) {
                return res.status(404).json({ error: 'Stage not found for conversation status' });
            }
            // Cria o card
            existingCard = await database_1.default.card.create({
                data: {
                    conversationId,
                    stageId: stage.id,
                    accountId,
                    customName: customName.trim() || null
                }
            });
            logger_1.default.info('Card created with custom name', {
                conversationId,
                customName: customName.trim() || null,
                userId: authReq.user.id
            });
            return res.json({ success: true, customName: existingCard.customName });
        }
        // Atualiza o customName
        const updatedCard = await database_1.default.card.update({
            where: { id: existingCard.id },
            data: { customName: customName.trim() || null }
        });
        logger_1.default.info('Card name updated', {
            conversationId,
            customName: customName.trim() || null,
            userId: authReq.user.id
        });
        return res.json({ success: true, customName: updatedCard.customName });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger_1.default.error('Error updating card name', { conversationId, error: errorMessage });
        res.status(500).json({ error: 'Failed to update card name' });
    }
});
// PATCH /api/kanban/:id/lead-status - Atualiza o status do lead (ganho/perdido)
router.patch('/:id/lead-status', async (req, res) => {
    const authReq = req;
    const conversationId = parseInt(req.params.id);
    const { leadStatus, reason } = req.body;
    if (!leadStatus || !['open', 'won', 'lost'].includes(leadStatus)) {
        return res.status(400).json({ error: 'leadStatus deve ser "open", "won" ou "lost"' });
    }
    try {
        const accountId = authReq.user.account_id;
        // Busca o card
        const card = await database_1.default.card.findFirst({
            where: { conversationId, accountId }
        });
        if (!card) {
            return res.status(404).json({ error: 'Card não encontrado' });
        }
        // Monta dados de atualização
        const updateData = { leadStatus };
        if (leadStatus === 'won' || leadStatus === 'lost') {
            updateData.closedAt = new Date();
            updateData.closeReason = reason || null;
        }
        else {
            // Voltou para aberto: limpa motivo e data de fechamento
            updateData.closedAt = null;
            updateData.closeReason = null;
        }
        // Atualiza o status do lead
        const updatedCard = await database_1.default.card.update({
            where: { id: card.id },
            data: updateData
        });
        logger_1.default.info('Lead status updated', {
            conversationId,
            leadStatus,
            reason: reason || null,
            userId: authReq.user.id
        });
        return res.json({ success: true, leadStatus: updatedCard.leadStatus, closeReason: updatedCard.closeReason });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger_1.default.error('Error updating lead status', { conversationId, error: errorMessage });
        res.status(500).json({ error: 'Failed to update lead status' });
    }
});
exports.default = router;
//# sourceMappingURL=kanban.js.map