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
exports.updateChatwootDashboardScript = updateChatwootDashboardScript;
exports.applyDashboardScriptOnStartup = applyDashboardScriptOnStartup;
const pg_1 = require("pg");
const fs_1 = require("fs");
const path_1 = require("path");
const net = __importStar(require("net"));
const logger_1 = __importDefault(require("../utils/logger"));
const systemSettings_1 = require("./systemSettings");
const CHATWOOT_REDIS_CACHE_KEY = 'V1:GLOBAL_CONFIG:DASHBOARD_SCRIPTS';
/**
 * Tenta invalidar o cache Redis do Chatwoot em um host:port específico.
 * Usa protocolo Redis raw via net.Socket para evitar dependência extra.
 */
function tryInvalidateRedis(host, port) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const key = CHATWOOT_REDIS_CACHE_KEY;
        const cmd = `*2\r\n$3\r\nDEL\r\n$${key.length}\r\n${key}\r\n`;
        socket.setTimeout(2000);
        socket.connect(port, host, () => {
            socket.write(cmd);
        });
        socket.on('data', (data) => {
            const deleted = data.toString().startsWith(':1');
            logger_1.default.info(`Cache Redis do Chatwoot ${deleted ? 'invalidado' : 'já expirado/inexistente'} (${host}:${port})`);
            socket.destroy();
            resolve(true);
        });
        socket.on('error', () => { socket.destroy(); resolve(false); });
        socket.on('timeout', () => { socket.destroy(); resolve(false); });
    });
}
/**
 * Invalida o cache Redis do Chatwoot para forçar recarga imediata do Dashboard Script.
 * Tenta CHATWOOT_REDIS_URL primeiro; se falhar, tenta hostnames comuns de Redis em stacks Docker.
 */
async function invalidateChatwootRedisCache() {
    const candidates = [];
    // Env var explícita tem prioridade
    if (process.env.CHATWOOT_REDIS_URL) {
        try {
            const parsed = new URL(process.env.CHATWOOT_REDIS_URL);
            candidates.push({ host: parsed.hostname, port: parseInt(parsed.port || '6379', 10) });
        }
        catch (e) { /* ignora URL inválida */ }
    }
    // Hostnames comuns em stacks Docker Swarm com Chatwoot
    const commonHosts = ['redis_redis', 'chatwoot_redis', 'chatwoot_redis_cw', 'redis'];
    for (const host of commonHosts) {
        if (!candidates.find(c => c.host === host)) {
            candidates.push({ host, port: 6379 });
        }
    }
    for (const { host, port } of candidates) {
        const ok = await tryInvalidateRedis(host, port);
        if (ok)
            return;
    }
    logger_1.default.warn('Não foi possível invalidar cache Redis do Chatwoot em nenhum host conhecido (será expirado naturalmente)');
}
/**
 * Gera o conteúdo do Dashboard Script do Chatwoot
 */
function generateDashboardScript(kanbancwUrl) {
    const templatePath = (0, path_1.join)(__dirname, '../../chatwoot-dashboard-script.template.html');
    const template = (0, fs_1.readFileSync)(templatePath, 'utf-8');
    // Substitui a URL no template
    return template.replace(/__KANBANCW_URL__/g, kanbancwUrl);
}
/**
 * Atualiza o Dashboard Script diretamente no banco do Chatwoot
 */
async function updateChatwootDashboardScript(accountId, kanbancwUrl, chatwootDatabaseUrl) {
    let client = null;
    try {
        // Usa connection string fornecida, variável de ambiente, ou busca das configurações
        let finalDatabaseUrl = chatwootDatabaseUrl;
        if (!finalDatabaseUrl && process.env.CHATWOOT_DATABASE_URL) {
            finalDatabaseUrl = process.env.CHATWOOT_DATABASE_URL;
            logger_1.default.info('Usando CHATWOOT_DATABASE_URL da variável de ambiente');
        }
        if (!finalDatabaseUrl) {
            try {
                const settings = await (0, systemSettings_1.getSystemSettings)(accountId);
                finalDatabaseUrl = settings.chatwootDatabaseUrl;
                logger_1.default.info('Usando CHATWOOT_DATABASE_URL das configurações do sistema');
            }
            catch (error) {
                logger_1.default.warn('Não foi possível buscar configurações do sistema', { error });
            }
        }
        if (!finalDatabaseUrl) {
            logger_1.default.error('CHATWOOT_DATABASE_URL não configurado', {
                hasEnvVar: !!process.env.CHATWOOT_DATABASE_URL,
                accountId
            });
            return {
                success: false,
                message: 'Chatwoot Database URL não configurado'
            };
        }
        // URL do KanbanCW (deriva do domínio ou usa variável direta)
        let finalKanbancwUrl = kanbancwUrl;
        if (!finalKanbancwUrl) {
            // Tenta KANBANCW_URL primeiro (se já derivado no entrypoint)
            if (process.env.KANBANCW_URL) {
                finalKanbancwUrl = process.env.KANBANCW_URL;
            }
            // Senão, deriva do KANBANCW_DOMAIN
            else if (process.env.KANBANCW_DOMAIN) {
                const domain = process.env.KANBANCW_DOMAIN;
                finalKanbancwUrl = domain.startsWith('http') ? domain : `https://${domain}`;
            }
            // Fallback para VITE_API_URL
            else if (process.env.VITE_API_URL) {
                finalKanbancwUrl = process.env.VITE_API_URL;
            }
        }
        if (!finalKanbancwUrl) {
            logger_1.default.error('Nenhuma URL do KanbanCW encontrada', {
                KANBANCW_URL: process.env.KANBANCW_URL,
                KANBANCW_DOMAIN: process.env.KANBANCW_DOMAIN,
                VITE_API_URL: process.env.VITE_API_URL
            });
            return {
                success: false,
                message: 'KANBANCW_URL ou KANBANCW_DOMAIN não configurado'
            };
        }
        logger_1.default.info('🔧 URL do KanbanCW para Dashboard Script', {
            url: finalKanbancwUrl,
            source: process.env.KANBANCW_URL ? 'KANBANCW_URL' :
                process.env.KANBANCW_DOMAIN ? 'KANBANCW_DOMAIN' : 'VITE_API_URL',
            env: {
                KANBANCW_URL: process.env.KANBANCW_URL || 'not set',
                KANBANCW_DOMAIN: process.env.KANBANCW_DOMAIN || 'not set',
                VITE_API_URL: process.env.VITE_API_URL || 'not set'
            }
        });
        // Gera o script
        const scriptContent = generateDashboardScript(finalKanbancwUrl);
        // Conecta no banco do Chatwoot
        logger_1.default.info('Tentando conectar no Chatwoot DB', {
            host: finalDatabaseUrl?.split('@')[1]?.split(':')[0] || 'unknown',
            dbExists: !!finalDatabaseUrl
        });
        client = new pg_1.Client({
            connectionString: finalDatabaseUrl
        });
        await client.connect();
        logger_1.default.info('Conexão com Chatwoot DB estabelecida com sucesso');
        // Verifica se já existe um Dashboard Script (independente de locked)
        const checkQuery = `
      SELECT id, serialized_value, locked
      FROM installation_configs
      WHERE name = 'DASHBOARD_SCRIPTS'
    `;
        const result = await client.query(checkQuery);
        // O Rails espera uma STRING YAML dentro do campo JSONB
        // Formato: "--- !ruby/hash:ActiveSupport::HashWithIndifferentAccess\nvalue: CONTENT\n"
        // Precisamos escapar o conteúdo do script para YAML
        const escapedContent = scriptContent
            .replace(/\\/g, '\\\\') // Escapa backslashes
            .replace(/"/g, '\\"') // Escapa aspas duplas
            .replace(/\n/g, '\\n') // Escapa newlines
            .replace(/\r/g, '\\r'); // Escapa carriage returns
        // Cria a string YAML no formato esperado pelo Rails
        const yamlString = `--- !ruby/hash:ActiveSupport::HashWithIndifferentAccess\nvalue: "${escapedContent}"\n`;
        // Salva a string YAML como valor JSON
        const scriptValue = JSON.stringify(yamlString);
        // Upsert atômico — evita race condition entre verificação e insert
        const upsertQuery = `
      INSERT INTO installation_configs (name, serialized_value, locked, created_at, updated_at)
      VALUES ('DASHBOARD_SCRIPTS', $1::jsonb, false, NOW(), NOW())
      ON CONFLICT (name)
      DO UPDATE SET serialized_value = EXCLUDED.serialized_value, updated_at = NOW()
    `;
        await client.query(upsertQuery, [scriptValue]);
        const wasUpdate = result.rows.length > 0;
        logger_1.default.info(wasUpdate ? 'Dashboard Script atualizado no Chatwoot' : 'Dashboard Script criado no Chatwoot', { accountId });
        await client.end();
        // Invalida o cache Redis do Chatwoot para forçar recarga imediata
        await invalidateChatwootRedisCache();
        return {
            success: true,
            message: 'Dashboard Script atualizado com sucesso no Chatwoot'
        };
    }
    catch (error) {
        logger_1.default.error('Erro ao atualizar Dashboard Script no Chatwoot', { error, accountId });
        if (client) {
            try {
                await client.end();
            }
            catch (e) {
                // Ignora erro ao fechar conexão
            }
        }
        return {
            success: false,
            message: `Erro: ${error.message}`
        };
    }
}
/**
 * Aplica o Dashboard Script automaticamente no startup.
 * O Dashboard Script é um registro GLOBAL na tabela installation_configs do Chatwoot
 * (campo DASHBOARD_SCRIPTS), aplicado a todos os usuários de todas as contas.
 * O accountId=1 é usado apenas como referência para buscar a URL nas configurações do sistema;
 * não limita a aplicação do script a uma conta específica.
 */
async function applyDashboardScriptOnStartup() {
    try {
        const result = await updateChatwootDashboardScript(1);
        if (result.success) {
            logger_1.default.info('✅ Dashboard Script aplicado com sucesso no startup');
        }
        else {
            logger_1.default.warn('⚠️ Falha ao aplicar Dashboard Script no startup', { message: result.message });
        }
    }
    catch (error) {
        logger_1.default.error('❌ Erro ao aplicar Dashboard Script no startup', { error: error.message });
    }
}
//# sourceMappingURL=chatwootDashboardScript.js.map