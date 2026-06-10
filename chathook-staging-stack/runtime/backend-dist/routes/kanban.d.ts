declare const router: import("express-serve-static-core").Router;
export declare function invalidateCardsIndexCache(accountId: number): void;
export declare function invalidateFunnelBoardCache(accountId: number, funnelId?: number): void;
export declare function updateCardsIndexCacheEntry(accountId: number, conversationId: number, data: Record<string, any> | null): void;
export default router;
//# sourceMappingURL=kanban.d.ts.map