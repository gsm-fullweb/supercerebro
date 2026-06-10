"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDecryptedCredential = getDecryptedCredential;
exports.getAudioTranscriptionCredential = getAudioTranscriptionCredential;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const database_1 = __importDefault(require("../services/database"));
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'kanbancw-ai-credentials-secret-key-32b';
const ALGORITHM = 'aes-256-cbc';
function encrypt(text) {
    const key = crypto_1.default.createHash('sha256').update(ENCRYPTION_KEY).digest();
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}
function decrypt(encrypted) {
    const key = crypto_1.default.createHash('sha256').update(ENCRYPTION_KEY).digest();
    const parts = encrypted.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
// Listar todas as credenciais (text + audio + oauth)
router.get('/ai-credentials', auth_1.validateAuth, async (req, res) => {
    try {
        const authReq = req;
        const accountId = authReq.user.account_id;
        const [credentials, oauthCredentials] = await Promise.all([
            database_1.default.aICredentials.findMany({
                where: { accountId, isActive: true },
                select: { id: true, provider: true, credentialType: true, isActive: true, createdAt: true, updatedAt: true },
            }),
            database_1.default.aICredentialOAuth.findMany({
                where: { accountId, isActive: true },
                select: { id: true, provider: true, isActive: true, openaiAccountId: true, createdAt: true, updatedAt: true },
            }),
        ]);
        const all = [
            ...credentials,
            ...oauthCredentials.map(o => ({
                id: o.id,
                provider: o.provider,
                credentialType: 'text',
                isActive: o.isActive,
                createdAt: o.createdAt,
                updatedAt: o.updatedAt,
                openaiAccountId: o.openaiAccountId,
            })),
        ];
        res.json({ data: all });
    }
    catch (error) {
        console.error('[AI-CREDENTIALS] Erro ao listar credenciais:', error);
        res.status(500).json({ error: 'Erro ao listar credenciais' });
    }
});
// Adicionar ou atualizar credencial
router.post('/ai-credentials', auth_1.validateAuth, async (req, res) => {
    try {
        const authReq = req;
        const accountId = authReq.user.account_id;
        const { provider, apiKey, credentialType = 'text' } = req.body;
        if (!provider || !apiKey) {
            return res.status(400).json({ error: 'Provider e apiKey são obrigatórios' });
        }
        const validTextProviders = ['openai', 'groq', 'openrouter', 'google'];
        const validAudioProviders = ['openai', 'groq'];
        if (credentialType === 'audio' && !validAudioProviders.includes(provider)) {
            return res.status(400).json({ error: 'Para transcrição de áudio use "openai" ou "groq"' });
        }
        if (credentialType === 'text' && !validTextProviders.includes(provider)) {
            return res.status(400).json({ error: 'Provider deve ser "openai", "groq", "openrouter" ou "google"' });
        }
        const encryptedKey = encrypt(apiKey);
        const credential = await database_1.default.aICredentials.upsert({
            where: {
                accountId_provider_credentialType: {
                    accountId,
                    provider,
                    credentialType,
                },
            },
            update: {
                apiKey: encryptedKey,
                isActive: true,
                updatedAt: new Date(),
            },
            create: {
                accountId,
                provider,
                credentialType,
                apiKey: encryptedKey,
                isActive: true,
            },
        });
        res.json({
            message: 'Credencial salva com sucesso',
            data: {
                id: credential.id,
                provider: credential.provider,
                credentialType: credential.credentialType,
                isActive: credential.isActive,
            },
        });
    }
    catch (error) {
        console.error('[AI-CREDENTIALS] Erro ao salvar credencial:', error);
        res.status(500).json({ error: 'Erro ao salvar credencial' });
    }
});
// Deletar credencial por provider + tipo
router.delete('/ai-credentials/:provider', auth_1.validateAuth, async (req, res) => {
    try {
        const authReq = req;
        const accountId = authReq.user.account_id;
        const { provider } = req.params;
        const credentialType = req.query.type || 'text';
        const validProviders = ['openai', 'groq', 'openrouter', 'google'];
        if (!validProviders.includes(provider)) {
            return res.status(400).json({ error: 'Provider inválido' });
        }
        await database_1.default.aICredentials.deleteMany({
            where: { accountId, provider, credentialType },
        });
        res.json({ message: 'Credencial removida com sucesso' });
    }
    catch (error) {
        console.error('[AI-CREDENTIALS] Erro ao deletar credencial:', error);
        res.status(500).json({ error: 'Erro ao deletar credencial' });
    }
});
// Helper interno: busca credencial de texto descriptografada
async function getDecryptedCredential(accountId, provider, credentialType = 'text') {
    try {
        const credential = await database_1.default.aICredentials.findUnique({
            where: {
                accountId_provider_credentialType: {
                    accountId,
                    provider,
                    credentialType,
                },
                isActive: true,
            },
        });
        if (!credential)
            return null;
        return decrypt(credential.apiKey);
    }
    catch (error) {
        console.error('[AI-CREDENTIALS] Erro ao buscar credencial:', error);
        return null;
    }
}
// Helper interno: busca a melhor credencial de áudio disponível (openai > groq)
async function getAudioTranscriptionCredential(accountId) {
    try {
        // Procura credencial de áudio específica (tipo 'audio')
        const audioCredential = await database_1.default.aICredentials.findFirst({
            where: {
                accountId,
                isActive: true,
                credentialType: 'audio',
                provider: { in: ['openai', 'groq'] },
            },
            orderBy: [
                // openai tem prioridade (whisper-1 > whisper-large-v3-turbo em qualidade)
                { provider: 'asc' },
            ],
        });
        if (audioCredential) {
            return {
                provider: audioCredential.provider,
                apiKey: decrypt(audioCredential.apiKey),
            };
        }
        return null;
    }
    catch (error) {
        console.error('[AI-CREDENTIALS] Erro ao buscar credencial de áudio:', error);
        return null;
    }
}
exports.default = router;
//# sourceMappingURL=ai-credentials.js.map