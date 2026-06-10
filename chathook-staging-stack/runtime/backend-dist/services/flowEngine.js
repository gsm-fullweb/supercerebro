"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlowEngine = void 0;
exports.setFlowEngineSocketIO = setFlowEngineSocketIO;
const database_1 = __importDefault(require("./database"));
const chatwoot_1 = __importDefault(require("./chatwoot"));
const chatwootDatabase_1 = __importDefault(require("./chatwootDatabase"));
const logger_1 = __importDefault(require("../utils/logger"));
const expr_eval_1 = require("expr-eval");
const aiService_1 = __importDefault(require("./aiService"));
const ai_credentials_1 = require("../routes/ai-credentials");
const oauth_credentials_1 = require("../routes/oauth-credentials");
const axios_1 = __importDefault(require("axios"));
const systemSettings_1 = require("./systemSettings");
const flowQueue_1 = require("../queues/flowQueue");
let io = null;
function setFlowEngineSocketIO(socketIO) {
    io = socketIO;
}
/**
 * Engine de execução de flows de chatbot
 */
class FlowEngine {
    MAX_DEPTH = 50; // Limite de nodes por execução
    MAX_EXECUTION_TIME = 5 * 60 * 1000; // 5 minutos
    botToken;
    constructor() {
        // Token de sistema para envio de mensagens do bot (fallback global)
        this.botToken = process.env.CHATWOOT_BOT_TOKEN;
        if (!this.botToken) {
            logger_1.default.warn('CHATWOOT_BOT_TOKEN not configured - bot messages will be sent without authentication');
        }
    }
    /**
     * Busca o bot token para uma conta (do flow creator ou fallback para SystemSettings/env)
     */
    async getBotToken(accountId, flowId) {
        // Se flowId fornecido, busca token do criador do flow
        if (flowId) {
            const flow = await database_1.default.chatbotFlow.findUnique({
                where: { id: flowId },
                select: { creatorAccessToken: true, createdBy: true },
            });
            // Se já tem token salvo, usa
            if (flow?.creatorAccessToken) {
                return flow.creatorAccessToken;
            }
            // Se não tem token salvo, busca do banco do Chatwoot via chatwootDatabase
            if (flow?.createdBy) {
                const tokenFromDb = await chatwootDatabase_1.default.getUserAccessToken(flow.createdBy);
                if (tokenFromDb) {
                    // Salva o token no flow para próximas execuções
                    await database_1.default.chatbotFlow.update({
                        where: { id: flowId },
                        data: { creatorAccessToken: tokenFromDb },
                    });
                    return tokenFromDb;
                }
            }
        }
        // Fallback: busca do SystemSettings ou env
        const settings = await (0, systemSettings_1.getSystemSettings)(accountId);
        return settings.chatwootPlatformToken || this.botToken;
    }
    /**
     * Executa um flow completo
     */
    async executeFlow(flowId, conversationId, accountId, initialContext = {}) {
        const startTime = Date.now();
        let execution;
        try {
            // Busca o flow
            const flow = await database_1.default.chatbotFlow.findFirst({
                where: { id: flowId, accountId },
            });
            if (!flow) {
                throw new Error(`Flow ${flowId} não encontrado`);
            }
            if (!flow.isActive) {
                logger_1.default.warn(`Flow ${flowId} está inativo, ignorando execução`);
                return;
            }
            const flowData = JSON.parse(flow.flowData);
            const { nodes, edges } = flowData;
            // Verifica se existe contexto de retomada (para waitForResponse)
            const resumeExecutionId = initialContext._resumeExecutionId;
            let currentNodeId;
            let context = { ...initialContext, _flowId: flowId }; // Adiciona flowId no context
            if (resumeExecutionId) {
                // Retomando execução anterior
                execution = await database_1.default.flowExecution.findUnique({
                    where: { id: resumeExecutionId },
                });
                if (!execution) {
                    throw new Error(`Execução ${resumeExecutionId} não encontrada`);
                }
                // Guard: se a execução já foi retomada (não está mais 'waiting'), ignora
                // Isso evita que o timeout dispare depois que o usuário respondeu
                if (execution.status !== 'waiting') {
                    logger_1.default.info(`Execution ${resumeExecutionId} already resumed (status: ${execution.status}), skipping`);
                    return;
                }
                const savedNodeId = execution.currentNodeId || undefined;
                context = {
                    ...JSON.parse(execution.context || '{}'),
                    ...initialContext,
                };
                // Se o node salvo for waitForResponse, avança para o próximo
                // (evita processar o mesmo waitForResponse de novo ao retomar)
                if (savedNodeId) {
                    const savedNode = nodes.find((n) => n.id === savedNodeId);
                    if (savedNode?.type === 'waitForResponse') {
                        currentNodeId = await this.getNextNode(savedNodeId, 'waitForResponse', edges, undefined, undefined) || undefined;
                    }
                    else {
                        currentNodeId = savedNodeId;
                    }
                }
                // Atualiza status para running
                await database_1.default.flowExecution.update({
                    where: { id: resumeExecutionId },
                    data: { status: 'running' },
                });
            }
            else {
                // Nova execução
                execution = await database_1.default.flowExecution.create({
                    data: {
                        flowId,
                        conversationId,
                        accountId,
                        status: 'running',
                        context: JSON.stringify(context),
                    },
                });
                // Emite evento via Socket.IO
                io?.to(`account_${accountId}`).emit('flow:execution:started', {
                    flowId,
                    conversationId,
                    executionId: execution.id,
                });
            }
            logger_1.default.info(`Executing flow ${flowId} for conversation ${conversationId}`, {
                executionId: execution.id,
                resume: !!resumeExecutionId,
            });
            // Encontra o node start se não estiver retomando
            if (!currentNodeId) {
                const startNode = nodes.find((n) => n.type === 'start');
                if (!startNode) {
                    throw new Error('Flow não possui node Start');
                }
                currentNodeId = startNode.id;
                // Verifica horário de atendimento (apenas na execução inicial, não ao retomar)
                if (!resumeExecutionId) {
                    const bhResult = await this.checkBusinessHours(startNode, accountId, conversationId);
                    if (bhResult === 'blocked') {
                        // Fora do horário e ação = ignorar — encerra execução silenciosamente
                        await database_1.default.flowExecution.update({
                            where: { id: execution.id },
                            data: { status: 'completed' },
                        });
                        logger_1.default.info(`Flow ${flowId} blocked by business hours — outside schedule, no response`);
                        return;
                    }
                    else if (bhResult === 'message_sent') {
                        // Fora do horário e mensagem automática já enviada — encerra
                        await database_1.default.flowExecution.update({
                            where: { id: execution.id },
                            data: { status: 'completed' },
                        });
                        logger_1.default.info(`Flow ${flowId} blocked by business hours — outside schedule, auto-message sent`);
                        return;
                    }
                    // bhResult === 'ok' → prossegue normalmente
                }
            }
            // Loop de execução
            let depth = 0;
            while (currentNodeId && depth < this.MAX_DEPTH) {
                // Verifica timeout
                if (Date.now() - startTime > this.MAX_EXECUTION_TIME) {
                    throw new Error('Timeout: execução excedeu 5 minutos');
                }
                // Busca o node atual
                const currentNode = nodes.find((n) => n.id === currentNodeId);
                if (!currentNode) {
                    throw new Error(`Node ${currentNodeId} não encontrado`);
                }
                logger_1.default.info(`Processing node ${currentNode.id} (${currentNode.type})`);
                // Processa o node
                const result = await this.processNode(execution.id, currentNode, context, conversationId, accountId, nodes, edges);
                // Atualiza contexto
                if (result.context) {
                    context = { ...context, ...result.context };
                }
                // Se o node é waitForResponse, pausa a execução
                if (result.waitForResponse) {
                    await this.saveExecutionState(execution.id, currentNodeId, context, 'waiting');
                    logger_1.default.info(`Flow paused at waitForResponse node ${currentNodeId}`);
                    // Agenda timeout automático se configurado
                    const timeoutSeconds = Number(currentNode.data?.timeout) || 0;
                    if (timeoutSeconds > 0) {
                        await (0, flowQueue_1.enqueueFlowTimeout)(execution.id, flowId, conversationId, accountId, timeoutSeconds);
                        logger_1.default.info(`waitForResponse timeout scheduled: ${timeoutSeconds}s for execution ${execution.id}`);
                    }
                    return; // Sai da execução, será retomada no webhook
                }
                // Se o node é end, finaliza
                if (currentNode.type === 'end') {
                    await this.saveExecutionState(execution.id, currentNodeId, context, 'completed');
                    logger_1.default.info(`Flow completed for conversation ${conversationId}`);
                    // Emite evento de conclusão
                    io?.to(`account_${accountId}`).emit('flow:execution:completed', {
                        flowId,
                        conversationId,
                        executionId: execution.id,
                    });
                    return;
                }
                // Determina próximo node
                const nextNodeId = await this.getNextNode(currentNodeId, currentNode.type, edges, result.conditionResult, result.switchCaseIndex, result.scheduleAppointmentHandle, result.interactiveItemId);
                if (!nextNodeId) {
                    logger_1.default.warn(`No next node found for ${currentNodeId}, ending flow`);
                    await this.saveExecutionState(execution.id, currentNodeId, context, 'completed');
                    return;
                }
                currentNodeId = nextNodeId;
                depth++;
            }
            if (depth >= this.MAX_DEPTH) {
                throw new Error(`Flow execution exceeded maximum depth of ${this.MAX_DEPTH} nodes`);
            }
        }
        catch (error) {
            logger_1.default.error(`Flow execution failed for flow ${flowId}:`, error);
            if (execution) {
                await database_1.default.flowExecution.update({
                    where: { id: execution.id },
                    data: {
                        status: 'failed',
                        errorMessage: error.message,
                        completedAt: new Date(),
                    },
                });
                // Emite evento de falha
                io?.to(`account_${accountId}`).emit('flow:execution:failed', {
                    flowId,
                    conversationId,
                    executionId: execution.id,
                    error: error.message,
                });
            }
            throw error;
        }
    }
    /**
     * Verifica se o horário atual está dentro do horário de atendimento configurado no start node.
     * Retorna: 'ok' | 'blocked' | 'message_sent'
     */
    async checkBusinessHours(startNode, accountId, conversationId) {
        const bh = startNode.data?.businessHours;
        if (!bh || !bh.enabled)
            return 'ok';
        const timezone = bh.timezone || 'America/Sao_Paulo';
        // Obtém data/hora atual no fuso configurado
        const now = new Date();
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour12: false,
            weekday: 'short',
            hour: '2-digit',
            minute: '2-digit',
        }).formatToParts(now);
        const weekdayShort = parts.find((p) => p.type === 'weekday')?.value || '';
        const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
        const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
        const currentMinutes = hour * 60 + minute;
        // Mapeia dia da semana (0=Dom, 1=Seg, ..., 6=Sáb)
        const weekdayMap = {
            Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
        };
        const dayOfWeek = weekdayMap[weekdayShort];
        const allowedDays = Array.isArray(bh.days) ? bh.days : [1, 2, 3, 4, 5];
        // Verifica se o dia está permitido
        if (!allowedDays.includes(dayOfWeek)) {
            return this.handleOutsideHours(bh, accountId, conversationId);
        }
        // Converte horários para minutos
        const toMinutes = (t) => {
            const [h, m] = (t || '00:00').split(':').map(Number);
            return (h || 0) * 60 + (m || 0);
        };
        const startMinutes = toMinutes(bh.startTime);
        const endMinutes = toMinutes(bh.endTime);
        // Verifica se está dentro do horário de trabalho
        if (currentMinutes < startMinutes || currentMinutes >= endMinutes) {
            return this.handleOutsideHours(bh, accountId, conversationId);
        }
        // Verifica intervalo de almoço
        if (bh.lunchEnabled) {
            const lunchStart = toMinutes(bh.lunchStart);
            const lunchEnd = toMinutes(bh.lunchEnd);
            if (currentMinutes >= lunchStart && currentMinutes < lunchEnd) {
                return this.handleOutsideHours(bh, accountId, conversationId);
            }
        }
        return 'ok';
    }
    async handleOutsideHours(bh, accountId, conversationId) {
        if (bh.outsideAction === 'message' && bh.outsideMessage) {
            try {
                await chatwoot_1.default.sendMessage(accountId, conversationId, bh.outsideMessage, undefined, this.botToken);
            }
            catch (err) {
                logger_1.default.warn('Falha ao enviar mensagem de fora do horário', { err });
            }
            return 'message_sent';
        }
        return 'blocked';
    }
    /**
     * Processa um node individual
     */
    async processNode(executionId, node, context, conversationId, accountId, nodes, edges) {
        // Salva estado atual
        await this.saveExecutionState(executionId, node.id, context, 'running');
        switch (node.type) {
            case 'start':
                return {}; // Start não faz nada, apenas inicializa
            case 'sendText':
                await this.executeSendText(node, context, conversationId, accountId);
                return {};
            case 'sendImage':
                await this.executeSendImage(node, context, conversationId, accountId);
                return {};
            case 'sendVideo':
                await this.executeSendVideo(node, context, conversationId, accountId);
                return {};
            case 'sendAudio':
                await this.executeSendAudio(node, context, conversationId, accountId);
                return {};
            case 'sendFile':
                await this.executeSendFile(node, context, conversationId, accountId);
                return {};
            case 'sendWATemplate':
                await this.executeSendWATemplate(node, context, conversationId, accountId);
                return {};
            case 'sendWAInteractive': {
                const isWaitingForThisNode = context._waitingForInteractiveNodeId === node.id;
                if (!isWaitingForThisNode) {
                    // Primeira execução: envia mensagem interativa e aguarda resposta
                    await this.executeSendWAInteractive(node, context, conversationId, accountId);
                    return {
                        waitForResponse: true,
                        context: {
                            _waitingForInteractiveNodeId: node.id,
                            _interactiveItems: node.data.items || [],
                        },
                    };
                }
                // Retomada: usuário respondeu — roteia pelo item clicado (matching por título)
                const response = String(context.response || '').trim().toLowerCase();
                const items = context._interactiveItems || node.data.items || [];
                const matched = items.find((item) => item.title.trim().toLowerCase() === response);
                logger_1.default.info(`sendWAInteractive resumed for node ${node.id}`, {
                    response,
                    matched: matched?.id || 'fallback',
                });
                return {
                    interactiveItemId: matched?.id || 'fallback',
                    context: { _waitingForInteractiveNodeId: null, _interactiveItems: null },
                };
            }
            case 'condition':
                const conditionResult = await this.evaluateCondition(node.data.condition, context, conversationId, accountId);
                return { conditionResult };
            case 'switch':
                // Switch SEMPRE aguarda resposta do usuário antes de avaliar
                if (!context.response) {
                    logger_1.default.info('Switch node waiting for user response');
                    return { waitForResponse: true };
                }
                const switchCaseIndex = await this.evaluateSwitch(node.data.cases, context, conversationId, accountId);
                return { switchCaseIndex };
            case 'delay':
                await this.executeDelay(node.data);
                return {};
            case 'changeStatus':
                await this.executeChangeStatus(node.data.status, conversationId, accountId, context);
                return {};
            case 'labels':
                await this.executeLabels(node.data.labels, node.data.action, conversationId, accountId, context);
                return {};
            case 'assign':
                await this.executeAssign(node.data.assignType, node.data.assignId, conversationId, accountId, context);
                return {};
            case 'applySLA':
                await this.executeApplySLA(node.data.slaId, conversationId, accountId, context);
                return {};
            case 'aiAgent':
                const aiResponse = await this.executeAIAgent(node.id, node.data, conversationId, accountId, context, nodes, edges);
                // Salva a resposta no contexto se configurado
                if (node.data.saveResponseTo) {
                    context[node.data.saveResponseTo] = aiResponse;
                }
                return {};
            case 'generateImage': {
                const imgResult = await this.executeGenerateImage(node.data, conversationId, accountId, context);
                if (node.data.saveImageUrl && imgResult) {
                    context[node.data.saveImageUrl] = imgResult;
                }
                return {};
            }
            case 'httpRequest':
                const httpResponse = await this.executeHttpRequest(node.data, context);
                // Salva a resposta no contexto se configurado
                if (node.data.saveResponseTo) {
                    context[node.data.saveResponseTo] = httpResponse;
                }
                return {};
            case 'waitForResponse':
                return { waitForResponse: true };
            case 'input': {
                // Input aguarda resposta e salva em uma variável nomeada.
                // Usa _waitingForInputNodeId para distinguir primeira execução (aguardar)
                // de retomada (capturar resposta). Isso evita capturar a mensagem que
                // disparou o flow (ex: botão do switch) como resposta prematura.
                const isWaitingForThisNode = context._waitingForInputNodeId === node.id;
                if (!isWaitingForThisNode) {
                    logger_1.default.info('Input node waiting for user response');
                    // Opcionalmente envia uma mensagem antes de aguardar
                    if (node.data.message) {
                        await this.executeSendText(node, context, conversationId, accountId);
                    }
                    // Salva flag no contexto para identificar retomada correta
                    return { waitForResponse: true, context: { _waitingForInputNodeId: node.id } };
                }
                // Retomada: captura a resposta do usuário na variável especificada
                const variableName = node.data.variableName || 'userInput';
                const newContext = { ...context, [variableName]: context.response, _waitingForInputNodeId: null };
                logger_1.default.info(`Input node saved response to variable "${variableName}"`, {
                    value: context.response,
                });
                return { context: newContext };
            }
            case 'checkResponse':
                // Verifica se houve resposta do usuário (para flows de sequência)
                // Retorna true/false através de conditionResult para permitir branching
                const hasResponse = !!context.userReplied;
                logger_1.default.info(`CheckResponse node evaluated`, { hasResponse });
                // Salva no contexto se configurado
                if (node.data.saveResponseTo) {
                    context[node.data.saveResponseTo] = hasResponse;
                }
                return { conditionResult: hasResponse };
            case 'scheduleAppointment': {
                const schedResult = await this.executeScheduleAppointment(node.data, conversationId, accountId, context);
                if (node.data.saveResultTo && schedResult) {
                    context[node.data.saveResultTo] = schedResult;
                }
                return {};
            }
            case 'cancelAppointment': {
                await this.executeCancelAppointment(node.data, accountId, context);
                return {};
            }
            case 'aiSchedulingAgent': {
                const aiSchedResult = await this.executeAISchedulingAgent(node.data, conversationId, accountId, context);
                if (node.data.saveResultTo && aiSchedResult?.appointmentId) {
                    context[node.data.saveResultTo] = aiSchedResult.appointmentId;
                }
                if (aiSchedResult?.booked) {
                    return { scheduleAppointmentHandle: 'booked' };
                }
                return { scheduleAppointmentHandle: 'failed' };
            }
            case 'checkAvailability': {
                await this.executeCheckAvailability(node.data, accountId, context);
                return {};
            }
            case 'moveToStage': {
                await this.executeMoveToStage(node.data, conversationId, accountId, context);
                return {};
            }
            case 'end':
                return {}; // End será tratado no loop principal
            default:
                logger_1.default.warn(`Unknown node type: ${node.type}`);
                return {};
        }
    }
    /**
     * Determina o próximo node baseado nas edges
     */
    async getNextNode(currentNodeId, nodeType, edges, conditionResult, switchCaseIndex, scheduleHandle, interactiveItemId) {
        const outgoingEdges = edges.filter((e) => e.source === currentNodeId && e.sourceHandle !== 'tools');
        if (outgoingEdges.length === 0) {
            return null; // Não há próximo node
        }
        // Switch routing
        if (nodeType === 'switch' && switchCaseIndex !== undefined) {
            // Fallback: nenhum case correspondeu
            if (switchCaseIndex === -1) {
                const fallbackEdge = outgoingEdges.find((e) => e.sourceHandle === 'fallback');
                if (fallbackEdge) {
                    logger_1.default.info('Switch took fallback path');
                    return fallbackEdge.target;
                }
                logger_1.default.info('Switch has no matching case and no fallback, ending flow');
                return null;
            }
            // Case correspondeu
            const handleId = `case-${switchCaseIndex}`;
            const edge = outgoingEdges.find((e) => e.sourceHandle === handleId);
            if (edge) {
                logger_1.default.info(`Switch took path: ${handleId}`);
                return edge.target;
            }
            logger_1.default.warn(`No edge found for switch case ${handleId}`);
            return null;
        }
        // Switch sem resultado (não deveria ocorrer, mas segurança extra)
        if (nodeType === 'switch' && switchCaseIndex === undefined) {
            logger_1.default.info('Switch has no matching case, ending flow');
            return null;
        }
        // Se há resultado de condição, filtra pela handle correta
        if (conditionResult !== undefined) {
            const edge = outgoingEdges.find((e) => {
                if (conditionResult) {
                    return e.sourceHandle === 'true' || !e.sourceHandle;
                }
                else {
                    return e.sourceHandle === 'false';
                }
            });
            return edge ? edge.target : null;
        }
        // Handle para aiSchedulingAgent (booked/failed)
        if (scheduleHandle) {
            const edge = outgoingEdges.find(e => e.sourceHandle === scheduleHandle);
            return edge ? edge.target : (outgoingEdges[0]?.target || null);
        }
        // Roteamento por item interativo (sendWAInteractive)
        if (interactiveItemId !== undefined) {
            const edge = outgoingEdges.find(e => e.sourceHandle === interactiveItemId);
            if (edge) {
                logger_1.default.info(`Interactive message routed to handle: ${interactiveItemId}`);
                return edge.target;
            }
            const fallbackEdge = outgoingEdges.find(e => e.sourceHandle === 'fallback');
            if (fallbackEdge) {
                logger_1.default.info('Interactive message took fallback path');
                return fallbackEdge.target;
            }
            return outgoingEdges[0]?.target || null;
        }
        // Caso padrão: retorna o primeiro edge
        return outgoingEdges[0].target;
    }
    /**
     * Substitui variáveis no texto
     */
    replaceVariables(text, context) {
        let result = text;
        // Substitui variáveis do contexto: {{variavel}}
        Object.keys(context).forEach((key) => {
            if (!key.startsWith('_')) {
                // Ignora variáveis internas que começam com _
                const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                result = result.replace(regex, String(context[key]));
            }
        });
        return result;
    }
    /**
     * Executa node: sendWATemplate
     * Envia um template de WhatsApp via Chatwoot API
     */
    async executeSendWATemplate(node, context, conversationId, accountId) {
        const { templateName, templateLanguage = 'pt_BR', variables = [], headerUrl, headerType, templateBody } = node.data;
        if (!templateName) {
            logger_1.default.warn('SendWATemplate node has no templateName');
            return;
        }
        const flowId = context._flowId;
        const botToken = await this.getBotToken(accountId, flowId);
        // Substitui variáveis nos parâmetros do template
        const processedParams = variables.map((v) => this.replaceVariables(v, context));
        // Renderiza o body do template para registrar o conteúdo real no Chatwoot
        let renderedContent;
        if (templateBody) {
            renderedContent = String(templateBody);
            processedParams.forEach((val, idx) => {
                renderedContent = renderedContent.replace(new RegExp(`\\{\\{${idx + 1}\\}\\}`, 'g'), val);
            });
        }
        try {
            await chatwoot_1.default.sendWhatsAppTemplate(accountId, conversationId, templateName, templateLanguage, processedParams, botToken, undefined, headerUrl || undefined, headerType || undefined, renderedContent);
            logger_1.default.info(`Sent WA template '${templateName}' to conversation ${conversationId}`);
        }
        catch (error) {
            logger_1.default.error(`Failed to send WA template '${templateName}'`, { error: error.message });
            throw error;
        }
    }
    /**
     * Executa node: sendWAInteractive (botões ou lista)
     */
    async executeSendWAInteractive(node, context, conversationId, accountId) {
        const { bodyText = '', items = [], header, footer, buttonText, sectionTitle } = node.data;
        if (!items.length) {
            logger_1.default.warn('sendWAInteractive node has no items configured');
            return;
        }
        const flowId = context._flowId;
        const botToken = await this.getBotToken(accountId, flowId);
        const renderedBody = this.replaceVariables(bodyText, context);
        const renderedHeader = header ? this.replaceVariables(header, context) : undefined;
        const renderedFooter = footer ? this.replaceVariables(footer, context) : undefined;
        const success = await chatwoot_1.default.sendWhatsAppInteractive(accountId, conversationId, renderedBody, items, botToken, undefined, {
            header: renderedHeader,
            footer: renderedFooter,
            buttonText: buttonText || undefined,
            sectionTitle: sectionTitle || undefined,
        });
        if (success) {
            logger_1.default.info(`Sent WA interactive (${items.length <= 3 ? 'buttons' : 'list'}) to conversation ${conversationId}`, {
                itemCount: items.length,
            });
        }
        else {
            logger_1.default.warn(`Failed to send WA interactive to conversation ${conversationId}`);
        }
    }
    /**
     * Executa node: sendText
     */
    async executeSendText(node, context, conversationId, accountId) {
        const message = this.replaceVariables(node.data.message || '', context);
        if (!message) {
            logger_1.default.warn('SendText node has empty message');
            return;
        }
        // Busca token do flow creator
        const flowId = context._flowId;
        const botToken = await this.getBotToken(accountId, flowId);
        // Envia mensagem via Chatwoot API com token do bot
        await chatwoot_1.default.sendMessage(accountId, conversationId, message, undefined, botToken);
        logger_1.default.info(`Sent message to conversation ${conversationId}: ${message.substring(0, 50)}...`);
    }
    /**
     * Executa node: sendImage
     */
    async executeSendImage(node, context, conversationId, accountId) {
        const imageUrl = node.data.imageUrl;
        const caption = node.data.caption ? this.replaceVariables(node.data.caption, context) : undefined;
        if (!imageUrl) {
            logger_1.default.warn('SendImage node has no imageUrl');
            return;
        }
        const flowId = context._flowId;
        const botToken = await this.getBotToken(accountId, flowId);
        await chatwoot_1.default.sendAttachment(conversationId, imageUrl, caption, accountId, undefined, botToken);
        logger_1.default.info(`Sent image to conversation ${conversationId}: ${imageUrl}`);
    }
    /**
     * Executa node sendVideo
     */
    async executeSendVideo(node, context, conversationId, accountId) {
        const videoUrl = node.data.videoUrl;
        const caption = node.data.caption ? this.replaceVariables(node.data.caption, context) : undefined;
        if (!videoUrl) {
            logger_1.default.warn('SendVideo node has no videoUrl');
            return;
        }
        const flowId = context._flowId;
        const botToken = await this.getBotToken(accountId, flowId);
        await chatwoot_1.default.sendAttachment(conversationId, videoUrl, caption, accountId, undefined, botToken);
        logger_1.default.info(`Sent video to conversation ${conversationId}: ${videoUrl}`);
    }
    /**
     * Executa node sendAudio
     */
    async executeSendAudio(node, context, conversationId, accountId) {
        const audioUrl = node.data.audioUrl;
        const caption = node.data.caption ? this.replaceVariables(node.data.caption, context) : undefined;
        if (!audioUrl) {
            logger_1.default.warn('SendAudio node has no audioUrl');
            return;
        }
        const flowId = context._flowId;
        const botToken = await this.getBotToken(accountId, flowId);
        await chatwoot_1.default.sendAttachment(conversationId, audioUrl, caption, accountId, undefined, botToken);
        logger_1.default.info(`Sent audio to conversation ${conversationId}: ${audioUrl}`);
    }
    /**
     * Executa node sendFile
     */
    async executeSendFile(node, context, conversationId, accountId) {
        const fileUrl = node.data.fileUrl;
        const caption = node.data.caption ? this.replaceVariables(node.data.caption, context) : undefined;
        if (!fileUrl) {
            logger_1.default.warn('SendFile node has no fileUrl');
            return;
        }
        const flowId = context._flowId;
        const botToken = await this.getBotToken(accountId, flowId);
        await chatwoot_1.default.sendAttachment(conversationId, fileUrl, caption, accountId, undefined, botToken);
        logger_1.default.info(`Sent file to conversation ${conversationId}: ${fileUrl}`);
    }
    /**
     * Avalia condição - suporta tanto expressões matemáticas quanto operações de string
     */
    async evaluateCondition(condition, context, conversationId = 0, accountId = 0) {
        if (!condition) {
            logger_1.default.warn('Condition node has empty condition, defaulting to true');
            return true;
        }
        // Verificação de etiqueta (tag) — busca labels da conversa no Chatwoot
        if (condition.startsWith('__hasLabel:') || condition.startsWith('__notHasLabel:')) {
            const isHas = condition.startsWith('__hasLabel:');
            const tagName = condition.replace(/^__(?:not)?hasLabel:/, '').trim().toLowerCase();
            try {
                const botToken = await this.getBotToken(accountId, context._flowId);
                const conversation = await chatwoot_1.default.getConversation(accountId, conversationId, undefined, botToken || undefined);
                const conversationLabels = (conversation?.labels || []).map((l) => l.toLowerCase());
                const hasTag = conversationLabels.includes(tagName);
                logger_1.default.info('Label condition evaluated', { tagName, hasTag, isHas, conversationLabels, conversationId });
                return isHas ? hasTag : !hasTag;
            }
            catch (error) {
                logger_1.default.error('Failed to evaluate label condition', { condition, conversationId, error: error?.message });
                return false;
            }
        }
        try {
            // Se a condição contém métodos JavaScript (.includes, .startsWith, etc), avalia de forma segura
            if (this.isStringCondition(condition)) {
                return this.evaluateStringCondition(condition, context);
            }
            // Caso contrário, usa expr-eval para expressões matemáticas
            const parser = new expr_eval_1.Parser();
            const result = parser.evaluate(condition, context);
            return Boolean(result);
        }
        catch (error) {
            logger_1.default.error(`Error evaluating condition "${condition}":`, error);
            return false; // Default em caso de erro
        }
    }
    /**
     * Verifica se é uma condição de string (contém métodos JavaScript)
     */
    isStringCondition(condition) {
        const stringMethods = ['.includes(', '.startsWith(', '.endsWith(', '.toLowerCase(', '.toUpperCase(', '.test(', '.match('];
        // Também detecta regex literals como /pattern/.test(...)
        return stringMethods.some(method => condition.includes(method)) || /\/[^/]+\/\w*\.test\(/.test(condition);
    }
    /**
     * Avalia condição de string de forma segura
     */
    evaluateStringCondition(condition, context) {
        try {
            // Cria uma função segura com apenas as variáveis do contexto disponíveis
            const contextVars = Object.keys(context)
                .filter(key => !key.startsWith('_'))
                .map(key => `const ${key} = context.${key} || '';`)
                .join('\n');
            logger_1.default.info('Evaluating string condition', {
                condition,
                contextVars: Object.keys(context).filter(key => !key.startsWith('_')),
                contextValues: Object.keys(context)
                    .filter(key => !key.startsWith('_'))
                    .reduce((acc, key) => ({ ...acc, [key]: context[key] }), {})
            });
            const safeEval = new Function('context', `
        ${contextVars}
        try {
          return ${condition};
        } catch (e) {
          return false;
        }
      `);
            const result = safeEval(context);
            logger_1.default.info('String condition evaluation result', {
                condition,
                result
            });
            return Boolean(result);
        }
        catch (error) {
            logger_1.default.error(`Error evaluating string condition "${condition}":`, error);
            return false;
        }
    }
    /**
     * Avalia um switch node e retorna o índice do case que corresponder
     */
    async evaluateSwitch(cases, context, conversationId = 0, accountId = 0) {
        if (!cases || cases.length === 0) {
            logger_1.default.warn('Switch node has no cases');
            return undefined;
        }
        logger_1.default.info('Switch evaluation started', {
            totalCases: cases.length,
            contextKeys: Object.keys(context),
            contextResponse: context.response
        });
        // Avalia cada case na ordem
        for (let i = 0; i < cases.length; i++) {
            const switchCase = cases[i];
            const condition = switchCase.condition;
            logger_1.default.info(`Evaluating switch case ${i}`, {
                label: switchCase.label,
                condition,
                field: switchCase.field,
                operator: switchCase.operator,
                value: switchCase.value
            });
            if (!condition) {
                logger_1.default.warn(`Switch case ${i} (${switchCase.label}) has no condition`);
                continue;
            }
            try {
                const result = await this.evaluateCondition(condition, context, conversationId, accountId);
                logger_1.default.info(`Switch case ${i} evaluation result`, {
                    label: switchCase.label,
                    condition,
                    result
                });
                if (result) {
                    logger_1.default.info(`Switch matched case ${i}: ${switchCase.label}`);
                    return i;
                }
            }
            catch (error) {
                logger_1.default.error(`Error evaluating switch case ${i}:`, error);
                continue;
            }
        }
        // Nenhum case correspondeu — retorna -1 para sinalizar fallback
        logger_1.default.info('Switch has no matching case, checking for fallback');
        return -1;
    }
    /**
     * Executa node: delay
     * Suporta modo fixo (seconds) e modo range aleatório (minSeconds, maxSeconds)
     */
    async executeDelay(data) {
        let seconds;
        if (data.delayType === 'range' && data.minSeconds > 0 && data.maxSeconds > data.minSeconds) {
            // Sorteia um valor aleatório inteiro entre min e max (inclusive)
            const min = Math.ceil(data.minSeconds);
            const max = Math.floor(Math.min(data.maxSeconds, 60));
            seconds = Math.floor(Math.random() * (max - min + 1)) + min;
            logger_1.default.info(`Delay range: sorteado ${seconds}s (entre ${min}s e ${max}s)`);
        }
        else {
            seconds = data.seconds || (typeof data === 'number' ? data : 0);
        }
        if (!seconds || seconds <= 0) {
            return;
        }
        const ms = Math.min(seconds * 1000, 60000); // Máximo 60 segundos
        await new Promise((resolve) => setTimeout(resolve, ms));
        logger_1.default.info(`Delayed ${ms}ms`);
    }
    /**
     * Executa node: changeStatus
     */
    async executeChangeStatus(status, conversationId, accountId, context) {
        if (!status) {
            logger_1.default.warn('ChangeStatus node has no status');
            return;
        }
        const flowId = context._flowId;
        const botToken = await this.getBotToken(accountId, flowId);
        await chatwoot_1.default.updateConversationStatus(accountId, conversationId, status, undefined, botToken);
        logger_1.default.info(`Changed status of conversation ${conversationId} to ${status}`);
    }
    /**
     * Executa node: labels (add ou remove)
     */
    async executeLabels(labels, action, conversationId, accountId, context) {
        if (!labels || labels.length === 0) {
            logger_1.default.warn('Labels node has no labels');
            return;
        }
        if (!action) {
            logger_1.default.warn('Labels node has no action specified, defaulting to add');
            action = 'add';
        }
        const flowId = context._flowId;
        const botToken = await this.getBotToken(accountId, flowId);
        if (action === 'add') {
            await chatwoot_1.default.addLabels(conversationId, labels, accountId, undefined, botToken);
            logger_1.default.info(`Added labels to conversation ${conversationId}: ${labels.join(', ')}`);
        }
        else {
            await chatwoot_1.default.removeLabels(conversationId, labels, accountId, undefined, botToken);
            logger_1.default.info(`Removed labels from conversation ${conversationId}: ${labels.join(', ')}`);
        }
    }
    /**
     * Executa node: assign (agent ou team)
     */
    async executeAssign(assignType, assignId, conversationId, accountId, context) {
        if (!assignId) {
            logger_1.default.warn('Assign node has no assignId');
            return;
        }
        if (!assignType) {
            logger_1.default.warn('Assign node has no assignType, defaulting to agent');
            assignType = 'agent';
        }
        const flowId = context._flowId;
        const botToken = await this.getBotToken(accountId, flowId);
        await chatwoot_1.default.assign(conversationId, assignType, assignId, accountId, undefined, botToken);
        logger_1.default.info(`Assigned ${assignType} ${assignId} to conversation ${conversationId}`);
    }
    /**
     * Executa node: applySLA
     */
    async executeApplySLA(slaId, conversationId, accountId, context) {
        if (!slaId) {
            logger_1.default.warn('ApplySLA node has no slaId');
            return;
        }
        const flowId = context._flowId;
        const botToken = await this.getBotToken(accountId, flowId);
        await chatwoot_1.default.applySLA(conversationId, slaId, accountId, undefined, botToken);
        logger_1.default.info(`Applied SLA ${slaId} to conversation ${conversationId}`);
    }
    /**
     * Executa node: aiAgent (OpenAI ou Groq)
     */
    async executeAIAgent(nodeId, data, conversationId, accountId, context, nodes, edges) {
        if (!data.provider || !data.model || !data.prompt) {
            logger_1.default.warn('AIAgent node missing required fields');
            throw new Error('AIAgent node precisa ter provider, model e prompt configurados');
        }
        // Busca credencial do provedor
        // Para openai_oauth: usa token OAuth (ChatGPT Plus/Pro) em vez de API key
        let apiKey = null;
        let oauthToken = null;
        if (data.provider === 'openai_oauth') {
            oauthToken = await (0, oauth_credentials_1.getOAuthAccessToken)(accountId);
            if (!oauthToken) {
                logger_1.default.error(`No OAuth token found for openai_oauth`);
                throw new Error('Conta ChatGPT não conectada. Acesse as Credenciais IA e conecte via OAuth.');
            }
            apiKey = oauthToken.accessToken; // usado apenas para Whisper se necessário
        }
        else {
            apiKey = await (0, ai_credentials_1.getDecryptedCredential)(accountId, data.provider);
            if (!apiKey) {
                logger_1.default.error(`No API key found for provider ${data.provider}`);
                throw new Error(`Credencial não configurada para o provedor ${data.provider}`);
            }
        }
        logger_1.default.info(`Executing AI Agent with ${data.provider} - ${data.model}`, {
            conversationId,
            accountId,
        });
        // Busca as últimas mensagens da conversa para manter contexto
        const flowId = context._flowId;
        const botToken = await this.getBotToken(accountId, flowId);
        const chatwootMessages = await chatwoot_1.default.getConversationMessages(accountId, conversationId, undefined, botToken);
        // --- Transcrição de áudio ---
        // Se a mensagem atual é um áudio e transcrição está habilitada (default: true)
        let audioTranscription = null;
        const audioUrl = context._audioUrl;
        const audioMime = context._audioMimeType;
        if (audioUrl && data.transcribeAudio === true) {
            logger_1.default.info('AI Agent: transcribing audio message', { conversationId, audioUrl });
            try {
                // Busca a credencial de áudio dedicada (configurada na aba "Transcrição de Áudio")
                const audioCred = await (0, ai_credentials_1.getAudioTranscriptionCredential)(accountId);
                let transcribeProvider;
                let transcribeKey;
                if (audioCred) {
                    // Usa a credencial de áudio dedicada
                    transcribeProvider = audioCred.provider;
                    transcribeKey = audioCred.apiKey;
                }
                else {
                    // Fallback: tenta usar a credencial de texto do provider atual (exceto oauth)
                    if (data.provider === 'groq') {
                        const groqKey = await (0, ai_credentials_1.getDecryptedCredential)(accountId, 'groq', 'text');
                        transcribeProvider = 'groq';
                        transcribeKey = groqKey || apiKey;
                    }
                    else if (data.provider === 'openai') {
                        transcribeProvider = 'openai';
                        transcribeKey = apiKey;
                    }
                    else {
                        // openrouter ou openai_oauth sem credencial de áudio — tenta openai ou groq text como fallback
                        const openaiKey = await (0, ai_credentials_1.getDecryptedCredential)(accountId, 'openai', 'text');
                        const groqKey = await (0, ai_credentials_1.getDecryptedCredential)(accountId, 'groq', 'text');
                        if (openaiKey) {
                            transcribeProvider = 'openai';
                            transcribeKey = openaiKey;
                        }
                        else if (groqKey) {
                            transcribeProvider = 'groq';
                            transcribeKey = groqKey;
                        }
                        else {
                            throw new Error('Nenhuma credencial de áudio configurada. Configure em Credenciais IA → Transcrição de Áudio.');
                        }
                    }
                }
                audioTranscription = await aiService_1.default.transcribeAudio(transcribeProvider, transcribeKey, audioUrl, audioMime || 'audio/ogg');
                logger_1.default.info('AI Agent: audio transcription done', {
                    conversationId,
                    transcriptionLength: audioTranscription.length,
                });
            }
            catch (transcribeErr) {
                logger_1.default.error('AI Agent: audio transcription failed (continuing without transcript)', {
                    conversationId,
                    error: transcribeErr.message,
                });
            }
        }
        // Constrói o array de mensagens no formato da API
        const messages = [];
        // 1. Adiciona o prompt do node como mensagem de sistema
        let systemPrompt = aiService_1.default.interpolateVariables(data.prompt, context);
        // 1.1. Busca bases de conhecimento conectadas ao AI Agent através dos edges
        let knowledgeBaseContext = '';
        const connectedKBNodes = edges
            .filter(edge => edge.target === nodeId && edge.targetHandle === 'knowledge-base')
            .map(edge => nodes.find(n => n.id === edge.source))
            .filter(node => node && node.type === 'knowledgeBase');
        if (connectedKBNodes.length > 0) {
            const kbIds = connectedKBNodes
                .map(node => node.data.knowledgeBaseId)
                .filter(id => id !== undefined && id !== null);
            if (kbIds.length > 0) {
                knowledgeBaseContext = await this.getKnowledgeBaseContext(accountId, kbIds);
                logger_1.default.info('Knowledge base context added to AI Agent', {
                    contextLength: knowledgeBaseContext.length,
                    knowledgeBaseIds: kbIds,
                    connectedNodes: connectedKBNodes.length,
                });
            }
        }
        if (audioTranscription) {
            systemPrompt = `${systemPrompt}\n\nQuando o usuário enviar um áudio, a transcrição já foi feita automaticamente e aparecerá na mensagem como texto.`;
        }
        if (knowledgeBaseContext) {
            systemPrompt = `${systemPrompt}\n\n## Base de Conhecimento:\n${knowledgeBaseContext}`;
        }
        messages.push({
            role: 'system',
            content: systemPrompt,
        });
        // 2. Adiciona as últimas 10 mensagens da conversa (para manter contexto)
        const recentMessages = chatwootMessages
            .filter(m => m.message_type !== 'activity' &&
            !m.private &&
            (m.content?.trim().length > 0 || (m.attachments && m.attachments.length > 0)))
            .slice(-10)
            .map(m => {
            const role = m.message_type === 'incoming' ? 'user' : 'assistant';
            // Mensagens de áudio sem texto: usa placeholder para manter contexto
            const content = m.content?.trim() ||
                (m.attachments?.some((a) => (a.file_type || '').startsWith('audio')) ? '[áudio]' : '');
            return content ? { role, content } : null;
        })
            .filter((m) => m !== null);
        messages.push(...recentMessages);
        // 3. Mensagem atual: se for áudio com transcrição, usa a transcrição; senão usa context.response
        const currentUserText = audioTranscription
            ? `[Áudio transcrito]: ${audioTranscription}`
            : (context.response && typeof context.response === 'string' ? context.response : null);
        if (currentUserText) {
            messages.push({ role: 'user', content: currentUserText });
        }
        logger_1.default.info(`AI Agent - messages prepared`, {
            conversationId,
            totalMessages: messages.length,
            hasAudioTranscription: !!audioTranscription,
            systemPrompt: systemPrompt.substring(0, 100) + '...',
        });
        // Monta tools a partir dos nós conectados via handle "tools"
        const toolNodeEdges = edges.filter(edge => edge.source === nodeId && edge.sourceHandle === 'tools');
        const agentTools = [];
        for (const edge of toolNodeEdges) {
            const toolNode = nodes.find(n => n.id === edge.target);
            if (!toolNode)
                continue;
            if (toolNode.type === 'assign') {
                const assignType = toolNode.data.assignType || 'agent';
                const assignId = toolNode.data.assignId;
                if (!assignId)
                    continue;
                const typeLabel = assignType === 'agent' ? 'agente' : 'time';
                const safeName = `transferir_para_${typeLabel}_${assignId}`;
                const description = toolNode.data.toolDescription?.trim() ||
                    `Transfere e atribui a conversa para o ${typeLabel} ID ${assignId}. Use quando precisar encaminhar o atendimento para um humano.`;
                agentTools.push({
                    name: safeName.replace(/[^a-z0-9_]/gi, '_').toLowerCase(),
                    description,
                    func: async () => {
                        await this.executeAssign(assignType, assignId, conversationId, accountId, context);
                        return `Conversa transferida com sucesso para o ${typeLabel} ${assignId}.`;
                    },
                });
            }
            else if (toolNode.type === 'changeStatus') {
                const status = toolNode.data.status;
                if (!status)
                    continue;
                const statusLabel = { open: 'aberto', pending: 'pendente', resolved: 'resolvido' };
                const safeName = `alterar_status_para_${status}`;
                const description = toolNode.data.toolDescription?.trim() ||
                    `Altera o status da conversa para ${statusLabel[status] || status}.`;
                agentTools.push({
                    name: safeName,
                    description,
                    func: async () => {
                        await this.executeChangeStatus(status, conversationId, accountId, context);
                        return `Status da conversa alterado para ${statusLabel[status] || status}.`;
                    },
                });
            }
            else if (toolNode.type === 'generateImage') {
                const imgProvider = toolNode.data.provider || '';
                const imgModel = toolNode.data.model || '';
                if (!imgProvider)
                    continue;
                const description = toolNode.data.toolDescription?.trim() ||
                    'Gera uma imagem com base em um prompt descritivo e envia para o chat. Use quando o usuário pedir para criar, desenhar ou gerar uma imagem.';
                agentTools.push({
                    name: 'gerar_imagem',
                    description,
                    parameters: {
                        type: 'object',
                        properties: {
                            prompt: { type: 'string', description: 'Descrição detalhada da imagem a ser gerada em inglês' },
                        },
                        required: ['prompt'],
                    },
                    func: async (args) => {
                        const prompt = args?.prompt || toolNode.data.prompt || 'imagem gerada pelo assistente';
                        const nodeDataWithPrompt = { ...toolNode.data, prompt, sendToChat: true };
                        const imgUrl = await this.executeGenerateImage(nodeDataWithPrompt, conversationId, accountId, context);
                        return imgUrl ? `Imagem gerada e enviada com sucesso. URL: ${imgUrl}` : 'Não foi possível gerar a imagem.';
                    },
                });
            }
        }
        let response;
        if (data.provider === 'openai_oauth' && oauthToken) {
            response = await aiService_1.default.callOpenAIOAuth(oauthToken.accessToken, oauthToken.openaiAccountId, data, messages, agentTools);
        }
        else {
            response = await aiService_1.default.callLangChain(data.provider, apiKey, data, messages, agentTools);
        }
        logger_1.default.info(`AI Agent response received`, {
            conversationId,
            model: response.model,
            contentLength: response.content.length,
            usage: response.usage,
        });
        // Opcionalmente envia a resposta de volta para o chat
        // (pode ser configurado no node)
        if (data.sendToChat !== false) {
            await chatwoot_1.default.sendMessage(accountId, conversationId, response.content, undefined, botToken);
        }
        return response.content;
    }
    /**
     * Busca conteúdo das bases de conhecimento
     */
    async getKnowledgeBaseContext(accountId, knowledgeBaseIds) {
        try {
            // Coleta todos os documentos das bases especificadas
            let allContext = '';
            for (const kbId of knowledgeBaseIds) {
                // Busca documentos da base de conhecimento
                const documents = await database_1.default.knowledgeDocument.findMany({
                    where: {
                        knowledgeBaseId: kbId,
                        knowledgeBase: {
                            accountId: accountId,
                        },
                    },
                    select: {
                        originalName: true,
                        content: true,
                    },
                });
                if (documents.length > 0) {
                    for (const doc of documents) {
                        allContext += `\n\n### Documento: ${doc.originalName}\n${doc.content}`;
                    }
                }
            }
            return allContext.trim();
        }
        catch (error) {
            logger_1.default.error('Error fetching knowledge base context:', error);
            return '';
        }
    }
    /**
     * Executa node: httpRequest (dispara webhook externo)
     */
    async executeGenerateImage(data, conversationId, accountId, context) {
        const provider = data.provider || '';
        const model = data.model || '';
        const prompt = this.replaceVariables(data.prompt || '', context);
        const sendToChat = data.sendToChat !== false;
        if (!provider || !prompt) {
            logger_1.default.warn('GenerateImage node missing provider or prompt');
            return null;
        }
        try {
            let imageUrl = null;
            if (provider === 'openai') {
                const apiKey = await (0, ai_credentials_1.getDecryptedCredential)(accountId, 'openai', 'image');
                if (!apiKey)
                    throw new Error('Credencial OpenAI para imagem não configurada');
                const { OpenAI } = await Promise.resolve().then(() => __importStar(require('openai')));
                const client = new OpenAI({ apiKey });
                const size = data.size || '1024x1024';
                const quality = data.quality || 'standard';
                const style = data.style || 'vivid';
                const resp = await client.images.generate({
                    model: model || 'dall-e-3',
                    prompt,
                    n: 1,
                    size: size,
                    quality: quality,
                    style: style,
                    response_format: 'url',
                });
                imageUrl = resp.data?.[0]?.url || null;
            }
            else if (provider === 'google') {
                const apiKey = await (0, ai_credentials_1.getDecryptedCredential)(accountId, 'google', 'text');
                if (!apiKey)
                    throw new Error('Credencial Google Gemini não configurada');
                const { GoogleGenAI, Modality } = await Promise.resolve().then(() => __importStar(require('@google/genai')));
                const ai = new GoogleGenAI({ apiKey });
                // Usa gemini com responseModalities Image — compatível com API Key do Google AI Studio
                const geminiModel = (model && model.startsWith('gemini')) ? model : 'gemini-2.5-flash-image';
                const result = await ai.models.generateContent({
                    model: geminiModel,
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
                });
                const parts = result.candidates?.[0]?.content?.parts ?? [];
                for (const part of parts) {
                    if (part.inlineData?.mimeType?.startsWith('image/')) {
                        imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                        break;
                    }
                }
            }
            else if (provider === 'pollinations') {
                const pollinationsModel = model || 'flux';
                const encodedPrompt = encodeURIComponent(prompt);
                const pollinationsResp = await axios_1.default.get(`https://image.pollinations.ai/prompt/${encodedPrompt}`, {
                    params: { width: 1024, height: 1024, model: pollinationsModel, nologo: true, enhance: false },
                    responseType: 'arraybuffer',
                    timeout: 90000,
                });
                const b64 = Buffer.from(pollinationsResp.data).toString('base64');
                const contentType = pollinationsResp.headers['content-type'] || 'image/jpeg';
                imageUrl = `data:${contentType};base64,${b64}`;
            }
            else if (provider === 'stability') {
                const apiKey = await (0, ai_credentials_1.getDecryptedCredential)(accountId, 'stability', 'image');
                if (!apiKey)
                    throw new Error('Credencial Stability AI não configurada');
                const stResp = await axios_1.default.post('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', { text_prompts: [{ text: prompt }], cfg_scale: 7, height: 1024, width: 1024, samples: 1, steps: 30 }, { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 60000 });
                const b64 = stResp.data?.artifacts?.[0]?.base64;
                if (b64)
                    imageUrl = `data:image/png;base64,${b64}`;
            }
            if (!imageUrl) {
                logger_1.default.warn('GenerateImage: no image returned from provider', { provider });
                return null;
            }
            if (sendToChat) {
                const flowId = context._flowId;
                const botToken = await this.getBotToken(accountId, flowId);
                await chatwoot_1.default.sendAttachment(conversationId, imageUrl, prompt.substring(0, 100), accountId, undefined, botToken);
            }
            logger_1.default.info('GenerateImage: image generated', { provider, model, conversationId });
            return imageUrl;
        }
        catch (err) {
            logger_1.default.error('GenerateImage failed', { provider, error: err.message });
            throw err;
        }
    }
    async executeHttpRequest(data, context) {
        try {
            const method = data.method || 'POST';
            let url = data.url || '';
            const headers = data.headers || {};
            let body = data.body || '';
            const timeout = data.timeout || 10000;
            if (!url || !url.trim()) {
                logger_1.default.warn('HTTP Request node has no URL configured');
                throw new Error('URL é obrigatória para HTTP Request');
            }
            // Interpola variáveis na URL
            url = this.replaceVariables(url, context);
            // Interpola variáveis no body (se for string JSON)
            if (body && typeof body === 'string') {
                body = this.replaceVariables(body, context);
            }
            // Interpola variáveis nos headers
            const interpolatedHeaders = {};
            for (const [key, value] of Object.entries(headers)) {
                interpolatedHeaders[key] = this.replaceVariables(value, context);
            }
            // Configuração da requisição
            const config = {
                method: method.toUpperCase(),
                url,
                headers: interpolatedHeaders,
                timeout,
            };
            // Adiciona body para métodos que aceitam
            if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && body) {
                try {
                    config.data = JSON.parse(body);
                }
                catch (parseError) {
                    logger_1.default.warn('HTTP Request body is not valid JSON, sending as string');
                    config.data = body;
                }
            }
            logger_1.default.info(`Executing HTTP Request: ${method} ${url}`, {
                hasHeaders: Object.keys(interpolatedHeaders).length > 0,
                hasBody: !!config.data,
            });
            // Executa a requisição
            const response = await (0, axios_1.default)(config);
            logger_1.default.info(`HTTP Request completed: ${method} ${url}`, {
                status: response.status,
                statusText: response.statusText,
            });
            // Retorna a resposta
            return {
                status: response.status,
                statusText: response.statusText,
                data: response.data,
                headers: response.headers,
            };
        }
        catch (error) {
            logger_1.default.error('Error executing HTTP Request:', {
                message: error.message,
                url: data.url,
                method: data.method,
                status: error.response?.status,
                statusText: error.response?.statusText,
            });
            // Retorna erro estruturado
            return {
                error: true,
                message: error.message,
                status: error.response?.status || 0,
                statusText: error.response?.statusText || 'Error',
                data: error.response?.data || null,
            };
        }
    }
    /**
     * Salva estado da execução no banco
     */
    async saveExecutionState(executionId, currentNodeId, context, status) {
        await database_1.default.flowExecution.update({
            where: { id: executionId },
            data: {
                currentNodeId,
                context: JSON.stringify(context),
                status,
                ...(status === 'completed' || status === 'failed' ? { completedAt: new Date() } : {}),
            },
        });
    }
    /**
     * Executa node: scheduleAppointment
     * Cria um agendamento para o contato da conversa
     */
    async executeScheduleAppointment(data, conversationId, accountId, context) {
        const { practitionerMode, practitionerIdVar, serviceMode, serviceIdVar, dateTimeMode, dateTimeVariable, fixedDateTime, patientMode, patientNameVar, patientPhoneVar, notes, sendConfirmation, confirmationTemplate, } = data;
        // Resolve practitionerId — fixo ou variável
        let practitionerId = data.practitionerId;
        if (practitionerMode === 'variable' && practitionerIdVar) {
            practitionerId = context[practitionerIdVar];
        }
        if (!practitionerId) {
            logger_1.default.error('scheduleAppointment: practitionerId not resolved');
            return null;
        }
        // Resolve serviceId — fixo ou variável
        let serviceId = data.serviceId;
        if (serviceMode === 'variable' && serviceIdVar) {
            serviceId = context[serviceIdVar];
        }
        if (!serviceId) {
            logger_1.default.error('scheduleAppointment: serviceId not resolved');
            return null;
        }
        // Resolve data/hora
        const { dateVariable, timeVariable } = data;
        let appointmentAtRaw = fixedDateTime || '';
        // Detecta modo automaticamente quando dateTimeMode não foi salvo
        const resolvedMode = dateTimeMode ||
            (dateVariable ? 'split' : (dateTimeVariable ? 'combined' : 'fixed'));
        if (resolvedMode === 'split' && dateVariable) {
            // Data e hora em variáveis separadas
            const datePart = String(context[dateVariable] || '').trim();
            const timePart = timeVariable ? String(context[timeVariable] || '').trim() : '09:00';
            appointmentAtRaw = timePart ? `${datePart} ${timePart}` : datePart;
        }
        else if ((resolvedMode === 'variable' || resolvedMode === 'combined') && dateTimeVariable) {
            appointmentAtRaw = String(context[dateTimeVariable] || '');
        }
        if (!appointmentAtRaw || appointmentAtRaw.trim() === '') {
            logger_1.default.error('scheduleAppointment: no appointment datetime resolved', { dateTimeMode, dateVariable, timeVariable, dateTimeVariable });
            return null;
        }
        // Parse da data — aceita ISO ou DD/MM/YYYY HH:mm
        // Sempre trata como horário de Brasília (UTC-3) quando não há timezone explícito
        const tzOffset = process.env.TIMEZONE_OFFSET || '-03:00';
        let appointmentAt;
        try {
            if (/^\d{2}\/\d{2}\/\d{4}/.test(appointmentAtRaw)) {
                // Formato DD/MM/YYYY HH:mm — sem timezone, adiciona offset do Brasil
                const [datePart, timePart] = appointmentAtRaw.split(' ');
                const [d, m, y] = datePart.split('/');
                appointmentAt = new Date(`${y}-${m}-${d}T${timePart || '09:00'}:00${tzOffset}`);
            }
            else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(appointmentAtRaw) && !/[Zz]|[+-]\d{2}:\d{2}$/.test(appointmentAtRaw)) {
                // ISO sem timezone (ex: "2026-03-27T14:00:00") — adiciona offset do Brasil
                appointmentAt = new Date(`${appointmentAtRaw}${tzOffset}`);
            }
            else {
                appointmentAt = new Date(appointmentAtRaw);
            }
            if (isNaN(appointmentAt.getTime()))
                throw new Error('invalid date');
        }
        catch {
            logger_1.default.error('scheduleAppointment: invalid date', { appointmentAtRaw });
            return null;
        }
        // Interpolação de {{variavel}} nas observações
        const resolvedNotes = notes
            ? notes.replace(/\{\{(\w+)\}\}/g, (_, key) => String(context[key] ?? ''))
            : null;
        try {
            // Busca serviço para calcular duração
            const serviceRecord = await database_1.default.appointmentService.findFirst({
                where: { id: parseInt(serviceId), accountId },
            });
            if (!serviceRecord) {
                logger_1.default.error('scheduleAppointment: service not found');
                return null;
            }
            const endsAt = new Date(appointmentAt.getTime() + serviceRecord.durationMinutes * 60000);
            const flowId = context._flowId;
            const botToken = await this.getBotToken(accountId, flowId);
            let patientId = null;
            if (context._aiPatientId) {
                // Paciente já resolvido pelo aiSchedulingAgent — usa diretamente
                patientId = context._aiPatientId;
            }
            else if (patientMode === 'variable' && patientNameVar) {
                // Paciente vem de variáveis do flow
                const name = String(context[patientNameVar] || 'Sem nome');
                const phone = patientPhoneVar ? String(context[patientPhoneVar] || '') : '';
                const existing = phone ? await database_1.default.patient.findFirst({ where: { accountId, phone } }) : null;
                if (existing) {
                    patientId = existing.id;
                }
                else {
                    const created = await database_1.default.patient.create({ data: { accountId, name, phone: phone || 'N/A' } });
                    patientId = created.id;
                }
            }
            else {
                // Paciente vem do contato da conversa (padrão)
                const conversation = await chatwoot_1.default.getConversation(accountId, conversationId, undefined, botToken);
                const contactId = conversation?.meta?.sender?.id || conversation?.contact?.id;
                if (contactId) {
                    const contact = await chatwoot_1.default.getContact(accountId, contactId, undefined, botToken);
                    if (contact) {
                        const phone = contact.phone_number || '';
                        // Usa nome coletado pela IA se disponível, senão usa nome do contato Chatwoot
                        const name = context._aiClientName || contact.name || 'Sem nome';
                        const existing = phone ? await database_1.default.patient.findFirst({ where: { accountId, phone } }) : null;
                        if (existing) {
                            patientId = existing.id;
                        }
                        else {
                            const created = await database_1.default.patient.create({ data: { accountId, name, phone: phone || 'N/A' } });
                            patientId = created.id;
                        }
                    }
                }
            }
            if (!patientId) {
                logger_1.default.error('scheduleAppointment: could not resolve patient');
                return null;
            }
            const appointment = await database_1.default.appointment.create({
                data: {
                    accountId,
                    patientId,
                    practitionerId: parseInt(practitionerId),
                    serviceId: parseInt(serviceId),
                    appointmentAt,
                    endsAt,
                    notes: resolvedNotes || null,
                    chatwootConversationId: conversationId,
                    status: 'scheduled',
                    createdBy: 0,
                },
            });
            logger_1.default.info('scheduleAppointment: appointment created', { appointmentId: appointment.id });
            // Confirmação para o cliente
            if (sendConfirmation !== false) {
                const practRecord = await database_1.default.practitioner.findFirst({ where: { id: parseInt(practitionerId) }, select: { name: true } });
                const tz = process.env.TIMEZONE || 'America/Sao_Paulo';
                const dateStr = appointmentAt.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz });
                const timeStr = appointmentAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: tz });
                const defaultTemplate = `✅ *Agendamento confirmado!*\n📅 {{data}} às {{hora}}\n👤 Profissional: {{profissional}}\n🔧 Serviço: {{servico}}`;
                const template = confirmationTemplate || defaultTemplate;
                const msg = template
                    .replace(/\{\{data\}\}/g, dateStr)
                    .replace(/\{\{hora\}\}/g, timeStr)
                    .replace(/\{\{profissional\}\}/g, practRecord?.name || '')
                    .replace(/\{\{servico\}\}/g, serviceRecord.name)
                    .replace(/\{\{(\w+)\}\}/g, (_, key) => String(context[key] ?? ''));
                await chatwoot_1.default.sendMessage(accountId, conversationId, msg, undefined, botToken);
            }
            return appointment.id;
        }
        catch (err) {
            logger_1.default.error('scheduleAppointment: error creating appointment', { err });
            return null;
        }
    }
    /**
     * Executa node: cancelAppointment
     * Cancela um agendamento existente pelo ID (fixo ou de variável)
     */
    async executeCancelAppointment(data, accountId, context) {
        const { appointmentIdMode, appointmentIdFixed, appointmentIdVariable, cancelReason } = data;
        let appointmentId = null;
        if (appointmentIdMode === 'variable' && appointmentIdVariable) {
            const raw = context[appointmentIdVariable];
            appointmentId = raw ? parseInt(String(raw), 10) : null;
        }
        else if (appointmentIdFixed) {
            appointmentId = parseInt(String(appointmentIdFixed), 10);
        }
        if (!appointmentId || isNaN(appointmentId)) {
            logger_1.default.error('cancelAppointment: appointmentId not resolved', { appointmentIdMode, appointmentIdFixed, appointmentIdVariable });
            return;
        }
        try {
            const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
            const prismaLocal = new PrismaClient();
            const appt = await prismaLocal.appointment.findFirst({ where: { id: appointmentId, accountId } });
            if (!appt) {
                logger_1.default.error('cancelAppointment: appointment not found', { appointmentId, accountId });
                await prismaLocal.$disconnect();
                return;
            }
            if (appt.status === 'cancelled') {
                logger_1.default.info('cancelAppointment: already cancelled', { appointmentId });
                await prismaLocal.$disconnect();
                return;
            }
            await prismaLocal.appointment.update({
                where: { id: appointmentId },
                data: { status: 'cancelled', cancelReason: cancelReason || null },
            });
            await prismaLocal.appointmentReminder.updateMany({
                where: { appointmentId, status: 'pending' },
                data: { status: 'cancelled' },
            });
            await prismaLocal.$disconnect();
            logger_1.default.info('cancelAppointment: cancelled', { appointmentId });
        }
        catch (err) {
            logger_1.default.error('cancelAppointment: error', { err });
        }
    }
    /**
     * Executa node: aiSchedulingAgent
     * IA analisa a conversa e cria o agendamento automaticamente
     */
    async executeAISchedulingAgent(data, conversationId, accountId, context) {
        const { provider, model, prompt, autoBook, defaultPractitionerId, defaultServiceId } = data;
        if (!provider || !model || !prompt) {
            logger_1.default.error('aiSchedulingAgent: provider, model and prompt required');
            return { booked: false };
        }
        try {
            // Busca credencial
            const apiKey = await (0, ai_credentials_1.getDecryptedCredential)(accountId, provider);
            if (!apiKey) {
                logger_1.default.error('aiSchedulingAgent: no credential found');
                return { booked: false };
            }
            const aiFlowId = context._flowId;
            const aiToken = await this.getBotToken(accountId, aiFlowId);
            // Busca dados da conversa (telefone do contato) + profissionais + serviços + mensagens
            // Se o nó tem um profissional/serviço padrão configurado, filtra apenas esse
            const practitionerWhere = { accountId, isActive: true };
            if (defaultPractitionerId)
                practitionerWhere.id = parseInt(defaultPractitionerId);
            const serviceWhere = { accountId };
            if (defaultServiceId)
                serviceWhere.id = parseInt(defaultServiceId);
            const [conversation, practitioners, services, messages] = await Promise.all([
                chatwoot_1.default.getConversation(accountId, conversationId, undefined, aiToken),
                database_1.default.practitioner.findMany({
                    where: practitionerWhere,
                    select: { id: true, name: true, specialty: true },
                }),
                database_1.default.appointmentService.findMany({
                    where: serviceWhere,
                    select: { id: true, name: true, durationMinutes: true },
                }),
                chatwoot_1.default.getConversationMessages(accountId, conversationId, undefined, aiToken),
            ]);
            // Telefone já disponível via contato do Chatwoot
            const contactPhone = conversation?.meta?.sender?.phone_number || '';
            const contactName = conversation?.meta?.sender?.name || '';
            const contactId = conversation?.meta?.sender?.id || null;
            // Verifica se paciente já existe pelo telefone
            let existingPatient = null;
            if (contactPhone) {
                existingPatient = await database_1.default.patient.findFirst({
                    where: { accountId, phone: { contains: contactPhone.replace(/\D/g, '').slice(-8) } },
                });
            }
            const practitionerList = practitioners.map(p => `ID:${p.id} — ${p.name}${p.specialty ? ` (${p.specialty})` : ''}`).join('\n');
            const serviceList = services.map(s => `ID:${s.id} — ${s.name} (${s.durationMinutes}min)`).join('\n');
            const systemPrompt = `${prompt}

## DADOS JÁ DISPONÍVEIS DO CONTATO (não precisa perguntar):
- Telefone: ${contactPhone || 'não disponível'}
- Nome do contato: ${contactName || 'não informado'}
${existingPatient ? `- Paciente já cadastrado no sistema: ID ${existingPatient.id}, Nome: ${existingPatient.name}` : '- Paciente ainda não cadastrado no sistema'}

## Profissionais (IDs para o JSON):
${practitionerList}

## Serviços (IDs para o JSON):
${serviceList}

${defaultPractitionerId ? `Profissional padrão: ID ${defaultPractitionerId}` : ''}
${defaultServiceId ? `Serviço padrão: ID ${defaultServiceId}` : ''}

## REGRA OBRIGATÓRIA:
- NUNCA mostre IDs (numéricos) nas mensagens enviadas ao cliente
- Os IDs são apenas para uso interno no JSON (practitionerId, serviceId)
- Nas mensagens ao cliente, use SEMPRE apenas os nomes: nome do profissional e nome do serviço`;
            const aiMessages = [
                { role: 'system', content: systemPrompt },
                ...(messages || [])
                    .filter((m) => m.message_type !== 'activity' && !m.private && m.content)
                    .slice(-15)
                    .map((m) => ({
                    role: (m.message_type === 'incoming' ? 'user' : 'assistant'),
                    content: m.content,
                })),
            ];
            // Chama IA
            const aiData = { provider, model, prompt: systemPrompt, temperature: 0.3, maxTokens: 800 };
            const aiResult = await aiService_1.default.execute(provider, apiKey, aiData, aiMessages);
            const aiResponse = aiResult.content || '';
            logger_1.default.info('AISchedulingAgent raw response', { conversationId, aiResponse: aiResponse.substring(0, 500) });
            let parsed = null;
            try {
                const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                if (jsonMatch)
                    parsed = JSON.parse(jsonMatch[0]);
            }
            catch { /* não parseable */ }
            logger_1.default.info('AISchedulingAgent parsed', { action: parsed?.action, hasMessages: Array.isArray(parsed?.messages), messagesCount: parsed?.messages?.length });
            // Helper: envia mensagens (suporta array ou string simples)
            const sendMessages = async (msgOrArr) => {
                const msgs = Array.isArray(msgOrArr) ? msgOrArr : [msgOrArr];
                for (const m of msgs) {
                    if (m?.trim()) {
                        await chatwoot_1.default.sendMessage(accountId, conversationId, m.trim(), undefined, aiToken);
                    }
                }
            };
            // Criar/atualizar paciente se a IA coletou os dados necessários
            // Suporta tanto parsed.patientData quanto parsed.clientName (formato antigo)
            const aiCollectedName = parsed?.patientData?.name || parsed?.clientName || null;
            const aiCollectedPhone = parsed?.patientData?.phone || parsed?.clientPhone || contactPhone || null;
            // Prefere o nome do contato Chatwoot (nome completo) sobre o nome coletado pela IA (pode ser só primeiro nome)
            const bestName = contactName || aiCollectedName || 'Sem nome';
            if ((aiCollectedName || contactName) && !existingPatient && aiCollectedPhone) {
                const pd = parsed?.patientData || {};
                try {
                    existingPatient = await database_1.default.patient.create({
                        data: {
                            accountId,
                            name: bestName,
                            phone: aiCollectedPhone,
                            email: pd.email || null,
                            cpf: pd.cpf || null,
                            notes: pd.notes || null,
                            chatwootContactId: contactId,
                        },
                    });
                    logger_1.default.info('aiSchedulingAgent: patient created', { patientId: existingPatient.id, name: aiCollectedName, accountId });
                }
                catch (e) {
                    logger_1.default.warn('aiSchedulingAgent: failed to create patient', { e });
                }
            }
            else if (parsed?.patientData && existingPatient) {
                // Atualiza dados faltantes do paciente já existente
                const pd = parsed.patientData;
                const updateData = {};
                if (pd.email && !existingPatient.email)
                    updateData.email = pd.email;
                if (pd.cpf && !existingPatient.cpf)
                    updateData.cpf = pd.cpf;
                if (Object.keys(updateData).length > 0) {
                    await database_1.default.patient.update({ where: { id: existingPatient.id }, data: updateData }).catch(() => { });
                }
            }
            if (!parsed || parsed.action !== 'book') {
                const msg = parsed?.messages || parsed?.message || aiResponse;
                await sendMessages(msg);
                return { booked: false };
            }
            // Tenta criar o agendamento
            const pId = parsed.practitionerId || defaultPractitionerId;
            const sId = parsed.serviceId || defaultServiceId;
            const dtRaw = parsed.appointmentAt;
            if (!pId || !sId || !dtRaw) {
                const msg = parsed?.messages || parsed?.message || 'Preciso saber o profissional, serviço e data/hora para agendar.';
                await sendMessages(msg);
                return { booked: false };
            }
            const appointmentId = await this.executeScheduleAppointment({ practitionerId: pId, serviceId: sId, dateTimeMode: 'variable', dateTimeVariable: '_aiDateTime', sendConfirmation: true }, conversationId, accountId, { ...context, _aiDateTime: dtRaw, _aiPatientId: existingPatient?.id ?? null, _aiClientName: bestName });
            if (appointmentId && autoBook !== false) {
                if (parsed?.messages || parsed?.message) {
                    await sendMessages(parsed.messages || parsed.message);
                }
                return { booked: true, appointmentId };
            }
            if (parsed?.messages || parsed?.message) {
                await sendMessages(parsed.messages || parsed.message);
            }
            return { booked: !!appointmentId, appointmentId: appointmentId || undefined };
        }
        catch (err) {
            logger_1.default.error('aiSchedulingAgent: error', { err });
            return { booked: false };
        }
    }
    /**
     * Executa node: checkAvailability
     * Consulta horários livres de um profissional numa data e salva em variável
     */
    async executeCheckAvailability(data, accountId, context) {
        const { practitionerMode, practitionerIdVar, dateMode, dateVariable, fixedDate, workStart = '08:00', workEnd = '18:00', slotDurationMode, slotMinutes, serviceId, maxSlots = 8, outputFormat, saveResultTo, saveListTo, } = data;
        try {
            // Resolve practitionerId
            let practitionerId = null;
            if (practitionerMode === 'variable' && practitionerIdVar) {
                practitionerId = parseInt(String(context[practitionerIdVar] || ''));
            }
            else {
                practitionerId = data.practitionerId ? parseInt(data.practitionerId) : null;
            }
            if (!practitionerId || isNaN(practitionerId)) {
                logger_1.default.error('checkAvailability: practitionerId not resolved');
                return;
            }
            // Resolve data — modo fixo ou variável
            let dateRaw = '';
            if (dateMode === 'fixed' && fixedDate) {
                dateRaw = fixedDate; // formato YYYY-MM-DD do input type="date"
            }
            else {
                dateRaw = dateVariable ? String(context[dateVariable] || '').trim() : '';
            }
            if (!dateRaw) {
                logger_1.default.error('checkAvailability: date not resolved', { dateMode, dateVariable, fixedDate });
                return;
            }
            // Parse da data — aceita DD/MM/YYYY ou YYYY-MM-DD
            let targetDate;
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateRaw)) {
                const [d, m, y] = dateRaw.split('/');
                targetDate = new Date(`${y}-${m}-${d}T00:00:00`);
            }
            else {
                targetDate = new Date(dateRaw);
            }
            if (isNaN(targetDate.getTime())) {
                logger_1.default.error('checkAvailability: invalid date', { dateRaw });
                return;
            }
            // Resolve duração do slot (minutos)
            let duration = 60;
            if (slotDurationMode === 'service' && serviceId) {
                const svc = await database_1.default.appointmentService.findFirst({ where: { id: parseInt(serviceId), accountId } });
                if (svc)
                    duration = svc.durationMinutes;
            }
            else if (slotDurationMode === 'custom' && slotMinutes) {
                duration = parseInt(slotMinutes);
            }
            // Gera lista de slots do dia
            const [startH, startM] = workStart.split(':').map(Number);
            const [endH, endM] = workEnd.split(':').map(Number);
            const dayStart = startH * 60 + startM;
            const dayEnd = endH * 60 + endM;
            const allSlots = [];
            for (let min = dayStart; min + duration <= dayEnd; min += duration) {
                const h = Math.floor(min / 60).toString().padStart(2, '0');
                const m = (min % 60).toString().padStart(2, '0');
                allSlots.push(`${h}:${m}`);
            }
            // Busca agendamentos existentes no dia
            const dayBegin = new Date(targetDate);
            dayBegin.setHours(0, 0, 0, 0);
            const dayEnd2 = new Date(targetDate);
            dayEnd2.setHours(23, 59, 59, 999);
            const existing = await database_1.default.appointment.findMany({
                where: {
                    accountId,
                    practitionerId,
                    appointmentAt: { gte: dayBegin, lte: dayEnd2 },
                    status: { not: 'cancelled' },
                },
                select: { appointmentAt: true, endsAt: true },
            });
            // Filtra slots ocupados
            const availableSlots = allSlots.filter(slot => {
                const [sh, sm] = slot.split(':').map(Number);
                const slotStart = new Date(targetDate);
                slotStart.setHours(sh, sm, 0, 0);
                const slotEnd = new Date(slotStart.getTime() + duration * 60000);
                return !existing.some(appt => {
                    const aStart = new Date(appt.appointmentAt);
                    const aEnd = new Date(appt.endsAt);
                    return slotStart < aEnd && slotEnd > aStart;
                });
            }).slice(0, maxSlots);
            // Formata data para exibição
            const dateDisplay = targetDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
            if (availableSlots.length === 0) {
                const noSlotsMsg = `Não há horários disponíveis para ${dateDisplay}.`;
                if (saveResultTo)
                    context[saveResultTo] = noSlotsMsg;
                if (saveListTo)
                    context[saveListTo] = '';
                logger_1.default.info('checkAvailability: no slots available', { date: dateRaw, practitionerId });
                return;
            }
            // Monta mensagem formatada
            const horariosList = availableSlots.map((s, i) => `${i + 1}. ${s}`).join('\n');
            const template = outputFormat || `🗓 Horários disponíveis para {{data}}:\n\n{{horarios}}\n\nQual horário prefere?`;
            const formatted = template
                .replace(/\{\{horarios\}\}/g, horariosList)
                .replace(/\{\{data\}\}/g, dateDisplay)
                .replace(/\{\{quantidade\}\}/g, String(availableSlots.length));
            if (saveResultTo)
                context[saveResultTo] = formatted;
            if (saveListTo)
                context[saveListTo] = availableSlots.join(', ');
            logger_1.default.info('checkAvailability: slots found', { count: availableSlots.length, date: dateRaw, practitionerId });
        }
        catch (err) {
            logger_1.default.error('checkAvailability: error', { err });
        }
    }
    /**
     * Move o lead (conversa) para uma etapa do Kanban.
     * Modo manual: usa funnelId + stageId configurados no node.
     * Modo IA: resolve o nome da etapa a partir de uma variável de contexto.
     */
    async executeMoveToStage(data, conversationId, accountId, context) {
        try {
            const mode = data.mode || 'manual';
            let resolvedStageId = null;
            if (mode === 'ai') {
                // Resolve nome da etapa a partir da variável no contexto
                const varName = data.stageVariable;
                if (!varName) {
                    logger_1.default.warn('moveToStage (IA): stageVariable não configurada');
                    return;
                }
                const stageName = (context[varName] || '').toString().trim();
                if (!stageName) {
                    logger_1.default.warn('moveToStage (IA): variável está vazia', { varName });
                    return;
                }
                if (!data.funnelId) {
                    logger_1.default.warn('moveToStage (IA): funnelId não configurado');
                    return;
                }
                const stage = await database_1.default.stage.findFirst({
                    where: {
                        funnelId: Number(data.funnelId),
                        funnel: { accountId },
                        name: { equals: stageName, mode: 'insensitive' },
                    },
                });
                if (!stage) {
                    logger_1.default.warn('moveToStage (IA): etapa não encontrada pelo nome', { stageName, funnelId: data.funnelId });
                    return;
                }
                resolvedStageId = stage.id;
                logger_1.default.info('moveToStage (IA): etapa resolvida', { stageName, stageId: resolvedStageId });
            }
            else {
                // Modo manual
                if (!data.stageId) {
                    logger_1.default.warn('moveToStage (manual): stageId não configurado');
                    return;
                }
                resolvedStageId = Number(data.stageId);
            }
            // Verifica se a etapa pertence à conta
            const stage = await database_1.default.stage.findFirst({
                where: { id: resolvedStageId, funnel: { accountId } },
                include: { funnel: true },
                // automations é campo do Stage (JSON string com sequenceId etc.)
            });
            if (!stage) {
                logger_1.default.warn('moveToStage: etapa não encontrada ou sem permissão', { stageId: resolvedStageId, accountId });
                return;
            }
            // Se a etapa tem chatwootStatus, atualiza o status no Chatwoot
            if (stage.chatwootStatus) {
                const targetStatus = stage.chatwootStatus;
                await chatwoot_1.default.updateConversationStatus(accountId, conversationId, targetStatus);
                // Se há campos a popular, mantém/cria um card local nessa etapa antes de deletar
                const hasFields = data.customName || data.leadStatus || Object.values(data.fieldValues || {}).some(Boolean);
                if (hasFields) {
                    const card = await database_1.default.card.upsert({
                        where: { conversationId_accountId: { conversationId, accountId } },
                        create: { conversationId, accountId, stageId: stage.id, order: 0 },
                        update: {},
                    });
                    await this.applyCardFields(card.id, conversationId, accountId, data, context);
                }
                else {
                    await database_1.default.card.deleteMany({ where: { conversationId, accountId } });
                }
                logger_1.default.info('moveToStage: conversa movida para status Chatwoot', {
                    conversationId, targetStatus, stageId: stage.id, stageName: stage.name,
                });
                return;
            }
            // Etapa customizada: cria/atualiza card local
            const card = await database_1.default.card.upsert({
                where: { conversationId_accountId: { conversationId, accountId } },
                create: {
                    conversationId,
                    accountId,
                    stageId: resolvedStageId,
                    order: 0,
                },
                update: {
                    stageId: resolvedStageId,
                },
            });
            logger_1.default.info('moveToStage: lead movido para etapa', {
                conversationId, stageId: resolvedStageId, stageName: stage.name, funnelName: stage.funnel.name, mode,
            });
            await this.applyCardFields(card.id, conversationId, accountId, data, context);
            // Dispara sequência associada à etapa de destino (se houver)
            if (stage.automations) {
                try {
                    const automations = typeof stage.automations === 'string'
                        ? JSON.parse(stage.automations)
                        : stage.automations;
                    if (automations?.sequenceId) {
                        const conv = await chatwoot_1.default.getConversation(accountId, conversationId);
                        const contactId = conv?.meta?.sender?.id || conv?.contact_id;
                        if (contactId) {
                            const sequenceExecutor = (await Promise.resolve().then(() => __importStar(require('./sequenceExecutor')))).default;
                            sequenceExecutor.startSequence(automations.sequenceId, contactId, accountId, conversationId, {}).then(() => {
                                logger_1.default.info('moveToStage: sequência da etapa disparada', {
                                    conversationId, stageId: resolvedStageId, sequenceId: automations.sequenceId,
                                });
                            }).catch((seqErr) => {
                                logger_1.default.warn('moveToStage: falha ao disparar sequência da etapa', {
                                    conversationId, stageId: resolvedStageId, sequenceId: automations.sequenceId,
                                    error: seqErr?.message,
                                });
                            });
                        }
                    }
                }
                catch { /* automations malformado — ignora */ }
            }
        }
        catch (err) {
            logger_1.default.error('moveToStage: erro ao mover lead', {
                conversationId, accountId, error: err instanceof Error ? err.message : String(err),
            });
        }
    }
    /**
     * Aplica campos do lead (customName, leadStatus, closeReason, campos customizados)
     * após mover o card. Só sobrescreve campos explicitamente configurados.
     */
    async applyCardFields(cardId, conversationId, accountId, data, context) {
        const updates = {};
        // Nome do lead
        if (data.customName) {
            updates.customName = this.replaceVariables(data.customName, context);
        }
        // Status do lead
        if (data.leadStatus) {
            updates.leadStatus = data.leadStatus;
            if (data.leadStatus === 'won' || data.leadStatus === 'lost') {
                updates.closedAt = new Date();
                if (data.closeReason) {
                    updates.closeReason = this.replaceVariables(data.closeReason, context);
                }
            }
            else {
                updates.closedAt = null;
                updates.closeReason = null;
            }
        }
        if (Object.keys(updates).length > 0) {
            await database_1.default.card.update({ where: { id: cardId }, data: updates });
            logger_1.default.info('moveToStage: campos do lead atualizados', { cardId, fields: Object.keys(updates) });
        }
        // Campos customizados
        const fieldValues = data.fieldValues || {};
        for (const [fieldIdStr, rawValue] of Object.entries(fieldValues)) {
            if (!rawValue)
                continue;
            const fieldId = parseInt(fieldIdStr, 10);
            if (isNaN(fieldId))
                continue;
            const value = this.replaceVariables(String(rawValue), context);
            try {
                await database_1.default.customFieldValue.upsert({
                    where: { cardId_fieldId: { cardId, fieldId } },
                    create: { cardId, fieldId, conversationId, accountId, value },
                    update: { value },
                });
            }
            catch (cfErr) {
                logger_1.default.warn('moveToStage: erro ao salvar campo customizado', {
                    cardId, fieldId, error: cfErr instanceof Error ? cfErr.message : String(cfErr),
                });
            }
        }
        const customFieldCount = Object.values(fieldValues).filter(Boolean).length;
        if (customFieldCount > 0) {
            logger_1.default.info('moveToStage: campos customizados atualizados', { cardId, count: customFieldCount });
        }
    }
}
exports.FlowEngine = FlowEngine;
//# sourceMappingURL=flowEngine.js.map