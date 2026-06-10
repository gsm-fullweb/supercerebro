"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../services/database"));
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
/**
 * GET /api/user/preferences
 * Retorna as preferências do usuário autenticado
 */
router.get('/user/preferences', async (req, res) => {
    const authReq = req;
    const { id: userId, account_id: accountId } = authReq.user;
    try {
        const perm = await database_1.default.userResourcePermission.findUnique({
            where: { accountId_userId: { accountId, userId } },
            select: { defaultFunnelId: true }
        });
        res.json({ data: { defaultFunnelId: perm?.defaultFunnelId ?? null } });
    }
    catch (error) {
        logger_1.default.error('Error fetching user preferences', { userId, accountId, error });
        res.status(500).json({ error: 'Erro ao buscar preferências' });
    }
});
/**
 * PUT /api/user/preferences
 * Atualiza as preferências do usuário (ex: funil padrão)
 * Body: { defaultFunnelId: number | null }
 */
router.put('/user/preferences', async (req, res) => {
    const authReq = req;
    const { id: userId, account_id: accountId } = authReq.user;
    const { defaultFunnelId } = req.body;
    try {
        // Valida que o funil existe e pertence à conta (se não for null)
        if (defaultFunnelId !== null && defaultFunnelId !== undefined) {
            const funnel = await database_1.default.funnel.findFirst({
                where: { id: Number(defaultFunnelId), accountId }
            });
            if (!funnel) {
                return res.status(404).json({ error: 'Funil não encontrado' });
            }
        }
        const perm = await database_1.default.userResourcePermission.upsert({
            where: { accountId_userId: { accountId, userId } },
            create: {
                accountId,
                userId,
                defaultFunnelId: defaultFunnelId ?? null
            },
            update: {
                defaultFunnelId: defaultFunnelId ?? null
            },
            select: { defaultFunnelId: true }
        });
        logger_1.default.info('User default funnel updated', { userId, accountId, defaultFunnelId: perm.defaultFunnelId });
        res.json({ data: { defaultFunnelId: perm.defaultFunnelId } });
    }
    catch (error) {
        logger_1.default.error('Error updating user preferences', { userId, accountId, error });
        res.status(500).json({ error: 'Erro ao salvar preferências' });
    }
});
exports.default = router;
//# sourceMappingURL=userPreferences.js.map