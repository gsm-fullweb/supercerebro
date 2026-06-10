export interface UazapiConfig {
    baseUrl: string;
    adminToken: string;
}
export interface UazapiInstance {
    name: string;
    token: string;
    qrcode?: string;
    status?: string;
}
export interface UazapiChatwootConfig {
    enabled: boolean;
    url: string;
    access_token: string;
    account_id: number;
    inbox_id: number;
    ignore_groups: boolean;
    sign_messages: boolean;
    create_new_conversation: boolean;
}
/**
 * Cria uma nova instância na Uazapi
 */
export declare function createUazapiInstance(config: UazapiConfig, instanceName: string, accountId: number, systemName?: string): Promise<UazapiInstance>;
/**
 * Conecta instância e obtém QR Code
 */
export declare function connectUazapiInstance(config: UazapiConfig, instanceToken: string): Promise<{
    qrcode: string;
}>;
/**
 * Busca status da instância
 */
export declare function getUazapiInstanceStatus(config: UazapiConfig, instanceToken: string): Promise<any>;
/**
 * Configura integração com Chatwoot
 */
export declare function configureUazapiChatwoot(config: UazapiConfig, instanceToken: string, chatwootConfig: UazapiChatwootConfig): Promise<any>;
/**
 * Deleta instância
 */
export declare function deleteUazapiInstance(config: UazapiConfig, instanceToken: string): Promise<void>;
/**
 * Envia mensagem de texto via Uazapi (/send/text)
 * Método confiável de entrega — diferente do webhook /chatwoot/webhook que é
 * um "falso positivo" e pode não entregar a mensagem ao WhatsApp.
 */
export declare function sendUazapiText(baseUrl: string, instanceToken: string, number: string, text: string): Promise<any>;
/**
 * Logout da instância
 */
export declare function logoutUazapiInstance(config: UazapiConfig, instanceToken: string): Promise<void>;
export declare function deleteUazapiMessage(baseUrl: string, instanceToken: string, messageId: string): Promise<void>;
export declare function editUazapiMessage(baseUrl: string, instanceToken: string, messageId: string, newText: string): Promise<void>;
/**
 * Busca o WA message ID de uma mensagem enviada via UazAPI.
 * Usa POST /message/find para listar mensagens do chat e encontra por conteúdo/timestamp.
 */
export declare function findUazapiMessageId(baseUrl: string, instanceToken: string, phone: string, content: string, createdAtSeconds: number): Promise<string | null>;
//# sourceMappingURL=uazapi.d.ts.map