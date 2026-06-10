"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
const database_1 = __importDefault(require("../services/database"));
const logger_1 = __importDefault(require("../utils/logger"));
const systemSettings_1 = require("../services/systemSettings");
const evolution_1 = require("../services/evolution");
const waha_1 = require("../services/waha");
const router = (0, express_1.Router)();
// Multer para CSV de sanitização
const csvStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        const dir = '/tmp/sanitize-csv';
        fs_1.default.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        cb(null, `${Date.now()}-${crypto_1.default.randomBytes(6).toString('hex')}${path_1.default.extname(file.originalname)}`);
    },
});
const uploadCsv = (0, multer_1.default)({
    storage: csvStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (['.csv', '.txt'].includes(path_1.default.extname(file.originalname).toLowerCase())) {
            cb(null, true);
        }
        else {
            cb(new Error('Somente arquivos .csv ou .txt são aceitos'));
        }
    },
});
/** Parseia CSV e retorna linhas */
function parseCsv(content) {
    const lines = content.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0)
        return [];
    const firstLine = lines[0];
    const sep = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';
    // Detecta se há header (primeira célula não é numérica)
    const firstCell = firstLine.split(sep)[0].trim().replace(/^"|"$/g, '');
    const hasHeader = isNaN(Number(firstCell.replace(/\D/g, ''))) || firstCell.replace(/\D/g, '').length < 8;
    let headers = [];
    let dataLines = [];
    if (hasHeader) {
        headers = firstLine.split(sep).map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());
        dataLines = lines.slice(1);
    }
    else {
        // Sem header: assume coluna 0 = phone, coluna 1 = name
        headers = ['telefone', 'nome'];
        dataLines = lines;
    }
    // Identifica colunas de phone e name
    const phoneCol = headers.findIndex((h) => /^(tel|phone|telefone|celular|numero|number|fone|whatsapp|contato)/.test(h)) ?? 0;
    const nameCol = headers.findIndex((h) => /^(nome|name|cliente|contact|contato)/.test(h));
    const raw = dataLines.map((line) => {
        const values = line.split(sep).map((v) => v.trim().replace(/^"|"$/g, ''));
        const phone = (values[phoneCol < 0 ? 0 : phoneCol] || '').replace(/\D/g, '');
        if (phone.length < 8)
            return null;
        const name = nameCol >= 0 ? values[nameCol] || undefined : undefined;
        const extra = {};
        headers.forEach((h, i) => { if (i !== phoneCol && i !== nameCol)
            extra[h] = values[i] || ''; });
        return { phone, name, extra };
    });
    return raw.filter((r) => r !== null);
}
/** Delay helper */
function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
/** Verifica números via Evolution API em lotes */
async function checkEvolution(accountId, instanceName, phones) {
    const settings = await (0, systemSettings_1.getSystemSettings)(accountId);
    const baseURL = settings.evolutionApiUrl || process.env.EVOLUTION_API_URL || '';
    const apiKey = settings.evolutionApiKey || process.env.EVOLUTION_API_KEY || '';
    const client = axios_1.default.create({
        baseURL,
        timeout: 30000,
        headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
    });
    const result = new Map();
    const BATCH_SIZE = 50;
    const BATCH_DELAY_MS = 1500;
    for (let i = 0; i < phones.length; i += BATCH_SIZE) {
        const batch = phones.slice(i, i + BATCH_SIZE);
        try {
            const response = await client.post(`/chat/whatsappNumbers/${instanceName}`, { numbers: batch });
            const items = Array.isArray(response.data) ? response.data : [];
            logger_1.default.info('Evolution checkNumbers batch response', { batchSize: batch.length, responseSize: items.length, sample: items.slice(0, 2) });
            for (const item of items) {
                const phone = String(item.number || item.jid || '').replace(/\D/g, '');
                if (phone.length >= 8) {
                    result.set(phone, {
                        exists: item.exists === true,
                        chatId: item.jid || undefined,
                    });
                }
            }
        }
        catch (err) {
            const errDetail = err?.response?.data || String(err);
            logger_1.default.warn('Evolution checkNumbers batch failed', { batchSize: batch.length, error: errDetail });
            // Não marca como false para não mascarar erros; serão resolvidos pelo fallback no caller
        }
        if (i + BATCH_SIZE < phones.length)
            await delay(BATCH_DELAY_MS);
    }
    return result;
}
/** Verifica números via WAHA (um por vez) */
async function checkWaha(accountId, instanceName, phones) {
    const settings = await (0, systemSettings_1.getSystemSettings)(accountId);
    const baseURL = settings.wahaApiUrl || process.env.WAHA_API_URL || '';
    const apiKey = settings.wahaApiKey || process.env.WAHA_API_KEY || '';
    const client = axios_1.default.create({
        baseURL,
        timeout: 15000,
        headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
    });
    // O instanceName extraído do padrão é o nome curto (ex: "15"), mas a WAHA
    // API precisa do nome completo da sessão (ex: "Whatsapp_15_CWID_2")
    const wahaSessionName = `Whatsapp_${instanceName}_CWID_${accountId}`;
    const result = new Map();
    const ITEM_DELAY_MS = 400;
    for (const phone of phones) {
        try {
            const response = await client.get('/api/contacts/check-exists', {
                params: { phone, session: wahaSessionName },
            });
            result.set(phone, {
                exists: response.data?.numberExists === true,
                chatId: response.data?.chatId || undefined,
            });
        }
        catch {
            result.set(phone, { exists: false });
        }
        await delay(ITEM_DELAY_MS);
    }
    return result;
}
/** Verifica números via UazAPI */
async function checkUazapi(accountId, instanceName, phones) {
    const config = await database_1.default.uazapiConfig.findUnique({ where: { accountId } }).catch(() => null);
    const baseURL = config?.baseUrl || process.env.UAZAPI_BASE_URL || '';
    const instance = await database_1.default.uazapiInstance.findFirst({
        where: { accountId, instanceName },
    }).catch(() => null);
    const token = instance?.instanceToken || '';
    const client = axios_1.default.create({
        baseURL,
        timeout: 15000,
        headers: { 'token': token, 'Content-Type': 'application/json' },
    });
    const result = new Map();
    const ITEM_DELAY_MS = 400;
    for (const phone of phones) {
        try {
            const response = await client.get(`/instance/${instanceName}/wa/${phone}`);
            const exists = response.data?.exists === true || response.data?.numberExists === true;
            result.set(phone, { exists, chatId: response.data?.chatId || undefined });
        }
        catch {
            result.set(phone, { exists: false });
        }
        await delay(ITEM_DELAY_MS);
    }
    return result;
}
/** Processa o job de sanitização em background */
async function processSanitizeJob(jobId, contacts, provider, instanceName, accountId) {
    const phones = contacts.map((c) => c.phone);
    let checkMap;
    try {
        if (provider === 'evolution') {
            checkMap = await checkEvolution(accountId, instanceName, phones);
        }
        else if (provider === 'waha') {
            checkMap = await checkWaha(accountId, instanceName, phones);
        }
        else {
            checkMap = await checkUazapi(accountId, instanceName, phones);
        }
        const results = contacts.map((c) => {
            // Tenta lookup direto; se não encontrar, tenta via sufixo (mismatch de código de país)
            const check = checkMap.get(c.phone)
                ?? [...checkMap.entries()].find(([k]) => k.endsWith(c.phone) || c.phone.endsWith(k))?.[1]
                ?? { exists: false };
            return {
                phone: c.phone,
                name: c.name || null,
                exists: check.exists,
                chatId: check.chatId || null,
                extra: c.extra,
            };
        });
        const validCount = results.filter((r) => r.exists).length;
        const invalidCount = results.filter((r) => !r.exists).length;
        await database_1.default.sanitizeJob.update({
            where: { id: jobId },
            data: {
                status: 'completed',
                checkedCount: results.length,
                validCount,
                invalidCount,
                results: results,
            },
        });
        logger_1.default.info('SanitizeJob completed', { jobId, total: results.length, valid: validCount, invalid: invalidCount });
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger_1.default.error('SanitizeJob failed', { jobId, error: msg });
        await database_1.default.sanitizeJob.update({
            where: { id: jobId },
            data: { status: 'failed', errorMessage: msg },
        });
    }
}
// ══════════════════════════════════════════════════════
// ROTAS
// ══════════════════════════════════════════════════════
/** GET /api/sanitize/instances — Lista instâncias disponíveis para sanitização (filtradas por conta) */
router.get('/sanitize/instances', async (req, res) => {
    const authReq = req;
    const accountId = authReq.user.account_id;
    const instances = [];
    // Evolution — usa fetchEvolutionInstances que já respeita as credenciais da conta
    try {
        const evList = await (0, evolution_1.fetchEvolutionInstances)(accountId);
        for (const inst of (Array.isArray(evList) ? evList : [])) {
            const name = inst.instance?.instanceName || inst.name || '';
            const state = inst.instance?.state || inst.connectionStatus || 'unknown';
            if (name)
                instances.push({ instanceName: name, provider: 'evolution', state });
        }
    }
    catch (err) {
        logger_1.default.warn('sanitize/instances: Evolution fetch failed', { error: String(err) });
    }
    // WAHA — filtra pelo padrão Whatsapp_{name}_CWID_{accountId} para isolar por conta
    try {
        const allSessions = await (0, waha_1.fetchWahaSessions)(accountId);
        const pattern = new RegExp(`^Whatsapp_(.+)_CWID_${accountId}$`);
        for (const session of (Array.isArray(allSessions) ? allSessions : [])) {
            const sessionName = session.name || '';
            const match = sessionName.match(pattern);
            if (match) {
                // Extrai o nome real da instância (sem o prefixo/sufixo CWID)
                const instanceName = match[1];
                instances.push({ instanceName, provider: 'waha', state: session.status || 'unknown' });
            }
        }
    }
    catch (err) {
        logger_1.default.warn('sanitize/instances: WAHA fetch failed', { error: String(err) });
    }
    // UazAPI — já filtrado por accountId no banco
    try {
        const uazapiInstances = await database_1.default.uazapiInstance.findMany({ where: { accountId } });
        const uazapiConfig = await database_1.default.uazapiConfig.findUnique({ where: { accountId } }).catch(() => null);
        if (uazapiConfig?.baseUrl) {
            for (const inst of uazapiInstances) {
                instances.push({ instanceName: inst.instanceName, provider: 'uazapi', state: 'connected' });
            }
        }
    }
    catch (err) {
        logger_1.default.warn('sanitize/instances: UazAPI fetch failed', { error: String(err) });
    }
    res.json({ data: instances });
});
/** POST /api/sanitize/upload — Faz upload do CSV e inicia verificação */
router.post('/sanitize/upload', uploadCsv.single('file'), async (req, res) => {
    const authReq = req;
    const accountId = authReq.user.account_id;
    const { provider, instanceName } = req.body;
    if (!req.file)
        return res.status(400).json({ error: 'Arquivo CSV obrigatório' });
    if (!provider || !['evolution', 'waha', 'uazapi'].includes(provider)) {
        return res.status(400).json({ error: 'Provedor inválido. Use: evolution, waha ou uazapi' });
    }
    if (!instanceName)
        return res.status(400).json({ error: 'instanceName obrigatório' });
    try {
        const content = fs_1.default.readFileSync(req.file.path, 'utf-8');
        fs_1.default.unlinkSync(req.file.path);
        const contacts = parseCsv(content);
        if (contacts.length === 0)
            return res.status(400).json({ error: 'Nenhum número encontrado no CSV' });
        if (contacts.length > 5000)
            return res.status(400).json({ error: 'Máximo de 5.000 números por verificação' });
        const job = await database_1.default.sanitizeJob.create({
            data: {
                accountId,
                status: 'running',
                provider,
                instanceName,
                totalNumbers: contacts.length,
                checkedCount: 0,
                validCount: 0,
                invalidCount: 0,
            },
        });
        // Processa em background sem bloquear a resposta
        processSanitizeJob(job.id, contacts, provider, instanceName, accountId).catch(() => { });
        logger_1.default.info('SanitizeJob created', { jobId: job.id, accountId, provider, instanceName, total: contacts.length });
        res.json({ data: { jobId: job.id, totalNumbers: contacts.length } });
    }
    catch (error) {
        logger_1.default.error('Error creating sanitize job', { error: String(error) });
        res.status(500).json({ error: 'Erro ao iniciar verificação' });
    }
});
/** GET /api/sanitize/:jobId — Status e resultados do job */
router.get('/sanitize/:jobId', async (req, res) => {
    const authReq = req;
    const accountId = authReq.user.account_id;
    const jobId = parseInt(req.params.jobId);
    if (isNaN(jobId))
        return res.status(400).json({ error: 'ID inválido' });
    const job = await database_1.default.sanitizeJob.findFirst({ where: { id: jobId, accountId } });
    if (!job)
        return res.status(404).json({ error: 'Job não encontrado' });
    res.json({
        data: {
            id: job.id,
            status: job.status,
            provider: job.provider,
            instanceName: job.instanceName,
            totalNumbers: job.totalNumbers,
            checkedCount: job.checkedCount,
            validCount: job.validCount,
            invalidCount: job.invalidCount,
            errorMessage: job.errorMessage,
            createdAt: job.createdAt,
            results: job.status === 'completed' ? job.results : null,
        },
    });
});
/** GET /api/sanitize/:jobId/download?filter=valid|invalid|all — Baixa CSV filtrado */
router.get('/sanitize/:jobId/download', async (req, res) => {
    const authReq = req;
    const accountId = authReq.user.account_id;
    const jobId = parseInt(req.params.jobId);
    const filter = req.query.filter || 'valid';
    if (isNaN(jobId))
        return res.status(400).json({ error: 'ID inválido' });
    const job = await database_1.default.sanitizeJob.findFirst({ where: { id: jobId, accountId } });
    if (!job || job.status !== 'completed')
        return res.status(404).json({ error: 'Job não encontrado ou ainda em execução' });
    const results = job.results || [];
    const filtered = filter === 'all' ? results : results.filter((r) => filter === 'valid' ? r.exists : !r.exists);
    // Monta CSV
    const extraKeys = filtered.length > 0 ? Object.keys(filtered[0].extra || {}) : [];
    const headers = ['telefone', 'nome', 'tem_whatsapp', ...extraKeys];
    const csvLines = [
        headers.join(','),
        ...filtered.map((r) => {
            const cols = [
                r.phone,
                r.name || '',
                r.exists ? 'sim' : 'nao',
                ...extraKeys.map((k) => r.extra?.[k] || ''),
            ];
            return cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',');
        }),
    ];
    const filterLabel = filter === 'valid' ? 'validos' : filter === 'invalid' ? 'invalidos' : 'todos';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="sanitizacao-${filterLabel}-${jobId}.csv"`);
    res.send(csvLines.join('\n'));
});
/** GET /api/sanitize — Lista jobs do account */
router.get('/sanitize', async (req, res) => {
    const authReq = req;
    const accountId = authReq.user.account_id;
    const jobs = await database_1.default.sanitizeJob.findMany({
        where: { accountId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
            id: true, status: true, provider: true, instanceName: true,
            totalNumbers: true, checkedCount: true, validCount: true, invalidCount: true,
            errorMessage: true, createdAt: true,
        },
    });
    res.json({ data: jobs });
});
/** DELETE /api/sanitize/:jobId — Remove job */
router.delete('/sanitize/:jobId', async (req, res) => {
    const authReq = req;
    const accountId = authReq.user.account_id;
    const jobId = parseInt(req.params.jobId);
    if (isNaN(jobId))
        return res.status(400).json({ error: 'ID inválido' });
    await database_1.default.sanitizeJob.deleteMany({ where: { id: jobId, accountId } });
    res.json({ success: true });
});
exports.default = router;
//# sourceMappingURL=sanitize.js.map