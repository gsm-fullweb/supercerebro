import { FlowExecutionContext } from '../types';
import { Server as SocketIOServer } from 'socket.io';
export declare function setFlowEngineSocketIO(socketIO: SocketIOServer): void;
/**
 * Engine de execução de flows de chatbot
 */
export declare class FlowEngine {
    private readonly MAX_DEPTH;
    private readonly MAX_EXECUTION_TIME;
    private readonly botToken;
    constructor();
    /**
     * Busca o bot token para uma conta (do flow creator ou fallback para SystemSettings/env)
     */
    private getBotToken;
    /**
     * Executa um flow completo
     */
    executeFlow(flowId: number, conversationId: number, accountId: number, initialContext?: FlowExecutionContext): Promise<void>;
    /**
     * Verifica se o horário atual está dentro do horário de atendimento configurado no start node.
     * Retorna: 'ok' | 'blocked' | 'message_sent'
     */
    private checkBusinessHours;
    private handleOutsideHours;
    /**
     * Processa um node individual
     */
    private processNode;
    /**
     * Determina o próximo node baseado nas edges
     */
    private getNextNode;
    /**
     * Substitui variáveis no texto
     */
    private replaceVariables;
    /**
     * Executa node: sendWATemplate
     * Envia um template de WhatsApp via Chatwoot API
     */
    private executeSendWATemplate;
    /**
     * Executa node: sendWAInteractive (botões ou lista)
     */
    private executeSendWAInteractive;
    /**
     * Executa node: sendText
     */
    private executeSendText;
    /**
     * Executa node: sendImage
     */
    private executeSendImage;
    /**
     * Executa node sendVideo
     */
    private executeSendVideo;
    /**
     * Executa node sendAudio
     */
    private executeSendAudio;
    /**
     * Executa node sendFile
     */
    private executeSendFile;
    /**
     * Avalia condição - suporta tanto expressões matemáticas quanto operações de string
     */
    private evaluateCondition;
    /**
     * Verifica se é uma condição de string (contém métodos JavaScript)
     */
    private isStringCondition;
    /**
     * Avalia condição de string de forma segura
     */
    private evaluateStringCondition;
    /**
     * Avalia um switch node e retorna o índice do case que corresponder
     */
    private evaluateSwitch;
    /**
     * Executa node: delay
     * Suporta modo fixo (seconds) e modo range aleatório (minSeconds, maxSeconds)
     */
    private executeDelay;
    /**
     * Executa node: changeStatus
     */
    private executeChangeStatus;
    /**
     * Executa node: labels (add ou remove)
     */
    private executeLabels;
    /**
     * Executa node: assign (agent ou team)
     */
    private executeAssign;
    /**
     * Executa node: applySLA
     */
    private executeApplySLA;
    /**
     * Executa node: aiAgent (OpenAI ou Groq)
     */
    private executeAIAgent;
    /**
     * Busca conteúdo das bases de conhecimento
     */
    private getKnowledgeBaseContext;
    /**
     * Executa node: httpRequest (dispara webhook externo)
     */
    private executeGenerateImage;
    private executeHttpRequest;
    /**
     * Salva estado da execução no banco
     */
    private saveExecutionState;
    /**
     * Executa node: scheduleAppointment
     * Cria um agendamento para o contato da conversa
     */
    private executeScheduleAppointment;
    /**
     * Executa node: cancelAppointment
     * Cancela um agendamento existente pelo ID (fixo ou de variável)
     */
    private executeCancelAppointment;
    /**
     * Executa node: aiSchedulingAgent
     * IA analisa a conversa e cria o agendamento automaticamente
     */
    private executeAISchedulingAgent;
    /**
     * Executa node: checkAvailability
     * Consulta horários livres de um profissional numa data e salva em variável
     */
    private executeCheckAvailability;
    /**
     * Move o lead (conversa) para uma etapa do Kanban.
     * Modo manual: usa funnelId + stageId configurados no node.
     * Modo IA: resolve o nome da etapa a partir de uma variável de contexto.
     */
    private executeMoveToStage;
    /**
     * Aplica campos do lead (customName, leadStatus, closeReason, campos customizados)
     * após mover o card. Só sobrescreve campos explicitamente configurados.
     */
    private applyCardFields;
}
//# sourceMappingURL=flowEngine.d.ts.map