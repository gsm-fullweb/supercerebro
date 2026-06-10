/**
 * Cliente PostgreSQL para consultas READ-ONLY no banco do Chatwoot
 * Usado apenas para validação de JWT sem sobrecarregar a API
 */
declare class ChatwootDatabase {
    private connectionString;
    constructor();
    /**
     * Valida JWT consultando diretamente a tabela users do Chatwoot
     * Muito mais rápido que fazer HTTP request para /api/v1/profile
     */
    validateJWTDirect(accessToken: string, client: string, uid: string): Promise<any | null>;
    /**
     * Valida API token consultando diretamente a tabela access_tokens do Chatwoot
     */
    validateAPITokenDirect(apiToken: string): Promise<any | null>;
    /**
     * Busca o access_token do Chatwoot de um usuário pelo seu ID
     * Usado para autenticar chamadas API em nome do usuário
     */
    getUserAccessToken(userId: number): Promise<string | null>;
    /**
     * Retorna o access_token de qualquer admin da conta no Chatwoot.
     * Usado como fallback pelo ensureGlobalWebhook quando não há apiToken/jwt disponível.
     */
    getAccountAdminToken(accountId: number): Promise<string | null>;
    /**
     * Retorna todos os account_ids associados a um usuário Chatwoot (via account_users).
     * Usado pelo scheduler para tentar contas alternativas quando a conta padrão retorna 404.
     */
    getUserAccountIds(userId: number): Promise<number[]>;
    /**
     * Verifica se um usuário Chatwoot tem acesso a uma conta específica.
     * SuperAdmins têm acesso a qualquer conta; demais precisam estar em account_users.
     * Usado para validar X-Account-ID no middleware de API token.
     */
    canUserAccessAccount(chatwootUserId: number, accountId: number): Promise<boolean>;
    /**
     * Busca conversas de um contato diretamente no banco do Chatwoot
     */
    getContactConversations(accountId: number, contactId: number): Promise<{
        id: number;
    }[]>;
    /**
     * Retorna configuração de uma inbox WhatsApp Cloud pelo ID.
     * Busca direto nas tabelas inboxes + channel_whatsapp do Chatwoot.
     */
    getWhatsappInboxConfig(inboxId: number, accountId: number | null): Promise<{
        inboxId: number;
        inboxName: string;
        phoneNumber: string;
        provider: string;
        providerConfig: {
            api_key?: string;
            phone_number_id?: string;
            business_account_id?: string;
            webhook_verify_token?: string;
        };
    } | null>;
    /**
     * Retorna todas as inboxes de API Oficial WhatsApp (Channel::Whatsapp) da conta.
     */
    getAllWhatsappInboxes(accountId: number): Promise<Array<{
        inboxId: number;
        inboxName: string;
        phoneNumber: string;
        providerConfig: {
            api_key?: string;
            phone_number_id?: string;
            business_account_id?: string;
        };
    }>>;
    /**
     * Retorna o API access token de um administrador da conta.
     * Usado para buscar conversas sem restrição de visibilidade do agente.
     */
    getAdminApiTokenForAccount(accountId: number): Promise<string | null>;
    /**
     * Retorna o status de entrega de uma mensagem do Chatwoot.
     * status: 0=sent, 1=delivered, 2=read, 3=failed
     * Usado pelo polling de status de campanhas quando o webhook não inclui o campo status.
     */
    getMessageDeliveryStatus(messageId: number): Promise<{
        status: number;
        contentAttributes: Record<string, unknown>;
    } | null>;
    /**
     * Retorna o channel_type de uma inbox pelo ID.
     * Ex: 'Channel::Whatsapp', 'Channel::Api', 'Channel::Email', etc.
     */
    getInboxChannelType(inboxId: number): Promise<string | null>;
    /**
     * Atualiza source_id de uma mensagem do Chatwoot (somente se ainda não tiver).
     * Usado para registrar o WA message ID em mensagens enviadas via UazAPI.
     */
    updateMessageSourceId(chatwootMessageId: number, sourceId: string): Promise<boolean>;
    /**
     * Busca mensagens outgoing (message_type=1) sem source_id em uma conversa.
     * Retorna as N mais recentes para matching com evento UazAPI.
     */
    findOutgoingMessagesWithoutSourceId(conversationId: number, limit?: number, sinceTs?: number): Promise<Array<{
        id: number;
        content: string;
        created_at: number;
    }>>;
    /**
     * Busca conversas de um inbox pelo número de telefone do contato.
     */
    findConversationsByPhone(accountId: number, inboxId: number, phone: string): Promise<Array<{
        id: number;
    }>>;
    /**
     * Atualiza o conteúdo de uma mensagem do Chatwoot diretamente no banco.
     * Usado como fallback quando não é possível editar no WhatsApp (source_id ausente).
     */
    updateMessageContent(chatwootMessageId: number, newContent: string): Promise<boolean>;
}
declare const _default: ChatwootDatabase;
export default _default;
//# sourceMappingURL=chatwootDatabase.d.ts.map