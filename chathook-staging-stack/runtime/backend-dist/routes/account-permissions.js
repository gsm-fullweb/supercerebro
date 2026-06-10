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
const database_1 = __importDefault(require("../services/database"));
const chatwoot_1 = __importDefault(require("../services/chatwoot"));
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
// Verifica se a requisição carrega um API token KanbanCW com o escopo necessário
async function hasApiTokenScope(req, scope) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
        return false;
    const token = authHeader.substring(7);
    try {
        const apiToken = await database_1.default.apiToken.findUnique({ where: { token } });
        if (!apiToken || !apiToken.isActive)
            return false;
        if (apiToken.expiresAt && apiToken.expiresAt < new Date())
            return false;
        const perms = JSON.parse(apiToken.permissions || '[]');
        return perms.includes('*') || perms.includes(scope) || perms.includes('account-permissions:write');
    }
    catch {
        return false;
    }
}
// GET /api/account-permissions - Lista todas as accounts com suas permissões (apenas Super Admin)
router.get('/', async (req, res) => {
    const authReq = req;
    try {
        // Aceita API token KanbanCW com escopo account-permissions:read OU validação SuperAdmin Chatwoot
        const scopeOk = await hasApiTokenScope(req, 'account-permissions:read');
        if (!scopeOk) {
            const profile = await chatwoot_1.default.getUserProfile(authReq.jwt, authReq.apiToken);
            if (profile.type !== 'SuperAdmin') {
                return res.status(403).json({ error: 'Acesso negado. Apenas Super Admins podem gerenciar permissões.' });
            }
        }
        // Busca accounts diretamente do banco de dados do Chatwoot
        const chatwootDbUrl = process.env.CHATWOOT_DATABASE_URL;
        let accounts = [];
        if (chatwootDbUrl) {
            // Se tiver conexão com banco do Chatwoot, busca direto de lá
            const { Client } = await Promise.resolve().then(() => __importStar(require('pg')));
            const client = new Client({ connectionString: chatwootDbUrl });
            try {
                await client.connect();
                const result = await client.query('SELECT id, name FROM accounts ORDER BY id');
                accounts = result.rows.map(row => ({
                    id: row.id,
                    name: row.name,
                    status: 'active'
                }));
                await client.end();
                logger_1.default.info('Accounts fetched from Chatwoot database', {
                    userId: authReq.user.id,
                    count: accounts.length
                });
            }
            catch (error) {
                logger_1.default.error('Failed to fetch from Chatwoot database', {
                    userId: authReq.user.id,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                await client.end().catch(() => { });
                // Fallback: busca do nosso banco
                const accountIds = await database_1.default.$queryRaw `
          SELECT DISTINCT "accountId"
          FROM (
            SELECT DISTINCT "accountId" FROM "Funnel"
            UNION
            SELECT DISTINCT "accountId" FROM "AccountPermissions"
          ) accounts
          ORDER BY "accountId"
        `;
                accounts = accountIds.map(({ accountId }) => ({
                    id: accountId,
                    name: `Account ${accountId}`,
                    status: 'active'
                }));
            }
        }
        else {
            // Sem conexão com Chatwoot DB, busca do nosso banco
            const accountIds = await database_1.default.$queryRaw `
        SELECT DISTINCT "accountId"
        FROM (
          SELECT DISTINCT "accountId" FROM "Funnel"
          UNION
          SELECT DISTINCT "accountId" FROM "AccountPermissions"
        ) accounts
        ORDER BY "accountId"
      `;
            accounts = accountIds.map(({ accountId }) => ({
                id: accountId,
                name: `Account ${accountId}`,
                status: 'active'
            }));
        }
        // Busca permissões do banco de dados
        const permissions = await database_1.default.accountPermissions.findMany();
        const permissionsMap = new Map(permissions.map(p => [p.accountId, p]));
        // Combina dados das accounts com permissões
        const accountsWithPermissions = accounts.map((account) => {
            const perms = permissionsMap.get(account.id);
            // Parse allowedProviders do banco (JSON array) → objeto {evolution, waha, uazapi}
            let allowedProvidersRaw = ['evolution', 'waha', 'uazapi', 'evolution-go'];
            if (perms?.allowedProviders) {
                try {
                    allowedProvidersRaw = JSON.parse(perms.allowedProviders);
                }
                catch { }
            }
            const allowedProviders = {
                evolution: allowedProvidersRaw.includes('evolution'),
                waha: allowedProvidersRaw.includes('waha'),
                uazapi: allowedProvidersRaw.includes('uazapi'),
                'evolution-go': allowedProvidersRaw.includes('evolution-go'),
            };
            return {
                id: account.id,
                name: account.name,
                status: account.status,
                allowedProviders,
                permissions: {
                    kanbanEnabled: perms?.kanbanEnabled ?? true,
                    chatsInternosEnabled: perms?.chatsInternosEnabled ?? true,
                    conexoesEnabled: perms?.conexoesEnabled ?? true,
                    projectsEnabled: perms?.projectsEnabled ?? true,
                    chatbotFlowsEnabled: perms?.chatbotFlowsEnabled ?? true,
                    wavoipEnabled: perms?.wavoipEnabled ?? false,
                    appointmentsEnabled: perms?.appointmentsEnabled ?? true,
                    disparadorEnabled: perms?.disparadorEnabled ?? true,
                }
            };
        });
        logger_1.default.info('Account permissions listed', {
            userId: authReq.user.id,
            totalAccounts: accountsWithPermissions.length
        });
        res.json({ data: accountsWithPermissions });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger_1.default.error('Failed to list account permissions', {
            userId: authReq.user.id,
            error: errorMessage
        });
        res.status(500).json({ error: 'Falha ao listar permissões das empresas' });
    }
});
// PUT /api/account-permissions/:accountId - Atualiza permissões de uma account (apenas Super Admin)
router.put('/:accountId', async (req, res) => {
    const authReq = req;
    const accountId = parseInt(req.params.accountId);
    const { kanbanEnabled, chatsInternosEnabled, conexoesEnabled, projectsEnabled, chatbotFlowsEnabled, wavoipEnabled, appointmentsEnabled, disparadorEnabled, allowedProviders } = req.body;
    if (isNaN(accountId)) {
        return res.status(400).json({ error: 'ID da empresa inválido' });
    }
    // Valida campos booleanos (apenas os enviados)
    const boolFields = { kanbanEnabled, chatsInternosEnabled, conexoesEnabled, projectsEnabled, chatbotFlowsEnabled, wavoipEnabled, appointmentsEnabled, disparadorEnabled };
    for (const [key, val] of Object.entries(boolFields)) {
        if (val !== undefined && typeof val !== 'boolean') {
            return res.status(400).json({ error: `Campo '${key}' deve ser boolean` });
        }
    }
    // Converte allowedProviders (objeto {evolution:true, waha:false} → array ['evolution'])
    let resolvedProviders;
    if (allowedProviders !== undefined) {
        if (typeof allowedProviders === 'object' && !Array.isArray(allowedProviders)) {
            const valid = ['evolution', 'waha', 'uazapi', 'evolution-go'];
            resolvedProviders = valid.filter(p => allowedProviders[p] === true);
        }
        else if (Array.isArray(allowedProviders)) {
            resolvedProviders = allowedProviders.filter((p) => ['evolution', 'waha', 'uazapi', 'evolution-go'].includes(p));
        }
        if (resolvedProviders && resolvedProviders.length === 0) {
            return res.status(400).json({ error: 'Pelo menos um provedor deve ser habilitado' });
        }
    }
    if (Object.values(boolFields).every(v => v === undefined) && resolvedProviders === undefined) {
        return res.status(400).json({ error: 'Envie ao menos um campo para atualizar' });
    }
    try {
        // Aceita API token KanbanCW com escopo account-permissions:write OU validação SuperAdmin Chatwoot
        const scopeOk = await hasApiTokenScope(req, 'account-permissions:write');
        if (!scopeOk) {
            const profile = await chatwoot_1.default.getUserProfile(authReq.jwt, authReq.apiToken);
            if (profile.type !== 'SuperAdmin') {
                return res.status(403).json({ error: 'Acesso negado. Apenas Super Admins podem gerenciar permissões.' });
            }
        }
        // Busca valores atuais para mesclar (suporte a atualização parcial)
        const existing = await database_1.default.accountPermissions.findUnique({ where: { accountId } });
        const defaults = { kanbanEnabled: true, chatsInternosEnabled: true, conexoesEnabled: true, projectsEnabled: true, chatbotFlowsEnabled: true, wavoipEnabled: false, appointmentsEnabled: true, disparadorEnabled: true };
        const current = existing ?? defaults;
        const permissions = await database_1.default.accountPermissions.upsert({
            where: { accountId },
            create: {
                accountId,
                kanbanEnabled: kanbanEnabled ?? current.kanbanEnabled,
                chatsInternosEnabled: chatsInternosEnabled ?? current.chatsInternosEnabled,
                conexoesEnabled: conexoesEnabled ?? current.conexoesEnabled,
                projectsEnabled: projectsEnabled ?? current.projectsEnabled,
                chatbotFlowsEnabled: chatbotFlowsEnabled ?? current.chatbotFlowsEnabled,
                wavoipEnabled: wavoipEnabled ?? current.wavoipEnabled,
                appointmentsEnabled: appointmentsEnabled ?? current.appointmentsEnabled,
                disparadorEnabled: disparadorEnabled ?? current.disparadorEnabled,
                ...(resolvedProviders !== undefined && { allowedProviders: JSON.stringify(resolvedProviders) }),
            },
            update: {
                ...(kanbanEnabled !== undefined && { kanbanEnabled }),
                ...(chatsInternosEnabled !== undefined && { chatsInternosEnabled }),
                ...(conexoesEnabled !== undefined && { conexoesEnabled }),
                ...(projectsEnabled !== undefined && { projectsEnabled }),
                ...(chatbotFlowsEnabled !== undefined && { chatbotFlowsEnabled }),
                ...(wavoipEnabled !== undefined && { wavoipEnabled }),
                ...(appointmentsEnabled !== undefined && { appointmentsEnabled }),
                ...(disparadorEnabled !== undefined && { disparadorEnabled }),
                ...(resolvedProviders !== undefined && { allowedProviders: JSON.stringify(resolvedProviders) }),
            }
        });
        logger_1.default.info('Account permissions updated', {
            userId: authReq.user.id,
            accountId,
            permissions: { kanbanEnabled, chatsInternosEnabled, conexoesEnabled }
        });
        res.json({ data: permissions });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger_1.default.error('Failed to update account permissions', {
            userId: authReq.user.id,
            accountId,
            error: errorMessage
        });
        res.status(500).json({ error: 'Falha ao atualizar permissões da empresa' });
    }
});
// GET /api/account-permissions/check/:accountId - Verifica permissões de uma account específica
router.get('/check/:accountId', async (req, res) => {
    const authReq = req;
    const accountId = parseInt(req.params.accountId);
    if (isNaN(accountId)) {
        return res.status(400).json({ error: 'ID da empresa inválido' });
    }
    try {
        const permissions = await database_1.default.accountPermissions.findUnique({
            where: { accountId }
        });
        // Se não encontrar, retorna permissões padrão (tudo habilitado)
        const result = {
            kanbanEnabled: permissions?.kanbanEnabled ?? true,
            chatsInternosEnabled: permissions?.chatsInternosEnabled ?? true,
            conexoesEnabled: permissions?.conexoesEnabled ?? true,
            projectsEnabled: permissions?.projectsEnabled ?? true,
            chatbotFlowsEnabled: permissions?.chatbotFlowsEnabled ?? true,
            wavoipEnabled: permissions?.wavoipEnabled ?? false,
            appointmentsEnabled: permissions?.appointmentsEnabled ?? true,
            disparadorEnabled: permissions?.disparadorEnabled ?? true,
        };
        res.json({ data: result });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger_1.default.error('Failed to check account permissions', {
            userId: authReq.user.id,
            accountId,
            error: errorMessage
        });
        res.status(500).json({ error: 'Falha ao verificar permissões da empresa' });
    }
});
exports.default = router;
//# sourceMappingURL=account-permissions.js.map