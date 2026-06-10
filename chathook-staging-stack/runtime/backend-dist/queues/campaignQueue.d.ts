import Bull from 'bull';
export interface CampaignJobData {
    type: 'send_message' | 'follow_up_message' | 'verify_numbers_batch';
    campaignId: number;
    contactId?: number;
    accountId: number;
    attemptNumber?: number;
    phonesBatch?: string[];
}
export declare const campaignQueue: Bull.Queue<CampaignJobData>;
/**
 * Enfileira envio para um contato da campanha
 */
export declare function enqueueCampaignContact(campaignId: number, contactId: number, accountId: number, delayMs?: number): Promise<Bull.Job<CampaignJobData>>;
/**
 * Enfileira follow-up para contato que não respondeu
 */
export declare function enqueueCampaignFollowUp(campaignId: number, contactId: number, accountId: number, attemptNumber: number, delayMs: number): Promise<Bull.Job<CampaignJobData>>;
/**
 * Enfileira verificação de lote de números
 */
export declare function enqueueNumberVerification(campaignId: number, accountId: number, phonesBatch: string[]): Promise<Bull.Job<CampaignJobData>>;
//# sourceMappingURL=campaignQueue.d.ts.map