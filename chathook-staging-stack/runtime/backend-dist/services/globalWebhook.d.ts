import { ChatwootJWT } from '../types';
/**
 * Garante que o webhook global do Chatwoot existe e tem as subscriptions corretas.
 * Chamado ao criar o primeiro flow e ao iniciar qualquer campanha.
 * Um único webhook por conta — sem duplicatas, sem conflito com chatbot.
 */
export declare function ensureGlobalWebhook(accountId: number, apiToken?: string, jwt?: ChatwootJWT): Promise<string | null>;
/**
 * Remove webhook global do Chatwoot
 */
export declare function removeGlobalWebhook(accountId: number, apiToken?: string, jwt?: ChatwootJWT): Promise<void>;
//# sourceMappingURL=globalWebhook.d.ts.map