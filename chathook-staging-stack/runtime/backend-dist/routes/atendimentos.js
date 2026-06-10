"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chatwoot_1 = __importDefault(require("../services/chatwoot"));
const chatwootDatabase_1 = __importDefault(require("../services/chatwootDatabase"));
const database_1 = __importDefault(require("../services/database"));
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
function extractAuth(req) {
    const authReq = req;
    const jwt = authReq.jwt?.['access-token'] ? authReq.jwt : undefined;
    const apiToken = !jwt ? authReq.apiToken : undefined;
    return { jwt, apiToken, accountId: authReq.user.account_id };
}
/**
 * Tenta obter credenciais de admin para chamadas ao Chatwoot.
 * Agentes normais não têm acesso a todas as conversas via JWT próprio —
 * usamos o token de admin da conta para garantir visibilidade total.
 */
async function resolveCredentials(accountId, userJwt, userApiToken) {
    try {
        const adminToken = await chatwootDatabase_1.default.getAdminApiTokenForAccount(accountId);
        if (adminToken)
            return { jwt: undefined, apiToken: adminToken };
    }
    catch {
        // Fallback para as credenciais do próprio usuário
    }
    return { jwt: userJwt, apiToken: userApiToken };
}
// ──────────────────────────────────────────────────────────────────────────────
// GET /api/atendimentos/filters
// Retorna opções de filtro (agentes, caixas de entrada, labels) em uma chamada.
// ──────────────────────────────────────────────────────────────────────────────
router.get('/filters', async (req, res) => {
    const { jwt, apiToken, accountId } = extractAuth(req);
    try {
        const creds = await resolveCredentials(accountId, jwt, apiToken);
        const [agents, inboxes, labels, teams] = await Promise.all([
            chatwoot_1.default.getAccountAgents(accountId, creds.jwt, creds.apiToken).catch(() => []),
            chatwoot_1.default.getInboxes(accountId, creds.jwt, creds.apiToken).catch(() => []),
            chatwoot_1.default.getAccountLabels(accountId, creds.jwt, creds.apiToken).catch(() => []),
            chatwoot_1.default.getAccountTeams(accountId, creds.jwt, creds.apiToken).catch(() => []),
        ]);
        logger_1.default.info('Atendimentos filters fetched', {
            accountId,
            agents: agents.length,
            inboxes: inboxes.length,
            labels: labels.length,
            teams: teams.length,
        });
        res.json({
            success: true,
            data: { agents, inboxes, labels, teams },
        });
    }
    catch (error) {
        logger_1.default.error('Error fetching atendimentos filters', { error, accountId });
        res.status(500).json({ success: false, error: 'Erro ao buscar filtros' });
    }
});
// ──────────────────────────────────────────────────────────────────────────────
// GET /api/atendimentos/stats
// Estatísticas de atendimento com breakdown por status, caixa e agente.
//
// Query params:
//   inbox_id    — filtrar por caixa de entrada
//   assignee_id — filtrar por agente (filtro client-side após fetch)
//   from        — data de início ISO (filtro client-side)
//   to          — data de fim ISO (filtro client-side)
// ──────────────────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
    const { jwt, apiToken, accountId } = extractAuth(req);
    const inboxId = req.query.inbox_id ? parseInt(req.query.inbox_id, 10) : undefined;
    const assigneeId = req.query.assignee_id ? parseInt(req.query.assignee_id, 10) : undefined;
    const from = req.query.from ? new Date(req.query.from) : undefined;
    const to = req.query.to ? new Date(req.query.to) : undefined;
    try {
        const creds = await resolveCredentials(accountId, jwt, apiToken);
        // Contagens reais via meta.all_count (1 request por status, não pagina tudo)
        const baseConvParams = { inbox_id: inboxId };
        const [openCount, pendingCount, resolvedCount, snoozedCount, inboxes, agents] = await Promise.all([
            chatwoot_1.default.getConversationCount(accountId, 'open', creds.jwt, creds.apiToken, baseConvParams),
            chatwoot_1.default.getConversationCount(accountId, 'pending', creds.jwt, creds.apiToken, baseConvParams),
            chatwoot_1.default.getConversationCount(accountId, 'resolved', creds.jwt, creds.apiToken, baseConvParams),
            chatwoot_1.default.getConversationCount(accountId, 'snoozed', creds.jwt, creds.apiToken, baseConvParams),
            chatwoot_1.default.getInboxes(accountId, creds.jwt, creds.apiToken).catch(() => []),
            chatwoot_1.default.getAccountAgents(accountId, creds.jwt, creds.apiToken).catch(() => []),
        ]);
        const total = openCount + pendingCount + resolvedCount + snoozedCount;
        // Busca amostra de conversas abertas e resolvidas para breakdowns por caixa e agente.
        // Limitamos a 5 páginas (≈125 conversas) — suficiente para breakdown representativo.
        const sampleParams = { fetchAll: true, maxPages: 5, inbox_id: inboxId };
        const [openSample, resolvedSample] = await Promise.all([
            chatwoot_1.default.getConversations(accountId, creds.jwt, creds.apiToken, { status: 'open', ...sampleParams }).catch(() => []),
            chatwoot_1.default.getConversations(accountId, creds.jwt, creds.apiToken, { status: 'resolved', ...sampleParams }).catch(() => []),
        ]);
        const allSample = [...openSample, ...resolvedSample];
        // Aplica filtro por assignee_id e período (client-side)
        const filtered = allSample.filter((c) => {
            if (assigneeId && c.meta?.assignee?.id !== assigneeId)
                return false;
            if (from && new Date(c.created_at) < from)
                return false;
            if (to && new Date(c.created_at) > to)
                return false;
            return true;
        });
        // Breakdown por caixa de entrada
        const inboxMap = new Map();
        for (const c of filtered) {
            const id = c.inbox_id;
            if (!id)
                continue;
            if (!inboxMap.has(id)) {
                const inbox = inboxes.find((i) => i.id === id);
                inboxMap.set(id, { id, name: inbox?.name ?? `Caixa ${id}`, channelType: inbox?.channel_type ?? 'unknown', open: 0, resolved: 0 });
            }
            const entry = inboxMap.get(id);
            if (c.status === 'open')
                entry.open++;
            else if (c.status === 'resolved')
                entry.resolved++;
        }
        const byInbox = Array.from(inboxMap.values()).sort((a, b) => (b.open + b.resolved) - (a.open + a.resolved));
        // Breakdown por agente
        const agentMap = new Map();
        for (const c of filtered) {
            const assignee = c.meta?.assignee;
            if (!assignee)
                continue;
            if (!agentMap.has(assignee.id)) {
                agentMap.set(assignee.id, { id: assignee.id, name: assignee.name, email: assignee.email ?? '', open: 0, resolved: 0 });
            }
            const entry = agentMap.get(assignee.id);
            if (c.status === 'open')
                entry.open++;
            else if (c.status === 'resolved')
                entry.resolved++;
        }
        const byAgent = Array.from(agentMap.values()).sort((a, b) => (b.open + b.resolved) - (a.open + a.resolved));
        // Métricas de hoje
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const openedToday = allSample.filter((c) => new Date(c.created_at) >= todayStart).length;
        const resolvedToday = resolvedSample.filter((c) => {
            const updatedAt = new Date(c.updated_at);
            return updatedAt >= todayStart;
        }).length;
        // Tempo médio de primeira resposta (em minutos) — disponível apenas quando Chatwoot retorna
        // o campo `additional_attributes.waiting_since` ou `first_reply_created_at`
        let avgFirstReplyMinutes = null;
        const repliedConvs = allSample.filter((c) => c.additional_attributes?.first_reply_created_at && c.created_at);
        if (repliedConvs.length > 0) {
            const totalMinutes = repliedConvs.reduce((sum, c) => {
                const diff = (new Date(c.additional_attributes.first_reply_created_at).getTime() - new Date(c.created_at).getTime()) / 60000;
                return sum + (diff > 0 ? diff : 0);
            }, 0);
            avgFirstReplyMinutes = Math.round(totalMinutes / repliedConvs.length);
        }
        logger_1.default.info('Atendimentos stats fetched', { accountId, total, openCount, pendingCount, resolvedCount });
        res.json({
            success: true,
            data: {
                total,
                byStatus: { open: openCount, pending: pendingCount, resolved: resolvedCount, snoozed: snoozedCount },
                byInbox,
                byAgent,
                today: { opened: openedToday, resolved: resolvedToday },
                avgFirstReplyMinutes,
                sampleSize: allSample.length,
            },
        });
    }
    catch (error) {
        logger_1.default.error('Error fetching atendimentos stats', { error, accountId });
        res.status(500).json({ success: false, error: 'Erro ao buscar estatísticas' });
    }
});
// ──────────────────────────────────────────────────────────────────────────────
// GET /api/atendimentos
// Lista conversas com filtros, paginação e enriquecimento com dados locais (funil/card).
//
// Query params:
//   status        — open | pending | resolved | snoozed | all (default: all)
//   inbox_id      — filtrar por caixa de entrada
//   assignee_id   — filtrar por agente (client-side após fetch do Chatwoot)
//   assignee_type — assigned | unassigned | all (passado direto ao Chatwoot)
//   team_id       — filtrar por time
//   labels        — labels separadas por vírgula (ex: "venda,urgente")
//   search        — busca em nome/email/telefone do contato e ID da conversa
//   from          — data de início ISO (client-side)
//   to            — data de fim ISO (client-side)
//   sort          — latest | created_at | assignee | unattended (default: latest)
//   page          — página (default: 1)
//   limit         — itens por página entre 1-100 (default: 25)
// ──────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    const { jwt, apiToken, accountId } = extractAuth(req);
    const { status = 'all', inbox_id, assignee_id, assignee_type, team_id, labels: labelsRaw, search, from: fromRaw, to: toRaw, sort = 'latest', } = req.query;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '25', 10)));
    const inboxId = inbox_id ? parseInt(inbox_id, 10) : undefined;
    const teamId = team_id ? parseInt(team_id, 10) : undefined;
    const assigneeIdFilter = assignee_id ? parseInt(assignee_id, 10) : undefined;
    const labelsArr = labelsRaw ? labelsRaw.split(',').map(l => l.trim()).filter(Boolean) : undefined;
    const fromDate = fromRaw ? new Date(fromRaw) : undefined;
    const toDate = toRaw ? new Date(toRaw) : undefined;
    // Validação básica
    if (inboxId !== undefined && isNaN(inboxId))
        return res.status(400).json({ success: false, error: 'inbox_id inválido' });
    if (teamId !== undefined && isNaN(teamId))
        return res.status(400).json({ success: false, error: 'team_id inválido' });
    if (assigneeIdFilter !== undefined && isNaN(assigneeIdFilter))
        return res.status(400).json({ success: false, error: 'assignee_id inválido' });
    try {
        const creds = await resolveCredentials(accountId, jwt, apiToken);
        // Quando há filtros client-side (assignee_id, from, to) precisamos de mais dados.
        // Para paginação correta precisamos buscar tudo e paginar aqui.
        // Caso contrário delegamos paginação ao Chatwoot.
        const needsClientSideFilter = !!(assigneeIdFilter || fromDate || toDate);
        let conversations;
        let chatwootTotal;
        if (needsClientSideFilter) {
            // Busca tudo (até 10 páginas ≈ 250 conversas) e filtra/pagina aqui
            const allConvs = await chatwoot_1.default.getConversations(accountId, creds.jwt, creds.apiToken, {
                status,
                inbox_id: inboxId,
                team_id: teamId,
                assignee_type: assignee_type || undefined,
                labels: labelsArr,
                sort,
                q: search || undefined,
                fetchAll: true,
                maxPages: 10,
            });
            const filtered = allConvs.filter((c) => {
                if (assigneeIdFilter && c.meta?.assignee?.id !== assigneeIdFilter)
                    return false;
                if (fromDate && new Date(c.created_at) < fromDate)
                    return false;
                if (toDate && new Date(c.created_at) > toDate)
                    return false;
                return true;
            });
            chatwootTotal = filtered.length;
            conversations = filtered.slice((page - 1) * limit, page * limit);
        }
        else {
            // Paginação delegada ao Chatwoot
            const chatwootPage = Math.ceil((page * limit) / 25); // Chatwoot usa páginas de 25
            const pageOffset = ((page - 1) * limit) % 25;
            const response = await chatwoot_1.default.getConversations(accountId, creds.jwt, creds.apiToken, {
                status,
                inbox_id: inboxId,
                team_id: teamId,
                assignee_type: assignee_type || undefined,
                labels: labelsArr,
                sort,
                q: search || undefined,
                page: chatwootPage,
            });
            // Se limit=25 (padrão Chatwoot), sem necessidade de ajuste
            conversations = limit === 25 ? response : response.slice(pageOffset, pageOffset + limit);
            // Contagem real para paginação
            chatwootTotal = await chatwoot_1.default.getConversationCount(accountId, status === 'all' ? 'open' : status, creds.jwt, creds.apiToken, { inbox_id: inboxId })
                .catch(() => conversations.length);
        }
        // Enriquece com dados locais (funil, etapa, leadStatus) em batch
        const convIds = conversations.map((c) => c.id).filter(Boolean);
        const localCards = convIds.length > 0
            ? await database_1.default.card.findMany({
                where: { conversationId: { in: convIds }, accountId },
                include: { stage: { include: { funnel: { select: { id: true, name: true, color: true } } } } },
            })
            : [];
        const cardMap = new Map(localCards.map(c => [c.conversationId, c]));
        const enriched = conversations.map((conv) => {
            const card = cardMap.get(conv.id);
            return {
                ...conv,
                kanban: card
                    ? {
                        cardId: card.id,
                        stageId: card.stage.id,
                        stageName: card.stage.name,
                        stageColor: card.stage.color,
                        funnelId: card.stage.funnel.id,
                        funnelName: card.stage.funnel.name,
                        funnelColor: card.stage.funnel.color,
                        leadStatus: card.leadStatus,
                        closedAt: card.closedAt,
                    }
                    : null,
            };
        });
        const pages = Math.ceil(chatwootTotal / limit);
        logger_1.default.info('Atendimentos list fetched', {
            accountId,
            count: enriched.length,
            total: chatwootTotal,
            page,
            status,
        });
        res.json({
            success: true,
            data: {
                conversations: enriched,
                meta: {
                    total: chatwootTotal,
                    page,
                    limit,
                    pages,
                    hasMore: page < pages,
                },
            },
        });
    }
    catch (error) {
        logger_1.default.error('Error fetching atendimentos list', { error, accountId });
        res.status(500).json({ success: false, error: 'Erro ao buscar atendimentos' });
    }
});
// ──────────────────────────────────────────────────────────────────────────────
// POST /api/atendimentos
// Cria uma nova conversa no Chatwoot.
// Body: { inbox_id, contact_id, status?, additional_attributes?, custom_attributes? }
// ──────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
    const { jwt, apiToken, accountId } = extractAuth(req);
    const { inbox_id, contact_id, status, additional_attributes, custom_attributes } = req.body;
    if (!inbox_id)
        return res.status(400).json({ success: false, error: 'inbox_id obrigatório' });
    if (!contact_id)
        return res.status(400).json({ success: false, error: 'contact_id obrigatório' });
    try {
        const creds = await resolveCredentials(accountId, jwt, apiToken);
        const conversation = await chatwoot_1.default.createConversation(accountId, {
            source_id: `cwapp-${Date.now()}`,
            inbox_id: parseInt(inbox_id, 10),
            contact_id: parseInt(contact_id, 10),
            status: status || 'open',
            additional_attributes: additional_attributes || {},
            custom_attributes: custom_attributes || {},
        }, creds.jwt, creds.apiToken);
        if (!conversation)
            return res.status(500).json({ success: false, error: 'Erro ao criar conversa' });
        logger_1.default.info('Atendimento created', { accountId, conversationId: conversation.id });
        res.status(201).json({ success: true, data: conversation });
    }
    catch (error) {
        logger_1.default.error('Error creating atendimento', { error, accountId });
        res.status(500).json({ success: false, error: 'Erro ao criar atendimento' });
    }
});
// ──────────────────────────────────────────────────────────────────────────────
// GET /api/atendimentos/:id
// Retorna detalhes de uma conversa específica, enriquecida com dados do kanban.
// ──────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
    const { jwt, apiToken, accountId } = extractAuth(req);
    const conversationId = parseInt(req.params.id, 10);
    if (isNaN(conversationId))
        return res.status(400).json({ success: false, error: 'ID inválido' });
    try {
        const creds = await resolveCredentials(accountId, jwt, apiToken);
        const conversation = await chatwoot_1.default.getConversation(accountId, conversationId, creds.jwt, creds.apiToken);
        if (!conversation)
            return res.status(404).json({ success: false, error: 'Conversa não encontrada' });
        // Enriquece com dados do kanban
        const card = await database_1.default.card.findFirst({
            where: { conversationId, accountId },
            include: { stage: { include: { funnel: { select: { id: true, name: true, color: true } } } } },
        });
        res.json({
            success: true,
            data: {
                ...conversation,
                kanban: card ? {
                    cardId: card.id,
                    stageId: card.stage.id,
                    stageName: card.stage.name,
                    stageColor: card.stage.color,
                    funnelId: card.stage.funnel.id,
                    funnelName: card.stage.funnel.name,
                    funnelColor: card.stage.funnel.color,
                    leadStatus: card.leadStatus,
                    closedAt: card.closedAt,
                } : null,
            },
        });
    }
    catch (error) {
        logger_1.default.error('Error fetching atendimento', { error, accountId, conversationId });
        res.status(500).json({ success: false, error: 'Erro ao buscar atendimento' });
    }
});
// ──────────────────────────────────────────────────────────────────────────────
// PATCH /api/atendimentos/:id
// Atualiza status, agente, time e/ou labels de uma conversa.
// Body: { status?, agent_id?, team_id?, labels? }
// ──────────────────────────────────────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
    const { jwt, apiToken, accountId } = extractAuth(req);
    const conversationId = parseInt(req.params.id, 10);
    if (isNaN(conversationId))
        return res.status(400).json({ success: false, error: 'ID inválido' });
    const { status, agent_id, team_id, labels } = req.body;
    const validStatuses = ['open', 'pending', 'resolved', 'snoozed'];
    if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ success: false, error: `Status inválido. Use: ${validStatuses.join(', ')}` });
    }
    try {
        const creds = await resolveCredentials(accountId, jwt, apiToken);
        const ops = [];
        if (status)
            ops.push(chatwoot_1.default.updateConversationStatus(accountId, conversationId, status, creds.jwt, creds.apiToken));
        if (agent_id)
            ops.push(chatwoot_1.default.assign(conversationId, 'agent', parseInt(agent_id, 10), accountId, creds.jwt, creds.apiToken));
        if (team_id)
            ops.push(chatwoot_1.default.assign(conversationId, 'team', parseInt(team_id, 10), accountId, creds.jwt, creds.apiToken));
        if (labels && Array.isArray(labels) && labels.length > 0)
            ops.push(chatwoot_1.default.addLabels(conversationId, labels, accountId, creds.jwt, creds.apiToken));
        if (ops.length === 0)
            return res.status(400).json({ success: false, error: 'Nenhum campo para atualizar' });
        await Promise.all(ops);
        logger_1.default.info('Atendimento updated', { accountId, conversationId, status, agent_id, team_id });
        res.json({ success: true });
    }
    catch (error) {
        logger_1.default.error('Error updating atendimento', { error, accountId, conversationId });
        res.status(500).json({ success: false, error: 'Erro ao atualizar atendimento' });
    }
});
// ──────────────────────────────────────────────────────────────────────────────
// DELETE /api/atendimentos/:id
// Deleta uma conversa do Chatwoot.
// ──────────────────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
    const { jwt, apiToken, accountId } = extractAuth(req);
    const conversationId = parseInt(req.params.id, 10);
    if (isNaN(conversationId))
        return res.status(400).json({ success: false, error: 'ID inválido' });
    try {
        const creds = await resolveCredentials(accountId, jwt, apiToken);
        const ok = await chatwoot_1.default.deleteConversation(accountId, conversationId, creds.jwt, creds.apiToken);
        if (!ok)
            return res.status(500).json({ success: false, error: 'Erro ao deletar conversa' });
        // Remove card do kanban se existir
        await database_1.default.card.deleteMany({ where: { conversationId, accountId } }).catch(() => { });
        logger_1.default.info('Atendimento deleted', { accountId, conversationId });
        res.json({ success: true });
    }
    catch (error) {
        logger_1.default.error('Error deleting atendimento', { error, accountId, conversationId });
        res.status(500).json({ success: false, error: 'Erro ao deletar atendimento' });
    }
});
// ──────────────────────────────────────────────────────────────────────────────
// POST /api/atendimentos/:id/labels
// Adiciona labels a uma conversa.
// Body: { labels: string[] }
// ──────────────────────────────────────────────────────────────────────────────
router.post('/:id/labels', async (req, res) => {
    const { jwt, apiToken, accountId } = extractAuth(req);
    const conversationId = parseInt(req.params.id, 10);
    if (isNaN(conversationId))
        return res.status(400).json({ success: false, error: 'ID inválido' });
    const { labels } = req.body;
    if (!Array.isArray(labels) || labels.length === 0) {
        return res.status(400).json({ success: false, error: 'labels deve ser um array não vazio' });
    }
    try {
        const creds = await resolveCredentials(accountId, jwt, apiToken);
        const ok = await chatwoot_1.default.addLabels(conversationId, labels, accountId, creds.jwt, creds.apiToken);
        if (!ok)
            return res.status(500).json({ success: false, error: 'Erro ao adicionar labels' });
        res.json({ success: true });
    }
    catch (error) {
        logger_1.default.error('Error adding labels', { error, accountId, conversationId });
        res.status(500).json({ success: false, error: 'Erro ao adicionar labels' });
    }
});
// ──────────────────────────────────────────────────────────────────────────────
// DELETE /api/atendimentos/:id/labels
// Remove labels de uma conversa.
// Body: { labels: string[] }
// ──────────────────────────────────────────────────────────────────────────────
router.delete('/:id/labels', async (req, res) => {
    const { jwt, apiToken, accountId } = extractAuth(req);
    const conversationId = parseInt(req.params.id, 10);
    if (isNaN(conversationId))
        return res.status(400).json({ success: false, error: 'ID inválido' });
    const { labels } = req.body;
    if (!Array.isArray(labels) || labels.length === 0) {
        return res.status(400).json({ success: false, error: 'labels deve ser um array não vazio' });
    }
    try {
        const creds = await resolveCredentials(accountId, jwt, apiToken);
        const ok = await chatwoot_1.default.removeLabels(conversationId, labels, accountId, creds.jwt, creds.apiToken);
        if (!ok)
            return res.status(500).json({ success: false, error: 'Erro ao remover labels' });
        res.json({ success: true });
    }
    catch (error) {
        logger_1.default.error('Error removing labels', { error, accountId, conversationId });
        res.status(500).json({ success: false, error: 'Erro ao remover labels' });
    }
});
exports.default = router;
//# sourceMappingURL=atendimentos.js.map