"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.campaignQueue = void 0;
exports.enqueueCampaignContact = enqueueCampaignContact;
exports.enqueueCampaignFollowUp = enqueueCampaignFollowUp;
exports.enqueueNumberVerification = enqueueNumberVerification;
const bull_1 = __importDefault(require("bull"));
const logger_1 = __importDefault(require("../utils/logger"));
const campaignSender_1 = require("../services/campaignSender");
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    db: parseInt(process.env.REDIS_DB || '0'),
};
if (process.env.REDIS_PASSWORD)
    redisConfig.password = process.env.REDIS_PASSWORD;
if (process.env.REDIS_USERNAME)
    redisConfig.username = process.env.REDIS_USERNAME;
logger_1.default.info('Initializing campaign queue', { redis: redisConfig });
exports.campaignQueue = new bull_1.default('campaigns', {
    redis: redisConfig,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: false,
        removeOnFail: false,
    },
});
exports.campaignQueue.process(async (job) => {
    const { type, campaignId, contactId, accountId, attemptNumber, phonesBatch } = job.data;
    logger_1.default.info(`Processing campaign job ${job.id}`, { type, campaignId, contactId });
    const sender = new campaignSender_1.CampaignSender();
    try {
        if (type === 'send_message' && contactId !== undefined) {
            await sender.processSendMessage(campaignId, contactId, accountId);
        }
        else if (type === 'follow_up_message' && contactId !== undefined) {
            await sender.processFollowUp(campaignId, contactId, accountId, attemptNumber || 1);
        }
        else if (type === 'verify_numbers_batch' && phonesBatch) {
            await sender.processVerifyBatch(campaignId, accountId, phonesBatch);
        }
        else {
            logger_1.default.warn(`Unknown campaign job type or missing params: ${type}`);
        }
        logger_1.default.info(`Campaign job ${job.id} completed`);
        return { success: true };
    }
    catch (error) {
        logger_1.default.error(`Campaign job ${job.id} failed:`, error);
        throw error;
    }
});
exports.campaignQueue.on('completed', (job) => {
    logger_1.default.info(`Campaign job ${job.id} completed`);
});
exports.campaignQueue.on('failed', (job, error) => {
    logger_1.default.error(`Campaign job ${job?.id} failed permanently:`, error);
});
exports.campaignQueue.on('stalled', (job) => {
    logger_1.default.warn(`Campaign job ${job.id} stalled`);
});
exports.campaignQueue.on('error', (error) => {
    logger_1.default.error('Campaign queue error:', error);
});
/**
 * Enfileira envio para um contato da campanha
 */
async function enqueueCampaignContact(campaignId, contactId, accountId, delayMs = 0) {
    const job = await exports.campaignQueue.add({ type: 'send_message', campaignId, contactId, accountId }, delayMs > 0 ? { delay: delayMs } : {});
    logger_1.default.info(`Campaign contact enqueued: job ${job.id}, campaign ${campaignId}, contact ${contactId}`);
    return job;
}
/**
 * Enfileira follow-up para contato que não respondeu
 */
async function enqueueCampaignFollowUp(campaignId, contactId, accountId, attemptNumber, delayMs) {
    const job = await exports.campaignQueue.add({ type: 'follow_up_message', campaignId, contactId, accountId, attemptNumber }, { delay: delayMs });
    logger_1.default.info(`Campaign follow-up enqueued: job ${job.id}, campaign ${campaignId}, attempt ${attemptNumber}`);
    return job;
}
/**
 * Enfileira verificação de lote de números
 */
async function enqueueNumberVerification(campaignId, accountId, phonesBatch) {
    const job = await exports.campaignQueue.add({
        type: 'verify_numbers_batch',
        campaignId,
        accountId,
        phonesBatch,
    });
    logger_1.default.info(`Number verification enqueued: job ${job.id}, campaign ${campaignId}, ${phonesBatch.length} phones`);
    return job;
}
//# sourceMappingURL=campaignQueue.js.map