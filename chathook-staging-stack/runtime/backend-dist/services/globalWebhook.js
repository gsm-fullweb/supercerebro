"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureGlobalWebhook = ensureGlobalWebhook;
exports.removeGlobalWebhook = removeGlobalWebhook;
const chatwoot_1 = __importDefault(require("./chatwoot"));
const logger_1 = __importDefault(require("../utils/logger"));
const database_1 = __importDefault(require("./database"));
const chatwootDatabase_1 = __importDefault(require("./chatwootDatabase"));
const REQUIRED_SUBSCRIPTIONS = ['message_created', 'message_updated'];
/**
 * Garante que o webhook global do Chatwoot existe e tem as subscriptions corretas.
 * Chamado ao criar o primeiro flow e ao iniciar qualquer campanha.
 * Um único webhook por conta — sem duplicatas, sem conflito com chatbot.
 */
async function ensureGlobalWebhook(accountId, apiToken, jwt) {
    try {
        const webhookUrl = `${process.env.KANBANCW_URL || process.env.VITE_API_URL}/webhooks/chatwoot`;
        // Fallback: busca token de admin da conta no Chatwoot DB quando não há apiToken/jwt
        if (!apiToken && !jwt) {
            const adminToken = await chatwootDatabase_1.default.getAccountAdminToken(accountId);
            if (adminToken) {
                apiToken = adminToken;
                logger_1.default.info('ensureGlobalWebhook: using DB admin token as fallback', { accountId });
            }
            else {
                logger_1.default.warn('ensureGlobalWebhook: no token available, cannot create webhook', { accountId });
                return null;
            }
        }
        // Verifica se já existe webhook salvo nas settings
        const settings = await database_1.default.systemSettings.findUnique({
            where: { accountId },
        });
        if (settings?.chatwootGlobalWebhookId) {
            // Webhook salvo — verifica se ainda tem message_updated
            const webhooks = await chatwoot_1.default.listWebhooks(accountId, jwt, apiToken);
            const existing = webhooks.find((w) => w.id.toString() === settings.chatwootGlobalWebhookId);
            if (existing) {
                const missing = REQUIRED_SUBSCRIPTIONS.filter((s) => !existing.subscriptions.includes(s));
                if (missing.length > 0) {
                    logger_1.default.info('Updating webhook subscriptions', {
                        accountId,
                        webhookId: settings.chatwootGlobalWebhookId,
                        adding: missing,
                    });
                    await chatwoot_1.default.updateWebhook(accountId, settings.chatwootGlobalWebhookId, REQUIRED_SUBSCRIPTIONS, jwt, apiToken);
                }
                else {
                    logger_1.default.info('Global webhook already up-to-date', {
                        accountId,
                        webhookId: settings.chatwootGlobalWebhookId,
                    });
                }
                return settings.chatwootGlobalWebhookId;
            }
            // ID salvo mas webhook não existe mais no Chatwoot — recria
            logger_1.default.warn('Saved webhook ID not found in Chatwoot, recreating', {
                accountId,
                savedId: settings.chatwootGlobalWebhookId,
            });
        }
        // Verifica se já existe algum webhook para nossa URL (criado manualmente)
        const webhooks = await chatwoot_1.default.listWebhooks(accountId, jwt, apiToken);
        // Normaliza URL para comparação (remove trailing slash, lowercase)
        const normalizeUrl = (u) => u?.replace(/\/+$/, '').toLowerCase();
        const normalizedTarget = normalizeUrl(webhookUrl);
        logger_1.default.info('ensureGlobalWebhook: searching webhooks', {
            accountId,
            targetUrl: webhookUrl,
            found: webhooks.map((w) => ({ id: w.id, url: w.url })),
        });
        const existingForUrl = webhooks.find((w) => normalizeUrl(w.url) === normalizedTarget);
        if (existingForUrl) {
            const webhookId = existingForUrl.id.toString();
            const missing = REQUIRED_SUBSCRIPTIONS.filter((s) => !existingForUrl.subscriptions.includes(s));
            if (missing.length > 0) {
                await chatwoot_1.default.updateWebhook(accountId, webhookId, REQUIRED_SUBSCRIPTIONS, jwt, apiToken);
            }
            // Salva o ID que encontrou
            await database_1.default.systemSettings.upsert({
                where: { accountId },
                create: { accountId, chatwootGlobalWebhookId: webhookId },
                update: { chatwootGlobalWebhookId: webhookId },
            });
            logger_1.default.info('Adopted existing webhook', { accountId, webhookId });
            return webhookId;
        }
        // Nenhum webhook encontrado — tenta criar
        logger_1.default.info('Creating global webhook', { accountId, webhookUrl });
        try {
            const response = await chatwoot_1.default.createWebhook(accountId, webhookUrl, REQUIRED_SUBSCRIPTIONS, jwt, apiToken);
            const webhookId = response.id?.toString();
            if (!webhookId) {
                logger_1.default.error('Failed to get webhook ID from response', { response });
                return null;
            }
            await database_1.default.systemSettings.upsert({
                where: { accountId },
                create: { accountId, chatwootGlobalWebhookId: webhookId },
                update: { chatwootGlobalWebhookId: webhookId },
            });
            logger_1.default.info('Global webhook created successfully', { accountId, webhookId, url: webhookUrl });
            return webhookId;
        }
        catch (createError) {
            // 422 = webhook com essa URL já existe — lista novamente para adotar por ID
            if (createError?.response?.status === 422) {
                logger_1.default.warn('ensureGlobalWebhook: 422 on create, re-listing to adopt existing', { accountId });
                const retryWebhooks = await chatwoot_1.default.listWebhooks(accountId, jwt, apiToken);
                const adoptCandidate = retryWebhooks.find((w) => normalizeUrl(w.url) === normalizedTarget);
                if (adoptCandidate) {
                    const webhookId = adoptCandidate.id.toString();
                    await database_1.default.systemSettings.upsert({
                        where: { accountId },
                        create: { accountId, chatwootGlobalWebhookId: webhookId },
                        update: { chatwootGlobalWebhookId: webhookId },
                    });
                    logger_1.default.info('Adopted webhook after 422', { accountId, webhookId });
                    return webhookId;
                }
                // Ainda não encontrou — pode ser outra conta com mesma URL (multi-server)
                // Neste caso, lista todos e adota qualquer webhook que contenha nossa URL como substring
                const fuzzyMatch = retryWebhooks.find((w) => w.url && normalizedTarget.includes(normalizeUrl(w.url).split('/webhooks')[0]));
                if (fuzzyMatch) {
                    const webhookId = fuzzyMatch.id.toString();
                    await database_1.default.systemSettings.upsert({
                        where: { accountId },
                        create: { accountId, chatwootGlobalWebhookId: webhookId },
                        update: { chatwootGlobalWebhookId: webhookId },
                    });
                    logger_1.default.info('Adopted webhook (fuzzy) after 422', { accountId, webhookId, url: fuzzyMatch.url });
                    return webhookId;
                }
                logger_1.default.error('ensureGlobalWebhook: 422 but could not find webhook to adopt', {
                    accountId,
                    targetUrl: webhookUrl,
                    retryList: retryWebhooks.map((w) => ({ id: w.id, url: w.url })),
                });
                return null;
            }
            throw createError;
        }
    }
    catch (error) {
        logger_1.default.error('Failed to ensure global webhook', {
            accountId,
            error: error instanceof Error ? error.message : error,
            errorResponse: error?.response?.data,
            errorStatus: error?.response?.status,
        });
        return null;
    }
}
/**
 * Remove webhook global do Chatwoot
 */
async function removeGlobalWebhook(accountId, apiToken, jwt) {
    try {
        const settings = await database_1.default.systemSettings.findUnique({
            where: { accountId },
        });
        if (!settings?.chatwootGlobalWebhookId) {
            logger_1.default.info('No global webhook to remove', { accountId });
            return;
        }
        logger_1.default.info('Removing global webhook', {
            accountId,
            webhookId: settings.chatwootGlobalWebhookId,
        });
        await chatwoot_1.default.deleteWebhook(accountId, settings.chatwootGlobalWebhookId, jwt, apiToken);
        await database_1.default.systemSettings.update({
            where: { accountId },
            data: { chatwootGlobalWebhookId: null },
        });
        logger_1.default.info('Global webhook removed successfully', { accountId });
    }
    catch (error) {
        logger_1.default.error('Failed to remove global webhook', {
            accountId,
            error: error instanceof Error ? error.message : error,
        });
    }
}
//# sourceMappingURL=globalWebhook.js.map