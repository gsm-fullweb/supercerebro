import { Server as SocketIOServer } from 'socket.io';
export declare function setCampaignSenderSocketIO(socketIO: SocketIOServer): void;
export declare class CampaignSender {
    private botToken;
    constructor();
    /** Resolve o API token da campanha */
    private resolveApiToken;
    /** Encontra ou cria contato Chatwoot por telefone */
    private findOrCreateContact;
    /** Encontra conversa existente aberta do contato na inbox, ou cria uma nova */
    private findOrCreateConversation;
    /** Processa envio de uma mensagem da campanha para um contato */
    processSendMessage(campaignId: number, contactId: number, accountId: number): Promise<void>;
    /** Processa follow-up para contato que não respondeu */
    processFollowUp(campaignId: number, contactId: number, accountId: number, attemptNumber: number): Promise<void>;
    /** Processa lote de verificação de números */
    processVerifyBatch(campaignId: number, accountId: number, phones: string[]): Promise<void>;
    /** Inicia uma campanha: resolve contatos, cria CampaignContacts e enfileira jobs */
    startCampaign(campaignId: number, accountId: number, apiToken?: string): Promise<void>;
    /** Resolve lista de contatos da fonte configurada */
    private resolveContacts;
    private resolveFromTags;
    private resolveFromKanbanStages;
    private resolveFromChatwootStatus;
    private deduplicateContacts;
    private filterBlacklist;
    private updateCampaignCounts;
    /** Reinicia uma campanha recorrente: limpa contatos antigos e re-executa */
    restartRecurringCampaign(campaignId: number): Promise<void>;
    private emitProgress;
}
//# sourceMappingURL=campaignSender.d.ts.map