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
const axios_1 = __importDefault(require("axios"));
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../middleware/auth");
const chatwoot_1 = __importDefault(require("../services/chatwoot"));
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }
    try {
        const chatwootUrl = process.env.CHATWOOT_API_URL;
        const response = await axios_1.default.post(`${chatwootUrl}/auth/sign_in`, { email, password });
        const headers = response.headers;
        const data = response.data?.data;
        if (!data) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }
        res.json({
            accessToken: headers['access-token'],
            client: headers['client'],
            uid: headers['uid'],
            tokenType: headers['token-type'],
            expiry: headers['expiry'],
            userId: data.id,
            accountId: data.account_id,
            name: data.name,
            email: data.email,
            avatarUrl: data.avatar_url,
            role: data.role,
        });
    }
    catch (error) {
        logger_1.default.error('CWApp login failed', { error: error.message });
        const status = error.response?.status || 500;
        res.status(status).json({ error: 'Credenciais inválidas' });
    }
});
router.get('/me', auth_1.validateAuth, async (req, res) => {
    const authReq = req;
    try {
        const profile = await chatwoot_1.default.getUserProfile(authReq.jwt, authReq.apiToken);
        res.json({
            userId: profile.id,
            accountId: profile.account_id,
            name: profile.name,
            email: profile.email,
            avatarUrl: profile.avatar_url,
            role: profile.role,
        });
    }
    catch (error) {
        logger_1.default.error('CWApp /me failed', { error: error.message });
        res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
});
// GET /api/cwapp/auth/profile — perfil completo com disponibilidade
router.get('/profile', auth_1.validateAuth, async (req, res) => {
    const authReq = req;
    try {
        const profile = await chatwoot_1.default.getUserProfile(authReq.jwt, authReq.apiToken);
        res.json({
            userId: profile.id,
            accountId: profile.account_id,
            name: profile.name,
            displayName: profile.display_name,
            email: profile.email,
            avatarUrl: profile.avatar_url,
            role: profile.role,
            messageSignature: profile.message_signature,
            availability: profile.availability_status,
        });
    }
    catch (error) {
        logger_1.default.error('CWApp GET /profile failed', { error: error.message });
        res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
});
// PUT /api/cwapp/auth/profile — atualiza nome, displayName, messageSignature
router.put('/profile', auth_1.validateAuth, async (req, res) => {
    const authReq = req;
    const { name, displayName, messageSignature } = req.body;
    try {
        const chatwootUrl = process.env.CHATWOOT_API_URL;
        const headers = {};
        if (authReq.apiToken) {
            headers['api_access_token'] = authReq.apiToken;
        }
        else if (authReq.jwt) {
            headers['access-token'] = authReq.jwt['access-token'];
            headers['token-type'] = authReq.jwt['token-type'] || 'Bearer';
            headers['client'] = authReq.jwt.client;
            headers['expiry'] = authReq.jwt.expiry;
            headers['uid'] = authReq.jwt.uid;
        }
        const FormData = (await Promise.resolve().then(() => __importStar(require('form-data')))).default;
        const form = new FormData();
        if (name !== undefined)
            form.append('profile[name]', name);
        if (displayName !== undefined)
            form.append('profile[display_name]', displayName);
        if (messageSignature !== undefined)
            form.append('profile[message_signature]', messageSignature);
        const axiosInstance = (await Promise.resolve().then(() => __importStar(require('axios')))).default;
        const resp = await axiosInstance.put(`${chatwootUrl}/api/v1/profile`, form, {
            headers: { ...headers, ...form.getHeaders() },
        });
        res.json({
            name: resp.data.name,
            displayName: resp.data.display_name,
            messageSignature: resp.data.message_signature,
            avatarUrl: resp.data.avatar_url,
        });
    }
    catch (error) {
        logger_1.default.error('CWApp PUT /profile failed', { error: error.message });
        const status = error?.response?.status;
        if (status === 401)
            return res.status(401).json({ error: 'Sessão expirada' });
        res.status(500).json({ error: error.response?.data?.message || 'Erro ao atualizar perfil' });
    }
});
// PUT /api/cwapp/auth/profile/availability — atualiza disponibilidade
router.put('/profile/availability', auth_1.validateAuth, async (req, res) => {
    const authReq = req;
    const accountId = authReq.accountId;
    const { availability } = req.body; // 'online' | 'busy' | 'offline'
    if (!availability)
        return res.status(400).json({ error: 'availability obrigatório' });
    try {
        const chatwootUrl = process.env.CHATWOOT_API_URL;
        const headers = {};
        if (authReq.apiToken) {
            headers['api_access_token'] = authReq.apiToken;
        }
        else if (authReq.jwt) {
            headers['access-token'] = authReq.jwt['access-token'];
            headers['token-type'] = authReq.jwt['token-type'] || 'Bearer';
            headers['client'] = authReq.jwt.client;
            headers['expiry'] = authReq.jwt.expiry;
            headers['uid'] = authReq.jwt.uid;
        }
        const axiosInstance = (await Promise.resolve().then(() => __importStar(require('axios')))).default;
        await axiosInstance.post(`${chatwootUrl}/api/v1/profile/availability`, {
            profile: { account_id: accountId, availability },
        }, { headers });
        res.json({ success: true, availability });
    }
    catch (error) {
        logger_1.default.error('CWApp PUT /profile/availability failed', { error: error.message });
        res.status(500).json({ error: 'Erro ao atualizar disponibilidade' });
    }
});
// PUT /api/cwapp/auth/profile/password — altera senha
router.put('/profile/password', auth_1.validateAuth, async (req, res) => {
    const authReq = req;
    const { currentPassword, password, passwordConfirmation } = req.body;
    if (!currentPassword || !password || !passwordConfirmation) {
        return res.status(400).json({ error: 'Todos os campos de senha são obrigatórios' });
    }
    if (password !== passwordConfirmation) {
        return res.status(400).json({ error: 'A nova senha e a confirmação não coincidem' });
    }
    try {
        const chatwootUrl = process.env.CHATWOOT_API_URL;
        const headers = {};
        if (authReq.apiToken) {
            headers['api_access_token'] = authReq.apiToken;
        }
        else if (authReq.jwt) {
            headers['access-token'] = authReq.jwt['access-token'];
            headers['token-type'] = authReq.jwt['token-type'] || 'Bearer';
            headers['client'] = authReq.jwt.client;
            headers['expiry'] = authReq.jwt.expiry;
            headers['uid'] = authReq.jwt.uid;
        }
        const FormData = (await Promise.resolve().then(() => __importStar(require('form-data')))).default;
        const form = new FormData();
        form.append('profile[current_password]', currentPassword);
        form.append('profile[password]', password);
        form.append('profile[password_confirmation]', passwordConfirmation);
        const axiosInstance = (await Promise.resolve().then(() => __importStar(require('axios')))).default;
        await axiosInstance.put(`${chatwootUrl}/api/v1/profile`, form, {
            headers: { ...headers, ...form.getHeaders() },
        });
        res.json({ success: true });
    }
    catch (error) {
        logger_1.default.error('CWApp PUT /profile/password failed', { error: error.message });
        const msg = error.response?.data?.message || error.response?.data?.error || 'Senha atual incorreta';
        res.status(400).json({ error: msg });
    }
});
// POST /api/cwapp/auth/profile/avatar — upload de avatar
router.post('/profile/avatar', auth_1.validateAuth, (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }).single('avatar'), async (req, res) => {
    const authReq = req;
    const file = req.file;
    if (!file)
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    try {
        const chatwootUrl = process.env.CHATWOOT_API_URL;
        const headers = {};
        if (authReq.apiToken) {
            headers['api_access_token'] = authReq.apiToken;
        }
        else if (authReq.jwt) {
            headers['access-token'] = authReq.jwt['access-token'];
            headers['token-type'] = authReq.jwt['token-type'] || 'Bearer';
            headers['client'] = authReq.jwt.client;
            headers['expiry'] = authReq.jwt.expiry;
            headers['uid'] = authReq.jwt.uid;
        }
        const FormData = (await Promise.resolve().then(() => __importStar(require('form-data')))).default;
        const form = new FormData();
        form.append('profile[avatar]', file.buffer, { filename: file.originalname, contentType: file.mimetype });
        const axiosInstance = (await Promise.resolve().then(() => __importStar(require('axios')))).default;
        const resp = await axiosInstance.put(`${chatwootUrl}/api/v1/profile`, form, {
            headers: { ...headers, ...form.getHeaders() },
        });
        res.json({ avatarUrl: resp.data.avatar_url });
    }
    catch (error) {
        logger_1.default.error('CWApp POST /profile/avatar failed', { error: error.message });
        res.status(500).json({ error: 'Erro ao atualizar avatar' });
    }
});
exports.default = router;
//# sourceMappingURL=cwapp-auth.js.map