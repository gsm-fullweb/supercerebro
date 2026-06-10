"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evolutionGoRouter = void 0;
exports.evolutionGoInternalHandler = evolutionGoInternalHandler;
exports.evolutionGoGlobalConfigHandler = evolutionGoGlobalConfigHandler;
const express_1 = require("express");
const crypto_1 = require("crypto");
const database_1 = __importDefault(require("../services/database"));
const encryption_1 = require("../utils/encryption");
const chatwoot_1 = __importDefault(require("../services/chatwoot"));
const chatwootDatabase_1 = __importDefault(require("../services/chatwootDatabase"));
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
exports.evolutionGoRouter = router;
function maskSensitive(value) {
    if (!value || value.length < 8)
        return '••••••••';
    return value.slice(0, 4) + '••••••••' + value.slice(-4);
}
// Permite SuperAdmin ou administrador da conta
function isSuperAdminOrAdmin(authReq, profile) {
    if (profile.type === 'SuperAdmin')
        return true;
    const role = authReq.user?.role;
    return role === 'administrator' || role === 1;
}
/**
 * GET /api/admin/evolution-go
 * Retorna URL + status (API Key mascarada)
 */
router.get('/', async (req, res) => {
    try {
        const authReq = req;
        const profile = await chatwoot_1.default.getUserProfile(authReq.jwt, authReq.apiToken);
        if (!isSuperAdminOrAdmin(authReq, profile)) {
            return res.status(403).json({ error: 'Acesso restrito a administradores' });
        }
        // Usa o accountId do middleware de auth (respeita X-Account-ID), não o account primário do SuperAdmin
        const accountId = authReq.user?.account_id ?? profile.account_id;
        const config = await database_1.default.evolutionGoConfig.findUnique({
            where: { accountId },
        });
        if (!config)
            return res.json({ data: null });
        res.json({
            data: {
                evolutionUrl: config.evolutionUrl,
                evolutionApiKey: maskSensitive((0, encryption_1.decrypt)(config.evolutionApiKey) || ''),
                connectorToken: config.connectorToken,
                enabled: config.enabled,
                updatedAt: config.updatedAt,
            },
        });
    }
    catch (error) {
        logger_1.default.error('EvolutionGo: GET error', { error });
        res.status(500).json({ error: 'Erro ao buscar configuração' });
    }
});
/**
 * POST /api/admin/evolution-go
 * Salva URL + API Key. Gera connectorToken na primeira vez.
 */
router.post('/', async (req, res) => {
    try {
        const authReq = req;
        const profile = await chatwoot_1.default.getUserProfile(authReq.jwt, authReq.apiToken);
        if (!isSuperAdminOrAdmin(authReq, profile)) {
            return res.status(403).json({ error: 'Acesso restrito a administradores' });
        }
        const { evolutionUrl, evolutionApiKey } = req.body;
        if (!evolutionUrl || !evolutionApiKey) {
            return res.status(400).json({ error: 'URL e API Key são obrigatórios' });
        }
        // Usa o accountId do middleware de auth (respeita X-Account-ID), não o account primário do SuperAdmin
        const accountId = authReq.user?.account_id ?? profile.account_id;
        const existing = await database_1.default.evolutionGoConfig.findUnique({ where: { accountId } });
        // Mantém chave existente se o frontend enviou valor mascarado
        const isMasked = (v) => v.includes('••••');
        const encryptedKey = isMasked(evolutionApiKey)
            ? (existing?.evolutionApiKey ?? (0, encryption_1.encrypt)(evolutionApiKey))
            : (0, encryption_1.encrypt)(evolutionApiKey);
        const connectorToken = existing?.connectorToken ?? (0, crypto_1.randomUUID)();
        const config = await database_1.default.evolutionGoConfig.upsert({
            where: { accountId },
            create: {
                accountId,
                evolutionUrl: evolutionUrl.replace(/\/$/, ''),
                evolutionApiKey: encryptedKey,
                connectorToken,
                updatedAt: new Date(),
            },
            update: {
                evolutionUrl: evolutionUrl.replace(/\/$/, ''),
                evolutionApiKey: encryptedKey,
                updatedAt: new Date(),
            },
        });
        logger_1.default.info('EvolutionGo: config saved', { accountId });
        res.json({ data: { connectorToken: config.connectorToken, updatedAt: config.updatedAt } });
    }
    catch (error) {
        logger_1.default.error('EvolutionGo: POST error', { error });
        res.status(500).json({ error: 'Erro ao salvar configuração' });
    }
});
/**
 * DELETE /api/admin/evolution-go
 */
router.delete('/', async (req, res) => {
    try {
        const authReq = req;
        const profile = await chatwoot_1.default.getUserProfile(authReq.jwt, authReq.apiToken);
        if (!isSuperAdminOrAdmin(authReq, profile)) {
            return res.status(403).json({ error: 'Acesso restrito a administradores' });
        }
        const accountId = authReq.user?.account_id ?? profile.account_id;
        await database_1.default.evolutionGoConfig.deleteMany({ where: { accountId } });
        res.json({ data: { deleted: true } });
    }
    catch (error) {
        logger_1.default.error('EvolutionGo: DELETE error', { error });
        res.status(500).json({ error: 'Erro ao remover configuração' });
    }
});
// ──────────────────────────────────────────────────────────────
// Endpoint interno — autenticado via connectorToken (Bearer)
// O conector chama isso no boot para buscar as credenciais globais
// + lista de instâncias ativas (virá de Conexões futuramente)
// ──────────────────────────────────────────────────────────────
async function evolutionGoInternalHandler(req, res) {
    try {
        const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
        if (!token)
            return res.status(401).json({ error: 'Token não fornecido' });
        // Verifica se o token é válido (pertence a algum account OU é o MASTER_CONNECTOR_TOKEN)
        const masterToken = process.env.MASTER_CONNECTOR_TOKEN || '';
        const isMaster = masterToken && token === masterToken;
        if (!isMaster) {
            const exists = await database_1.default.evolutionGoConfig.findUnique({ where: { connectorToken: token } });
            if (!exists)
                return res.status(401).json({ error: 'Token inválido' });
        }
        // Config compartilhada (qualquer conta habilitada — única instalação por servidor)
        const sharedConfig = await database_1.default.evolutionGoConfig.findFirst({ where: { enabled: true } });
        if (!sharedConfig) {
            return res.json({ data: [] });
        }
        const chatwootUrl = process.env.CHATWOOT_API_URL || '';
        // Busca todas as instâncias de todas as contas (multi-tenant compartilhado)
        const allInstances = await database_1.default.evolutionGoInstance.findMany({
            select: { accountId: true, instanceName: true, evoInstanceName: true, inboxId: true, instanceToken: true, signMsg: true, ignoreGroups: true },
        });
        // Agrupa por accountId
        const byAccount = new Map();
        for (const inst of allInstances) {
            if (!byAccount.has(inst.accountId))
                byAccount.set(inst.accountId, []);
            byAccount.get(inst.accountId).push(inst);
        }
        // Inclui também contas sem instâncias (que têm config própria habilitada)
        const configs = await database_1.default.evolutionGoConfig.findMany({ where: { enabled: true } });
        for (const cfg of configs) {
            if (!byAccount.has(cfg.accountId))
                byAccount.set(cfg.accountId, []);
        }
        const result = await Promise.all(Array.from(byAccount.entries()).map(async ([accountId, instances]) => {
            const chatwootToken = await chatwootDatabase_1.default.getAdminApiTokenForAccount(accountId).catch(() => null);
            // Usa config própria da conta se existir, senão usa a compartilhada
            const accountConfig = configs.find(c => c.accountId === accountId) || sharedConfig;
            return {
                accountId,
                evolutionUrl: accountConfig.evolutionUrl,
                evolutionApiKey: (0, encryption_1.decrypt)(accountConfig.evolutionApiKey),
                chatwootUrl,
                chatwootAccountId: String(accountId),
                chatwootToken: chatwootToken || '',
                instances: instances.map(i => ({
                    instanceName: i.evoInstanceName || i.instanceName,
                    displayName: i.instanceName,
                    inboxId: i.inboxId,
                    instanceToken: i.instanceToken || undefined,
                    signMsg: i.signMsg,
                    ignoreGroups: i.ignoreGroups,
                })),
            };
        }));
        res.json({ data: result });
    }
    catch (error) {
        logger_1.default.error('EvolutionGo: internal handler error', { error });
        res.status(500).json({ error: 'Erro interno' });
    }
}
// ──────────────────────────────────────────────────────────────
// Endpoint global — retorna configuração de TODOS os accounts habilitados
// Autenticado via MASTER_CONNECTOR_TOKEN (variável de ambiente do backend)
// Permite que um único conector sirva múltiplas empresas
// ──────────────────────────────────────────────────────────────
async function evolutionGoGlobalConfigHandler(req, res) {
    try {
        const masterToken = process.env.MASTER_CONNECTOR_TOKEN || '';
        if (!masterToken) {
            return res.status(501).json({ error: 'Global mode não configurado (MASTER_CONNECTOR_TOKEN ausente)' });
        }
        const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
        if (!token || token !== masterToken) {
            return res.status(401).json({ error: 'Token inválido' });
        }
        // Config compartilhada (única instalação Evolution Go por servidor)
        const sharedConfig = await database_1.default.evolutionGoConfig.findFirst({ where: { enabled: true } });
        if (!sharedConfig) {
            return res.json({ data: [] });
        }
        const chatwootUrl = process.env.CHATWOOT_API_URL || '';
        // Busca todas as instâncias de todas as contas
        const allInstances = await database_1.default.evolutionGoInstance.findMany({
            select: { accountId: true, instanceName: true, evoInstanceName: true, inboxId: true, instanceToken: true, signMsg: true, ignoreGroups: true },
        });
        const byAccount = new Map();
        for (const inst of allInstances) {
            if (!byAccount.has(inst.accountId))
                byAccount.set(inst.accountId, []);
            byAccount.get(inst.accountId).push(inst);
        }
        // Inclui contas sem instâncias mas com config própria habilitada
        const configs = await database_1.default.evolutionGoConfig.findMany({ where: { enabled: true } });
        for (const cfg of configs) {
            if (!byAccount.has(cfg.accountId))
                byAccount.set(cfg.accountId, []);
        }
        const result = await Promise.all(Array.from(byAccount.entries()).map(async ([accountId, instances]) => {
            const chatwootToken = await chatwootDatabase_1.default.getAdminApiTokenForAccount(accountId).catch(() => null);
            const accountConfig = configs.find(c => c.accountId === accountId) || sharedConfig;
            return {
                accountId,
                evolutionUrl: accountConfig.evolutionUrl,
                evolutionApiKey: (0, encryption_1.decrypt)(accountConfig.evolutionApiKey),
                chatwootUrl,
                chatwootAccountId: String(accountId),
                chatwootToken: chatwootToken || '',
                instances: instances.map(i => ({
                    instanceName: i.evoInstanceName || i.instanceName,
                    displayName: i.instanceName,
                    inboxId: i.inboxId,
                    instanceToken: i.instanceToken || undefined,
                    signMsg: i.signMsg,
                    ignoreGroups: i.ignoreGroups,
                })),
            };
        }));
        res.json({ data: result });
    }
    catch (error) {
        logger_1.default.error('EvolutionGo: global config handler error', { error });
        res.status(500).json({ error: 'Erro interno' });
    }
}
//# sourceMappingURL=evolutionGo.js.map