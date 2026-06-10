"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEvoGoInstance = createEvoGoInstance;
exports.connectEvoGoInstance = connectEvoGoInstance;
exports.getEvoGoQR = getEvoGoQR;
exports.getEvoGoStatus = getEvoGoStatus;
exports.getEvoGoInstanceInfo = getEvoGoInstanceInfo;
exports.listEvoGoInstances = listEvoGoInstances;
exports.deleteEvoGoMessage = deleteEvoGoMessage;
exports.editEvoGoMessage = editEvoGoMessage;
exports.deleteEvoGoInstance = deleteEvoGoInstance;
const axios_1 = __importDefault(require("axios"));
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Cria uma instância na Evolution Go API.
 * Rota: POST /instance/create  (global apikey)
 * Body: { name, token }
 * Retorna o UUID (id) atribuído pela API.
 */
async function createEvoGoInstance(evolutionUrl, globalApiKey, instanceName, instanceToken) {
    const url = `${evolutionUrl}/instance/create`;
    logger_1.default.info('EvoGo: creating instance', { instanceName, url });
    const response = await axios_1.default.post(url, { name: instanceName, token: instanceToken }, {
        headers: { apikey: globalApiKey, 'Content-Type': 'application/json' },
        timeout: 15000,
    });
    const data = response.data?.data;
    const instanceId = data?.id || data?.instanceId || '';
    return { instanceId };
}
/**
 * Conecta uma instância e registra o webhook.
 * Rota: POST /instance/connect  (instance token como apikey)
 * Body: { webhookUrl, subscribe, immediate }
 * Retorna QR code se disponível.
 */
async function connectEvoGoInstance(evolutionUrl, instanceToken, webhookUrl, subscribe = ['MESSAGE', 'SEND_MESSAGE', 'CONNECTION', 'HISTORY_SYNC']) {
    const url = `${evolutionUrl}/instance/connect`;
    logger_1.default.info('EvoGo: connecting instance and registering webhook', { url, webhookUrl });
    const response = await axios_1.default.post(url, { webhookUrl, subscribe, immediate: false }, {
        headers: { apikey: instanceToken, 'Content-Type': 'application/json' },
        timeout: 20000,
    });
    // Evolution Go retorna webhook info no connect, QR não vem neste endpoint
    const status = response.data?.status || 'connecting';
    return { qrcode: null, status };
}
/**
 * Busca o QR code atual de uma instância.
 * Rota: GET /instance/qr  (instance token como apikey)
 * Resposta: { data: { Qrcode: "data:image/...", Code: "..." }, message: "success" }
 */
async function getEvoGoQR(evolutionUrl, instanceToken) {
    const url = `${evolutionUrl}/instance/qr`;
    logger_1.default.info('EvoGo: fetching QR code', { url });
    const response = await axios_1.default.get(url, {
        headers: { apikey: instanceToken },
        timeout: 10000,
    });
    const data = response.data?.data;
    // Campo com capital Q: { Qrcode: "data:image/png;base64,..." }
    const qrcode = data?.Qrcode || data?.qrcode || null;
    const status = response.data?.status || 'connecting';
    return { qrcode, status };
}
/**
 * Busca o status de conexão de uma instância.
 * Rota: GET /instance/status  (instance token como apikey)
 * Resposta: { data: { Connected: bool, LoggedIn: bool, Name: string, JID: string }, message: "success" }
 */
async function getEvoGoStatus(evolutionUrl, instanceToken) {
    const url = `${evolutionUrl}/instance/status`;
    const response = await axios_1.default.get(url, {
        headers: { apikey: instanceToken },
        timeout: 10000,
    });
    const data = response.data?.data;
    if (data?.Connected && data?.LoggedIn)
        return 'open';
    if (data?.Connected)
        return 'connecting';
    return 'close';
}
/**
 * Busca status + info de perfil de uma instância.
 * Rota: GET /instance/status  (instance token como apikey)
 */
async function getEvoGoInstanceInfo(evolutionUrl, instanceToken) {
    const url = `${evolutionUrl}/instance/status`;
    const response = await axios_1.default.get(url, {
        headers: { apikey: instanceToken },
        timeout: 10000,
    });
    const data = response.data?.data;
    let status = 'close';
    if (data?.Connected && data?.LoggedIn)
        status = 'open';
    else if (data?.Connected)
        status = 'connecting';
    // JID formato: 5511999999999@s.whatsapp.net → extrai só o número
    const jid = data?.JID || data?.Jid || data?.jid || '';
    const owner = jid ? jid.replace(/@s\.whatsapp\.net$/, '').replace(/@.*$/, '') : null;
    return {
        status,
        profileName: data?.Name || data?.name || null,
        owner,
        profilePictureUrl: data?.ProfilePicURL || data?.ProfilePicUrl || data?.profilePicUrl || null,
    };
}
/**
 * Lista todas as instâncias via global apikey.
 * Rota: GET /instance/all  (global apikey)
 */
async function listEvoGoInstances(evolutionUrl, globalApiKey) {
    const url = `${evolutionUrl}/instance/all`;
    const response = await axios_1.default.get(url, {
        headers: { apikey: globalApiKey },
        timeout: 10000,
    });
    const list = response.data?.data || [];
    return list.map((i) => ({
        id: i.id,
        name: i.name,
        token: i.token,
        connected: !!i.connected,
    }));
}
/**
 * Apaga uma mensagem no WhatsApp via Evolution Go.
 * Rota: DELETE /chat/deleteMessage/{instanceName}  (instance token como apikey)
 * Body: { id, remoteJid, fromMe }
 */
async function deleteEvoGoMessage(evolutionUrl, instanceToken, evoInstanceName, messageId, remoteJid) {
    // Remove prefixo WAID: se existir
    const cleanId = messageId.startsWith('WAID:') ? messageId.slice(5) : messageId;
    const jid = remoteJid.includes('@') ? remoteJid : `${remoteJid}@s.whatsapp.net`;
    const url = `${evolutionUrl}/chat/deleteMessage/${evoInstanceName}`;
    logger_1.default.info('EvoGo: tentando apagar mensagem', { evoInstanceName, cleanId, jid });
    await axios_1.default.delete(url, {
        headers: { apikey: instanceToken, 'Content-Type': 'application/json' },
        data: { id: cleanId, remoteJid: jid, fromMe: true },
        timeout: 10000,
    });
    logger_1.default.info('EvoGo: mensagem apagada', { evoInstanceName, cleanId });
}
/**
 * Edita uma mensagem no WhatsApp via conector Evolution Go.
 * O conector mantém em memória o mapa chatwootMsgId → waMessageId.
 */
async function editEvoGoMessage(connectorUrl, chatwootMessageId, inboxId, phone, newContent) {
    const url = `${connectorUrl}/internal/edit-message`;
    const response = await axios_1.default.post(url, {
        chatwootMessageId: String(chatwootMessageId),
        inboxId,
        phone,
        newContent,
    }, { timeout: 10000 });
    if (response.data?.error) {
        throw new Error(response.data.error);
    }
}
/**
 * Deleta uma instância da Evolution Go API.
 * Rota: DELETE /instance/delete/:uuid  (global apikey)
 * Precisa do UUID (id) — se não disponível, busca via GET /instance/all por nome.
 */
async function deleteEvoGoInstance(evolutionUrl, globalApiKey, instanceName, instanceUUID) {
    let uuid = instanceUUID;
    if (!uuid) {
        // Busca o UUID pelo nome
        const instances = await listEvoGoInstances(evolutionUrl, globalApiKey);
        const found = instances.find(i => i.name === instanceName);
        if (!found) {
            logger_1.default.warn('EvoGo: instance not found in API for deletion', { instanceName });
            return;
        }
        uuid = found.id;
    }
    const url = `${evolutionUrl}/instance/delete/${uuid}`;
    logger_1.default.info('EvoGo: deleting instance', { instanceName, uuid, url });
    await axios_1.default.delete(url, {
        headers: { apikey: globalApiKey },
        timeout: 10000,
    });
}
//# sourceMappingURL=evolutionGo.js.map