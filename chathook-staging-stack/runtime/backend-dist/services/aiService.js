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
exports.AIService = void 0;
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
class AIService {
    /**
     * Chama a API da OpenAI
     */
    async callOpenAI(apiKey, data, messages) {
        try {
            const response = await axios_1.default.post('https://api.openai.com/v1/chat/completions', {
                model: data.model || 'gpt-5-mini',
                messages: messages,
                temperature: data.temperature ?? 0.7,
                max_tokens: data.maxTokens ?? 1000,
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                timeout: 60000, // 60 segundos
            });
            const completion = response.data.choices[0].message.content;
            const usage = response.data.usage;
            return {
                content: completion,
                model: response.data.model,
                usage: usage
                    ? {
                        promptTokens: usage.prompt_tokens,
                        completionTokens: usage.completion_tokens,
                        totalTokens: usage.total_tokens,
                    }
                    : undefined,
            };
        }
        catch (error) {
            console.error('[AI-SERVICE] Erro ao chamar OpenAI:', error.response?.data || error.message);
            throw new Error(`Erro ao chamar OpenAI: ${error.response?.data?.error?.message || error.message}`);
        }
    }
    /**
     * Chama a API do Groq
     */
    async callGroq(apiKey, data, messages) {
        try {
            const response = await axios_1.default.post('https://api.groq.com/openai/v1/chat/completions', {
                model: data.model || 'llama-3.3-70b-versatile',
                messages: messages,
                temperature: data.temperature ?? 0.7,
                max_tokens: data.maxTokens ?? 1000,
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                timeout: 60000, // 60 segundos
            });
            const completion = response.data.choices[0].message.content;
            const usage = response.data.usage;
            return {
                content: completion,
                model: response.data.model,
                usage: usage
                    ? {
                        promptTokens: usage.prompt_tokens,
                        completionTokens: usage.completion_tokens,
                        totalTokens: usage.total_tokens,
                    }
                    : undefined,
            };
        }
        catch (error) {
            console.error('[AI-SERVICE] Erro ao chamar Groq:', error.response?.data || error.message);
            throw new Error(`Erro ao chamar Groq: ${error.response?.data?.error?.message || error.message}`);
        }
    }
    /**
     * Chama a API do OpenRouter
     */
    async callOpenRouter(apiKey, data, messages) {
        try {
            const response = await axios_1.default.post('https://openrouter.ai/api/v1/chat/completions', {
                model: data.model || 'openai/gpt-5-mini',
                messages: messages,
                temperature: data.temperature ?? 0.7,
                max_tokens: data.maxTokens ?? 1000,
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                    'HTTP-Referer': process.env.VITE_API_URL || 'https://kanbancw.trecofantastico.com.br',
                    'X-Title': 'KanbanCW Chatbot',
                },
                timeout: 60000, // 60 segundos
            });
            const completion = response.data.choices[0].message.content;
            const usage = response.data.usage;
            return {
                content: completion,
                model: response.data.model,
                usage: usage
                    ? {
                        promptTokens: usage.prompt_tokens,
                        completionTokens: usage.completion_tokens,
                        totalTokens: usage.total_tokens,
                    }
                    : undefined,
            };
        }
        catch (error) {
            console.error('[AI-SERVICE] Erro ao chamar OpenRouter:', error.response?.data || error.message);
            throw new Error(`Erro ao chamar OpenRouter: ${error.response?.data?.error?.message || error.message}`);
        }
    }
    /**
     * Interpola variáveis em um texto
     * Exemplo: "Olá {{nome}}" com context.nome = "João" -> "Olá João"
     */
    interpolateVariables(text, context) {
        return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
            return context[varName]?.toString() || match;
        });
    }
    /**
     * Método genérico que decide qual provedor usar (chamada direta à API)
     */
    async execute(provider, apiKey, data, messages) {
        if (provider === 'openai') {
            return this.callOpenAI(apiKey, data, messages);
        }
        else if (provider === 'groq') {
            return this.callGroq(apiKey, data, messages);
        }
        else if (provider === 'openrouter') {
            return this.callOpenRouter(apiKey, data, messages);
        }
        else {
            throw new Error(`Provider não suportado: ${provider}`);
        }
    }
    /**
     * Chama o LLM via LangChain com suporte a tools (function calling).
     * Executa o loop agentico: invoke → tool call → execute → invoke final.
     */
    async callLangChain(provider, apiKey, data, messages, tools = []) {
        const { ChatOpenAI } = await Promise.resolve().then(() => __importStar(require('@langchain/openai')));
        const { ChatGroq } = await Promise.resolve().then(() => __importStar(require('@langchain/groq')));
        const { HumanMessage, SystemMessage, AIMessage: LCAIMessage, ToolMessage, } = await Promise.resolve().then(() => __importStar(require('@langchain/core/messages')));
        const { DynamicTool } = await Promise.resolve().then(() => __importStar(require('@langchain/core/tools')));
        // Constrói o modelo conforme o provedor
        let model;
        if (provider === 'groq') {
            model = new ChatGroq({
                model: data.model || 'llama-3.3-70b-versatile',
                apiKey,
                temperature: data.temperature ?? 0.7,
                maxTokens: data.maxTokens ?? 1000,
            });
        }
        else if (provider === 'openrouter') {
            model = new ChatOpenAI({
                model: data.model || 'openai/gpt-5-mini',
                apiKey,
                temperature: data.temperature ?? 0.7,
                maxTokens: data.maxTokens ?? 1000,
                configuration: {
                    baseURL: 'https://openrouter.ai/api/v1',
                    defaultHeaders: {
                        'HTTP-Referer': process.env.VITE_API_URL || 'https://kanbancw.app',
                        'X-Title': 'KanbanCW Chatbot',
                    },
                },
            });
        }
        else if (provider === 'google') {
            const { ChatGoogleGenerativeAI } = await Promise.resolve().then(() => __importStar(require('@langchain/google-genai')));
            model = new ChatGoogleGenerativeAI({
                model: data.model || 'gemini-2.0-flash',
                apiKey,
                temperature: data.temperature ?? 0.7,
                maxOutputTokens: data.maxTokens ?? 1000,
            });
        }
        else {
            model = new ChatOpenAI({
                model: data.model || 'gpt-5-mini',
                apiKey,
                temperature: data.temperature ?? 0.7,
                maxTokens: data.maxTokens ?? 1000,
            });
        }
        // Converte mensagens para o formato LangChain
        const lcMessages = messages.map(m => {
            if (m.role === 'system')
                return new SystemMessage(m.content);
            if (m.role === 'assistant')
                return new LCAIMessage(m.content);
            return new HumanMessage(m.content);
        });
        // Sem tools: chamada direta simples
        if (tools.length === 0) {
            try {
                const response = await model.invoke(lcMessages);
                return {
                    content: typeof response.content === 'string' ? response.content : JSON.stringify(response.content),
                    model: data.model,
                    usage: this.extractLCUsage(response),
                };
            }
            catch (error) {
                console.error('[AI-SERVICE] Erro LangChain:', error.message);
                throw new Error(`Erro no LangChain: ${error.message}`);
            }
        }
        // Com tools: loop agentico (máx. 5 iterações)
        const lcTools = tools.map(t => new DynamicTool({
            name: t.name,
            description: t.description,
            func: async (input) => {
                let args;
                try {
                    args = input ? JSON.parse(input) : undefined;
                }
                catch {
                    args = input ? { prompt: input } : undefined;
                }
                return t.func(args);
            },
        }));
        const modelWithTools = model.bindTools(lcTools);
        let currentMessages = [...lcMessages];
        try {
            for (let i = 0; i < 5; i++) {
                const response = await modelWithTools.invoke(currentMessages);
                const toolCalls = response.tool_calls || [];
                if (toolCalls.length === 0) {
                    // Resposta final sem tool call
                    return {
                        content: typeof response.content === 'string' ? response.content : JSON.stringify(response.content),
                        model: data.model,
                        usage: this.extractLCUsage(response),
                    };
                }
                // Adiciona a resposta da IA (com tool_calls) ao histórico
                currentMessages.push(response);
                // Executa cada tool call
                for (const toolCall of toolCalls) {
                    const matchedTool = tools.find(t => t.name === toolCall.name);
                    let toolResult = 'Ferramenta não encontrada';
                    if (matchedTool) {
                        try {
                            const args = toolCall.args && Object.keys(toolCall.args).length > 0 ? toolCall.args : undefined;
                            toolResult = await matchedTool.func(args);
                        }
                        catch (e) {
                            toolResult = `Erro ao executar: ${e.message}`;
                        }
                    }
                    currentMessages.push(new ToolMessage({
                        content: toolResult,
                        tool_call_id: toolCall.id || toolCall.name,
                    }));
                }
            }
            // Esgotou iterações — pede resposta final sem tools
            const finalResponse = await model.invoke(currentMessages);
            return {
                content: typeof finalResponse.content === 'string' ? finalResponse.content : JSON.stringify(finalResponse.content),
                model: data.model,
                usage: this.extractLCUsage(finalResponse),
            };
        }
        catch (error) {
            console.error('[AI-SERVICE] Erro no loop agentico LangChain:', error.message);
            throw new Error(`Erro no agente LangChain: ${error.message}`);
        }
    }
    extractLCUsage(response) {
        const meta = response.usage_metadata;
        if (!meta)
            return undefined;
        return {
            promptTokens: meta.input_tokens ?? 0,
            completionTokens: meta.output_tokens ?? 0,
            totalTokens: meta.total_tokens ?? 0,
        };
    }
    /**
     * Transcreve um áudio via Whisper (OpenAI ou Groq).
     * @param audioUrl URL do áudio (Chatwoot ou outro)
     * @param authHeaders Headers de autenticação para baixar o áudio
     */
    async transcribeAudio(provider, apiKey, audioUrl, audioMimeType = 'audio/ogg', authHeaders) {
        // 1. Baixa o áudio
        const audioResponse = await axios_1.default.get(audioUrl, {
            responseType: 'arraybuffer',
            headers: authHeaders || {},
            timeout: 30000,
        });
        const audioBuffer = Buffer.from(audioResponse.data);
        // 2. Determina extensão pelo MIME
        const mimeToExt = {
            'audio/ogg': 'ogg',
            'audio/mpeg': 'mp3',
            'audio/mp3': 'mp3',
            'audio/wav': 'wav',
            'audio/x-wav': 'wav',
            'audio/mp4': 'mp4',
            'audio/m4a': 'm4a',
            'audio/aac': 'aac',
            'audio/webm': 'webm',
        };
        const ext = mimeToExt[audioMimeType] || 'ogg';
        const filename = `audio.${ext}`;
        // 3. Monta FormData para Whisper
        const formData = new form_data_1.default();
        formData.append('file', audioBuffer, { filename, contentType: audioMimeType });
        formData.append('language', 'pt');
        let whisperUrl;
        let whisperModel;
        if (provider === 'groq') {
            // Groq Whisper: mais rápido, gratuito
            whisperUrl = 'https://api.groq.com/openai/v1/audio/transcriptions';
            whisperModel = 'whisper-large-v3-turbo';
        }
        else {
            // OpenAI Whisper (também usado como fallback do openrouter)
            whisperUrl = 'https://api.openai.com/v1/audio/transcriptions';
            whisperModel = 'whisper-1';
        }
        formData.append('model', whisperModel);
        const transcribeResponse = await axios_1.default.post(whisperUrl, formData, {
            headers: {
                ...formData.getHeaders(),
                Authorization: `Bearer ${apiKey}`,
            },
            timeout: 60000,
        });
        return transcribeResponse.data?.text || '';
    }
    /**
     * Chama o endpoint interno do ChatGPT via OAuth (sem API key).
     * Usa chatgpt.com/backend-api/openai/responses com token OAuth do ChatGPT Plus/Pro.
     * Requer stream:true — parseia SSE com eventos response.output_text.delta.
     * Modelo padrão: gpt-5.5 (único suportado para contas ChatGPT Plus via este endpoint).
     */
    async callOpenAIOAuth(accessToken, openaiAccountId, data, messages, tools = []) {
        const model = data.model || 'gpt-5.5';
        const systemMsg = messages.find(m => m.role === 'system');
        const userMessages = messages.filter(m => m.role !== 'system');
        const buildInput = (msgs) => msgs
            .filter(m => m.role !== 'system')
            .map(m => ({
            type: 'message',
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: [{ type: m.role === 'assistant' ? 'output_text' : 'input_text', text: m.content }],
        }));
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'OpenAI-Beta': 'responses=experimental',
            'originator': 'openai_cli_rs',
            'accept': 'text/event-stream',
        };
        if (openaiAccountId)
            headers['chatgpt-account-id'] = openaiAccountId;
        const parseSSE = (raw) => {
            let text = '';
            const functionCalls = [];
            const pendingArgs = {};
            for (const line of raw.split('\n')) {
                if (!line.startsWith('data:'))
                    continue;
                const chunk = line.slice(5).trim();
                if (!chunk || chunk === '[DONE]')
                    continue;
                try {
                    const evt = JSON.parse(chunk);
                    if (evt.type === 'response.output_text.delta' && typeof evt.delta === 'string') {
                        text += evt.delta;
                    }
                    else if (evt.type === 'response.output_item.added' && evt.item?.type === 'function_call') {
                        pendingArgs[evt.item.id] = { id: evt.item.id, name: evt.item.name, args: '' };
                    }
                    else if (evt.type === 'response.function_call_arguments.delta' && pendingArgs[evt.item_id]) {
                        pendingArgs[evt.item_id].args += evt.delta || '';
                    }
                    else if (evt.type === 'response.function_call_arguments.done' && pendingArgs[evt.item_id]) {
                        const fc = pendingArgs[evt.item_id];
                        functionCalls.push({ id: fc.id, name: fc.name, arguments: fc.args || evt.arguments || '{}' });
                    }
                    else if (evt.type === 'response.completed') {
                        if (!text) {
                            for (const item of evt.response?.output ?? []) {
                                if (item.type === 'message' && Array.isArray(item.content)) {
                                    for (const c of item.content) {
                                        if (c.type === 'output_text' && typeof c.text === 'string')
                                            text += c.text;
                                    }
                                }
                            }
                        }
                        // Captura function_calls do output final se não veio via eventos incrementais
                        for (const item of evt.response?.output ?? []) {
                            if (item.type === 'function_call' && !functionCalls.find(f => f.id === item.id)) {
                                functionCalls.push({ id: item.id, name: item.name, arguments: item.arguments || '{}' });
                            }
                        }
                    }
                    else if (evt.type === 'response.failed') {
                        throw new Error(evt.response?.error?.message || 'response.failed');
                    }
                }
                catch (parseErr) {
                    if (parseErr.message?.startsWith('response.failed'))
                        throw parseErr;
                }
            }
            return { text, functionCalls };
        };
        const sendRequest = async (input, previousResponseId) => {
            const reqBody = {
                model,
                input,
                stream: true,
                store: false,
            };
            if (systemMsg)
                reqBody.instructions = systemMsg.content;
            if (previousResponseId)
                reqBody.previous_response_id = previousResponseId;
            if (tools.length > 0) {
                reqBody.tools = tools.map(t => ({
                    type: 'function',
                    name: t.name,
                    description: t.description,
                    parameters: t.parameters || { type: 'object', properties: {}, required: [], additionalProperties: false },
                }));
            }
            try {
                const resp = await axios_1.default.post('https://chatgpt.com/backend-api/openai/responses', reqBody, { headers, timeout: 90000, responseType: 'text' });
                return resp.data;
            }
            catch (error) {
                let rawData = error.response?.data;
                let parsedMsg = '';
                if (typeof rawData === 'string') {
                    try {
                        parsedMsg = JSON.parse(rawData)?.detail || JSON.parse(rawData)?.error?.message || rawData.slice(0, 500);
                    }
                    catch {
                        parsedMsg = rawData.slice(0, 500);
                    }
                }
                else if (rawData) {
                    parsedMsg = rawData?.detail || rawData?.error?.message || JSON.stringify(rawData);
                }
                console.error('[AI-SERVICE] Erro ao chamar OpenAI OAuth:', { status: error.response?.status, message: error.message });
                throw new Error(`Erro no OpenAI OAuth: ${parsedMsg || error.message}`);
            }
        };
        // Loop agêntico (máx 5 iterações para tool calls)
        let currentInput = buildInput(userMessages);
        let lastText = '';
        for (let i = 0; i < 5; i++) {
            const rawSSE = await sendRequest(currentInput);
            const { text, functionCalls } = parseSSE(rawSSE);
            if (functionCalls.length === 0) {
                lastText = text;
                break;
            }
            console.log('[AI-SERVICE][OAuth] Model requested tool calls:', functionCalls.map(f => f.name));
            // Executa cada tool call e adiciona resultado ao input para próxima iteração
            const toolResults = [];
            for (const fc of functionCalls) {
                const tool = tools.find(t => t.name === fc.name);
                let result = `Ferramenta "${fc.name}" não encontrada.`;
                if (tool) {
                    try {
                        let args;
                        try {
                            args = fc.arguments ? JSON.parse(fc.arguments) : undefined;
                        }
                        catch {
                            args = undefined;
                        }
                        result = await tool.func(args);
                    }
                    catch (e) {
                        result = `Erro ao executar ferramenta: ${e.message}`;
                    }
                }
                toolResults.push({
                    type: 'function_call_output',
                    call_id: fc.id,
                    output: result,
                });
            }
            // Próxima rodada: inclui as function_calls do modelo + os resultados
            const functionCallItems = functionCalls.map(fc => ({
                type: 'function_call',
                id: fc.id,
                call_id: fc.id,
                name: fc.name,
                arguments: fc.arguments,
            }));
            currentInput = [...currentInput, ...functionCallItems, ...toolResults];
            lastText = text;
        }
        return { content: lastText, model };
    }
}
exports.AIService = AIService;
exports.default = new AIService();
//# sourceMappingURL=aiService.js.map