"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../services/database"));
const chatwootDatabase_1 = __importDefault(require("../services/chatwootDatabase"));
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
// GET /api/features - Retorna quais features estão habilitadas para a account do usuário
router.get('/', async (req, res) => {
    const authReq = req;
    try {
        const permissions = await database_1.default.accountPermissions.findUnique({
            where: { accountId: authReq.user.account_id }
        });
        // Se não encontrar permissões, assume tudo habilitado (padrão)
        const waInboxes = await chatwootDatabase_1.default.getAllWhatsappInboxes(authReq.user.account_id).catch(() => []);
        const features = {
            kanbanEnabled: permissions?.kanbanEnabled ?? true,
            chatsInternosEnabled: permissions?.chatsInternosEnabled ?? true,
            conexoesEnabled: permissions?.conexoesEnabled ?? true,
            projectsEnabled: permissions?.projectsEnabled ?? true,
            chatbotFlowsEnabled: permissions?.chatbotFlowsEnabled ?? true,
            appointmentsEnabled: permissions?.appointmentsEnabled ?? true,
            atendimentosEnabled: permissions?.atendimentosEnabled ?? true,
            disparadorEnabled: permissions?.disparadorEnabled ?? true,
            hasOfficialWaInboxes: waInboxes.length > 0,
        };
        logger_1.default.info('Features checked', {
            accountId: authReq.user.account_id,
            userId: authReq.user.id,
            features
        });
        res.json({ data: features });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger_1.default.error('Failed to check features', {
            userId: authReq.user.id,
            error: errorMessage
        });
        // Em caso de erro, retorna tudo habilitado (fail-open)
        res.json({
            data: {
                kanbanEnabled: true,
                chatsInternosEnabled: true,
                conexoesEnabled: true,
                projectsEnabled: true,
                chatbotFlowsEnabled: true,
                appointmentsEnabled: true,
                atendimentosEnabled: true,
                disparadorEnabled: true,
                hasOfficialWaInboxes: false,
            }
        });
    }
});
exports.default = router;
//# sourceMappingURL=features.js.map