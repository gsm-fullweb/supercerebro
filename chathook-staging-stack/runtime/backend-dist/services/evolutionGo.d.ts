/**
 * Serviço para interagir com a Evolution Go API.
 *
 * Auth de duas camadas:
 *  - Rotas globais (/instance/create, /instance/all, /instance/delete/:uuid):
 *      header `apikey` = chave global da conta (GLOBAL_API_KEY)
 *  - Rotas de instância (/instance/connect, /instance/qr, /instance/status):
 *      header `apikey` = token per-instância (definido pelo usuário no create)
 *
 * Rota de criação: POST /instance/create  (não /admin/instance/create)
 * QR code field:   data.data.Qrcode  (capital Q)
 * Delete:          DELETE /instance/delete/:uuid  (usa UUID retornado no create)
 */
export interface EvoGoQRResult {
    qrcode: string | null;
    status: string;
}
export interface EvoGoCreateResult {
    instanceId: string;
}
/**
 * Cria uma instância na Evolution Go API.
 * Rota: POST /instance/create  (global apikey)
 * Body: { name, token }
 * Retorna o UUID (id) atribuído pela API.
 */
export declare function createEvoGoInstance(evolutionUrl: string, globalApiKey: string, instanceName: string, instanceToken: string): Promise<EvoGoCreateResult>;
/**
 * Conecta uma instância e registra o webhook.
 * Rota: POST /instance/connect  (instance token como apikey)
 * Body: { webhookUrl, subscribe, immediate }
 * Retorna QR code se disponível.
 */
export declare function connectEvoGoInstance(evolutionUrl: string, instanceToken: string, webhookUrl: string, subscribe?: string[]): Promise<EvoGoQRResult>;
/**
 * Busca o QR code atual de uma instância.
 * Rota: GET /instance/qr  (instance token como apikey)
 * Resposta: { data: { Qrcode: "data:image/...", Code: "..." }, message: "success" }
 */
export declare function getEvoGoQR(evolutionUrl: string, instanceToken: string): Promise<EvoGoQRResult>;
/**
 * Busca o status de conexão de uma instância.
 * Rota: GET /instance/status  (instance token como apikey)
 * Resposta: { data: { Connected: bool, LoggedIn: bool, Name: string, JID: string }, message: "success" }
 */
export declare function getEvoGoStatus(evolutionUrl: string, instanceToken: string): Promise<string>;
export interface EvoGoInstanceInfo {
    status: string;
    profileName: string | null;
    owner: string | null;
    profilePictureUrl: string | null;
}
/**
 * Busca status + info de perfil de uma instância.
 * Rota: GET /instance/status  (instance token como apikey)
 */
export declare function getEvoGoInstanceInfo(evolutionUrl: string, instanceToken: string): Promise<EvoGoInstanceInfo>;
/**
 * Lista todas as instâncias via global apikey.
 * Rota: GET /instance/all  (global apikey)
 */
export declare function listEvoGoInstances(evolutionUrl: string, globalApiKey: string): Promise<Array<{
    id: string;
    name: string;
    token: string;
    connected: boolean;
}>>;
/**
 * Apaga uma mensagem no WhatsApp via Evolution Go.
 * Rota: DELETE /chat/deleteMessage/{instanceName}  (instance token como apikey)
 * Body: { id, remoteJid, fromMe }
 */
export declare function deleteEvoGoMessage(evolutionUrl: string, instanceToken: string, evoInstanceName: string, messageId: string, remoteJid: string): Promise<void>;
/**
 * Edita uma mensagem no WhatsApp via conector Evolution Go.
 * O conector mantém em memória o mapa chatwootMsgId → waMessageId.
 */
export declare function editEvoGoMessage(connectorUrl: string, chatwootMessageId: string | number, inboxId: number, phone: string, newContent: string): Promise<void>;
/**
 * Deleta uma instância da Evolution Go API.
 * Rota: DELETE /instance/delete/:uuid  (global apikey)
 * Precisa do UUID (id) — se não disponível, busca via GET /instance/all por nome.
 */
export declare function deleteEvoGoInstance(evolutionUrl: string, globalApiKey: string, instanceName: string, instanceUUID?: string): Promise<void>;
//# sourceMappingURL=evolutionGo.d.ts.map