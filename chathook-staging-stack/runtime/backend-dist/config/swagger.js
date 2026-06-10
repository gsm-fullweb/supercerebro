"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerSpec = void 0;
exports.swaggerSpec = {
    openapi: '3.0.0',
    info: {
        title: 'KanbanCW API',
        version: '2.0.0',
        description: `API REST completa para o sistema KanbanCW com Kanban, Funis, Chat Interno e Agendamentos.

## Autenticação

Use o header \`api_access_token\` com o token de acesso da API do Chatwoot:
\`\`\`
api_access_token: SEU_TOKEN_AQUI
\`\`\`

## Multi-empresa (X-Account-ID)

O KanbanCW suporta múltiplas empresas (contas Chatwoot). Por padrão, todas as operações usam a conta associada ao token autenticado.

Para operar em uma empresa específica, envie o header **\`X-Account-ID\`**:
\`\`\`
X-Account-ID: 2
\`\`\`

**Regras de acesso:**
- **SuperAdmins** podem informar qualquer \`X-Account-ID\` para gerenciar qualquer empresa
- **Usuários comuns** só podem informar IDs das contas às quais pertencem (retorna 403 caso contrário)
- **Sem o header**: usa a conta padrão do token

**Exemplo completo:**
\`\`\`http
GET /api/funnels
api_access_token: meu-token
X-Account-ID: 2
\`\`\`
`,
    },
    servers: [
        {
            url: '/api/v1',
            description: 'Servidor de produção',
        },
    ],
    components: {
        securitySchemes: {
            BearerAuth: {
                type: 'http',
                scheme: 'bearer',
                description: 'Token de API (Bearer Token) gerado na interface do KanbanCW',
            },
            ApiAccessToken: {
                type: 'apiKey',
                in: 'header',
                name: 'api_access_token',
                description: 'Token de acesso da API do Chatwoot (obtido em Settings → API Access Token)',
            },
        },
        parameters: {
            AccountId: {
                name: 'X-Account-ID',
                in: 'header',
                required: false,
                schema: { type: 'integer', example: 2 },
                description: `**Multi-empresa:** ID da conta (empresa) a ser operada.
- **Omitir**: usa a conta padrão do token autenticado.
- **SuperAdmins**: podem informar qualquer account_id para gerenciar qualquer empresa.
- **Usuários comuns**: só podem informar account_ids das contas às quais pertencem — caso contrário retorna 403.

Exemplo: \`X-Account-ID: 2\` para operar na empresa ID 2.`,
            },
        },
        schemas: {
            Error: {
                type: 'object',
                properties: {
                    error: {
                        type: 'string',
                        description: 'Mensagem de erro',
                    },
                },
            },
            Success: {
                type: 'object',
                properties: {
                    success: {
                        type: 'boolean',
                        example: true,
                    },
                },
            },
            Board: {
                type: 'object',
                properties: {
                    id: { type: 'integer', example: 1 },
                    name: { type: 'string', example: 'Vendas' },
                    color: { type: 'string', example: '#3B82F6' },
                    isSystem: { type: 'boolean', example: false },
                    isPublic: { type: 'boolean', example: true },
                    stages: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Stage' },
                    },
                },
            },
            Stage: {
                type: 'object',
                properties: {
                    id: { type: 'integer', example: 1 },
                    name: { type: 'string', example: 'Prospecção' },
                    color: { type: 'string', example: '#10B981' },
                    chatwootStatus: { type: 'string', nullable: true, example: null },
                },
            },
            Card: {
                type: 'object',
                properties: {
                    conversationId: { type: 'integer', example: 123 },
                    order: { type: 'integer', example: 0 },
                    createdAt: { type: 'string', format: 'date-time' },
                },
            },
            Funnel: {
                type: 'object',
                properties: {
                    id: { type: 'integer', example: 1 },
                    accountId: { type: 'integer', example: 1 },
                    name: { type: 'string', example: 'Pipeline de Vendas' },
                    color: { type: 'string', example: '#3B82F6' },
                    isPublic: { type: 'boolean', example: true },
                    isSystem: { type: 'boolean', example: false },
                    order: { type: 'integer', example: 0 },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                },
            },
            ScheduledMessage: {
                type: 'object',
                properties: {
                    id: { type: 'integer', example: 1 },
                    accountId: { type: 'integer', example: 1 },
                    createdBy: { type: 'integer', example: 5 },
                    conversationId: { type: 'integer', example: 123 },
                    message: { type: 'string', example: 'Olá! Como posso ajudar?' },
                    scheduledAt: { type: 'string', format: 'date-time' },
                    status: { type: 'string', enum: ['pending', 'sent', 'failed'], example: 'pending' },
                    createdAt: { type: 'string', format: 'date-time' },
                },
            },
            InternalChat: {
                type: 'object',
                properties: {
                    id: { type: 'integer', example: 1 },
                    accountId: { type: 'integer', example: 1 },
                    name: { type: 'string', example: 'Time de Vendas' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                },
            },
            InternalChatMessage: {
                type: 'object',
                properties: {
                    id: { type: 'integer', example: 1 },
                    chatId: { type: 'integer', example: 1 },
                    userId: { type: 'integer', example: 5 },
                    content: { type: 'string', example: 'Mensagem do chat' },
                    createdAt: { type: 'string', format: 'date-time' },
                },
            },
            ChatbotFlow: {
                type: 'object',
                properties: {
                    id: { type: 'integer', example: 1 },
                    name: { type: 'string', example: 'Atendimento Automático' },
                    description: { type: 'string', example: 'Flow para atendimento inicial', nullable: true },
                    accountId: { type: 'integer', example: 1 },
                    isActive: { type: 'boolean', example: true },
                    trigger: {
                        type: 'object',
                        properties: {
                            type: { type: 'string', enum: ['keyword', 'inbox', 'label'], example: 'keyword' },
                            value: { oneOf: [{ type: 'string' }, { type: 'integer' }], example: 'ajuda' },
                        },
                    },
                    flowData: {
                        type: 'object',
                        properties: {
                            nodes: { type: 'array', items: { $ref: '#/components/schemas/FlowNode' } },
                            edges: { type: 'array', items: { $ref: '#/components/schemas/FlowEdge' } },
                        },
                    },
                    createdBy: { type: 'integer', example: 5 },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                    executionsCount: { type: 'integer', example: 42 },
                },
            },
            FlowNode: {
                type: 'object',
                properties: {
                    id: { type: 'string', example: 'start-1' },
                    type: {
                        type: 'string',
                        enum: ['start', 'sendText', 'sendImage', 'condition', 'delay', 'changeStatus', 'addLabel', 'assignAgent', 'waitForResponse', 'end'],
                        example: 'start',
                    },
                    position: {
                        type: 'object',
                        properties: {
                            x: { type: 'number', example: 250 },
                            y: { type: 'number', example: 50 },
                        },
                    },
                    data: { type: 'object', example: {} },
                },
            },
            FlowEdge: {
                type: 'object',
                properties: {
                    id: { type: 'string', example: 'edge-1' },
                    source: { type: 'string', example: 'start-1' },
                    target: { type: 'string', example: 'sendText-1' },
                    sourceHandle: { type: 'string', nullable: true },
                    targetHandle: { type: 'string', nullable: true },
                },
            },
            FlowExecution: {
                type: 'object',
                properties: {
                    id: { type: 'integer', example: 1 },
                    flowId: { type: 'integer', example: 1 },
                    conversationId: { type: 'integer', example: 123 },
                    accountId: { type: 'integer', example: 1 },
                    status: { type: 'string', enum: ['queued', 'running', 'completed', 'failed', 'cancelled'], example: 'completed' },
                    currentNodeId: { type: 'string', nullable: true, example: 'end-1' },
                    context: { type: 'object', nullable: true, example: { message: 'Olá' } },
                    startedAt: { type: 'string', format: 'date-time' },
                    completedAt: { type: 'string', format: 'date-time', nullable: true },
                    errorMessage: { type: 'string', nullable: true },
                },
            },
            FlowVariable: {
                type: 'object',
                properties: {
                    id: { type: 'integer', example: 1 },
                    accountId: { type: 'integer', example: 1 },
                    name: { type: 'string', example: 'empresa_nome' },
                    defaultValue: { type: 'string', nullable: true, example: 'Minha Empresa' },
                    description: { type: 'string', nullable: true, example: 'Nome da empresa para mensagens' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                },
            },
            Sequence: {
                type: 'object',
                properties: {
                    id: { type: 'integer', example: 1 },
                    name: { type: 'string', example: 'Sequência de Boas-vindas' },
                    description: { type: 'string', nullable: true, example: 'Envia mensagens de boas-vindas ao longo de 7 dias' },
                    accountId: { type: 'integer', example: 1 },
                    isActive: { type: 'boolean', example: true },
                    type: { type: 'string', example: 'sequence' },
                    trigger: { type: 'object', example: { type: 'manual' } },
                    flowData: {
                        type: 'object',
                        properties: {
                            nodes: { type: 'array', items: { $ref: '#/components/schemas/FlowNode' } },
                            edges: { type: 'array', items: { $ref: '#/components/schemas/FlowEdge' } },
                        },
                    },
                    createdBy: { type: 'integer', example: 5 },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                    stats: {
                        type: 'object',
                        example: { running: 5, completed: 20, cancelled: 2 },
                    },
                },
            },
            SequenceExecution: {
                type: 'object',
                properties: {
                    id: { type: 'integer', example: 1 },
                    flowId: { type: 'integer', example: 1 },
                    contactId: { type: 'integer', example: 456 },
                    conversationId: { type: 'integer', nullable: true, example: 123 },
                    accountId: { type: 'integer', example: 1 },
                    status: { type: 'string', enum: ['running', 'completed', 'cancelled', 'failed'], example: 'running' },
                    currentNodeId: { type: 'string', nullable: true, example: 'delay-2' },
                    startedAt: { type: 'string', format: 'date-time' },
                    completedAt: { type: 'string', format: 'date-time', nullable: true },
                    errorMessage: { type: 'string', nullable: true },
                },
            },
            UserResourcePermission: {
                type: 'object',
                properties: {
                    id: { type: 'integer', example: 1 },
                    accountId: { type: 'integer', example: 1 },
                    userId: { type: 'integer', example: 5 },
                    kanbanAccess: { type: 'boolean', example: true },
                    conexoesAccess: { type: 'boolean', example: true },
                    chatsInternosAccess: { type: 'boolean', example: true },
                    projectsAccess: { type: 'boolean', example: true },
                    chatbotFlowsAccess: { type: 'boolean', example: true },
                    permissoesAccess: { type: 'boolean', example: false },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                },
            },
            AccountPermissions: {
                type: 'object',
                properties: {
                    id: { type: 'integer', example: 1 },
                    accountId: { type: 'integer', example: 1 },
                    kanbanEnabled: { type: 'boolean', example: true },
                    chatsInternosEnabled: { type: 'boolean', example: true },
                    conexoesEnabled: { type: 'boolean', example: true },
                    projectsEnabled: { type: 'boolean', example: true },
                    chatbotFlowsEnabled: { type: 'boolean', example: true },
                    wavoipEnabled: { type: 'boolean', example: false },
                    appointmentsEnabled: { type: 'boolean', example: true },
                    disparadorEnabled: { type: 'boolean', example: true },
                    allowedProviders: { type: 'string', nullable: true, example: '["evolution","waha"]' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                },
            },
            Project: {
                type: 'object',
                properties: {
                    id: { type: 'integer', example: 1 },
                    accountId: { type: 'integer', example: 1 },
                    name: { type: 'string', example: 'Projeto MVP 2024' },
                    description: { type: 'string', nullable: true, example: 'Desenvolvimento do MVP' },
                    status: { type: 'string', enum: ['active', 'completed', 'cancelled'], example: 'active' },
                    deadline: { type: 'string', format: 'date-time', nullable: true },
                    color: { type: 'string', nullable: true, example: '#3B82F6' },
                    createdBy: { type: 'integer', example: 5 },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                },
            },
            ProjectTask: {
                type: 'object',
                properties: {
                    id: { type: 'integer', example: 1 },
                    projectId: { type: 'integer', example: 1 },
                    title: { type: 'string', example: 'Revisar código do backend' },
                    description: { type: 'string', nullable: true, example: 'Revisar endpoints da API' },
                    status: { type: 'string', enum: ['pending', 'in_progress', 'completed'], example: 'in_progress' },
                    priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], nullable: true, example: 'high' },
                    dueDate: { type: 'string', format: 'date-time', nullable: true },
                    completedAt: { type: 'string', format: 'date-time', nullable: true },
                    milestoneId: { type: 'integer', nullable: true, example: 1 },
                    assignedTo: { type: 'integer', nullable: true, example: 5 },
                    createdBy: { type: 'integer', example: 5 },
                    order: { type: 'integer', example: 0 },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                },
            },
            ProjectMilestone: {
                type: 'object',
                properties: {
                    id: { type: 'integer', example: 1 },
                    projectId: { type: 'integer', example: 1 },
                    name: { type: 'string', example: 'Planejamento' },
                    description: { type: 'string', nullable: true, example: 'Fase de planejamento do projeto' },
                    dueDate: { type: 'string', format: 'date-time', nullable: true },
                    order: { type: 'integer', example: 0 },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                },
            },
            ProjectMember: {
                type: 'object',
                properties: {
                    id: { type: 'integer', example: 1 },
                    projectId: { type: 'integer', example: 1 },
                    userId: { type: 'integer', example: 5 },
                    role: { type: 'string', enum: ['manager', 'member'], example: 'member' },
                    addedAt: { type: 'string', format: 'date-time' },
                    addedBy: { type: 'integer', example: 3 },
                },
            },
            ProjectFile: {
                type: 'object',
                properties: {
                    id: { type: 'integer', example: 1 },
                    projectId: { type: 'integer', example: 1 },
                    filename: { type: 'string', example: 'documento-1703789012345.pdf' },
                    originalName: { type: 'string', example: 'documento.pdf' },
                    mimetype: { type: 'string', example: 'application/pdf' },
                    size: { type: 'integer', example: 1024000 },
                    uploadedBy: { type: 'integer', example: 5 },
                    uploadedAt: { type: 'string', format: 'date-time' },
                },
            },
            ProjectDiscussion: {
                type: 'object',
                properties: {
                    id: { type: 'integer', example: 1 },
                    projectId: { type: 'integer', example: 1 },
                    subject: { type: 'string', example: 'Reunião de kickoff' },
                    description: { type: 'string', nullable: true, example: 'Discutir escopo do projeto' },
                    createdBy: { type: 'integer', example: 5 },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                },
            },
            ProjectComment: {
                type: 'object',
                properties: {
                    id: { type: 'integer', example: 1 },
                    discussionId: { type: 'integer', example: 1 },
                    content: { type: 'string', example: 'Concordo com a proposta' },
                    createdBy: { type: 'integer', example: 5 },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                },
            },
            ProjectActivity: {
                type: 'object',
                properties: {
                    id: { type: 'integer', example: 1 },
                    projectId: { type: 'integer', example: 1 },
                    userId: { type: 'integer', example: 5 },
                    action: { type: 'string', example: 'task_created' },
                    description: { type: 'string', example: 'Criou a tarefa "Revisar código"' },
                    metadata: { type: 'object', nullable: true },
                    createdAt: { type: 'string', format: 'date-time' },
                },
            },
            ProjectStats: {
                type: 'object',
                properties: {
                    totalTasks: { type: 'integer', example: 10 },
                    completedTasks: { type: 'integer', example: 5 },
                    pendingTasks: { type: 'integer', example: 3 },
                    inProgressTasks: { type: 'integer', example: 2 },
                    overdueTasks: { type: 'integer', example: 1 },
                    totalMilestones: { type: 'integer', example: 3 },
                    completedMilestones: { type: 'integer', example: 1 },
                    totalMembers: { type: 'integer', example: 5 },
                    totalFiles: { type: 'integer', example: 8 },
                    totalDiscussions: { type: 'integer', example: 3 },
                    progress: { type: 'integer', example: 50 },
                    conversationCount: { type: 'integer', example: 12 },
                    totalValue: { type: 'integer', example: 500000 },
                },
            },
        },
    },
    security: [{ BearerAuth: [] }],
    tags: [
        { name: 'Atendimentos', description: 'Relatório e listagem de conversas/atendimentos com filtros avançados' },
        { name: 'Kanban', description: 'Gerenciamento de boards e cards Kanban' },
        { name: 'Funis', description: 'Criação e gerenciamento de funis customizados' },
        { name: 'Agendamentos', description: 'CRUD completo do módulo de agendamentos: pacientes, profissionais, serviços, planos de saúde, agenda e relatórios' },
        { name: 'Agendamentos - Mensagens', description: 'Agendamento de mensagens automáticas' },
        { name: 'Chat Interno', description: 'Chat interno entre membros da equipe' },
        { name: 'Chatbot Flows', description: 'Automações de chatbot com flow builder visual' },
        { name: 'Sequências', description: 'Sequências de mensagens automáticas programadas por tempo' },
        { name: 'Permissões', description: 'Gerenciamento de permissões de usuários' },
        { name: 'Permissões de Conta', description: 'Gerenciamento de permissões por empresa (Super Admin). Aceita API Token com escopo account-permissions:write' },
        { name: 'API Tokens', description: 'Criação e gerenciamento de tokens de API para integrações externas' },
        { name: 'Itens do Card', description: 'Produtos/serviços vinculados a um card do Kanban (via API Token)' },
        { name: 'Projetos', description: 'Gerenciamento de projetos e conversas vinculadas' },
        { name: 'Tarefas de Projeto', description: 'Gerenciamento de tarefas dentro de projetos. Acessível via Chatwoot auth (api_access_token) ou Bearer Token (API Token do KanbanCW) — use /api/v1/projects para acesso externo' },
        { name: 'Milestones de Projeto', description: 'Gerenciamento de marcos/milestones de projetos' },
        { name: 'Membros de Projeto', description: 'Gerenciamento de equipe de projetos' },
        { name: 'Arquivos de Projeto', description: 'Upload e gerenciamento de arquivos de projetos' },
        { name: 'Discussões de Projeto', description: 'Discussões e comentários em projetos' },
    ],
    paths: {
        // ── Atendimentos (base: /api — não /api/v1) ─────────────────────────────
        '/atendimentos/filters': {
            get: {
                summary: 'Opções de filtro para Atendimentos',
                description: 'Retorna agentes, caixas de entrada, labels e times disponíveis para uso nos filtros da listagem de atendimentos.',
                tags: ['Atendimentos'],
                security: [{ ApiAccessToken: [] }],
                responses: {
                    '200': {
                        description: 'Filtros retornados com sucesso',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                agents: {
                                                    type: 'array',
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            id: { type: 'integer', example: 1 },
                                                            name: { type: 'string', example: 'João Silva' },
                                                            email: { type: 'string', example: 'joao@empresa.com' },
                                                            role: { type: 'string', example: 'agent' },
                                                        },
                                                    },
                                                },
                                                inboxes: {
                                                    type: 'array',
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            id: { type: 'integer', example: 5 },
                                                            name: { type: 'string', example: 'WhatsApp Central' },
                                                            channel_type: { type: 'string', example: 'Channel::Whatsapp' },
                                                        },
                                                    },
                                                },
                                                labels: {
                                                    type: 'array',
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            id: { type: 'integer', example: 1 },
                                                            title: { type: 'string', example: 'urgente' },
                                                            color: { type: 'string', example: '#FF5630' },
                                                        },
                                                    },
                                                },
                                                teams: {
                                                    type: 'array',
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            id: { type: 'integer', example: 2 },
                                                            name: { type: 'string', example: 'Suporte' },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    '401': { description: 'Não autenticado' },
                    '403': { description: 'Sem permissão para o módulo Atendimentos' },
                },
            },
        },
        '/atendimentos/stats': {
            get: {
                summary: 'Estatísticas de atendimento',
                description: 'Retorna métricas agregadas: totais por status, breakdown por caixa de entrada e por agente, conversas de hoje e tempo médio de primeira resposta.',
                tags: ['Atendimentos'],
                security: [{ ApiAccessToken: [] }],
                parameters: [
                    {
                        name: 'inbox_id',
                        in: 'query',
                        required: false,
                        description: 'Filtrar estatísticas por caixa de entrada',
                        schema: { type: 'integer', example: 5 },
                    },
                    {
                        name: 'assignee_id',
                        in: 'query',
                        required: false,
                        description: 'Filtrar estatísticas por agente responsável',
                        schema: { type: 'integer', example: 1 },
                    },
                    {
                        name: 'from',
                        in: 'query',
                        required: false,
                        description: 'Data de início do período (ISO 8601)',
                        schema: { type: 'string', format: 'date-time', example: '2025-01-01T00:00:00Z' },
                    },
                    {
                        name: 'to',
                        in: 'query',
                        required: false,
                        description: 'Data de fim do período (ISO 8601)',
                        schema: { type: 'string', format: 'date-time', example: '2025-12-31T23:59:59Z' },
                    },
                ],
                responses: {
                    '200': {
                        description: 'Estatísticas retornadas com sucesso',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                total: { type: 'integer', example: 1234 },
                                                byStatus: {
                                                    type: 'object',
                                                    properties: {
                                                        open: { type: 'integer', example: 45 },
                                                        pending: { type: 'integer', example: 12 },
                                                        resolved: { type: 'integer', example: 1170 },
                                                        snoozed: { type: 'integer', example: 7 },
                                                    },
                                                },
                                                byInbox: {
                                                    type: 'array',
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            id: { type: 'integer', example: 5 },
                                                            name: { type: 'string', example: 'WhatsApp Central' },
                                                            channelType: { type: 'string', example: 'Channel::Whatsapp' },
                                                            open: { type: 'integer', example: 20 },
                                                            resolved: { type: 'integer', example: 300 },
                                                        },
                                                    },
                                                },
                                                byAgent: {
                                                    type: 'array',
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            id: { type: 'integer', example: 1 },
                                                            name: { type: 'string', example: 'João Silva' },
                                                            email: { type: 'string', example: 'joao@empresa.com' },
                                                            open: { type: 'integer', example: 8 },
                                                            resolved: { type: 'integer', example: 120 },
                                                        },
                                                    },
                                                },
                                                today: {
                                                    type: 'object',
                                                    properties: {
                                                        opened: { type: 'integer', example: 15 },
                                                        resolved: { type: 'integer', example: 22 },
                                                    },
                                                },
                                                avgFirstReplyMinutes: {
                                                    type: 'integer',
                                                    nullable: true,
                                                    example: 8,
                                                    description: 'Tempo médio de primeira resposta em minutos. Null se dados insuficientes.',
                                                },
                                                sampleSize: {
                                                    type: 'integer',
                                                    example: 250,
                                                    description: 'Número de conversas analisadas para os breakdowns (max ~250).',
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    '401': { description: 'Não autenticado' },
                    '403': { description: 'Sem permissão para o módulo Atendimentos' },
                },
            },
        },
        '/atendimentos': {
            get: {
                summary: 'Listar atendimentos (conversas)',
                description: `Lista conversas do Chatwoot com filtros avançados, paginação e enriquecimento com dados do Kanban (funil/etapa/leadStatus).

**Filtros client-side:** \`assignee_id\`, \`from\` e \`to\` são aplicados após o fetch do Chatwoot. Quando usados, a paginação é feita localmente (até ~250 conversas buscadas).

**Enriquecimento Kanban:** Cada conversa recebe um campo \`kanban\` com dados do card local se a conversa estiver em algum funil.`,
                tags: ['Atendimentos'],
                security: [{ ApiAccessToken: [] }],
                parameters: [
                    {
                        name: 'status',
                        in: 'query',
                        required: false,
                        description: 'Filtrar por status da conversa',
                        schema: { type: 'string', enum: ['open', 'pending', 'resolved', 'snoozed', 'all'], default: 'all' },
                    },
                    {
                        name: 'inbox_id',
                        in: 'query',
                        required: false,
                        description: 'Filtrar por caixa de entrada',
                        schema: { type: 'integer', example: 5 },
                    },
                    {
                        name: 'assignee_id',
                        in: 'query',
                        required: false,
                        description: 'Filtrar por agente responsável (filtro client-side)',
                        schema: { type: 'integer', example: 1 },
                    },
                    {
                        name: 'assignee_type',
                        in: 'query',
                        required: false,
                        description: 'Filtrar por tipo de atribuição',
                        schema: { type: 'string', enum: ['assigned', 'unassigned', 'all'] },
                    },
                    {
                        name: 'team_id',
                        in: 'query',
                        required: false,
                        description: 'Filtrar por time',
                        schema: { type: 'integer', example: 2 },
                    },
                    {
                        name: 'labels',
                        in: 'query',
                        required: false,
                        description: 'Filtrar por labels separadas por vírgula (ex: venda,urgente)',
                        schema: { type: 'string', example: 'venda,urgente' },
                    },
                    {
                        name: 'search',
                        in: 'query',
                        required: false,
                        description: 'Busca em nome/email/telefone do contato e ID da conversa',
                        schema: { type: 'string', example: 'João Silva' },
                    },
                    {
                        name: 'from',
                        in: 'query',
                        required: false,
                        description: 'Data de início (ISO 8601) — filtro client-side',
                        schema: { type: 'string', format: 'date-time', example: '2025-01-01T00:00:00Z' },
                    },
                    {
                        name: 'to',
                        in: 'query',
                        required: false,
                        description: 'Data de fim (ISO 8601) — filtro client-side',
                        schema: { type: 'string', format: 'date-time', example: '2025-12-31T23:59:59Z' },
                    },
                    {
                        name: 'sort',
                        in: 'query',
                        required: false,
                        description: 'Ordenação das conversas',
                        schema: { type: 'string', enum: ['latest', 'created_at', 'assignee', 'unattended'], default: 'latest' },
                    },
                    {
                        name: 'page',
                        in: 'query',
                        required: false,
                        description: 'Número da página',
                        schema: { type: 'integer', minimum: 1, default: 1 },
                    },
                    {
                        name: 'limit',
                        in: 'query',
                        required: false,
                        description: 'Itens por página (1-100)',
                        schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
                    },
                ],
                responses: {
                    '200': {
                        description: 'Listagem retornada com sucesso',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                conversations: {
                                                    type: 'array',
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            id: { type: 'integer', example: 11849 },
                                                            status: { type: 'string', example: 'open' },
                                                            created_at: { type: 'integer', example: 1740000000 },
                                                            updated_at: { type: 'integer', example: 1740003600 },
                                                            inbox_id: { type: 'integer', example: 5 },
                                                            meta: {
                                                                type: 'object',
                                                                properties: {
                                                                    assignee: {
                                                                        type: 'object',
                                                                        nullable: true,
                                                                        properties: {
                                                                            id: { type: 'integer', example: 1 },
                                                                            name: { type: 'string', example: 'João Silva' },
                                                                        },
                                                                    },
                                                                    sender: {
                                                                        type: 'object',
                                                                        properties: {
                                                                            id: { type: 'integer', example: 42 },
                                                                            name: { type: 'string', example: 'Maria Souza' },
                                                                            phone_number: { type: 'string', example: '+5511999999999' },
                                                                        },
                                                                    },
                                                                },
                                                            },
                                                            labels: { type: 'array', items: { type: 'string' }, example: ['venda'] },
                                                            kanban: {
                                                                type: 'object',
                                                                nullable: true,
                                                                description: 'Presente quando a conversa está em algum funil do KanbanCW',
                                                                properties: {
                                                                    cardId: { type: 'integer', example: 87 },
                                                                    stageId: { type: 'integer', example: 3 },
                                                                    stageName: { type: 'string', example: 'Proposta Enviada' },
                                                                    stageColor: { type: 'string', example: '#F59E0B' },
                                                                    funnelId: { type: 'integer', example: 1 },
                                                                    funnelName: { type: 'string', example: 'Pipeline de Vendas' },
                                                                    funnelColor: { type: 'string', example: '#3B82F6' },
                                                                    leadStatus: { type: 'string', enum: ['open', 'won', 'lost'], example: 'open' },
                                                                    closedAt: { type: 'string', nullable: true, format: 'date-time' },
                                                                },
                                                            },
                                                        },
                                                    },
                                                },
                                                meta: {
                                                    type: 'object',
                                                    properties: {
                                                        total: { type: 'integer', example: 1234 },
                                                        page: { type: 'integer', example: 1 },
                                                        limit: { type: 'integer', example: 25 },
                                                        pages: { type: 'integer', example: 50 },
                                                        hasMore: { type: 'boolean', example: true },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    '400': { description: 'Parâmetro inválido (inbox_id, team_id ou assignee_id não numérico)' },
                    '401': { description: 'Não autenticado' },
                    '403': { description: 'Sem permissão para o módulo Atendimentos' },
                },
            },
            post: {
                summary: 'Criar conversa (atendimento)',
                description: 'Cria uma nova conversa no Chatwoot na caixa de entrada especificada.',
                tags: ['Atendimentos'],
                security: [{ ApiAccessToken: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['inbox_id', 'contact_id'],
                                properties: {
                                    inbox_id: { type: 'integer', description: 'ID da caixa de entrada', example: 5 },
                                    contact_id: { type: 'integer', description: 'ID do contato', example: 42 },
                                    status: { type: 'string', enum: ['open', 'pending', 'resolved'], default: 'open' },
                                    additional_attributes: { type: 'object', description: 'Atributos adicionais da conversa' },
                                    custom_attributes: { type: 'object', description: 'Atributos customizados' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Conversa criada com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '400': { description: 'Parâmetros inválidos' },
                    '401': { description: 'Não autenticado' },
                    '403': { description: 'Sem permissão para o módulo Atendimentos' },
                    '500': { description: 'Erro ao criar conversa' },
                },
            },
        },
        '/atendimentos/{id}': {
            get: {
                summary: 'Detalhes de um atendimento',
                description: 'Retorna os detalhes completos de uma conversa, incluindo dados do kanban (funil/etapa) se a conversa estiver em algum funil.',
                tags: ['Atendimentos'],
                security: [{ ApiAccessToken: [] }],
                parameters: [
                    { in: 'path', name: 'id', required: true, schema: { type: 'integer' }, description: 'ID da conversa' },
                ],
                responses: {
                    '200': { description: 'Detalhes da conversa', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '400': { description: 'ID inválido' },
                    '401': { description: 'Não autenticado' },
                    '404': { description: 'Conversa não encontrada' },
                },
            },
            patch: {
                summary: 'Atualizar atendimento',
                description: 'Atualiza status, agente responsável, time e/ou labels de uma conversa. Pelo menos um campo deve ser informado.',
                tags: ['Atendimentos'],
                security: [{ ApiAccessToken: [] }],
                parameters: [
                    { in: 'path', name: 'id', required: true, schema: { type: 'integer' }, description: 'ID da conversa' },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    status: { type: 'string', enum: ['open', 'pending', 'resolved', 'snoozed'], description: 'Novo status da conversa' },
                                    agent_id: { type: 'integer', description: 'ID do agente a atribuir', example: 3 },
                                    team_id: { type: 'integer', description: 'ID do time a atribuir', example: 1 },
                                    labels: { type: 'array', items: { type: 'string' }, description: 'Labels a adicionar', example: ['urgente', 'vip'] },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Conversa atualizada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '400': { description: 'Parâmetros inválidos ou nenhum campo informado' },
                    '401': { description: 'Não autenticado' },
                    '403': { description: 'Sem permissão' },
                },
            },
            delete: {
                summary: 'Deletar atendimento',
                description: 'Deleta uma conversa do Chatwoot e remove o card do kanban (se existir).',
                tags: ['Atendimentos'],
                security: [{ ApiAccessToken: [] }],
                parameters: [
                    { in: 'path', name: 'id', required: true, schema: { type: 'integer' }, description: 'ID da conversa' },
                ],
                responses: {
                    '200': { description: 'Conversa deletada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '400': { description: 'ID inválido' },
                    '401': { description: 'Não autenticado' },
                    '403': { description: 'Sem permissão (requer admin no Chatwoot)' },
                    '500': { description: 'Erro ao deletar' },
                },
            },
        },
        '/atendimentos/{id}/labels': {
            post: {
                summary: 'Adicionar labels',
                description: 'Adiciona labels a uma conversa.',
                tags: ['Atendimentos'],
                security: [{ ApiAccessToken: [] }],
                parameters: [
                    { in: 'path', name: 'id', required: true, schema: { type: 'integer' }, description: 'ID da conversa' },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['labels'],
                                properties: {
                                    labels: { type: 'array', items: { type: 'string' }, description: 'Labels a adicionar', example: ['urgente', 'vip'] },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Labels adicionadas', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '400': { description: 'Labels inválidas' },
                    '401': { description: 'Não autenticado' },
                },
            },
            delete: {
                summary: 'Remover labels',
                description: 'Remove labels de uma conversa.',
                tags: ['Atendimentos'],
                security: [{ ApiAccessToken: [] }],
                parameters: [
                    { in: 'path', name: 'id', required: true, schema: { type: 'integer' }, description: 'ID da conversa' },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['labels'],
                                properties: {
                                    labels: { type: 'array', items: { type: 'string' }, description: 'Labels a remover', example: ['urgente'] },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Labels removidas', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '400': { description: 'Labels inválidas' },
                    '401': { description: 'Não autenticado' },
                },
            },
        },
        // ── Kanban (base: /api/v1) ───────────────────────────────────────────────
        '/kanban/boards': {
            get: {
                summary: 'Lista todos os funis/boards disponíveis',
                description: 'Retorna todos os funis (boards) do Kanban com seus respectivos stages',
                tags: ['Kanban'],
                security: [{ BearerAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/AccountId' }],
                responses: {
                    '200': {
                        description: 'Lista de funis retornada com sucesso',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'array',
                                            items: { $ref: '#/components/schemas/Board' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    '401': {
                        description: 'Token de autenticação inválido ou ausente',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                    '500': {
                        description: 'Erro interno do servidor',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/kanban/boards/{boardId}/cards': {
            get: {
                summary: 'Lista cards de um board específico',
                description: 'Retorna todos os cards organizados por stages de um board/funil específico',
                tags: ['Kanban'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    { $ref: '#/components/parameters/AccountId' },
                    {
                        in: 'path',
                        name: 'boardId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do board/funil',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Cards do board retornados com sucesso',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                id: { type: 'integer', example: 1 },
                                                name: { type: 'string', example: 'Vendas' },
                                                stages: {
                                                    type: 'array',
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            id: { type: 'integer', example: 1 },
                                                            name: { type: 'string', example: 'Prospecção' },
                                                            color: { type: 'string', example: '#10B981' },
                                                            cards: {
                                                                type: 'array',
                                                                items: { $ref: '#/components/schemas/Card' },
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    '404': {
                        description: 'Board não encontrado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/kanban/cards': {
            post: {
                summary: 'Cria um novo card no Kanban',
                description: 'Adiciona uma conversa como card em um stage específico',
                tags: ['Kanban'],
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['conversationId', 'stageId'],
                                properties: {
                                    conversationId: {
                                        type: 'integer',
                                        example: 123,
                                        description: 'ID da conversa do Chatwoot',
                                    },
                                    stageId: {
                                        type: 'integer',
                                        example: 1,
                                        description: 'ID do stage onde o card será criado',
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Card criado com sucesso',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/Card' },
                                    },
                                },
                            },
                        },
                    },
                    '400': {
                        description: 'Parâmetros inválidos',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                    '404': {
                        description: 'Stage não encontrado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                    '409': {
                        description: 'Card já existe para esta conversa',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/kanban/cards/{conversationId}/move': {
            put: {
                summary: 'Move um card para outro stage',
                description: 'Atualiza a posição de um card movendo-o para um stage diferente',
                tags: ['Kanban'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'conversationId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID da conversa',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['stageId'],
                                properties: {
                                    stageId: {
                                        type: 'integer',
                                        example: 2,
                                        description: 'ID do stage de destino',
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Card movido com sucesso',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/Card' },
                                    },
                                },
                            },
                        },
                    },
                    '404': {
                        description: 'Card ou stage não encontrado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/kanban/cards/{conversationId}': {
            get: {
                summary: 'Busca card por conversation ID',
                description: 'Retorna os dados do card (funil, etapa, leadStatus) de uma conversa específica. Retorna 404 se a conversa não estiver em nenhum board.',
                tags: ['Kanban'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'conversationId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID da conversa no Chatwoot',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Dados do card',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                conversationId: { type: 'integer', example: 123 },
                                                stageId: { type: 'integer', example: 5 },
                                                stageName: { type: 'string', example: 'Em negociação' },
                                                stageColor: { type: 'string', example: '#6366f1' },
                                                funnelId: { type: 'integer', example: 2 },
                                                funnelName: { type: 'string', example: 'Vendas' },
                                                leadStatus: { type: 'string', enum: ['open', 'won', 'lost'], example: 'open' },
                                                customName: { type: 'string', nullable: true, example: null },
                                                order: { type: 'integer', example: 0 },
                                                createdAt: { type: 'string', format: 'date-time' },
                                                updatedAt: { type: 'string', format: 'date-time' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    '404': {
                        description: 'Card não encontrado para esta conversa',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
                    },
                },
            },
            delete: {
                summary: 'Remove um card do Kanban',
                description: 'Exclui um card (conversa) de todos os boards',
                tags: ['Kanban'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'conversationId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID da conversa',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Card removido com sucesso',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Success' },
                            },
                        },
                    },
                    '404': {
                        description: 'Card não encontrado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/kanban/cards/by-contact/{contactId}': {
            get: {
                summary: 'Busca todos os cards de um contato',
                description: 'Retorna todos os cards (funil, etapa, leadStatus) de todas as conversas de um contato. Útil para saber em qual estágio do funil estão as conversas de um cliente.',
                tags: ['Kanban'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'contactId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do contato no Chatwoot',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Lista de cards do contato',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    conversationId: { type: 'integer', example: 123 },
                                                    stageId: { type: 'integer', example: 5 },
                                                    stageName: { type: 'string', example: 'Em negociação' },
                                                    stageColor: { type: 'string', example: '#6366f1' },
                                                    funnelId: { type: 'integer', example: 2 },
                                                    funnelName: { type: 'string', example: 'Vendas' },
                                                    leadStatus: { type: 'string', enum: ['open', 'won', 'lost'], example: 'open' },
                                                    customName: { type: 'string', nullable: true },
                                                    order: { type: 'integer' },
                                                    createdAt: { type: 'string', format: 'date-time' },
                                                    updatedAt: { type: 'string', format: 'date-time' },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    '404': {
                        description: 'Contato não encontrado ou sem conversas',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
                    },
                },
            },
        },
        // ── Itens do Card (base: /api/v1) ────────────────────────────────────────
        '/kanban/cards/{conversationId}/items': {
            get: {
                summary: 'Lista os itens de um card',
                description: 'Retorna todos os itens (produtos, serviços ou qualquer item com valor) adicionados ao card de uma conversa. O campo `total` é o valor unitário × quantidade.',
                tags: ['Itens do Card'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'conversationId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID da conversa no Chatwoot',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Lista de itens do card',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    id: { type: 'integer', example: 1 },
                                                    title: { type: 'string', example: 'Consultoria' },
                                                    description: { type: 'string', nullable: true },
                                                    value: { type: 'number', example: 15000 },
                                                    quantity: { type: 'integer', example: 2 },
                                                    total: { type: 'number', example: 30000 },
                                                    templateId: { type: 'integer', nullable: true },
                                                    order: { type: 'integer', example: 0 },
                                                    createdAt: { type: 'string', format: 'date-time' },
                                                    updatedAt: { type: 'string', format: 'date-time' },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            post: {
                summary: 'Adiciona um item a um card',
                description: `Cria um item no card de uma conversa.

**Dois modos:**
- **Manual:** informe \`title\` + \`value\` + \`quantity\` (mínimo 3 caracteres no título)
- **Template:** informe \`templateId\` e os dados são copiados do template do funil

O card precisa existir — use \`POST /v1/kanban/cards\` para criar o card caso a conversa ainda não esteja no Kanban.`,
                tags: ['Itens do Card'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'conversationId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID da conversa no Chatwoot',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    templateId: {
                                        type: 'integer',
                                        description: 'ID do template do funil. Quando informado, title/description/value são copiados automaticamente.',
                                        example: 3,
                                    },
                                    title: {
                                        type: 'string',
                                        description: 'Título do item (mínimo 3 caracteres). Obrigatório se templateId não for informado.',
                                        example: 'Consultoria',
                                    },
                                    description: {
                                        type: 'string',
                                        description: 'Descrição opcional do item',
                                    },
                                    value: {
                                        type: 'number',
                                        description: 'Valor unitário em centavos ou reais (conforme sua convenção). Padrão: 0',
                                        example: 15000,
                                    },
                                    quantity: {
                                        type: 'integer',
                                        description: 'Quantidade. Mínimo 1. Padrão: 1',
                                        example: 2,
                                    },
                                },
                            },
                            examples: {
                                manual: {
                                    summary: 'Item manual',
                                    value: { title: 'Consultoria', value: 15000, quantity: 2 },
                                },
                                from_template: {
                                    summary: 'A partir de template',
                                    value: { templateId: 3, quantity: 1 },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Item criado com sucesso' },
                    '400': { description: 'Parâmetros inválidos (título curto, valor negativo, quantidade < 1)' },
                    '404': { description: 'Card não encontrado. Crie o card antes de adicionar itens.' },
                },
            },
        },
        '/kanban/cards/{conversationId}/items/total': {
            get: {
                summary: 'Retorna o valor total dos itens',
                description: 'Soma de `value × quantity` de todos os itens do card.',
                tags: ['Itens do Card'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'conversationId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID da conversa no Chatwoot',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Total calculado',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                total: { type: 'number', example: 30000 },
                                                itemCount: { type: 'integer', example: 2 },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/kanban/cards/{conversationId}/items/{itemId}': {
            put: {
                summary: 'Atualiza um item do card',
                description: 'Atualiza title, description, value ou quantity de um item existente.',
                tags: ['Itens do Card'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'conversationId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID da conversa no Chatwoot',
                    },
                    {
                        in: 'path',
                        name: 'itemId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do item',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    title: { type: 'string', example: 'Consultoria Premium' },
                                    description: { type: 'string' },
                                    value: { type: 'number', example: 20000 },
                                    quantity: { type: 'integer', example: 3 },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Item atualizado' },
                    '404': { description: 'Item não encontrado' },
                },
            },
            delete: {
                summary: 'Remove um item do card',
                tags: ['Itens do Card'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'conversationId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID da conversa no Chatwoot',
                    },
                    {
                        in: 'path',
                        name: 'itemId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do item',
                    },
                ],
                responses: {
                    '200': { description: 'Item removido' },
                    '404': { description: 'Item não encontrado' },
                },
            },
        },
        '/funnels': {
            post: {
                summary: 'Cria um novo funil',
                description: 'Cria um funil customizado para organização de conversas',
                tags: ['Funis'],
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['name'],
                                properties: {
                                    name: {
                                        type: 'string',
                                        example: 'Pipeline de Vendas',
                                        description: 'Nome do funil',
                                    },
                                    color: {
                                        type: 'string',
                                        example: '#3B82F6',
                                        description: 'Cor hexadecimal do funil (padrão: #3B82F6)',
                                    },
                                    isPublic: {
                                        type: 'boolean',
                                        example: true,
                                        description: 'Se o funil é público para todos os usuários (padrão: true)',
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Funil criado com sucesso',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/Funnel' },
                                    },
                                },
                            },
                        },
                    },
                    '400': {
                        description: 'Nome é obrigatório',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/funnels/{funnelId}': {
            put: {
                summary: 'Atualiza um funil',
                description: 'Atualiza nome, cor ou visibilidade de um funil existente',
                tags: ['Funis'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'funnelId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do funil',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string', example: 'Pipeline Atualizado' },
                                    color: { type: 'string', example: '#EF4444' },
                                    isPublic: { type: 'boolean', example: false },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Funil atualizado com sucesso',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/Funnel' },
                                    },
                                },
                            },
                        },
                    },
                    '404': {
                        description: 'Funil não encontrado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
            delete: {
                summary: 'Remove um funil',
                description: 'Exclui um funil customizado (funis do sistema não podem ser removidos)',
                tags: ['Funis'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'funnelId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do funil',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Funil removido com sucesso',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Success' },
                            },
                        },
                    },
                    '404': {
                        description: 'Funil não encontrado ou não pode ser removido',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/funnels/{funnelId}/stages': {
            post: {
                summary: 'Cria um novo stage em um funil',
                description: 'Adiciona uma nova coluna/etapa em um funil existente',
                tags: ['Funis'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'funnelId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do funil',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['name'],
                                properties: {
                                    name: {
                                        type: 'string',
                                        example: 'Prospecção',
                                        description: 'Nome do stage',
                                    },
                                    color: {
                                        type: 'string',
                                        example: '#10B981',
                                        description: 'Cor hexadecimal do stage (padrão: #10B981)',
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Stage criado com sucesso',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/Stage' },
                                    },
                                },
                            },
                        },
                    },
                    '400': {
                        description: 'Nome é obrigatório',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                    '404': {
                        description: 'Funil não encontrado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/stages/{stageId}': {
            put: {
                summary: 'Atualiza um stage',
                description: 'Atualiza nome ou cor de um stage existente',
                tags: ['Funis'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'stageId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do stage',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string', example: 'Qualificação' },
                                    color: { type: 'string', example: '#F59E0B' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Stage atualizado com sucesso',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/Stage' },
                                    },
                                },
                            },
                        },
                    },
                    '404': {
                        description: 'Stage não encontrado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
            delete: {
                summary: 'Remove um stage',
                description: 'Exclui um stage de um funil (todos os cards serão removidos)',
                tags: ['Funis'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'stageId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do stage',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Stage removido com sucesso',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Success' },
                            },
                        },
                    },
                    '404': {
                        description: 'Stage não encontrado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/scheduled-messages': {
            get: {
                summary: 'Lista mensagens agendadas',
                description: 'Retorna todas as mensagens agendadas da conta',
                tags: ['Agendamentos - Mensagens'],
                security: [{ BearerAuth: [] }],
                responses: {
                    '200': {
                        description: 'Lista de mensagens agendadas',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'array',
                                            items: { $ref: '#/components/schemas/ScheduledMessage' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            post: {
                summary: 'Cria uma mensagem agendada',
                description: 'Agenda uma mensagem para ser enviada em uma conversa específica',
                tags: ['Agendamentos - Mensagens'],
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['conversationId', 'message', 'scheduledAt'],
                                properties: {
                                    conversationId: {
                                        type: 'integer',
                                        example: 123,
                                        description: 'ID da conversa do Chatwoot',
                                    },
                                    message: {
                                        type: 'string',
                                        example: 'Olá! Como posso ajudar hoje?',
                                        description: 'Conteúdo da mensagem',
                                    },
                                    scheduledAt: {
                                        type: 'string',
                                        format: 'date-time',
                                        example: '2024-12-31T14:00:00.000Z',
                                        description: 'Data e hora de envio (ISO 8601)',
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Mensagem agendada com sucesso',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/ScheduledMessage' },
                                    },
                                },
                            },
                        },
                    },
                    '400': {
                        description: 'Parâmetros obrigatórios ausentes',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/scheduled-messages/{messageId}': {
            delete: {
                summary: 'Cancela uma mensagem agendada',
                description: 'Remove uma mensagem agendada pendente',
                tags: ['Agendamentos - Mensagens'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'messageId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID da mensagem agendada',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Mensagem cancelada com sucesso',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Success' },
                            },
                        },
                    },
                    '404': {
                        description: 'Mensagem não encontrada ou já foi enviada',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/internal-chats': {
            get: {
                summary: 'Lista chats internos',
                description: 'Retorna todos os chats internos da equipe com última mensagem',
                tags: ['Chat Interno'],
                security: [{ BearerAuth: [] }],
                responses: {
                    '200': {
                        description: 'Lista de chats internos',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'array',
                                            items: { $ref: '#/components/schemas/InternalChat' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/internal-chats/{chatId}/messages': {
            get: {
                summary: 'Lista mensagens de um chat',
                description: 'Retorna todas as mensagens de um chat interno específico',
                tags: ['Chat Interno'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'chatId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do chat',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Lista de mensagens do chat',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'array',
                                            items: { $ref: '#/components/schemas/InternalChatMessage' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    '404': {
                        description: 'Chat não encontrado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
            post: {
                summary: 'Envia uma mensagem em um chat',
                description: 'Envia uma nova mensagem em um chat interno da equipe',
                tags: ['Chat Interno'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'chatId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do chat',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['content'],
                                properties: {
                                    content: {
                                        type: 'string',
                                        example: 'Olá equipe!',
                                        description: 'Conteúdo da mensagem',
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Mensagem enviada com sucesso',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/InternalChatMessage' },
                                    },
                                },
                            },
                        },
                    },
                    '400': {
                        description: 'Conteúdo é obrigatório',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                    '404': {
                        description: 'Chat não encontrado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/chatbot-flows': {
            get: {
                summary: 'Lista todos os flows de chatbot',
                description: 'Retorna todos os flows de automação da conta com contagem de execuções',
                tags: ['Chatbot Flows'],
                security: [{ BearerAuth: [] }],
                responses: {
                    '200': {
                        description: 'Lista de flows retornada com sucesso',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        data: {
                                            type: 'array',
                                            items: { $ref: '#/components/schemas/ChatbotFlow' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    '401': {
                        description: 'Token de autenticação inválido',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                    '500': {
                        description: 'Erro ao buscar flows',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
            post: {
                summary: 'Cria um novo flow de chatbot',
                description: 'Cria um flow de automação com nodes e triggers configuráveis',
                tags: ['Chatbot Flows'],
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['name', 'trigger'],
                                properties: {
                                    name: { type: 'string', example: 'Atendimento Inicial' },
                                    description: { type: 'string', example: 'Flow para primeiras mensagens' },
                                    trigger: {
                                        type: 'object',
                                        required: ['type', 'value'],
                                        properties: {
                                            type: { type: 'string', enum: ['keyword', 'inbox', 'label'], example: 'keyword' },
                                            value: { oneOf: [{ type: 'string' }, { type: 'integer' }], example: 'oi' },
                                        },
                                    },
                                    flowData: {
                                        type: 'object',
                                        properties: {
                                            nodes: { type: 'array', items: { $ref: '#/components/schemas/FlowNode' } },
                                            edges: { type: 'array', items: { $ref: '#/components/schemas/FlowEdge' } },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': {
                        description: 'Flow criado com sucesso',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        data: { $ref: '#/components/schemas/ChatbotFlow' },
                                    },
                                },
                            },
                        },
                    },
                    '400': {
                        description: 'Nome e trigger são obrigatórios ou tipo de trigger inválido',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/chatbot-flows/{id}': {
            get: {
                summary: 'Busca um flow específico',
                description: 'Retorna detalhes completos de um flow de chatbot',
                tags: ['Chatbot Flows'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do flow',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Flow encontrado',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        data: { $ref: '#/components/schemas/ChatbotFlow' },
                                    },
                                },
                            },
                        },
                    },
                    '404': {
                        description: 'Flow não encontrado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
            put: {
                summary: 'Atualiza um flow existente',
                description: 'Atualiza nome, descrição, trigger, flowData ou status de ativação',
                tags: ['Chatbot Flows'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do flow',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string', example: 'Atendimento Atualizado' },
                                    description: { type: 'string', example: 'Nova descrição' },
                                    trigger: {
                                        type: 'object',
                                        properties: {
                                            type: { type: 'string', enum: ['keyword', 'inbox', 'label'] },
                                            value: { oneOf: [{ type: 'string' }, { type: 'integer' }] },
                                        },
                                    },
                                    flowData: {
                                        type: 'object',
                                        properties: {
                                            nodes: { type: 'array', items: { $ref: '#/components/schemas/FlowNode' } },
                                            edges: { type: 'array', items: { $ref: '#/components/schemas/FlowEdge' } },
                                        },
                                    },
                                    isActive: { type: 'boolean', example: true },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Flow atualizado com sucesso',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        data: { $ref: '#/components/schemas/ChatbotFlow' },
                                    },
                                },
                            },
                        },
                    },
                    '404': {
                        description: 'Flow não encontrado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
            delete: {
                summary: 'Deleta um flow',
                description: 'Remove permanentemente um flow de chatbot',
                tags: ['Chatbot Flows'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do flow',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Flow deletado com sucesso',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Success' },
                            },
                        },
                    },
                    '404': {
                        description: 'Flow não encontrado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/chatbot-flows/{id}/activate': {
            patch: {
                summary: 'Ativa ou desativa um flow',
                description: 'Alterna o estado de ativação de um flow de chatbot',
                tags: ['Chatbot Flows'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do flow',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['isActive'],
                                properties: {
                                    isActive: { type: 'boolean', example: true },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Status do flow atualizado',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        data: { $ref: '#/components/schemas/ChatbotFlow' },
                                    },
                                },
                            },
                        },
                    },
                    '400': {
                        description: 'isActive deve ser um booleano',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                    '404': {
                        description: 'Flow não encontrado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/chatbot-flows/{id}/executions': {
            get: {
                summary: 'Lista execuções de um flow',
                description: 'Retorna histórico de execuções de um flow específico com paginação',
                tags: ['Chatbot Flows'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do flow',
                    },
                    {
                        in: 'query',
                        name: 'limit',
                        required: false,
                        schema: { type: 'integer', default: 50 },
                        description: 'Número máximo de resultados',
                    },
                    {
                        in: 'query',
                        name: 'offset',
                        required: false,
                        schema: { type: 'integer', default: 0 },
                        description: 'Offset para paginação',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Lista de execuções',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        data: {
                                            type: 'array',
                                            items: { $ref: '#/components/schemas/FlowExecution' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    '404': {
                        description: 'Flow não encontrado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/chatbot-flows/{id}/test': {
            post: {
                summary: 'Testa um flow manualmente',
                description: 'Enfileira um flow para execução de teste em uma conversa específica',
                tags: ['Chatbot Flows'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do flow',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['conversationId'],
                                properties: {
                                    conversationId: { type: 'integer', example: 123 },
                                    testContext: { type: 'object', example: { message: 'teste' } },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Flow enfileirado para teste',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Flow enfileirado para teste' },
                                        jobId: { type: 'string', example: '123' },
                                    },
                                },
                            },
                        },
                    },
                    '400': {
                        description: 'conversationId é obrigatório',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                    '404': {
                        description: 'Flow não encontrado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/chatbot-flows/executions/{id}/cancel': {
            delete: {
                summary: 'Cancela uma execução em andamento',
                description: 'Cancela uma execução de flow que está em progresso',
                tags: ['Chatbot Flows'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID da execução',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Execução cancelada',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        data: { $ref: '#/components/schemas/FlowExecution' },
                                    },
                                },
                            },
                        },
                    },
                    '400': {
                        description: 'Execução já finalizada',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                    '404': {
                        description: 'Execução não encontrada',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/chatbot-flows/variables': {
            get: {
                summary: 'Lista variáveis customizadas',
                description: 'Retorna todas as variáveis personalizadas para uso nos flows',
                tags: ['Chatbot Flows'],
                security: [{ BearerAuth: [] }],
                responses: {
                    '200': {
                        description: 'Lista de variáveis',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        data: {
                                            type: 'array',
                                            items: { $ref: '#/components/schemas/FlowVariable' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            post: {
                summary: 'Cria uma nova variável',
                description: 'Cria uma variável personalizada para uso nos flows de chatbot',
                tags: ['Chatbot Flows'],
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['name'],
                                properties: {
                                    name: { type: 'string', example: 'empresa_nome' },
                                    defaultValue: { type: 'string', example: 'Minha Empresa' },
                                    description: { type: 'string', example: 'Nome da empresa' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': {
                        description: 'Variável criada',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        data: { $ref: '#/components/schemas/FlowVariable' },
                                    },
                                },
                            },
                        },
                    },
                    '400': {
                        description: 'Nome é obrigatório ou variável já existe',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/chatbot-flows/variables/{id}': {
            put: {
                summary: 'Atualiza uma variável',
                description: 'Atualiza valor padrão e descrição de uma variável',
                tags: ['Chatbot Flows'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID da variável',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    defaultValue: { type: 'string', example: 'Novo valor' },
                                    description: { type: 'string', example: 'Nova descrição' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Variável atualizada',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        data: { $ref: '#/components/schemas/FlowVariable' },
                                    },
                                },
                            },
                        },
                    },
                    '404': {
                        description: 'Variável não encontrada',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
            delete: {
                summary: 'Deleta uma variável',
                description: 'Remove permanentemente uma variável personalizada',
                tags: ['Chatbot Flows'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID da variável',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Variável deletada',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Success' },
                            },
                        },
                    },
                    '404': {
                        description: 'Variável não encontrada',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/sequences': {
            get: {
                summary: 'Lista todas as sequências',
                description: 'Retorna todas as sequências de mensagens da empresa com estatísticas de execução',
                tags: ['Sequências'],
                security: [{ BearerAuth: [] }],
                responses: {
                    '200': {
                        description: 'Lista de sequências',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        data: {
                                            type: 'array',
                                            items: { $ref: '#/components/schemas/Sequence' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            post: {
                summary: 'Cria uma nova sequência',
                description: 'Cria uma nova sequência de mensagens automáticas',
                tags: ['Sequências'],
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['name'],
                                properties: {
                                    name: { type: 'string', example: 'Sequência de Follow-up' },
                                    description: { type: 'string', example: 'Mensagens de acompanhamento em 3 dias', nullable: true },
                                    trigger: { type: 'object', example: { type: 'manual' } },
                                    flowData: {
                                        type: 'object',
                                        properties: {
                                            nodes: { type: 'array', items: { $ref: '#/components/schemas/FlowNode' } },
                                            edges: { type: 'array', items: { $ref: '#/components/schemas/FlowEdge' } },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Sequência criada',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        data: { $ref: '#/components/schemas/Sequence' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/sequences/{id}': {
            get: {
                summary: 'Detalhes de uma sequência',
                description: 'Retorna dados completos de uma sequência incluindo últimas execuções',
                tags: ['Sequências'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID da sequência',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Detalhes da sequência',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        data: { $ref: '#/components/schemas/Sequence' },
                                    },
                                },
                            },
                        },
                    },
                    '404': {
                        description: 'Sequência não encontrada',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
            put: {
                summary: 'Atualiza uma sequência',
                description: 'Atualiza nome, descrição, trigger ou flowData de uma sequência',
                tags: ['Sequências'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID da sequência',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string', example: 'Sequência Atualizada' },
                                    description: { type: 'string', nullable: true },
                                    trigger: { type: 'object' },
                                    flowData: { type: 'object' },
                                    isActive: { type: 'boolean', example: true },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Sequência atualizada',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Success' },
                            },
                        },
                    },
                    '404': {
                        description: 'Sequência não encontrada',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
            delete: {
                summary: 'Remove uma sequência',
                description: 'Remove permanentemente uma sequência e todas as suas execuções',
                tags: ['Sequências'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID da sequência',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Sequência removida',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Success' },
                            },
                        },
                    },
                    '404': {
                        description: 'Sequência não encontrada',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/sequences/{id}/start': {
            post: {
                summary: 'Inicia sequência para um contato',
                description: 'Dispara a sequência para um contato específico através do ID da conversa',
                tags: ['Sequências'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID da sequência',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['contactId'],
                                properties: {
                                    contactId: { type: 'integer', example: 456, description: 'ID do contato no Chatwoot' },
                                    conversationId: { type: 'integer', example: 123, description: 'ID da conversa no Chatwoot (opcional)' },
                                    context: { type: 'object', example: { nome: 'João' }, description: 'Variáveis de contexto para a sequência' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Sequência iniciada',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        executionId: { type: 'integer', example: 42 },
                                    },
                                },
                            },
                        },
                    },
                    '400': {
                        description: 'contactId não fornecido',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                    '404': {
                        description: 'Sequência não encontrada',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/sequences/{id}/executions': {
            get: {
                summary: 'Lista execuções de uma sequência',
                description: 'Retorna execuções agrupadas por contato, com dados do contato (nome, telefone) e status de cada execução',
                tags: ['Sequências'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID da sequência',
                    },
                    {
                        in: 'query',
                        name: 'status',
                        required: false,
                        schema: { type: 'string', enum: ['running', 'completed', 'cancelled', 'failed'] },
                        description: 'Filtrar por status de execução',
                    },
                    {
                        in: 'query',
                        name: 'limit',
                        required: false,
                        schema: { type: 'integer', default: 50 },
                        description: 'Número máximo de contatos a retornar',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Execuções agrupadas por contato',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        data: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    conversationId: { type: 'integer', example: 123 },
                                                    contactPhone: { type: 'string', nullable: true, example: '+5511999998888' },
                                                    contactName: { type: 'string', nullable: true, example: 'João Silva' },
                                                    status: { type: 'string', example: 'running' },
                                                    currentNodeId: { type: 'string', nullable: true, example: 'delay-2' },
                                                    lastUpdated: { type: 'string', format: 'date-time' },
                                                    totalExecutions: { type: 'integer', example: 1 },
                                                    executions: {
                                                        type: 'array',
                                                        items: { $ref: '#/components/schemas/SequenceExecution' },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/sequences/executions/{id}': {
            get: {
                summary: 'Detalhes de uma execução',
                description: 'Retorna detalhes completos de uma execução de sequência incluindo os passos executados',
                tags: ['Sequências'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID da execução',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Detalhes da execução',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        data: { $ref: '#/components/schemas/SequenceExecution' },
                                    },
                                },
                            },
                        },
                    },
                    '404': {
                        description: 'Execução não encontrada',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/sequences/executions/{id}/cancel': {
            post: {
                summary: 'Cancela uma execução',
                description: 'Cancela uma execução em andamento de sequência para um contato',
                tags: ['Sequências'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID da execução',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Execução cancelada',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Success' },
                            },
                        },
                    },
                    '404': {
                        description: 'Execução não encontrada',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/permissions/users': {
            get: {
                summary: 'Lista usuários com permissões',
                description: 'Retorna todos os usuários da empresa com suas permissões de acesso aos módulos',
                tags: ['Permissões'],
                security: [{ BearerAuth: [] }],
                responses: {
                    '200': {
                        description: 'Lista de usuários com permissões',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    id: { type: 'integer' },
                                                    name: { type: 'string' },
                                                    email: { type: 'string' },
                                                    role: { type: 'string' },
                                                    permissions: { $ref: '#/components/schemas/UserResourcePermission' },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/permissions/user/{userId}': {
            get: {
                summary: 'Busca permissões de um usuário',
                description: 'Retorna as permissões de acesso de um usuário específico',
                tags: ['Permissões'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'userId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do usuário',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Permissões do usuário',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/UserResourcePermission' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            put: {
                summary: 'Atualiza permissões de um usuário',
                description: 'Atualiza as permissões de acesso de um usuário específico aos módulos do sistema',
                tags: ['Permissões'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'userId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do usuário',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    kanbanAccess: { type: 'boolean' },
                                    conexoesAccess: { type: 'boolean' },
                                    chatsInternosAccess: { type: 'boolean' },
                                    projectsAccess: { type: 'boolean' },
                                    chatbotFlowsAccess: { type: 'boolean' },
                                    permissoesAccess: { type: 'boolean' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Permissões atualizadas',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/UserResourcePermission' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/permissions/me': {
            get: {
                summary: 'Permissões do usuário logado',
                description: 'Retorna as permissões do usuário autenticado',
                tags: ['Permissões'],
                security: [{ BearerAuth: [] }],
                responses: {
                    '200': {
                        description: 'Permissões do usuário',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/UserResourcePermission' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/permissions/resources': {
            get: {
                summary: 'Lista recursos disponíveis',
                description: 'Retorna lista de recursos/módulos disponíveis para gerenciamento de permissões',
                tags: ['Permissões'],
                security: [{ BearerAuth: [] }],
                responses: {
                    '200': {
                        description: 'Lista de recursos',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    key: { type: 'string', example: 'kanbanAccess' },
                                                    name: { type: 'string', example: 'Kanban' },
                                                    description: { type: 'string', example: 'Acesso ao quadro Kanban' },
                                                    icon: { type: 'string', example: '📊' },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/account-permissions': {
            get: {
                summary: 'Lista permissões de todas as empresas (Super Admin)',
                description: 'Retorna todas as empresas com suas permissões de módulos habilitados.\n\n**Autenticação aceita:**\n- API Token KanbanCW com escopo `account-permissions:read` ou `account-permissions:write` (header `Authorization: Bearer <token>`)\n- Sessão de Super Admin (JWT do Chatwoot via headers `access-token` / `client` / `uid`)\n\n> **Nota:** O header `X-Account-ID` é ignorado neste endpoint — ele sempre retorna todas as empresas.',
                tags: ['Permissões de Conta'],
                security: [{ BearerAuth: [] }],
                responses: {
                    '200': {
                        description: 'Lista de empresas com permissões',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        data: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    id: { type: 'integer' },
                                                    name: { type: 'string' },
                                                    status: { type: 'string' },
                                                    permissions: { $ref: '#/components/schemas/AccountPermissions' },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    '403': {
                        description: 'Acesso negado (apenas Super Admin)',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/account-permissions/{accountId}': {
            put: {
                summary: 'Atualiza permissões de uma empresa (Super Admin)',
                description: 'Atualiza quais módulos estão habilitados para uma empresa específica.\n\n**Atualização parcial:** envie apenas os campos que deseja alterar — os demais mantêm o valor atual.\n\n**Autenticação aceita:**\n- API Token KanbanCW com escopo `account-permissions:write` (`Authorization: Bearer <token>`)\n- Sessão de Super Admin (JWT do Chatwoot)',
                tags: ['Permissões de Conta'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'accountId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID da empresa',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    kanbanEnabled: { type: 'boolean', description: 'Habilita o módulo Kanban', example: true },
                                    chatsInternosEnabled: { type: 'boolean', description: 'Habilita Chats Internos', example: true },
                                    conexoesEnabled: { type: 'boolean', description: 'Habilita Conexões (instâncias WhatsApp)', example: true },
                                    projectsEnabled: { type: 'boolean', description: 'Habilita Projetos', example: true },
                                    chatbotFlowsEnabled: { type: 'boolean', description: 'Habilita Chatbot Flows', example: true },
                                    wavoipEnabled: { type: 'boolean', description: 'Habilita Chamadas WhatsApp (Wavoip)', example: false },
                                    appointmentsEnabled: { type: 'boolean', description: 'Habilita módulo Atendimentos', example: true },
                                    disparadorEnabled: { type: 'boolean', description: 'Habilita o Disparador (campanhas em massa)', example: true },
                                    allowedProviders: {
                                        type: 'object',
                                        description: 'Provedores WhatsApp permitidos (true = habilitado, false = bloqueado)',
                                        properties: {
                                            evolution: { type: 'boolean', example: true },
                                            waha: { type: 'boolean', example: true },
                                            uazapi: { type: 'boolean', example: false },
                                        },
                                        example: { evolution: true, waha: true, uazapi: false },
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Permissões atualizadas',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        data: { $ref: '#/components/schemas/AccountPermissions' },
                                    },
                                },
                            },
                        },
                    },
                    '403': {
                        description: 'Acesso negado (apenas Super Admin)',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/account-permissions/check/{accountId}': {
            get: {
                summary: 'Verifica permissões de uma empresa',
                description: 'Retorna as permissões de módulos habilitados para uma empresa específica',
                tags: ['Permissões de Conta'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'accountId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID da empresa',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Permissões da empresa',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        data: {
                                            type: 'object',
                                            properties: {
                                                kanbanEnabled: { type: 'boolean' },
                                                chatsInternosEnabled: { type: 'boolean' },
                                                conexoesEnabled: { type: 'boolean' },
                                                projectsEnabled: { type: 'boolean' },
                                                chatbotFlowsEnabled: { type: 'boolean' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        // ── API Tokens ────────────────────────────────────────────────────────────
        '/api-tokens': {
            get: {
                summary: 'Lista todos os API Tokens da empresa',
                description: 'Retorna todos os tokens de API criados para a empresa autenticada',
                tags: ['API Tokens'],
                security: [{ ApiAccessToken: [] }],
                responses: {
                    '200': {
                        description: 'Lista de tokens',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        data: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    id: { type: 'integer' },
                                                    name: { type: 'string' },
                                                    token: { type: 'string' },
                                                    permissions: { type: 'array', items: { type: 'string' } },
                                                    isActive: { type: 'boolean' },
                                                    lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
                                                    expiresAt: { type: 'string', format: 'date-time', nullable: true },
                                                    createdAt: { type: 'string', format: 'date-time' },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            post: {
                summary: 'Cria um novo API Token',
                description: 'Cria um token de API com escopos específicos.\n\n**Escopos disponíveis:**\n- `*` — Acesso total\n- `kanban:read`, `kanban:write` — Kanban\n- `funnels:read`, `funnels:write`, `funnels:delete` — Funis\n- `projects:read`, `projects:write`, `projects:delete` — Projetos\n- `chatbot:read`, `chatbot:write`, `chatbot:execute` — Chatbot Flows\n- `sequences:read`, `sequences:write`, `sequences:execute` — Sequências\n- `connections:read`, `connections:write` — Conexões WhatsApp\n- `calendar:read`, `calendar:write`, `calendar:delete` — Agendamentos\n- `admin:read`, `admin:write` — Administração\n- `account-permissions:read`, `account-permissions:write` — Permissões de empresa (**Super Admin apenas**)',
                tags: ['API Tokens'],
                security: [{ ApiAccessToken: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['name', 'permissions'],
                                properties: {
                                    name: { type: 'string', example: 'Token Integração CRM', description: 'Nome descritivo do token' },
                                    permissions: {
                                        type: 'array',
                                        items: { type: 'string' },
                                        example: ['account-permissions:write'],
                                        description: 'Lista de escopos. account-permissions:* requer Super Admin',
                                    },
                                    expiresAt: { type: 'string', format: 'date-time', nullable: true, description: 'Data de expiração (opcional)' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Token criado',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                id: { type: 'integer' },
                                                name: { type: 'string' },
                                                token: { type: 'string', description: 'UUID do token — salve, não será exibido novamente' },
                                                permissions: { type: 'array', items: { type: 'string' } },
                                                isActive: { type: 'boolean' },
                                                expiresAt: { type: 'string', format: 'date-time', nullable: true },
                                                createdAt: { type: 'string', format: 'date-time' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    '403': {
                        description: 'Super Admin necessário para escopos account-permissions',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
                    },
                },
            },
        },
        '/api-tokens/{id}': {
            put: {
                summary: 'Atualiza um API Token',
                description: 'Atualiza nome, permissões, status ou expiração de um token existente',
                tags: ['API Tokens'],
                security: [{ ApiAccessToken: [] }],
                parameters: [
                    { in: 'path', name: 'id', required: true, schema: { type: 'integer' }, description: 'ID do token' },
                ],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    permissions: { type: 'array', items: { type: 'string' } },
                                    isActive: { type: 'boolean' },
                                    expiresAt: { type: 'string', format: 'date-time', nullable: true },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Token atualizado', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object' } } } } } },
                    '404': { description: 'Token não encontrado' },
                },
            },
            delete: {
                summary: 'Remove um API Token',
                description: 'Deleta permanentemente um token de API',
                tags: ['API Tokens'],
                security: [{ ApiAccessToken: [] }],
                parameters: [
                    { in: 'path', name: 'id', required: true, schema: { type: 'integer' }, description: 'ID do token' },
                ],
                responses: {
                    '200': { description: 'Token removido', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' } } } } } },
                    '404': { description: 'Token não encontrado' },
                },
            },
        },
        '/api-tokens/permissions/available': {
            get: {
                summary: 'Lista escopos disponíveis para API Tokens',
                description: 'Retorna todos os escopos de permissão que podem ser atribuídos a um API Token',
                tags: ['API Tokens'],
                security: [],
                responses: {
                    '200': {
                        description: 'Lista de escopos',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            value: { type: 'string', example: 'account-permissions:write' },
                                            label: { type: 'string', example: 'Permissões de Empresa: Escrita' },
                                            description: { type: 'string', example: 'Habilitar/desabilitar módulos por empresa (requer Super Admin)' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/projects': {
            get: {
                summary: 'Lista todos os projetos',
                description: 'Retorna todos os projetos da empresa com contagem de conversas vinculadas',
                tags: ['Projetos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'query',
                        name: 'status',
                        schema: { type: 'string', enum: ['active', 'completed', 'cancelled'] },
                        description: 'Filtrar por status do projeto',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Lista de projetos',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'array',
                                            items: { $ref: '#/components/schemas/Project' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            post: {
                summary: 'Cria um novo projeto',
                description: 'Cria um novo projeto para organização de conversas e tarefas',
                tags: ['Projetos'],
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['name'],
                                properties: {
                                    name: { type: 'string', example: 'Projeto MVP 2024' },
                                    description: { type: 'string', example: 'Desenvolvimento do MVP' },
                                    status: { type: 'string', enum: ['active', 'completed', 'cancelled'], default: 'active' },
                                    deadline: { type: 'string', format: 'date-time' },
                                    color: { type: 'string', example: '#3B82F6' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Projeto criado',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/Project' },
                                    },
                                },
                            },
                        },
                    },
                    '400': {
                        description: 'Nome do projeto é obrigatório',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/projects/{id}': {
            get: {
                summary: 'Busca um projeto específico',
                description: 'Retorna detalhes de um projeto incluindo conversas vinculadas e estatísticas',
                tags: ['Projetos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do projeto',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Projeto encontrado',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/Project' },
                                    },
                                },
                            },
                        },
                    },
                    '404': {
                        description: 'Projeto não encontrado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
            put: {
                summary: 'Atualiza um projeto',
                description: 'Atualiza informações de um projeto existente',
                tags: ['Projetos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do projeto',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    description: { type: 'string' },
                                    status: { type: 'string', enum: ['active', 'completed', 'cancelled'] },
                                    deadline: { type: 'string', format: 'date-time' },
                                    color: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Projeto atualizado',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/Project' },
                                    },
                                },
                            },
                        },
                    },
                    '404': {
                        description: 'Projeto não encontrado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
            delete: {
                summary: 'Deleta um projeto',
                description: 'Remove um projeto e todas as suas vinculações (cascata)',
                tags: ['Projetos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do projeto',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Projeto deletado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Success' },
                            },
                        },
                    },
                    '404': {
                        description: 'Projeto não encontrado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/projects/{id}/details': {
            get: {
                summary: 'Busca projeto com todas as relações',
                description: 'Retorna projeto com todas as relações (tasks, milestones, members, files, discussions, activities)',
                tags: ['Projetos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do projeto',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Detalhes completos do projeto',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/Project' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/projects/{id}/stats': {
            get: {
                summary: 'Busca estatísticas do projeto',
                description: 'Retorna estatísticas completas do projeto (tarefas, milestones, membros, arquivos, progresso)',
                tags: ['Projetos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do projeto',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Estatísticas do projeto',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/ProjectStats' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/projects/{id}/conversations/{conversationId}': {
            post: {
                summary: 'Vincula conversa ao projeto',
                description: 'Associa uma conversa do Kanban a um projeto',
                tags: ['Projetos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do projeto',
                    },
                    {
                        in: 'path',
                        name: 'conversationId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID da conversa',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Conversa vinculada ao projeto',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Success' },
                            },
                        },
                    },
                    '400': {
                        description: 'Conversa já vinculada ao projeto',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
            delete: {
                summary: 'Remove vinculação de conversa',
                description: 'Remove a associação de uma conversa com o projeto',
                tags: ['Projetos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do projeto',
                    },
                    {
                        in: 'path',
                        name: 'conversationId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID da conversa',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Conversa desvinculada do projeto',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Success' },
                            },
                        },
                    },
                },
            },
        },
        '/projects/{projectId}/tasks': {
            get: {
                summary: 'Lista todas as tarefas do projeto',
                description: `Retorna todas as tarefas do projeto com milestones associados.

**Acesso via API Token (Bearer):** Use \`/api/v1/projects/{projectId}/tasks\` com \`Authorization: Bearer SEU_TOKEN\`

**Filtros disponíveis:** \`status\`, \`milestoneId\`, \`assignedTo\``,
                tags: ['Tarefas de Projeto'],
                security: [{ BearerAuth: [] }, { ApiAccessToken: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'projectId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do projeto',
                    },
                    {
                        in: 'query',
                        name: 'status',
                        schema: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
                        description: 'Filtra por status da tarefa',
                    },
                    {
                        in: 'query',
                        name: 'milestoneId',
                        schema: { type: 'integer' },
                        description: 'Filtra pelo ID do milestone/marco',
                    },
                    {
                        in: 'query',
                        name: 'assignedTo',
                        schema: { type: 'integer' },
                        description: 'Filtra pelo userId do responsável (Chatwoot)',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Lista de tarefas',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'array',
                                            items: { $ref: '#/components/schemas/ProjectTask' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            post: {
                summary: 'Cria uma nova tarefa',
                description: `Adiciona uma nova tarefa ao projeto.

**Via API Token:** \`POST /api/v1/projects/{projectId}/tasks\` com \`Authorization: Bearer SEU_TOKEN\`

**Status válidos:** \`pending\`, \`in_progress\`, \`completed\`

**Prioridades:** \`low\`, \`medium\`, \`high\`, \`urgent\``,
                tags: ['Tarefas de Projeto'],
                security: [{ BearerAuth: [] }, { ApiAccessToken: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'projectId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do projeto',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['title'],
                                properties: {
                                    title: { type: 'string', minLength: 3, example: 'Revisar código do backend' },
                                    description: { type: 'string' },
                                    status: { type: 'string', enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
                                    priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
                                    dueDate: { type: 'string', format: 'date-time' },
                                    milestoneId: { type: 'integer' },
                                    assignedTo: { type: 'integer' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Tarefa criada',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/ProjectTask' },
                                    },
                                },
                            },
                        },
                    },
                    '400': {
                        description: 'Título é obrigatório (mínimo 3 caracteres)',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/projects/{projectId}/tasks/{id}': {
            put: {
                summary: 'Atualiza uma tarefa',
                description: 'Atualiza informações de uma tarefa existente',
                tags: ['Tarefas de Projeto'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'projectId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do projeto',
                    },
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID da tarefa',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    title: { type: 'string' },
                                    description: { type: 'string' },
                                    status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
                                    priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
                                    dueDate: { type: 'string', format: 'date-time' },
                                    milestoneId: { type: 'integer' },
                                    assignedTo: { type: 'integer' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Tarefa atualizada',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/ProjectTask' },
                                    },
                                },
                            },
                        },
                    },
                    '404': {
                        description: 'Tarefa não encontrada',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
            delete: {
                summary: 'Deleta uma tarefa',
                description: 'Remove uma tarefa do projeto',
                tags: ['Tarefas de Projeto'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'projectId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do projeto',
                    },
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID da tarefa',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Tarefa deletada',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Success' },
                            },
                        },
                    },
                    '404': {
                        description: 'Tarefa não encontrada',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/projects/{projectId}/tasks/{id}/status': {
            patch: {
                summary: 'Atualiza status da tarefa',
                description: 'Atualiza apenas o status de uma tarefa (pending, in_progress, completed)',
                tags: ['Tarefas de Projeto'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'projectId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do projeto',
                    },
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID da tarefa',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['status'],
                                properties: {
                                    status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Status atualizado',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/ProjectTask' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/projects/{projectId}/tasks/{id}/move': {
            patch: {
                summary: 'Move tarefa para outro milestone',
                description: 'Move uma tarefa para outro milestone ou remove o milestone',
                tags: ['Tarefas de Projeto'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'projectId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do projeto',
                    },
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID da tarefa',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    milestoneId: { type: 'integer', nullable: true, description: 'ID do milestone destino (null para remover)' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Tarefa movida',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/ProjectTask' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/projects/{projectId}/milestones': {
            get: {
                summary: 'Lista todos os milestones do projeto',
                description: 'Retorna todos os milestones/marcos do projeto com estatísticas de tarefas',
                tags: ['Milestones de Projeto'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'projectId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do projeto',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Lista de milestones',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'array',
                                            items: { $ref: '#/components/schemas/ProjectMilestone' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            post: {
                summary: 'Cria um novo milestone',
                description: 'Adiciona um novo marco ao projeto',
                tags: ['Milestones de Projeto'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'projectId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do projeto',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['name'],
                                properties: {
                                    name: { type: 'string', example: 'Planejamento' },
                                    description: { type: 'string' },
                                    dueDate: { type: 'string', format: 'date-time' },
                                    order: { type: 'integer', default: 0 },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Milestone criado',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/ProjectMilestone' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/projects/{projectId}/milestones/{id}': {
            put: {
                summary: 'Atualiza um milestone',
                description: 'Atualiza informações de um milestone existente',
                tags: ['Milestones de Projeto'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'projectId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do projeto',
                    },
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do milestone',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    description: { type: 'string' },
                                    dueDate: { type: 'string', format: 'date-time' },
                                    order: { type: 'integer' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Milestone atualizado',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/ProjectMilestone' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            delete: {
                summary: 'Deleta um milestone',
                description: 'Remove um milestone (tarefas passam a ficar sem milestone)',
                tags: ['Milestones de Projeto'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'projectId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do projeto',
                    },
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do milestone',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Milestone deletado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Success' },
                            },
                        },
                    },
                },
            },
        },
        '/projects/{projectId}/members': {
            get: {
                summary: 'Lista membros do projeto',
                description: 'Retorna todos os membros da equipe do projeto com dados do Chatwoot',
                tags: ['Membros de Projeto'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'projectId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do projeto',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Lista de membros',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'array',
                                            items: { $ref: '#/components/schemas/ProjectMember' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            post: {
                summary: 'Adiciona membro ao projeto',
                description: 'Adiciona um usuário à equipe do projeto',
                tags: ['Membros de Projeto'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'projectId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do projeto',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['userId'],
                                properties: {
                                    userId: { type: 'integer', example: 5 },
                                    role: { type: 'string', enum: ['manager', 'member'], default: 'member' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Membro adicionado',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/ProjectMember' },
                                    },
                                },
                            },
                        },
                    },
                    '400': {
                        description: 'Usuário já é membro ou não existe no Chatwoot',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/projects/{projectId}/members/{id}': {
            put: {
                summary: 'Atualiza papel do membro',
                description: 'Altera o papel de um membro (manager ou member)',
                tags: ['Membros de Projeto'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'projectId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do projeto',
                    },
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do membro',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['role'],
                                properties: {
                                    role: { type: 'string', enum: ['manager', 'member'] },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Papel atualizado',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/ProjectMember' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            delete: {
                summary: 'Remove membro do projeto',
                description: 'Remove um usuário da equipe do projeto',
                tags: ['Membros de Projeto'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'projectId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do projeto',
                    },
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do membro',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Membro removido',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Success' },
                            },
                        },
                    },
                },
            },
        },
        '/projects/{projectId}/files': {
            get: {
                summary: 'Lista arquivos do projeto',
                description: 'Retorna todos os arquivos do projeto com informações de uploader',
                tags: ['Arquivos de Projeto'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'projectId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do projeto',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Lista de arquivos',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'array',
                                            items: { $ref: '#/components/schemas/ProjectFile' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            post: {
                summary: 'Upload de arquivo',
                description: 'Faz upload de um arquivo para o projeto (máximo 50MB)',
                tags: ['Arquivos de Projeto'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'projectId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do projeto',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'multipart/form-data': {
                            schema: {
                                type: 'object',
                                required: ['file'],
                                properties: {
                                    file: { type: 'string', format: 'binary', description: 'Arquivo para upload (máximo 50MB)' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Arquivo enviado',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/ProjectFile' },
                                    },
                                },
                            },
                        },
                    },
                    '400': {
                        description: 'Arquivo não fornecido ou excede 50MB',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/projects/{projectId}/files/{id}/download': {
            get: {
                summary: 'Download de arquivo',
                description: 'Faz download de um arquivo do projeto',
                tags: ['Arquivos de Projeto'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'projectId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do projeto',
                    },
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do arquivo',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Arquivo retornado para download',
                        content: {
                            'application/octet-stream': {
                                schema: {
                                    type: 'string',
                                    format: 'binary',
                                },
                            },
                        },
                    },
                    '404': {
                        description: 'Arquivo não encontrado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/projects/{projectId}/files/{id}': {
            delete: {
                summary: 'Deleta um arquivo',
                description: 'Remove um arquivo do projeto (banco e filesystem)',
                tags: ['Arquivos de Projeto'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'projectId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do projeto',
                    },
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do arquivo',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Arquivo deletado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Success' },
                            },
                        },
                    },
                },
            },
        },
        '/projects/{projectId}/discussions': {
            get: {
                summary: 'Lista discussões do projeto',
                description: 'Retorna todas as discussões do projeto com comentários',
                tags: ['Discussões de Projeto'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'projectId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do projeto',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Lista de discussões',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'array',
                                            items: { $ref: '#/components/schemas/ProjectDiscussion' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            post: {
                summary: 'Cria uma discussão',
                description: 'Inicia uma nova discussão no projeto',
                tags: ['Discussões de Projeto'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'projectId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do projeto',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['subject'],
                                properties: {
                                    subject: { type: 'string', example: 'Reunião de kickoff' },
                                    description: { type: 'string', example: 'Discutir escopo do projeto' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Discussão criada',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/ProjectDiscussion' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/projects/{projectId}/discussions/{id}': {
            put: {
                summary: 'Atualiza uma discussão',
                description: 'Atualiza informações de uma discussão existente',
                tags: ['Discussões de Projeto'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'projectId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do projeto',
                    },
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID da discussão',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    subject: { type: 'string' },
                                    description: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Discussão atualizada',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/ProjectDiscussion' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            delete: {
                summary: 'Deleta uma discussão',
                description: 'Remove uma discussão e todos os seus comentários',
                tags: ['Discussões de Projeto'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'projectId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do projeto',
                    },
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID da discussão',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Discussão deletada',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Success' },
                            },
                        },
                    },
                },
            },
        },
        '/projects/{projectId}/discussions/{id}/comments': {
            post: {
                summary: 'Adiciona comentário à discussão',
                description: 'Adiciona um novo comentário a uma discussão existente',
                tags: ['Discussões de Projeto'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'projectId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do projeto',
                    },
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID da discussão',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['content'],
                                properties: {
                                    content: { type: 'string', example: 'Concordo com a proposta' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Comentário adicionado',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/ProjectComment' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/projects/{projectId}/discussions/{discussionId}/comments/{id}': {
            delete: {
                summary: 'Deleta um comentário',
                description: 'Remove um comentário de uma discussão',
                tags: ['Discussões de Projeto'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'projectId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do projeto',
                    },
                    {
                        in: 'path',
                        name: 'discussionId',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID da discussão',
                    },
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID do comentário',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Comentário deletado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Success' },
                            },
                        },
                    },
                },
            },
        },
        // ── Agendamentos (Módulo Clínica/Agenda) ──────────────────────────────────
        // Appointments
        '/appointments': {
            servers: [{ url: '/api', description: 'Módulo de Agendamentos' }],
            get: {
                summary: 'Lista agendamentos',
                description: 'Retorna agendamentos com filtros opcionais por data, profissional, status ou paciente',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    { in: 'query', name: 'date', schema: { type: 'string', format: 'date' }, description: 'Filtrar por data (YYYY-MM-DD)' },
                    { in: 'query', name: 'practitionerId', schema: { type: 'integer' }, description: 'Filtrar por profissional' },
                    { in: 'query', name: 'status', schema: { type: 'string', enum: ['scheduled', 'confirmed', 'waiting', 'in_progress', 'completed', 'missed', 'cancelled'] }, description: 'Filtrar por status' },
                    { in: 'query', name: 'patientId', schema: { type: 'integer' }, description: 'Filtrar por paciente' },
                    { in: 'query', name: 'page', schema: { type: 'integer', default: 1 }, description: 'Página' },
                    { in: 'query', name: 'limit', schema: { type: 'integer', default: 50 }, description: 'Itens por página' },
                ],
                responses: {
                    '200': { description: 'Lista de agendamentos', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '500': { description: 'Erro interno' },
                },
            },
            post: {
                summary: 'Cria agendamento',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['patientId', 'practitionerId', 'serviceId', 'appointmentAt'],
                                properties: {
                                    patientId: { type: 'integer' },
                                    practitionerId: { type: 'integer' },
                                    serviceId: { type: 'integer' },
                                    appointmentAt: { type: 'string', format: 'date-time' },
                                    healthPlanId: { type: 'integer' },
                                    notes: { type: 'string' },
                                    price: { type: 'number' },
                                    location: { type: 'string' },
                                    createdBy: { type: 'integer' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Agendamento criado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '400': { description: 'Parâmetros inválidos' },
                    '401': { description: 'Não autenticado' },
                    '409': { description: 'Conflito de horário' },
                    '500': { description: 'Erro interno' },
                },
            },
        },
        '/appointments/calendar': {
            servers: [{ url: '/api', description: 'Módulo de Agendamentos' }],
            get: {
                summary: 'Calendário de agendamentos',
                description: 'Retorna agendamentos em formato otimizado para visualização de calendário (semana/mês)',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    { in: 'query', name: 'startDate', required: true, schema: { type: 'string', format: 'date-time' }, description: 'Data/hora inicial' },
                    { in: 'query', name: 'endDate', required: true, schema: { type: 'string', format: 'date-time' }, description: 'Data/hora final' },
                    { in: 'query', name: 'practitionerId', schema: { type: 'integer' }, description: 'Filtrar por profissional' },
                    { in: 'query', name: 'serviceId', schema: { type: 'integer' }, description: 'Filtrar por serviço' },
                ],
                responses: {
                    '200': { description: 'Agendamentos para o calendário', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '400': { description: 'startDate e endDate são obrigatórios' },
                    '401': { description: 'Não autenticado' },
                    '500': { description: 'Erro interno' },
                },
            },
        },
        '/appointments/{appointmentId}': {
            servers: [{ url: '/api', description: 'Módulo de Agendamentos' }],
            get: {
                summary: 'Busca agendamento por ID',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    { in: 'path', name: 'appointmentId', required: true, schema: { type: 'integer' }, description: 'ID do agendamento' },
                ],
                responses: {
                    '200': { description: 'Dados do agendamento', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '404': { description: 'Agendamento não encontrado' },
                    '500': { description: 'Erro interno' },
                },
            },
            put: {
                summary: 'Atualiza agendamento',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    { in: 'path', name: 'appointmentId', required: true, schema: { type: 'integer' }, description: 'ID do agendamento' },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    appointmentAt: { type: 'string', format: 'date-time' },
                                    endsAt: { type: 'string', format: 'date-time' },
                                    practitionerId: { type: 'integer' },
                                    serviceId: { type: 'integer' },
                                    healthPlanId: { type: 'integer' },
                                    notes: { type: 'string' },
                                    price: { type: 'number' },
                                    location: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Agendamento atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '404': { description: 'Agendamento não encontrado' },
                    '500': { description: 'Erro interno' },
                },
            },
            delete: {
                summary: 'Cancela agendamento',
                description: 'Cancela o agendamento (soft delete: status → cancelled)',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    { in: 'path', name: 'appointmentId', required: true, schema: { type: 'integer' }, description: 'ID do agendamento' },
                ],
                responses: {
                    '200': { description: 'Agendamento cancelado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '404': { description: 'Agendamento não encontrado' },
                    '500': { description: 'Erro interno' },
                },
            },
        },
        '/appointments/{appointmentId}/status': {
            servers: [{ url: '/api', description: 'Módulo de Agendamentos' }],
            patch: {
                summary: 'Atualiza status do agendamento',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    { in: 'path', name: 'appointmentId', required: true, schema: { type: 'integer' }, description: 'ID do agendamento' },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['status'],
                                properties: {
                                    status: { type: 'string', enum: ['scheduled', 'confirmed', 'waiting', 'in_progress', 'completed', 'missed', 'cancelled'] },
                                    cancelReason: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Status atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '400': { description: 'Status inválido' },
                    '401': { description: 'Não autenticado' },
                    '404': { description: 'Agendamento não encontrado' },
                    '500': { description: 'Erro interno' },
                },
            },
        },
        // Patients
        '/appointments/patients': {
            servers: [{ url: '/api', description: 'Módulo de Agendamentos' }],
            get: {
                summary: 'Lista pacientes',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    { in: 'query', name: 'search', schema: { type: 'string' }, description: 'Busca por nome, telefone ou CPF' },
                    { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
                    { in: 'query', name: 'limit', schema: { type: 'integer', default: 50 } },
                ],
                responses: {
                    '200': { description: 'Lista de pacientes', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '500': { description: 'Erro interno' },
                },
            },
            post: {
                summary: 'Cria paciente',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['name', 'phone'],
                                properties: {
                                    name: { type: 'string' },
                                    phone: { type: 'string' },
                                    email: { type: 'string', format: 'email' },
                                    cpf: { type: 'string' },
                                    birthDate: { type: 'string', format: 'date' },
                                    address: { type: 'string' },
                                    healthPlanId: { type: 'integer' },
                                    notes: { type: 'string' },
                                    chatwootContactId: { type: 'integer' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Paciente criado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '400': { description: 'Parâmetros inválidos' },
                    '401': { description: 'Não autenticado' },
                    '500': { description: 'Erro interno' },
                },
            },
        },
        '/appointments/patients/by-phone/{phone}': {
            servers: [{ url: '/api', description: 'Módulo de Agendamentos' }],
            get: {
                summary: 'Busca paciente por telefone',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    { in: 'path', name: 'phone', required: true, schema: { type: 'string' }, description: 'Número de telefone (dígitos)' },
                ],
                responses: {
                    '200': { description: 'Dados do paciente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '500': { description: 'Erro interno' },
                },
            },
        },
        '/appointments/patients/{patientId}': {
            servers: [{ url: '/api', description: 'Módulo de Agendamentos' }],
            get: {
                summary: 'Busca paciente por ID',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    { in: 'path', name: 'patientId', required: true, schema: { type: 'integer' }, description: 'ID do paciente' },
                ],
                responses: {
                    '200': { description: 'Dados do paciente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '404': { description: 'Paciente não encontrado' },
                    '500': { description: 'Erro interno' },
                },
            },
            put: {
                summary: 'Atualiza paciente',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    { in: 'path', name: 'patientId', required: true, schema: { type: 'integer' }, description: 'ID do paciente' },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    phone: { type: 'string' },
                                    email: { type: 'string', format: 'email' },
                                    cpf: { type: 'string' },
                                    birthDate: { type: 'string', format: 'date' },
                                    address: { type: 'string' },
                                    healthPlanId: { type: 'integer' },
                                    notes: { type: 'string' },
                                    chatwootContactId: { type: 'integer' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Paciente atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '404': { description: 'Paciente não encontrado' },
                    '500': { description: 'Erro interno' },
                },
            },
            delete: {
                summary: 'Remove paciente',
                description: 'Remove paciente permanentemente (requer Admin)',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    { in: 'path', name: 'patientId', required: true, schema: { type: 'integer' }, description: 'ID do paciente' },
                ],
                responses: {
                    '200': { description: 'Paciente removido', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '403': { description: 'Requer Admin' },
                    '404': { description: 'Paciente não encontrado' },
                    '500': { description: 'Erro interno' },
                },
            },
        },
        // Practitioners
        '/appointments/practitioners': {
            servers: [{ url: '/api', description: 'Módulo de Agendamentos' }],
            get: {
                summary: 'Lista profissionais',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                responses: {
                    '200': { description: 'Lista de profissionais', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '500': { description: 'Erro interno' },
                },
            },
            post: {
                summary: 'Cria profissional',
                description: 'Cria um novo profissional (requer Admin)',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['name'],
                                properties: {
                                    name: { type: 'string' },
                                    specialty: { type: 'string' },
                                    registrationNo: { type: 'string' },
                                    email: { type: 'string', format: 'email' },
                                    phone: { type: 'string' },
                                    color: { type: 'string', example: '#6366F1' },
                                    workingHours: { type: 'array', items: { type: 'object' }, description: 'Horários de trabalho por dia da semana' },
                                    bufferMinutes: { type: 'integer', default: 0 },
                                    lunchStart: { type: 'string', example: '12:00' },
                                    lunchEnd: { type: 'string', example: '13:00' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Profissional criado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '400': { description: 'Parâmetros inválidos' },
                    '401': { description: 'Não autenticado' },
                    '403': { description: 'Requer Admin' },
                    '500': { description: 'Erro interno' },
                },
            },
        },
        '/appointments/practitioners/{practitionerId}': {
            servers: [{ url: '/api', description: 'Módulo de Agendamentos' }],
            get: {
                summary: 'Busca profissional por ID',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    { in: 'path', name: 'practitionerId', required: true, schema: { type: 'integer' }, description: 'ID do profissional' },
                ],
                responses: {
                    '200': { description: 'Dados do profissional', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '404': { description: 'Profissional não encontrado' },
                    '500': { description: 'Erro interno' },
                },
            },
            put: {
                summary: 'Atualiza profissional',
                description: 'Requer Admin',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    { in: 'path', name: 'practitionerId', required: true, schema: { type: 'integer' }, description: 'ID do profissional' },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    specialty: { type: 'string' },
                                    registrationNo: { type: 'string' },
                                    email: { type: 'string', format: 'email' },
                                    phone: { type: 'string' },
                                    color: { type: 'string' },
                                    workingHours: { type: 'array', items: { type: 'object' } },
                                    bufferMinutes: { type: 'integer' },
                                    lunchStart: { type: 'string' },
                                    lunchEnd: { type: 'string' },
                                    isActive: { type: 'boolean' },
                                    serviceIds: { type: 'array', items: { type: 'integer' } },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Profissional atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '403': { description: 'Requer Admin' },
                    '404': { description: 'Profissional não encontrado' },
                    '500': { description: 'Erro interno' },
                },
            },
            delete: {
                summary: 'Desativa profissional',
                description: 'Soft delete: marca isActive=false (requer Admin)',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    { in: 'path', name: 'practitionerId', required: true, schema: { type: 'integer' }, description: 'ID do profissional' },
                ],
                responses: {
                    '200': { description: 'Profissional desativado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '403': { description: 'Requer Admin' },
                    '404': { description: 'Profissional não encontrado' },
                    '500': { description: 'Erro interno' },
                },
            },
        },
        '/appointments/practitioners/{practitionerId}/slots': {
            servers: [{ url: '/api', description: 'Módulo de Agendamentos' }],
            get: {
                summary: 'Slots disponíveis do profissional',
                description: 'Retorna horários disponíveis para um profissional em uma data específica',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    { in: 'path', name: 'practitionerId', required: true, schema: { type: 'integer' }, description: 'ID do profissional' },
                    { in: 'query', name: 'date', required: true, schema: { type: 'string', format: 'date' }, description: 'Data no formato YYYY-MM-DD' },
                    { in: 'query', name: 'serviceId', schema: { type: 'integer' }, description: 'ID do serviço (para calcular duração correta)' },
                ],
                responses: {
                    '200': { description: 'Lista de slots disponíveis', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '400': { description: 'date é obrigatório' },
                    '401': { description: 'Não autenticado' },
                    '404': { description: 'Profissional não encontrado' },
                    '500': { description: 'Erro interno' },
                },
            },
        },
        '/appointments/practitioners/{practitionerId}/blocks': {
            servers: [{ url: '/api', description: 'Módulo de Agendamentos' }],
            post: {
                summary: 'Cria bloqueio de agenda',
                description: 'Bloqueia um período na agenda do profissional (requer Admin)',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    { in: 'path', name: 'practitionerId', required: true, schema: { type: 'integer' }, description: 'ID do profissional' },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['startsAt', 'endsAt'],
                                properties: {
                                    startsAt: { type: 'string', format: 'date-time' },
                                    endsAt: { type: 'string', format: 'date-time' },
                                    reason: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Bloqueio criado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '400': { description: 'startsAt e endsAt são obrigatórios' },
                    '401': { description: 'Não autenticado' },
                    '403': { description: 'Requer Admin' },
                    '500': { description: 'Erro interno' },
                },
            },
        },
        '/appointments/practitioners/{practitionerId}/blocks/{blockId}': {
            servers: [{ url: '/api', description: 'Módulo de Agendamentos' }],
            delete: {
                summary: 'Remove bloqueio de agenda',
                description: 'Remove um bloqueio de período da agenda (requer Admin)',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    { in: 'path', name: 'practitionerId', required: true, schema: { type: 'integer' }, description: 'ID do profissional' },
                    { in: 'path', name: 'blockId', required: true, schema: { type: 'integer' }, description: 'ID do bloqueio' },
                ],
                responses: {
                    '200': { description: 'Bloqueio removido', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '403': { description: 'Requer Admin' },
                    '404': { description: 'Bloqueio não encontrado' },
                    '500': { description: 'Erro interno' },
                },
            },
        },
        // Services
        '/appointments/services': {
            servers: [{ url: '/api', description: 'Módulo de Agendamentos' }],
            get: {
                summary: 'Lista serviços',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                responses: {
                    '200': { description: 'Lista de serviços', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '500': { description: 'Erro interno' },
                },
            },
            post: {
                summary: 'Cria serviço',
                description: 'Cria um novo tipo de serviço/procedimento (requer Admin)',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['name'],
                                properties: {
                                    name: { type: 'string' },
                                    description: { type: 'string' },
                                    durationMinutes: { type: 'integer', default: 60 },
                                    preparationMinutes: { type: 'integer', default: 0 },
                                    color: { type: 'string', example: '#10B981' },
                                    defaultPrice: { type: 'number' },
                                    isOnline: { type: 'boolean', default: true },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Serviço criado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '400': { description: 'Parâmetros inválidos' },
                    '401': { description: 'Não autenticado' },
                    '403': { description: 'Requer Admin' },
                    '500': { description: 'Erro interno' },
                },
            },
        },
        '/appointments/services/{serviceId}': {
            servers: [{ url: '/api', description: 'Módulo de Agendamentos' }],
            get: {
                summary: 'Busca serviço por ID',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    { in: 'path', name: 'serviceId', required: true, schema: { type: 'integer' }, description: 'ID do serviço' },
                ],
                responses: {
                    '200': { description: 'Dados do serviço', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '404': { description: 'Serviço não encontrado' },
                    '500': { description: 'Erro interno' },
                },
            },
            put: {
                summary: 'Atualiza serviço',
                description: 'Requer Admin',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    { in: 'path', name: 'serviceId', required: true, schema: { type: 'integer' }, description: 'ID do serviço' },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    description: { type: 'string' },
                                    durationMinutes: { type: 'integer' },
                                    preparationMinutes: { type: 'integer' },
                                    color: { type: 'string' },
                                    defaultPrice: { type: 'number' },
                                    isOnline: { type: 'boolean' },
                                    isActive: { type: 'boolean' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Serviço atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '403': { description: 'Requer Admin' },
                    '404': { description: 'Serviço não encontrado' },
                    '500': { description: 'Erro interno' },
                },
            },
            delete: {
                summary: 'Desativa serviço',
                description: 'Soft delete: marca isActive=false (requer Admin)',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    { in: 'path', name: 'serviceId', required: true, schema: { type: 'integer' }, description: 'ID do serviço' },
                ],
                responses: {
                    '200': { description: 'Serviço desativado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '403': { description: 'Requer Admin' },
                    '404': { description: 'Serviço não encontrado' },
                    '500': { description: 'Erro interno' },
                },
            },
        },
        '/appointments/services/{serviceId}/reminders': {
            servers: [{ url: '/api', description: 'Módulo de Agendamentos' }],
            get: {
                summary: 'Lista lembretes do serviço',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    { in: 'path', name: 'serviceId', required: true, schema: { type: 'integer' }, description: 'ID do serviço' },
                ],
                responses: {
                    '200': { description: 'Lista de lembretes', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '404': { description: 'Serviço não encontrado' },
                    '500': { description: 'Erro interno' },
                },
            },
            post: {
                summary: 'Cria lembrete de serviço',
                description: 'Cria um lembrete automático vinculado a um serviço (requer Admin)',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    { in: 'path', name: 'serviceId', required: true, schema: { type: 'integer' }, description: 'ID do serviço' },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['label', 'message'],
                                properties: {
                                    label: { type: 'string' },
                                    timing: { type: 'string', enum: ['before', 'after'], default: 'before' },
                                    daysBefore: { type: 'integer', default: 0 },
                                    hoursBefore: { type: 'integer', default: 24 },
                                    minutesBefore: { type: 'integer', default: 0 },
                                    message: { type: 'string' },
                                    inboxId: { type: 'integer' },
                                    isActive: { type: 'boolean', default: true },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Lembrete criado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '400': { description: 'Parâmetros inválidos' },
                    '401': { description: 'Não autenticado' },
                    '403': { description: 'Requer Admin' },
                    '404': { description: 'Serviço não encontrado' },
                    '500': { description: 'Erro interno' },
                },
            },
        },
        '/appointments/services/{serviceId}/reminders/{reminderId}': {
            servers: [{ url: '/api', description: 'Módulo de Agendamentos' }],
            put: {
                summary: 'Atualiza lembrete de serviço',
                description: 'Requer Admin',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    { in: 'path', name: 'serviceId', required: true, schema: { type: 'integer' }, description: 'ID do serviço' },
                    { in: 'path', name: 'reminderId', required: true, schema: { type: 'integer' }, description: 'ID do lembrete' },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    label: { type: 'string' },
                                    timing: { type: 'string', enum: ['before', 'after'] },
                                    daysBefore: { type: 'integer' },
                                    hoursBefore: { type: 'integer' },
                                    minutesBefore: { type: 'integer' },
                                    message: { type: 'string' },
                                    inboxId: { type: 'integer' },
                                    isActive: { type: 'boolean' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Lembrete atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '403': { description: 'Requer Admin' },
                    '404': { description: 'Lembrete não encontrado' },
                    '500': { description: 'Erro interno' },
                },
            },
            delete: {
                summary: 'Remove lembrete de serviço',
                description: 'Requer Admin',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    { in: 'path', name: 'serviceId', required: true, schema: { type: 'integer' }, description: 'ID do serviço' },
                    { in: 'path', name: 'reminderId', required: true, schema: { type: 'integer' }, description: 'ID do lembrete' },
                ],
                responses: {
                    '200': { description: 'Lembrete removido', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '403': { description: 'Requer Admin' },
                    '404': { description: 'Lembrete não encontrado' },
                    '500': { description: 'Erro interno' },
                },
            },
        },
        // Health Plans
        '/appointments/health-plans': {
            servers: [{ url: '/api', description: 'Módulo de Agendamentos' }],
            get: {
                summary: 'Lista planos de saúde',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                responses: {
                    '200': { description: 'Lista de planos de saúde', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '500': { description: 'Erro interno' },
                },
            },
            post: {
                summary: 'Cria plano de saúde',
                description: 'Requer Admin',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['name'],
                                properties: {
                                    name: { type: 'string' },
                                    type: { type: 'string', enum: ['particular', 'convenio', 'sus'], default: 'particular' },
                                    ansCode: { type: 'string' },
                                    paymentDays: { type: 'integer', default: 30 },
                                    requiresAuth: { type: 'boolean', default: false },
                                    sessionsLimit: { type: 'integer' },
                                    notes: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Plano criado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '400': { description: 'Parâmetros inválidos' },
                    '401': { description: 'Não autenticado' },
                    '403': { description: 'Requer Admin' },
                    '500': { description: 'Erro interno' },
                },
            },
        },
        '/appointments/health-plans/{healthPlanId}': {
            servers: [{ url: '/api', description: 'Módulo de Agendamentos' }],
            get: {
                summary: 'Busca plano de saúde por ID',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    { in: 'path', name: 'healthPlanId', required: true, schema: { type: 'integer' }, description: 'ID do plano' },
                ],
                responses: {
                    '200': { description: 'Dados do plano', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '404': { description: 'Plano não encontrado' },
                    '500': { description: 'Erro interno' },
                },
            },
            put: {
                summary: 'Atualiza plano de saúde',
                description: 'Requer Admin',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    { in: 'path', name: 'healthPlanId', required: true, schema: { type: 'integer' }, description: 'ID do plano' },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    type: { type: 'string' },
                                    ansCode: { type: 'string' },
                                    paymentDays: { type: 'integer' },
                                    requiresAuth: { type: 'boolean' },
                                    sessionsLimit: { type: 'integer' },
                                    notes: { type: 'string' },
                                    isActive: { type: 'boolean' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Plano atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '403': { description: 'Requer Admin' },
                    '404': { description: 'Plano não encontrado' },
                    '500': { description: 'Erro interno' },
                },
            },
            delete: {
                summary: 'Desativa plano de saúde',
                description: 'Soft delete: marca isActive=false se não houver agendamentos ativos (requer Admin)',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    { in: 'path', name: 'healthPlanId', required: true, schema: { type: 'integer' }, description: 'ID do plano' },
                ],
                responses: {
                    '200': { description: 'Plano desativado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '403': { description: 'Requer Admin' },
                    '404': { description: 'Plano não encontrado' },
                    '409': { description: 'Plano possui agendamentos ativos' },
                    '500': { description: 'Erro interno' },
                },
            },
        },
        // Waiting List
        '/appointments/waiting-list': {
            servers: [{ url: '/api', description: 'Módulo de Agendamentos' }],
            get: {
                summary: 'Lista fila de espera',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    { in: 'query', name: 'practitionerId', schema: { type: 'integer' }, description: 'Filtrar por profissional' },
                    { in: 'query', name: 'serviceId', schema: { type: 'integer' }, description: 'Filtrar por serviço' },
                    { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
                    { in: 'query', name: 'limit', schema: { type: 'integer', default: 50 } },
                ],
                responses: {
                    '200': { description: 'Lista de espera', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '500': { description: 'Erro interno' },
                },
            },
            post: {
                summary: 'Adiciona à fila de espera',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['patientId'],
                                properties: {
                                    patientId: { type: 'integer' },
                                    practitionerId: { type: 'integer' },
                                    serviceId: { type: 'integer' },
                                    preferredDays: { type: 'array', items: { type: 'string' }, description: 'Dias preferidos (ex: ["seg","qua"])' },
                                    preferredPeriod: { type: 'string', enum: ['manha', 'tarde', 'noite'] },
                                    priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
                                    notes: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Entrada criada na fila', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '400': { description: 'patientId é obrigatório' },
                    '401': { description: 'Não autenticado' },
                    '500': { description: 'Erro interno' },
                },
            },
        },
        '/appointments/waiting-list/{waitingListId}': {
            servers: [{ url: '/api', description: 'Módulo de Agendamentos' }],
            put: {
                summary: 'Atualiza entrada da fila de espera',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    { in: 'path', name: 'waitingListId', required: true, schema: { type: 'integer' }, description: 'ID da entrada' },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    preferredDays: { type: 'array', items: { type: 'string' } },
                                    preferredPeriod: { type: 'string' },
                                    priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
                                    notes: { type: 'string' },
                                    isActive: { type: 'boolean' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Entrada atualizada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '404': { description: 'Entrada não encontrada' },
                    '500': { description: 'Erro interno' },
                },
            },
            delete: {
                summary: 'Remove da fila de espera',
                description: 'Soft delete: marca isActive=false',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    { in: 'path', name: 'waitingListId', required: true, schema: { type: 'integer' }, description: 'ID da entrada' },
                ],
                responses: {
                    '200': { description: 'Entrada removida', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '404': { description: 'Entrada não encontrada' },
                    '500': { description: 'Erro interno' },
                },
            },
        },
        // Config
        '/appointments/config': {
            servers: [{ url: '/api', description: 'Módulo de Agendamentos' }],
            get: {
                summary: 'Configurações do módulo de agendamentos',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                responses: {
                    '200': { description: 'Configurações', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '500': { description: 'Erro interno' },
                },
            },
            put: {
                summary: 'Atualiza configurações do módulo',
                description: 'Requer Admin',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    slug: { type: 'string', description: 'Slug para agendamento online' },
                                    clinicName: { type: 'string' },
                                    timezone: { type: 'string', example: 'America/Sao_Paulo' },
                                    onlineBookingEnabled: { type: 'boolean' },
                                    minAdvanceHours: { type: 'integer', description: 'Antecedência mínima em horas' },
                                    maxAdvanceDays: { type: 'integer', description: 'Máximo de dias no futuro para agendar' },
                                    requireManualApproval: { type: 'boolean' },
                                    reminderInboxId: { type: 'integer' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Configurações atualizadas', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '403': { description: 'Requer Admin' },
                    '500': { description: 'Erro interno' },
                },
            },
        },
        '/appointments/config/reminders': {
            servers: [{ url: '/api', description: 'Módulo de Agendamentos' }],
            get: {
                summary: 'Configurações globais de lembretes',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                responses: {
                    '200': { description: 'Configurações de lembretes', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '500': { description: 'Erro interno' },
                },
            },
            put: {
                summary: 'Atualiza configurações globais de lembretes',
                description: 'Requer Admin',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    confirmationEnabled: { type: 'boolean' },
                                    reminder24hEnabled: { type: 'boolean' },
                                    reminder2hEnabled: { type: 'boolean' },
                                    postAppointmentEnabled: { type: 'boolean' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Configurações atualizadas', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '403': { description: 'Requer Admin' },
                    '500': { description: 'Erro interno' },
                },
            },
        },
        // Reports
        '/appointments/reports/overview': {
            servers: [{ url: '/api', description: 'Módulo de Agendamentos' }],
            get: {
                summary: 'Relatório geral de agendamentos',
                description: 'Retorna totais de agendamentos, taxa de comparecimento e resumo por status no período',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    { in: 'query', name: 'from', schema: { type: 'string', format: 'date' }, description: 'Data inicial (padrão: 7 dias atrás)' },
                    { in: 'query', name: 'to', schema: { type: 'string', format: 'date' }, description: 'Data final (padrão: hoje)' },
                ],
                responses: {
                    '200': { description: 'Relatório geral', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '500': { description: 'Erro interno' },
                },
            },
        },
        '/appointments/reports/by-practitioner': {
            servers: [{ url: '/api', description: 'Módulo de Agendamentos' }],
            get: {
                summary: 'Relatório de agendamentos por profissional',
                description: 'Retorna métricas de atendimento agrupadas por profissional no período',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    { in: 'query', name: 'from', schema: { type: 'string', format: 'date' }, description: 'Data inicial (padrão: 30 dias atrás)' },
                    { in: 'query', name: 'to', schema: { type: 'string', format: 'date' }, description: 'Data final (padrão: hoje)' },
                ],
                responses: {
                    '200': { description: 'Relatório por profissional', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '500': { description: 'Erro interno' },
                },
            },
        },
        '/appointments/reports/missed': {
            servers: [{ url: '/api', description: 'Módulo de Agendamentos' }],
            get: {
                summary: 'Relatório de faltas',
                description: 'Lista agendamentos com status missed no período',
                tags: ['Agendamentos'],
                security: [{ BearerAuth: [] }],
                parameters: [
                    { in: 'query', name: 'from', schema: { type: 'string', format: 'date' }, description: 'Data inicial (padrão: 30 dias atrás)' },
                    { in: 'query', name: 'to', schema: { type: 'string', format: 'date' }, description: 'Data final (padrão: hoje)' },
                ],
                responses: {
                    '200': { description: 'Lista de faltas', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    '401': { description: 'Não autenticado' },
                    '500': { description: 'Erro interno' },
                },
            },
        },
    },
};
// Injeta X-Account-ID em todos os endpoints autenticados (que têm security: BearerAuth)
const accountIdParam = { $ref: '#/components/parameters/AccountId' };
for (const pathItem of Object.values(exports.swaggerSpec.paths)) {
    for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
        const op = pathItem[method];
        if (!op || !op.security)
            continue;
        if (!op.parameters)
            op.parameters = [];
        const alreadyHas = op.parameters.some((p) => p.$ref === accountIdParam.$ref || p.name === 'X-Account-ID');
        if (!alreadyHas)
            op.parameters.unshift(accountIdParam);
    }
}
//# sourceMappingURL=swagger.js.map