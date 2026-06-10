"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOAuthAccessToken = getOAuthAccessToken;
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const auth_1 = require("../middleware/auth");
const database_1 = __importDefault(require("../services/database"));
const logger_1 = __importDefault(require("../utils/logger"));
// curl-impersonate para bypassar TLS fingerprinting do Cloudflare
const CURL_IMPERSONATE_BIN = path_1.default.join(__dirname, '..', '..', 'node_modules', 'node-curl-impersonate', 'bin', 'curl-impersonate-chrome-linux-x86');
async function fetchWithCurlImpersonate(url, headers) {
    return new Promise((resolve, reject) => {
        const headerArgs = [];
        for (const [k, v] of Object.entries(headers)) {
            headerArgs.push('-H', `${k}: ${v}`);
        }
        const args = ['-s', '--max-time', '12', ...headerArgs, url];
        (0, child_process_1.execFile)(CURL_IMPERSONATE_BIN, args, { timeout: 15000 }, (err, stdout, stderr) => {
            if (err)
                return reject(new Error(`curl-impersonate: ${err.message}`));
            try {
                resolve(JSON.parse(stdout));
            }
            catch {
                reject(new Error(`Resposta inválida: ${stdout.slice(0, 200)}`));
            }
        });
    });
}
const router = (0, express_1.Router)();
const OPENAI_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';
const OPENAI_TOKEN_URL = 'https://auth.openai.com/oauth/token';
const OPENAI_DEVICE_USERCODE_URL = 'https://auth.openai.com/api/accounts/deviceauth/usercode';
const OPENAI_DEVICE_TOKEN_URL = 'https://auth.openai.com/api/accounts/deviceauth/token';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'kanbancw-ai-credentials-secret-key-32b';
function encryptToken(text) {
    const key = crypto_1.default.createHash('sha256').update(ENCRYPTION_KEY).digest();
    const iv = crypto_1.default.randomBytes(12);
    const cipher = crypto_1.default.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
}
function decryptToken(encrypted) {
    const key = crypto_1.default.createHash('sha256').update(ENCRYPTION_KEY).digest();
    const parts = encrypted.split(':');
    if (parts.length !== 3) {
        // backward compat
        const iv = Buffer.from(parts[0], 'hex');
        const decipher = crypto_1.default.createDecipheriv('aes-256-cbc', key, iv);
        let d = decipher.update(parts[1], 'hex', 'utf8');
        d += decipher.final('utf8');
        return d;
    }
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const decipher = crypto_1.default.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    let d = decipher.update(parts[2], 'hex', 'utf8');
    d += decipher.final('utf8');
    return d;
}
function extractOpenAIAccountId(accessToken) {
    try {
        const payload = accessToken.split('.')[1];
        if (!payload)
            return null;
        const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        // O chatgpt_account_id fica dentro do claim https://api.openai.com/auth
        const authClaim = decoded?.['https://api.openai.com/auth'];
        return (authClaim?.chatgpt_account_id ||
            decoded?.chatgpt_account_id ||
            decoded?.['https://auth.openai.com/chatgpt_account_id'] ||
            null
        // NÃO usar decoded?.sub — é o Google/social ID, não o chatgpt_account_id
        );
    }
    catch {
        return null;
    }
}
// ─── GET /api/ai-credentials/oauth/openai/auth-url ─────────────────────────
// Gera URL de autorização PKCE para o fluxo manual (copy-paste da URL localhost)
router.get('/oauth/openai/auth-url', auth_1.validateAuth, async (req, res) => {
    try {
        const authReq = req;
        const accountId = authReq.user.account_id;
        const codeVerifier = crypto_1.default.randomBytes(32).toString('base64url');
        const codeChallenge = crypto_1.default.createHash('sha256').update(codeVerifier).digest('base64url');
        const state = crypto_1.default.randomBytes(16).toString('hex');
        await database_1.default.aICredentialOAuthState.deleteMany({
            where: { accountId, expiresAt: { lt: new Date() } },
        });
        await database_1.default.aICredentialOAuthState.create({
            data: {
                accountId,
                codeVerifier,
                state,
                expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            },
        });
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: OPENAI_CLIENT_ID,
            redirect_uri: 'http://localhost:1455/auth/callback',
            scope: 'openid email profile offline_access',
            state,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
        });
        const authUrl = `https://auth.openai.com/oauth/authorize?${params.toString()}`;
        res.json({ data: { authUrl, state } });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao gerar URL de autorização' });
    }
});
// ─── POST /api/ai-credentials/oauth/openai/exchange-code ───────────────────
// Recebe a URL localhost copiada pelo usuário e troca o code por tokens
router.post('/oauth/openai/exchange-code', auth_1.validateAuth, async (req, res) => {
    try {
        const authReq = req;
        const accountId = authReq.user.account_id;
        const { callbackUrl } = req.body;
        if (!callbackUrl) {
            return res.status(400).json({ error: 'callbackUrl obrigatório' });
        }
        let code = null;
        let state = null;
        try {
            const url = new URL(callbackUrl);
            code = url.searchParams.get('code');
            state = url.searchParams.get('state');
        }
        catch {
            return res.status(400).json({ error: 'URL inválida' });
        }
        if (!code || !state) {
            return res.status(400).json({ error: 'URL não contém code ou state válidos' });
        }
        const oauthState = await database_1.default.aICredentialOAuthState.findUnique({ where: { state } });
        if (!oauthState || oauthState.accountId !== accountId) {
            return res.status(400).json({ error: 'State inválido ou pertence a outra sessão' });
        }
        if (oauthState.expiresAt < new Date()) {
            await database_1.default.aICredentialOAuthState.delete({ where: { state } }).catch(() => { });
            return res.status(400).json({ error: 'Sessão expirada — inicie novamente' });
        }
        const tokenResponse = await axios_1.default.post(OPENAI_TOKEN_URL, new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: OPENAI_CLIENT_ID,
            code,
            code_verifier: oauthState.codeVerifier,
            redirect_uri: 'http://localhost:1455/auth/callback',
        }).toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 15000,
        });
        const { access_token, refresh_token, expires_in } = tokenResponse.data;
        const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null;
        const openaiAccountId = extractOpenAIAccountId(access_token);
        await database_1.default.aICredentialOAuth.upsert({
            where: { accountId_provider: { accountId, provider: 'openai_oauth' } },
            update: {
                accessToken: encryptToken(access_token),
                refreshToken: refresh_token ? encryptToken(refresh_token) : null,
                expiresAt,
                openaiAccountId,
                isActive: true,
                updatedAt: new Date(),
            },
            create: {
                accountId,
                provider: 'openai_oauth',
                accessToken: encryptToken(access_token),
                refreshToken: refresh_token ? encryptToken(refresh_token) : null,
                expiresAt,
                openaiAccountId,
                isActive: true,
            },
        });
        await database_1.default.aICredentialOAuthState.delete({ where: { state } }).catch(() => { });
        logger_1.default.info('[OAUTH-OPENAI] Code PKCE trocado com sucesso', { accountId, openaiAccountId });
        res.json({ data: { connected: true, openaiAccountId } });
    }
    catch (error) {
        const errMsg = error.response?.data?.detail || error.response?.data?.error || error.message;
        logger_1.default.error('[OAUTH-OPENAI] Erro ao trocar code PKCE', { error: errMsg });
        res.status(500).json({ error: `Erro ao autenticar: ${errMsg}` });
    }
});
// ─── POST /api/ai-credentials/oauth/openai/device-start ────────────────────
// Inicia o Device Code Flow: pede um user_code para a OpenAI
router.post('/oauth/openai/device-start', auth_1.validateAuth, async (req, res) => {
    try {
        const authReq = req;
        const accountId = authReq.user.account_id;
        // Pede o user code à OpenAI
        const response = await axios_1.default.post(OPENAI_DEVICE_USERCODE_URL, { client_id: OPENAI_CLIENT_ID }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 15000,
        });
        const { device_auth_id, user_code, interval, verification_uri } = response.data;
        if (!device_auth_id || !user_code) {
            logger_1.default.error('[OAUTH-OPENAI] Resposta inesperada do device auth', { data: response.data });
            return res.status(500).json({ error: 'Resposta inesperada da OpenAI' });
        }
        // Limpa states antigos deste account
        await database_1.default.aICredentialOAuthState.deleteMany({
            where: { accountId, expiresAt: { lt: new Date() } },
        });
        // Salva o state do device code (expira em 15 min)
        const state = await database_1.default.aICredentialOAuthState.create({
            data: {
                accountId,
                codeVerifier: device_auth_id, // reutiliza campo para guardar device_auth_id
                state: user_code, // reutiliza campo state para o user_code
                expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            },
        });
        logger_1.default.info('[OAUTH-OPENAI] Device code gerado', { accountId, userCode: user_code });
        res.json({
            data: {
                stateId: state.id,
                userCode: user_code,
                verificationUri: verification_uri || 'https://auth.openai.com/device',
                pollInterval: interval || 3,
            },
        });
    }
    catch (error) {
        const errMsg = error.response?.data?.detail || error.response?.data?.error || error.message;
        logger_1.default.error('[OAUTH-OPENAI] Erro ao iniciar device flow', { error: errMsg });
        res.status(500).json({ error: `Erro ao iniciar autenticação: ${errMsg}` });
    }
});
// ─── POST /api/ai-credentials/oauth/openai/device-poll ─────────────────────
// Polling: verifica se o usuário autorizou o device code
router.post('/oauth/openai/device-poll', auth_1.validateAuth, async (req, res) => {
    try {
        const authReq = req;
        const accountId = authReq.user.account_id;
        const { stateId } = req.body;
        if (!stateId) {
            return res.status(400).json({ error: 'stateId obrigatório' });
        }
        const oauthState = await database_1.default.aICredentialOAuthState.findUnique({ where: { id: stateId } });
        if (!oauthState || oauthState.accountId !== accountId) {
            return res.json({ data: { status: 'expired' } });
        }
        if (oauthState.expiresAt < new Date()) {
            await database_1.default.aICredentialOAuthState.delete({ where: { id: stateId } }).catch(() => { });
            return res.json({ data: { status: 'expired' } });
        }
        const deviceAuthId = oauthState.codeVerifier; // armazenado no campo codeVerifier
        const userCode = oauthState.state; // armazenado no campo state
        // Poll do token junto à OpenAI
        let pollResponse;
        try {
            pollResponse = await axios_1.default.post(OPENAI_DEVICE_TOKEN_URL, { device_auth_id: deviceAuthId, user_code: userCode }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000,
            });
        }
        catch (pollErr) {
            const status = pollErr.response?.status;
            if (status === 400 || status === 401 || status === 428) {
                // Ainda pendente ou authorization_pending
                return res.json({ data: { status: 'pending' } });
            }
            throw pollErr;
        }
        const { authorization_code, code_verifier } = pollResponse.data;
        if (!authorization_code) {
            return res.json({ data: { status: 'pending' } });
        }
        // Troca o authorization_code pelo token final
        const tokenResponse = await axios_1.default.post(OPENAI_TOKEN_URL, new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: OPENAI_CLIENT_ID,
            code: authorization_code,
            code_verifier: code_verifier,
            redirect_uri: 'https://auth.openai.com/deviceauth/callback',
        }).toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 15000,
        });
        const { access_token, refresh_token, expires_in } = tokenResponse.data;
        const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null;
        const openaiAccountId = extractOpenAIAccountId(access_token);
        // Persiste o token
        await database_1.default.aICredentialOAuth.upsert({
            where: { accountId_provider: { accountId, provider: 'openai_oauth' } },
            update: {
                accessToken: encryptToken(access_token),
                refreshToken: refresh_token ? encryptToken(refresh_token) : null,
                expiresAt,
                openaiAccountId,
                isActive: true,
                updatedAt: new Date(),
            },
            create: {
                accountId,
                provider: 'openai_oauth',
                accessToken: encryptToken(access_token),
                refreshToken: refresh_token ? encryptToken(refresh_token) : null,
                expiresAt,
                openaiAccountId,
                isActive: true,
            },
        });
        // Remove o state usado
        await database_1.default.aICredentialOAuthState.delete({ where: { id: stateId } }).catch(() => { });
        logger_1.default.info('[OAUTH-OPENAI] Device code autorizado, token salvo', { accountId, openaiAccountId });
        res.json({ data: { status: 'connected', openaiAccountId } });
    }
    catch (error) {
        const errMsg = error.response?.data?.detail || error.response?.data?.error || error.message;
        logger_1.default.error('[OAUTH-OPENAI] Erro no poll do device code', { error: errMsg });
        res.status(500).json({ error: `Erro ao verificar autorização: ${errMsg}` });
    }
});
// ─── GET /api/ai-credentials/oauth/openai/usage ────────────────────────────
// Consulta /backend-api/wham/usage via curl-impersonate (bypassa TLS fingerprint Cloudflare)
router.get('/oauth/openai/usage', auth_1.validateAuth, async (req, res) => {
    try {
        const authReq = req;
        const accountId = authReq.user.account_id;
        const tokenData = await getOAuthAccessToken(accountId);
        if (!tokenData) {
            return res.status(404).json({ error: 'Conta não conectada' });
        }
        const { accessToken, openaiAccountId } = tokenData;
        // Extrai infos do JWT como fallback
        let planType = null;
        let email = null;
        try {
            const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString('utf8'));
            planType = payload?.['https://api.openai.com/auth']?.chatgpt_plan_type || null;
            email = payload?.['https://api.openai.com/profile']?.email || null;
        }
        catch { }
        const headers = {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
        };
        if (openaiAccountId)
            headers['chatgpt-account-id'] = openaiAccountId;
        const raw = await fetchWithCurlImpersonate('https://chatgpt.com/backend-api/wham/usage', headers);
        const rateLimit = raw?.rate_limit;
        const primary = rateLimit?.primary_window;
        const secondary = rateLimit?.secondary_window;
        res.json({
            data: {
                plan: raw?.plan_type || planType,
                isPaid: (raw?.plan_type || planType) !== 'free' && (raw?.plan_type || planType) !== null,
                email: raw?.email || email,
                expiresAt: null,
                rateLimit: rateLimit ? {
                    allowed: rateLimit.allowed,
                    limitReached: rateLimit.limit_reached,
                    primary: primary ? {
                        usedPercent: primary.used_percent,
                        windowSeconds: primary.limit_window_seconds,
                        resetAfterSeconds: primary.reset_after_seconds,
                        resetAt: primary.reset_at,
                    } : null,
                    secondary: secondary ? {
                        usedPercent: secondary.used_percent,
                        windowSeconds: secondary.limit_window_seconds,
                        resetAfterSeconds: secondary.reset_after_seconds,
                        resetAt: secondary.reset_at,
                    } : null,
                } : null,
                credits: raw?.credits || null,
            },
        });
    }
    catch (error) {
        logger_1.default.error('[OAUTH-OPENAI] Erro ao buscar usage (wham)', { error: error.message });
        res.status(500).json({ error: 'Não foi possível obter dados de uso' });
    }
});
// ─── GET /api/ai-credentials/oauth/openai ──────────────────────────────────
// Status da conexão OAuth
router.get('/oauth/openai', auth_1.validateAuth, async (req, res) => {
    try {
        const authReq = req;
        const accountId = authReq.user.account_id;
        const credential = await database_1.default.aICredentialOAuth.findUnique({
            where: { accountId_provider: { accountId, provider: 'openai_oauth' } },
            select: { isActive: true, openaiAccountId: true, expiresAt: true, updatedAt: true },
        });
        res.json({
            data: {
                connected: !!credential?.isActive,
                openaiAccountId: credential?.openaiAccountId || null,
                expiresAt: credential?.expiresAt || null,
                connectedAt: credential?.updatedAt || null,
            },
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao verificar status' });
    }
});
// ─── DELETE /api/ai-credentials/oauth/openai ───────────────────────────────
// Desconecta
router.delete('/oauth/openai', auth_1.validateAuth, async (req, res) => {
    try {
        const authReq = req;
        const accountId = authReq.user.account_id;
        await database_1.default.aICredentialOAuth.deleteMany({ where: { accountId, provider: 'openai_oauth' } });
        logger_1.default.info('[OAUTH-OPENAI] Conta desconectada', { accountId });
        res.json({ message: 'Conta desconectada com sucesso' });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao desconectar conta' });
    }
});
// ─── Helper exportado: busca token válido (com auto-refresh) ──────────────
async function getOAuthAccessToken(accountId) {
    try {
        const credential = await database_1.default.aICredentialOAuth.findUnique({
            where: { accountId_provider: { accountId, provider: 'openai_oauth' }, isActive: true },
        });
        if (!credential)
            return null;
        const accessToken = decryptToken(credential.accessToken);
        // Auto-refresh se expirou
        if (credential.expiresAt && credential.expiresAt < new Date() && credential.refreshToken) {
            try {
                const refreshToken = decryptToken(credential.refreshToken);
                const tokenResponse = await axios_1.default.post(OPENAI_TOKEN_URL, new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken,
                    client_id: OPENAI_CLIENT_ID,
                }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 });
                const { access_token, refresh_token: newRefreshToken, expires_in } = tokenResponse.data;
                const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null;
                const openaiAccountId = extractOpenAIAccountId(access_token) || credential.openaiAccountId;
                await database_1.default.aICredentialOAuth.update({
                    where: { accountId_provider: { accountId, provider: 'openai_oauth' } },
                    data: {
                        accessToken: encryptToken(access_token),
                        refreshToken: newRefreshToken ? encryptToken(newRefreshToken) : credential.refreshToken,
                        expiresAt,
                        openaiAccountId,
                        updatedAt: new Date(),
                    },
                });
                return { accessToken: access_token, openaiAccountId };
            }
            catch {
                // usa token atual mesmo expirado
            }
        }
        return { accessToken, openaiAccountId: credential.openaiAccountId || null };
    }
    catch {
        return null;
    }
}
exports.default = router;
//# sourceMappingURL=oauth-credentials.js.map