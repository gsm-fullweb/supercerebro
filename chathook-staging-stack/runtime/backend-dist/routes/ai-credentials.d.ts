declare const router: import("express-serve-static-core").Router;
export declare function getDecryptedCredential(accountId: number, provider: 'openai' | 'groq' | 'openrouter' | 'google' | 'stability', credentialType?: 'text' | 'audio' | 'image'): Promise<string | null>;
export declare function getAudioTranscriptionCredential(accountId: number): Promise<{
    provider: 'openai' | 'groq';
    apiKey: string;
} | null>;
export default router;
//# sourceMappingURL=ai-credentials.d.ts.map