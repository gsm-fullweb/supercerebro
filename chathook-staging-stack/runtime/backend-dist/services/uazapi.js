"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUazapiInstance = createUazapiInstance;
exports.connectUazapiInstance = connectUazapiInstance;
exports.getUazapiInstanceStatus = getUazapiInstanceStatus;
exports.configureUazapiChatwoot = configureUazapiChatwoot;
exports.deleteUazapiInstance = deleteUazapiInstance;
exports.sendUazapiText = sendUazapiText;
exports.logoutUazapiInstance = logoutUazapiInstance;
exports.deleteUazapiMessage = deleteUazapiMessage;
exports.editUazapiMessage = editUazapiMessage;
exports.findUazapiMessageId = findUazapiMessageId;
const axios_1 = __importDefault(require("axios"));
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Cria cliente Uazapi com configuração dinâmica
 */
function createUazapiClient(baseUrl, token, adminToken) {
    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['token'] = token;
    }
    if (adminToken) {
        headers['admintoken'] = adminToken;
    }
    return axios_1.default.create({
        baseURL: baseUrl,
        headers,
    });
}
/**
 * Cria uma nova instância na Uazapi
 */
async function createUazapiInstance(config, instanceName, accountId, systemName) {
    try {
        logger_1.default.info('Creating Uazapi instance', { instanceName, accountId, baseUrl: config.baseUrl });
        const client = createUazapiClient(config.baseUrl, undefined, config.adminToken);
        const response = await client.post('/instance/init', {
            name: instanceName,
            systemName: systemName || `kanbancw-${accountId}`,
            adminField01: `account-${accountId}`,
            adminField02: instanceName,
        });
        logger_1.default.info('Uazapi instance created', {
            instanceName,
            token: response.data.instance?.token,
        });
        return response.data.instance;
    }
    catch (error) {
        const responseData = error.response?.data;
        const httpStatus = error.response?.status;
        logger_1.default.error('Failed to create Uazapi instance', {
            instanceName,
            error: error.message,
            httpStatus,
            response: responseData,
        });
        // HTTP 429 = limite de instâncias atingido
        if (httpStatus === 429 || responseData?.error?.toLowerCase().includes('maximum') || responseData?.error?.toLowerCase().includes('limit')) {
            throw new Error('Limite de instâncias Uazapi atingido, consulte seu provedor.');
        }
        const apiMessage = responseData?.message || responseData?.error || responseData?.info;
        throw new Error(apiMessage || 'Erro ao criar instância na Uazapi');
    }
}
/**
 * Conecta instância e obtém QR Code
 */
async function connectUazapiInstance(config, instanceToken) {
    try {
        logger_1.default.info('Connecting Uazapi instance', { baseUrl: config.baseUrl });
        const client = createUazapiClient(config.baseUrl, instanceToken);
        const response = await client.post('/instance/connect');
        logger_1.default.info('Uazapi instance connected, QR code generated');
        return {
            qrcode: response.data.instance?.qrcode || response.data.qrcode,
        };
    }
    catch (error) {
        const responseData = error.response?.data;
        const apiMessage = responseData?.message || responseData?.error || responseData?.msg;
        const httpStatus = error.response?.status;
        logger_1.default.error('Failed to connect Uazapi instance', {
            error: error.message,
            httpStatus,
            response: responseData,
        });
        // HTTP 429 = limite de instâncias atingido
        if (httpStatus === 429 || (apiMessage && /maximum|limit|reached/i.test(apiMessage))) {
            throw new Error('Limite de conexões Uazapi atingido. Remova uma instância existente ou entre em contato com seu provedor para ampliar o plano.');
        }
        throw new Error(apiMessage || 'Erro ao conectar instância Uazapi');
    }
}
/**
 * Busca status da instância
 */
async function getUazapiInstanceStatus(config, instanceToken) {
    try {
        logger_1.default.info('Getting Uazapi instance status', { baseUrl: config.baseUrl });
        const client = createUazapiClient(config.baseUrl, instanceToken);
        const response = await client.get('/instance/status');
        logger_1.default.info('Uazapi instance status retrieved', { status: response.data });
        return response.data;
    }
    catch (error) {
        logger_1.default.error('Failed to get Uazapi instance status', {
            error: error.message,
            response: error.response?.data,
        });
        throw new Error(error.response?.data?.message || 'Erro ao buscar status da instância');
    }
}
/**
 * Configura integração com Chatwoot
 */
async function configureUazapiChatwoot(config, instanceToken, chatwootConfig) {
    try {
        logger_1.default.info('Configuring Uazapi Chatwoot integration', {
            baseUrl: config.baseUrl,
            chatwootUrl: chatwootConfig.url,
            accountId: chatwootConfig.account_id,
            inboxId: chatwootConfig.inbox_id,
        });
        const client = createUazapiClient(config.baseUrl, instanceToken);
        const response = await client.put('/chatwoot/config', chatwootConfig);
        logger_1.default.info('Uazapi Chatwoot integration configured successfully');
        return response.data;
    }
    catch (error) {
        logger_1.default.error('Failed to configure Uazapi Chatwoot integration', {
            error: error.message,
            response: error.response?.data,
        });
        throw new Error(error.response?.data?.message || 'Erro ao configurar integração com Chatwoot');
    }
}
/**
 * Deleta instância
 */
async function deleteUazapiInstance(config, instanceToken) {
    try {
        logger_1.default.info('Deleting Uazapi instance', { baseUrl: config.baseUrl });
        const client = createUazapiClient(config.baseUrl, instanceToken);
        await client.delete('/instance/delete');
        logger_1.default.info('Uazapi instance deleted successfully');
    }
    catch (error) {
        logger_1.default.error('Failed to delete Uazapi instance', {
            error: error.message,
            response: error.response?.data,
        });
        throw new Error(error.response?.data?.message || 'Erro ao deletar instância');
    }
}
/**
 * Envia mensagem de texto via Uazapi (/send/text)
 * Método confiável de entrega — diferente do webhook /chatwoot/webhook que é
 * um "falso positivo" e pode não entregar a mensagem ao WhatsApp.
 */
async function sendUazapiText(baseUrl, instanceToken, number, text) {
    try {
        logger_1.default.info('Sending text via Uazapi /send/text', { baseUrl, number: number.substring(0, 6) + '***' });
        const client = createUazapiClient(baseUrl, instanceToken);
        const response = await client.post('/send/text', { number, text });
        logger_1.default.info('Uazapi /send/text success', { status: response.data?.status, messageid: response.data?.messageid });
        return response.data;
    }
    catch (error) {
        logger_1.default.error('Uazapi /send/text failed', {
            error: error.message,
            response: error.response?.data,
            status: error.response?.status,
        });
        throw new Error(error.response?.data?.message || error.message || 'Erro ao enviar mensagem via Uazapi');
    }
}
/**
 * Logout da instância
 */
async function logoutUazapiInstance(config, instanceToken) {
    try {
        logger_1.default.info('Logging out Uazapi instance', { baseUrl: config.baseUrl });
        const client = createUazapiClient(config.baseUrl, instanceToken);
        await client.post('/instance/logout');
        logger_1.default.info('Uazapi instance logged out successfully');
    }
    catch (error) {
        logger_1.default.error('Failed to logout Uazapi instance', {
            error: error.message,
            response: error.response?.data,
        });
        throw new Error(error.response?.data?.message || 'Erro ao fazer logout da instância');
    }
}
async function deleteUazapiMessage(baseUrl, instanceToken, messageId) {
    const client = createUazapiClient(baseUrl, instanceToken);
    await client.delete(`/message/${messageId}`);
    logger_1.default.info('UAZAPI: mensagem apagada', { messageId });
}
async function editUazapiMessage(baseUrl, instanceToken, messageId, newText) {
    const client = createUazapiClient(baseUrl, instanceToken);
    // Tenta v2 (messageId) e v1 (id) para compatibilidade entre versões UazAPI
    await client.post('/message/edit', { messageId, id: messageId, text: newText });
    logger_1.default.info('UAZAPI: mensagem editada', { messageId });
}
/**
 * Busca o WA message ID de uma mensagem enviada via UazAPI.
 * Usa POST /message/find para listar mensagens do chat e encontra por conteúdo/timestamp.
 */
async function findUazapiMessageId(baseUrl, instanceToken, phone, content, createdAtSeconds) {
    const client = createUazapiClient(baseUrl, instanceToken);
    const contentClean = content.trim().toLowerCase();
    // Testa variantes de chatId (formato WhatsApp pode variar)
    const chatIdVariants = [
        `${phone}@s.whatsapp.net`,
        `${phone}@c.us`,
    ];
    for (const chatId of chatIdVariants) {
        try {
            const response = await client.post('/message/find', { chatId, limit: 30 });
            const messages = Array.isArray(response.data)
                ? response.data
                : Array.isArray(response.data?.messages)
                    ? response.data.messages
                    : Array.isArray(response.data?.data)
                        ? response.data.data
                        : [];
            if (!messages.length)
                continue;
            const match = messages.find((m) => {
                const fromMe = m?.key?.fromMe ?? m?.fromMe ?? false;
                if (!fromMe)
                    return false;
                const tsRaw = Number(m?.messageTimestamp ?? m?.timestamp ?? 0);
                // UazAPI retorna timestamp em milissegundos quando > 1e10
                const ts = tsRaw > 1e10 ? Math.floor(tsRaw / 1000) : tsRaw;
                const timeDiff = ts && createdAtSeconds ? Math.abs(ts - createdAtSeconds) : 999;
                if (timeDiff > 600)
                    return false;
                if (!contentClean)
                    return timeDiff < 30;
                const msgContent = (m?.message?.conversation ??
                    m?.message?.extendedTextMessage?.text ??
                    m?.body ?? m?.text ?? '').trim().toLowerCase();
                return msgContent === contentClean || timeDiff < 15;
            });
            if (match) {
                const waId = match?.key?.id ?? match?.id ?? match?.messageId ?? '';
                if (waId) {
                    logger_1.default.info('UAZAPI: source_id encontrado via /message/find', {
                        phone: phone.substring(0, 6) + '****',
                        chatId,
                        waId,
                    });
                    return waId;
                }
            }
        }
        catch (err) {
            logger_1.default.warn('UAZAPI: /message/find falhou para chatId', { chatId, error: err.message });
        }
    }
    logger_1.default.warn('UAZAPI: mensagem não encontrada via /message/find', {
        phone: phone.substring(0, 6) + '****',
        contentLen: contentClean.length,
        createdAtSeconds,
    });
    return null;
}
//# sourceMappingURL=uazapi.js.map