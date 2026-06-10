declare const router: import("express-serve-static-core").Router;
export declare function getOAuthAccessToken(accountId: number): Promise<{
    accessToken: string;
    openaiAccountId: string | null;
} | null>;
export default router;
//# sourceMappingURL=oauth-credentials.d.ts.map