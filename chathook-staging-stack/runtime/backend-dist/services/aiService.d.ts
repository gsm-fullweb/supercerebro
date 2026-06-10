import { AIAgentNodeData } from '../types';
export interface AIResponse {
    content: string;
    model: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}
export interface AIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
export declare class AIService {
    /**
     * Chama a API da OpenAI
     */
    callOpenAI(apiKey: string, data: AIAgentNodeData, messages: AIMessage[]): Promise<AIResponse>;
    /**
     * Chama a API do Groq
     */
    callGroq(apiKey: string, data: AIAgentNodeData, messages: AIMessage[]): Promise<AIResponse>;
    /**
     * Chama a API do OpenRouter
     */
    callOpenRouter(apiKey: string, data: AIAgentNodeData, messages: AIMessage[]): Promise<AIResponse>;
    /**
     * Interpola variáveis em um texto
     * Exemplo: "Olá {{nome}}" com context.nome = "João" -> "Olá João"
     */
    interpolateVariables(text: string, context: Record<string, any>): string;
    /**
     * Método genérico que decide qual provedor usar (chamada direta à API)
     */
    execute(provider: 'openai' | 'groq' | 'openrouter', apiKey: string, data: AIAgentNodeData, messages: AIMessage[]): Promise<AIResponse>;
    /**
     * Chama o LLM via LangChain com suporte a tools (function calling).
     * Executa o loop agentico: invoke → tool call → execute → invoke final.
     */
    callLangChain(provider: 'openai' | 'groq' | 'openrouter' | 'google', apiKey: string, data: AIAgentNodeData, messages: AIMessage[], tools?: Array<{
        name: string;
        description: string;
        parameters?: Record<string, any>;
        func: (args?: Record<string, any>) => Promise<string>;
    }>): Promise<AIResponse>;
    private extractLCUsage;
    /**
     * Transcreve um áudio via Whisper (OpenAI ou Groq).
     * @param audioUrl URL do áudio (Chatwoot ou outro)
     * @param authHeaders Headers de autenticação para baixar o áudio
     */
    transcribeAudio(provider: 'openai' | 'groq' | 'openrouter', apiKey: string, audioUrl: string, audioMimeType?: string, authHeaders?: Record<string, string>): Promise<string>;
    /**
     * Chama o endpoint interno do ChatGPT via OAuth (sem API key).
     * Usa chatgpt.com/backend-api/openai/responses com token OAuth do ChatGPT Plus/Pro.
     * Requer stream:true — parseia SSE com eventos response.output_text.delta.
     * Modelo padrão: gpt-5.5 (único suportado para contas ChatGPT Plus via este endpoint).
     */
    callOpenAIOAuth(accessToken: string, openaiAccountId: string | null, data: AIAgentNodeData, messages: AIMessage[], tools?: Array<{
        name: string;
        description: string;
        parameters?: Record<string, any>;
        func: (args?: Record<string, any>) => Promise<string>;
    }>): Promise<AIResponse>;
}
declare const _default: AIService;
export default _default;
//# sourceMappingURL=aiService.d.ts.map