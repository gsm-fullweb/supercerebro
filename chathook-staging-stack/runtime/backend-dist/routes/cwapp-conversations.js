"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const chatwoot_1 = __importDefault(require("../services/chatwoot"));
const logger_1 = __importDefault(require("../utils/logger"));
const database_1 = __importDefault(require("../services/database"));
const router = (0, express_1.Router)();
// Helper: propaga 401 do Chatwoot para o frontend (JWT expirado)
function handleCwError(res, error, label) {
    const status = error?.response?.status;
    if (status === 401) {
        logger_1.default.warn(`CWApp ${label}: JWT expirado (401 do Chatwoot)`);
        return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
    }
    logger_1.default.error(`CWApp ${label} failed`, { error: error.message });
    return res.status(500).json({ error: error.message || 'Erro interno' });
}
// GET /api/cwapp/inboxes — lista caixas da conta
router.get('/inboxes', async (req, res) => {
    const authReq = req;
    const accountId = authReq.accountId;
    try {
        const inboxes = await chatwoot_1.default.getInboxes(accountId, authReq.jwt, authReq.apiToken);
        const mapped = (inboxes || []).map((i) => ({
            id: i.id,
            name: i.name,
            channelType: i.channel_type,
        }));
        res.json({ inboxes: mapped });
    }
    catch (error) {
        return handleCwError(res, error, 'GET /inboxes');
    }
});
// GET /api/cwapp/conversations — lista paginada
router.get('/', async (req, res) => {
    const authReq = req;
    const accountId = authReq.accountId;
    const userId = authReq.userId;
    const { status = 'open', page = '1', assignee_type, inbox_id } = req.query;
    try {
        // Busca escopo de conversas do usuário e aplica como restrição
        const userPerm = await database_1.default.userResourcePermission.findUnique({
            where: { accountId_userId: { accountId, userId } },
            select: { pwaConversationScope: true }
        });
        const scope = userPerm?.pwaConversationScope || 'all';
        // Determina o assignee_type efetivo: o escopo do admin prevalece sobre o filtro do cliente
        // IMPORTANTE: Chatwoot usa 'me' (não 'mine') para filtrar por usuário autenticado
        let effectiveAssigneeType;
        if (scope === 'mine') {
            effectiveAssigneeType = 'me';
        }
        else if (scope === 'unassigned') {
            effectiveAssigneeType = 'unassigned';
        }
        else {
            // scope === 'all': respeita o filtro enviado pelo cliente (traduz 'mine' → 'me')
            const clientType = assignee_type || undefined;
            effectiveAssigneeType = clientType === 'mine' ? 'me' : clientType;
        }
        const [conversations, inboxes] = await Promise.all([
            chatwoot_1.default.getConversations(accountId, authReq.jwt, authReq.apiToken, {
                status,
                page: parseInt(page),
                assignee_type: effectiveAssigneeType,
                inbox_id: inbox_id ? parseInt(inbox_id) : undefined,
            }),
            chatwoot_1.default.getInboxes(accountId, authReq.jwt, authReq.apiToken),
        ]);
        const inboxMap = new Map((inboxes || []).map((i) => [i.id, i]));
        const mapped = (conversations || []).map((conv) => ({
            id: conv.id,
            status: conv.status,
            contactName: conv.meta?.sender?.name || 'Contato',
            contactAvatarUrl: conv.meta?.sender?.thumbnail || conv.meta?.sender?.avatar_url,
            inboxName: inboxMap.get(conv.inbox_id)?.name,
            assigneeName: conv.meta?.assignee?.name,
            lastActivityAt: conv.last_activity_at
                ? new Date(conv.last_activity_at * 1000).toISOString()
                : undefined,
            unreadCount: conv.unread_count || 0,
        }));
        res.json({ conversations: mapped, totalCount: mapped.length, page: parseInt(page), scope });
    }
    catch (error) {
        return handleCwError(res, error, 'GET /conversations');
    }
});
// GET /api/cwapp/conversations/:id/messages
router.get('/:id/messages', async (req, res) => {
    const authReq = req;
    const accountId = authReq.accountId;
    const conversationId = parseInt(req.params.id);
    try {
        const messages = await chatwoot_1.default.getConversationMessages(accountId, conversationId, authReq.jwt, authReq.apiToken);
        // Log estrutura de mensagens com anexos para debug
        const withAttachments = (messages || []).filter((m) => m.attachments?.length > 0);
        if (withAttachments.length > 0) {
            const lastMsg = withAttachments[withAttachments.length - 1];
            logger_1.default.info('Messages with attachments', {
                conversationId,
                count: withAttachments.length,
                lastAttachment: JSON.stringify({
                    file_type: lastMsg?.attachments?.[0]?.file_type,
                    file_name: lastMsg?.attachments?.[0]?.file_name,
                    extension: lastMsg?.attachments?.[0]?.extension,
                    data_url_suffix: (lastMsg?.attachments?.[0]?.data_url || '').slice(-40),
                }),
            });
        }
        res.json({ messages: messages || [] });
    }
    catch (error) {
        return handleCwError(res, error, 'GET /messages');
    }
});
// POST /api/cwapp/conversations/:id/reply
router.post('/:id/reply', async (req, res) => {
    const authReq = req;
    const accountId = authReq.accountId;
    const conversationId = parseInt(req.params.id);
    const { message } = req.body;
    if (!message?.trim()) {
        return res.status(400).json({ error: 'Mensagem não pode ser vazia' });
    }
    try {
        const ok = await chatwoot_1.default.sendMessage(accountId, conversationId, message.trim(), authReq.jwt, authReq.apiToken);
        if (ok) {
            res.json({ success: true });
        }
        else {
            res.status(500).json({ error: 'Falha ao enviar mensagem' });
        }
    }
    catch (error) {
        return handleCwError(res, error, 'POST /reply');
    }
});
// POST /api/cwapp/conversations/:id/read — marca como lido
router.post('/:id/read', async (req, res) => {
    const authReq = req;
    const accountId = authReq.accountId;
    const conversationId = parseInt(req.params.id);
    try {
        await chatwoot_1.default.markConversationAsRead(accountId, conversationId, authReq.jwt, authReq.apiToken);
        res.json({ success: true });
    }
    catch (error) {
        return handleCwError(res, error, 'POST /read');
    }
});
// GET /api/cwapp/conversations/:id — detalhes
router.get('/:id', async (req, res) => {
    const authReq = req;
    const accountId = authReq.accountId;
    const conversationId = parseInt(req.params.id);
    try {
        const conv = await chatwoot_1.default.getConversation(accountId, conversationId, authReq.jwt, authReq.apiToken);
        res.json({ conversation: conv });
    }
    catch (error) {
        return handleCwError(res, error, 'GET /conversations/:id');
    }
});
// DELETE /api/cwapp/conversations/:id — deleta conversa
router.delete('/:id', async (req, res) => {
    const authReq = req;
    const accountId = authReq.accountId;
    const conversationId = parseInt(req.params.id);
    try {
        const ok = await chatwoot_1.default.deleteConversation(accountId, conversationId, authReq.jwt, authReq.apiToken);
        if (ok) {
            res.json({ success: true });
        }
        else {
            res.status(500).json({ error: 'Falha ao deletar conversa' });
        }
    }
    catch (error) {
        const status = error.response?.status || 500;
        const msg = error.response?.data?.message
            || error.response?.data?.error
            || error.message
            || 'Erro ao deletar conversa';
        logger_1.default.error('CWApp DELETE /conversations/:id failed', { error: msg, status });
        res.status(status === 403 ? 403 : 500).json({ error: msg });
    }
});
// POST /api/cwapp/conversations/:id/attachment — envia arquivo (imagem, audio, documento)
const UPLOAD_DIR = '/tmp/cwapp-uploads/';
// Usa diskStorage com callback lazy para evitar mkdirp.sync() no startup (crasharia se disco cheio)
const upload = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: (_req, _file, cb) => {
            try {
                fs_1.default.mkdirSync(UPLOAD_DIR, { recursive: true });
            }
            catch { }
            cb(null, UPLOAD_DIR);
        },
        filename: (_req, _file, cb) => {
            cb(null, Date.now().toString(16) + Math.random().toString(16).slice(2));
        },
    }),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});
router.post('/:id/attachment', upload.single('file'), async (req, res) => {
    const authReq = req;
    const accountId = authReq.accountId;
    const conversationId = parseInt(req.params.id);
    const caption = (req.body?.caption || '').trim();
    const file = req.file;
    logger_1.default.info('CWApp attachment POST recebido', {
        conversationId,
        accountId,
        hasFile: !!file,
        mimetype: file?.mimetype,
        originalname: file?.originalname,
        size: file?.size,
    });
    if (!file) {
        logger_1.default.warn('CWApp attachment: nenhum arquivo no request', { conversationId });
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    let namedPath = null;
    let convertedPath = null;
    try {
        // Renomeia para ter a extensão correta (Chatwoot precisa)
        const ext = path_1.default.extname(file.originalname) || '.bin';
        namedPath = file.path + ext;
        fs_1.default.renameSync(file.path, namedPath);
        // Se for áudio webm, converte para ogg (opus remux) para compatibilidade com WhatsApp.
        // WebM não é suportado pelo WhatsApp — OGG Opus é o formato nativo de mensagens de voz.
        // A conversão é apenas remux (sem recodificação), então é praticamente instantânea.
        let sendPath = namedPath;
        const isAudioWebm = file.mimetype?.startsWith('audio/') && namedPath.endsWith('.webm');
        if (isAudioWebm) {
            const oggPath = namedPath.replace('.webm', '.ogg');
            try {
                (0, child_process_1.execSync)(`ffmpeg -i "${namedPath}" -c:a copy -f ogg "${oggPath}" -y 2>/dev/null`);
                convertedPath = oggPath;
                sendPath = oggPath;
                logger_1.default.info('Audio converted from webm to ogg for WhatsApp compatibility', { conversationId });
            }
            catch (convErr) {
                logger_1.default.warn('ffmpeg conversion failed, sending original webm', { conversationId });
            }
        }
        const ok = await chatwoot_1.default.sendMessage(accountId, conversationId, caption, authReq.jwt, authReq.apiToken, sendPath);
        // Remove arquivos temporários
        try {
            if (namedPath)
                fs_1.default.unlinkSync(namedPath);
        }
        catch { }
        try {
            if (convertedPath)
                fs_1.default.unlinkSync(convertedPath);
        }
        catch { }
        if (ok) {
            res.json({ success: true });
        }
        else {
            res.status(500).json({ error: 'Falha ao enviar arquivo' });
        }
    }
    catch (error) {
        // Limpa arquivos em caso de erro
        try {
            if (file?.path)
                fs_1.default.unlinkSync(file.path);
        }
        catch { }
        try {
            if (namedPath)
                fs_1.default.unlinkSync(namedPath);
        }
        catch { }
        try {
            if (convertedPath)
                fs_1.default.unlinkSync(convertedPath);
        }
        catch { }
        return handleCwError(res, error, 'POST /attachment');
    }
});
// GET /api/cwapp/conversations/:id/agents — lista agentes da conta
router.get('/:id/agents', async (req, res) => {
    const authReq = req;
    const accountId = authReq.accountId;
    try {
        const agents = await chatwoot_1.default.getAccountAgents(accountId, authReq.jwt, authReq.apiToken);
        res.json({ agents: agents || [] });
    }
    catch (error) {
        return handleCwError(res, error, 'GET /agents');
    }
});
// POST /api/cwapp/conversations/:id/assign — atribui agente à conversa
router.post('/:id/assign', async (req, res) => {
    const authReq = req;
    const accountId = authReq.accountId;
    const conversationId = parseInt(req.params.id);
    const { agentId } = req.body;
    if (!agentId)
        return res.status(400).json({ error: 'agentId obrigatório' });
    try {
        const ok = await chatwoot_1.default.assignAgent(conversationId, agentId, accountId, authReq.jwt, authReq.apiToken);
        if (ok)
            res.json({ success: true });
        else
            res.status(500).json({ error: 'Falha ao atribuir agente' });
    }
    catch (error) {
        return handleCwError(res, error, 'POST /assign');
    }
});
exports.default = router;
//# sourceMappingURL=cwapp-conversations.js.map