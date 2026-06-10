export declare const swaggerSpec: {
    openapi: string;
    info: {
        title: string;
        version: string;
        description: string;
    };
    servers: {
        url: string;
        description: string;
    }[];
    components: {
        securitySchemes: {
            BearerAuth: {
                type: string;
                scheme: string;
                description: string;
            };
            ApiAccessToken: {
                type: string;
                in: string;
                name: string;
                description: string;
            };
        };
        parameters: {
            AccountId: {
                name: string;
                in: string;
                required: boolean;
                schema: {
                    type: string;
                    example: number;
                };
                description: string;
            };
        };
        schemas: {
            Error: {
                type: string;
                properties: {
                    error: {
                        type: string;
                        description: string;
                    };
                };
            };
            Success: {
                type: string;
                properties: {
                    success: {
                        type: string;
                        example: boolean;
                    };
                };
            };
            Board: {
                type: string;
                properties: {
                    id: {
                        type: string;
                        example: number;
                    };
                    name: {
                        type: string;
                        example: string;
                    };
                    color: {
                        type: string;
                        example: string;
                    };
                    isSystem: {
                        type: string;
                        example: boolean;
                    };
                    isPublic: {
                        type: string;
                        example: boolean;
                    };
                    stages: {
                        type: string;
                        items: {
                            $ref: string;
                        };
                    };
                };
            };
            Stage: {
                type: string;
                properties: {
                    id: {
                        type: string;
                        example: number;
                    };
                    name: {
                        type: string;
                        example: string;
                    };
                    color: {
                        type: string;
                        example: string;
                    };
                    chatwootStatus: {
                        type: string;
                        nullable: boolean;
                        example: null;
                    };
                };
            };
            Card: {
                type: string;
                properties: {
                    conversationId: {
                        type: string;
                        example: number;
                    };
                    order: {
                        type: string;
                        example: number;
                    };
                    createdAt: {
                        type: string;
                        format: string;
                    };
                };
            };
            Funnel: {
                type: string;
                properties: {
                    id: {
                        type: string;
                        example: number;
                    };
                    accountId: {
                        type: string;
                        example: number;
                    };
                    name: {
                        type: string;
                        example: string;
                    };
                    color: {
                        type: string;
                        example: string;
                    };
                    isPublic: {
                        type: string;
                        example: boolean;
                    };
                    isSystem: {
                        type: string;
                        example: boolean;
                    };
                    order: {
                        type: string;
                        example: number;
                    };
                    createdAt: {
                        type: string;
                        format: string;
                    };
                    updatedAt: {
                        type: string;
                        format: string;
                    };
                };
            };
            ScheduledMessage: {
                type: string;
                properties: {
                    id: {
                        type: string;
                        example: number;
                    };
                    accountId: {
                        type: string;
                        example: number;
                    };
                    createdBy: {
                        type: string;
                        example: number;
                    };
                    conversationId: {
                        type: string;
                        example: number;
                    };
                    message: {
                        type: string;
                        example: string;
                    };
                    scheduledAt: {
                        type: string;
                        format: string;
                    };
                    status: {
                        type: string;
                        enum: string[];
                        example: string;
                    };
                    createdAt: {
                        type: string;
                        format: string;
                    };
                };
            };
            InternalChat: {
                type: string;
                properties: {
                    id: {
                        type: string;
                        example: number;
                    };
                    accountId: {
                        type: string;
                        example: number;
                    };
                    name: {
                        type: string;
                        example: string;
                    };
                    createdAt: {
                        type: string;
                        format: string;
                    };
                    updatedAt: {
                        type: string;
                        format: string;
                    };
                };
            };
            InternalChatMessage: {
                type: string;
                properties: {
                    id: {
                        type: string;
                        example: number;
                    };
                    chatId: {
                        type: string;
                        example: number;
                    };
                    userId: {
                        type: string;
                        example: number;
                    };
                    content: {
                        type: string;
                        example: string;
                    };
                    createdAt: {
                        type: string;
                        format: string;
                    };
                };
            };
            ChatbotFlow: {
                type: string;
                properties: {
                    id: {
                        type: string;
                        example: number;
                    };
                    name: {
                        type: string;
                        example: string;
                    };
                    description: {
                        type: string;
                        example: string;
                        nullable: boolean;
                    };
                    accountId: {
                        type: string;
                        example: number;
                    };
                    isActive: {
                        type: string;
                        example: boolean;
                    };
                    trigger: {
                        type: string;
                        properties: {
                            type: {
                                type: string;
                                enum: string[];
                                example: string;
                            };
                            value: {
                                oneOf: {
                                    type: string;
                                }[];
                                example: string;
                            };
                        };
                    };
                    flowData: {
                        type: string;
                        properties: {
                            nodes: {
                                type: string;
                                items: {
                                    $ref: string;
                                };
                            };
                            edges: {
                                type: string;
                                items: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    createdBy: {
                        type: string;
                        example: number;
                    };
                    createdAt: {
                        type: string;
                        format: string;
                    };
                    updatedAt: {
                        type: string;
                        format: string;
                    };
                    executionsCount: {
                        type: string;
                        example: number;
                    };
                };
            };
            FlowNode: {
                type: string;
                properties: {
                    id: {
                        type: string;
                        example: string;
                    };
                    type: {
                        type: string;
                        enum: string[];
                        example: string;
                    };
                    position: {
                        type: string;
                        properties: {
                            x: {
                                type: string;
                                example: number;
                            };
                            y: {
                                type: string;
                                example: number;
                            };
                        };
                    };
                    data: {
                        type: string;
                        example: {};
                    };
                };
            };
            FlowEdge: {
                type: string;
                properties: {
                    id: {
                        type: string;
                        example: string;
                    };
                    source: {
                        type: string;
                        example: string;
                    };
                    target: {
                        type: string;
                        example: string;
                    };
                    sourceHandle: {
                        type: string;
                        nullable: boolean;
                    };
                    targetHandle: {
                        type: string;
                        nullable: boolean;
                    };
                };
            };
            FlowExecution: {
                type: string;
                properties: {
                    id: {
                        type: string;
                        example: number;
                    };
                    flowId: {
                        type: string;
                        example: number;
                    };
                    conversationId: {
                        type: string;
                        example: number;
                    };
                    accountId: {
                        type: string;
                        example: number;
                    };
                    status: {
                        type: string;
                        enum: string[];
                        example: string;
                    };
                    currentNodeId: {
                        type: string;
                        nullable: boolean;
                        example: string;
                    };
                    context: {
                        type: string;
                        nullable: boolean;
                        example: {
                            message: string;
                        };
                    };
                    startedAt: {
                        type: string;
                        format: string;
                    };
                    completedAt: {
                        type: string;
                        format: string;
                        nullable: boolean;
                    };
                    errorMessage: {
                        type: string;
                        nullable: boolean;
                    };
                };
            };
            FlowVariable: {
                type: string;
                properties: {
                    id: {
                        type: string;
                        example: number;
                    };
                    accountId: {
                        type: string;
                        example: number;
                    };
                    name: {
                        type: string;
                        example: string;
                    };
                    defaultValue: {
                        type: string;
                        nullable: boolean;
                        example: string;
                    };
                    description: {
                        type: string;
                        nullable: boolean;
                        example: string;
                    };
                    createdAt: {
                        type: string;
                        format: string;
                    };
                    updatedAt: {
                        type: string;
                        format: string;
                    };
                };
            };
            Sequence: {
                type: string;
                properties: {
                    id: {
                        type: string;
                        example: number;
                    };
                    name: {
                        type: string;
                        example: string;
                    };
                    description: {
                        type: string;
                        nullable: boolean;
                        example: string;
                    };
                    accountId: {
                        type: string;
                        example: number;
                    };
                    isActive: {
                        type: string;
                        example: boolean;
                    };
                    type: {
                        type: string;
                        example: string;
                    };
                    trigger: {
                        type: string;
                        example: {
                            type: string;
                        };
                    };
                    flowData: {
                        type: string;
                        properties: {
                            nodes: {
                                type: string;
                                items: {
                                    $ref: string;
                                };
                            };
                            edges: {
                                type: string;
                                items: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    createdBy: {
                        type: string;
                        example: number;
                    };
                    createdAt: {
                        type: string;
                        format: string;
                    };
                    updatedAt: {
                        type: string;
                        format: string;
                    };
                    stats: {
                        type: string;
                        example: {
                            running: number;
                            completed: number;
                            cancelled: number;
                        };
                    };
                };
            };
            SequenceExecution: {
                type: string;
                properties: {
                    id: {
                        type: string;
                        example: number;
                    };
                    flowId: {
                        type: string;
                        example: number;
                    };
                    contactId: {
                        type: string;
                        example: number;
                    };
                    conversationId: {
                        type: string;
                        nullable: boolean;
                        example: number;
                    };
                    accountId: {
                        type: string;
                        example: number;
                    };
                    status: {
                        type: string;
                        enum: string[];
                        example: string;
                    };
                    currentNodeId: {
                        type: string;
                        nullable: boolean;
                        example: string;
                    };
                    startedAt: {
                        type: string;
                        format: string;
                    };
                    completedAt: {
                        type: string;
                        format: string;
                        nullable: boolean;
                    };
                    errorMessage: {
                        type: string;
                        nullable: boolean;
                    };
                };
            };
            UserResourcePermission: {
                type: string;
                properties: {
                    id: {
                        type: string;
                        example: number;
                    };
                    accountId: {
                        type: string;
                        example: number;
                    };
                    userId: {
                        type: string;
                        example: number;
                    };
                    kanbanAccess: {
                        type: string;
                        example: boolean;
                    };
                    conexoesAccess: {
                        type: string;
                        example: boolean;
                    };
                    chatsInternosAccess: {
                        type: string;
                        example: boolean;
                    };
                    projectsAccess: {
                        type: string;
                        example: boolean;
                    };
                    chatbotFlowsAccess: {
                        type: string;
                        example: boolean;
                    };
                    permissoesAccess: {
                        type: string;
                        example: boolean;
                    };
                    createdAt: {
                        type: string;
                        format: string;
                    };
                    updatedAt: {
                        type: string;
                        format: string;
                    };
                };
            };
            AccountPermissions: {
                type: string;
                properties: {
                    id: {
                        type: string;
                        example: number;
                    };
                    accountId: {
                        type: string;
                        example: number;
                    };
                    kanbanEnabled: {
                        type: string;
                        example: boolean;
                    };
                    chatsInternosEnabled: {
                        type: string;
                        example: boolean;
                    };
                    conexoesEnabled: {
                        type: string;
                        example: boolean;
                    };
                    projectsEnabled: {
                        type: string;
                        example: boolean;
                    };
                    chatbotFlowsEnabled: {
                        type: string;
                        example: boolean;
                    };
                    wavoipEnabled: {
                        type: string;
                        example: boolean;
                    };
                    appointmentsEnabled: {
                        type: string;
                        example: boolean;
                    };
                    disparadorEnabled: {
                        type: string;
                        example: boolean;
                    };
                    allowedProviders: {
                        type: string;
                        nullable: boolean;
                        example: string;
                    };
                    createdAt: {
                        type: string;
                        format: string;
                    };
                    updatedAt: {
                        type: string;
                        format: string;
                    };
                };
            };
            Project: {
                type: string;
                properties: {
                    id: {
                        type: string;
                        example: number;
                    };
                    accountId: {
                        type: string;
                        example: number;
                    };
                    name: {
                        type: string;
                        example: string;
                    };
                    description: {
                        type: string;
                        nullable: boolean;
                        example: string;
                    };
                    status: {
                        type: string;
                        enum: string[];
                        example: string;
                    };
                    deadline: {
                        type: string;
                        format: string;
                        nullable: boolean;
                    };
                    color: {
                        type: string;
                        nullable: boolean;
                        example: string;
                    };
                    createdBy: {
                        type: string;
                        example: number;
                    };
                    createdAt: {
                        type: string;
                        format: string;
                    };
                    updatedAt: {
                        type: string;
                        format: string;
                    };
                };
            };
            ProjectTask: {
                type: string;
                properties: {
                    id: {
                        type: string;
                        example: number;
                    };
                    projectId: {
                        type: string;
                        example: number;
                    };
                    title: {
                        type: string;
                        example: string;
                    };
                    description: {
                        type: string;
                        nullable: boolean;
                        example: string;
                    };
                    status: {
                        type: string;
                        enum: string[];
                        example: string;
                    };
                    priority: {
                        type: string;
                        enum: string[];
                        nullable: boolean;
                        example: string;
                    };
                    dueDate: {
                        type: string;
                        format: string;
                        nullable: boolean;
                    };
                    completedAt: {
                        type: string;
                        format: string;
                        nullable: boolean;
                    };
                    milestoneId: {
                        type: string;
                        nullable: boolean;
                        example: number;
                    };
                    assignedTo: {
                        type: string;
                        nullable: boolean;
                        example: number;
                    };
                    createdBy: {
                        type: string;
                        example: number;
                    };
                    order: {
                        type: string;
                        example: number;
                    };
                    createdAt: {
                        type: string;
                        format: string;
                    };
                    updatedAt: {
                        type: string;
                        format: string;
                    };
                };
            };
            ProjectMilestone: {
                type: string;
                properties: {
                    id: {
                        type: string;
                        example: number;
                    };
                    projectId: {
                        type: string;
                        example: number;
                    };
                    name: {
                        type: string;
                        example: string;
                    };
                    description: {
                        type: string;
                        nullable: boolean;
                        example: string;
                    };
                    dueDate: {
                        type: string;
                        format: string;
                        nullable: boolean;
                    };
                    order: {
                        type: string;
                        example: number;
                    };
                    createdAt: {
                        type: string;
                        format: string;
                    };
                    updatedAt: {
                        type: string;
                        format: string;
                    };
                };
            };
            ProjectMember: {
                type: string;
                properties: {
                    id: {
                        type: string;
                        example: number;
                    };
                    projectId: {
                        type: string;
                        example: number;
                    };
                    userId: {
                        type: string;
                        example: number;
                    };
                    role: {
                        type: string;
                        enum: string[];
                        example: string;
                    };
                    addedAt: {
                        type: string;
                        format: string;
                    };
                    addedBy: {
                        type: string;
                        example: number;
                    };
                };
            };
            ProjectFile: {
                type: string;
                properties: {
                    id: {
                        type: string;
                        example: number;
                    };
                    projectId: {
                        type: string;
                        example: number;
                    };
                    filename: {
                        type: string;
                        example: string;
                    };
                    originalName: {
                        type: string;
                        example: string;
                    };
                    mimetype: {
                        type: string;
                        example: string;
                    };
                    size: {
                        type: string;
                        example: number;
                    };
                    uploadedBy: {
                        type: string;
                        example: number;
                    };
                    uploadedAt: {
                        type: string;
                        format: string;
                    };
                };
            };
            ProjectDiscussion: {
                type: string;
                properties: {
                    id: {
                        type: string;
                        example: number;
                    };
                    projectId: {
                        type: string;
                        example: number;
                    };
                    subject: {
                        type: string;
                        example: string;
                    };
                    description: {
                        type: string;
                        nullable: boolean;
                        example: string;
                    };
                    createdBy: {
                        type: string;
                        example: number;
                    };
                    createdAt: {
                        type: string;
                        format: string;
                    };
                    updatedAt: {
                        type: string;
                        format: string;
                    };
                };
            };
            ProjectComment: {
                type: string;
                properties: {
                    id: {
                        type: string;
                        example: number;
                    };
                    discussionId: {
                        type: string;
                        example: number;
                    };
                    content: {
                        type: string;
                        example: string;
                    };
                    createdBy: {
                        type: string;
                        example: number;
                    };
                    createdAt: {
                        type: string;
                        format: string;
                    };
                    updatedAt: {
                        type: string;
                        format: string;
                    };
                };
            };
            ProjectActivity: {
                type: string;
                properties: {
                    id: {
                        type: string;
                        example: number;
                    };
                    projectId: {
                        type: string;
                        example: number;
                    };
                    userId: {
                        type: string;
                        example: number;
                    };
                    action: {
                        type: string;
                        example: string;
                    };
                    description: {
                        type: string;
                        example: string;
                    };
                    metadata: {
                        type: string;
                        nullable: boolean;
                    };
                    createdAt: {
                        type: string;
                        format: string;
                    };
                };
            };
            ProjectStats: {
                type: string;
                properties: {
                    totalTasks: {
                        type: string;
                        example: number;
                    };
                    completedTasks: {
                        type: string;
                        example: number;
                    };
                    pendingTasks: {
                        type: string;
                        example: number;
                    };
                    inProgressTasks: {
                        type: string;
                        example: number;
                    };
                    overdueTasks: {
                        type: string;
                        example: number;
                    };
                    totalMilestones: {
                        type: string;
                        example: number;
                    };
                    completedMilestones: {
                        type: string;
                        example: number;
                    };
                    totalMembers: {
                        type: string;
                        example: number;
                    };
                    totalFiles: {
                        type: string;
                        example: number;
                    };
                    totalDiscussions: {
                        type: string;
                        example: number;
                    };
                    progress: {
                        type: string;
                        example: number;
                    };
                    conversationCount: {
                        type: string;
                        example: number;
                    };
                    totalValue: {
                        type: string;
                        example: number;
                    };
                };
            };
        };
    };
    security: {
        BearerAuth: never[];
    }[];
    tags: {
        name: string;
        description: string;
    }[];
    paths: {
        '/atendimentos/filters': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    ApiAccessToken: never[];
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            type: string;
                                            properties: {
                                                agents: {
                                                    type: string;
                                                    items: {
                                                        type: string;
                                                        properties: {
                                                            id: {
                                                                type: string;
                                                                example: number;
                                                            };
                                                            name: {
                                                                type: string;
                                                                example: string;
                                                            };
                                                            email: {
                                                                type: string;
                                                                example: string;
                                                            };
                                                            role: {
                                                                type: string;
                                                                example: string;
                                                            };
                                                        };
                                                    };
                                                };
                                                inboxes: {
                                                    type: string;
                                                    items: {
                                                        type: string;
                                                        properties: {
                                                            id: {
                                                                type: string;
                                                                example: number;
                                                            };
                                                            name: {
                                                                type: string;
                                                                example: string;
                                                            };
                                                            channel_type: {
                                                                type: string;
                                                                example: string;
                                                            };
                                                        };
                                                    };
                                                };
                                                labels: {
                                                    type: string;
                                                    items: {
                                                        type: string;
                                                        properties: {
                                                            id: {
                                                                type: string;
                                                                example: number;
                                                            };
                                                            title: {
                                                                type: string;
                                                                example: string;
                                                            };
                                                            color: {
                                                                type: string;
                                                                example: string;
                                                            };
                                                        };
                                                    };
                                                };
                                                teams: {
                                                    type: string;
                                                    items: {
                                                        type: string;
                                                        properties: {
                                                            id: {
                                                                type: string;
                                                                example: number;
                                                            };
                                                            name: {
                                                                type: string;
                                                                example: string;
                                                            };
                                                        };
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '403': {
                        description: string;
                    };
                };
            };
        };
        '/atendimentos/stats': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    ApiAccessToken: never[];
                }[];
                parameters: ({
                    name: string;
                    in: string;
                    required: boolean;
                    description: string;
                    schema: {
                        type: string;
                        example: number;
                        format?: undefined;
                    };
                } | {
                    name: string;
                    in: string;
                    required: boolean;
                    description: string;
                    schema: {
                        type: string;
                        format: string;
                        example: string;
                    };
                })[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            type: string;
                                            properties: {
                                                total: {
                                                    type: string;
                                                    example: number;
                                                };
                                                byStatus: {
                                                    type: string;
                                                    properties: {
                                                        open: {
                                                            type: string;
                                                            example: number;
                                                        };
                                                        pending: {
                                                            type: string;
                                                            example: number;
                                                        };
                                                        resolved: {
                                                            type: string;
                                                            example: number;
                                                        };
                                                        snoozed: {
                                                            type: string;
                                                            example: number;
                                                        };
                                                    };
                                                };
                                                byInbox: {
                                                    type: string;
                                                    items: {
                                                        type: string;
                                                        properties: {
                                                            id: {
                                                                type: string;
                                                                example: number;
                                                            };
                                                            name: {
                                                                type: string;
                                                                example: string;
                                                            };
                                                            channelType: {
                                                                type: string;
                                                                example: string;
                                                            };
                                                            open: {
                                                                type: string;
                                                                example: number;
                                                            };
                                                            resolved: {
                                                                type: string;
                                                                example: number;
                                                            };
                                                        };
                                                    };
                                                };
                                                byAgent: {
                                                    type: string;
                                                    items: {
                                                        type: string;
                                                        properties: {
                                                            id: {
                                                                type: string;
                                                                example: number;
                                                            };
                                                            name: {
                                                                type: string;
                                                                example: string;
                                                            };
                                                            email: {
                                                                type: string;
                                                                example: string;
                                                            };
                                                            open: {
                                                                type: string;
                                                                example: number;
                                                            };
                                                            resolved: {
                                                                type: string;
                                                                example: number;
                                                            };
                                                        };
                                                    };
                                                };
                                                today: {
                                                    type: string;
                                                    properties: {
                                                        opened: {
                                                            type: string;
                                                            example: number;
                                                        };
                                                        resolved: {
                                                            type: string;
                                                            example: number;
                                                        };
                                                    };
                                                };
                                                avgFirstReplyMinutes: {
                                                    type: string;
                                                    nullable: boolean;
                                                    example: number;
                                                    description: string;
                                                };
                                                sampleSize: {
                                                    type: string;
                                                    example: number;
                                                    description: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '403': {
                        description: string;
                    };
                };
            };
        };
        '/atendimentos': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    ApiAccessToken: never[];
                }[];
                parameters: ({
                    name: string;
                    in: string;
                    required: boolean;
                    description: string;
                    schema: {
                        type: string;
                        enum: string[];
                        default: string;
                        example?: undefined;
                        format?: undefined;
                        minimum?: undefined;
                        maximum?: undefined;
                    };
                } | {
                    name: string;
                    in: string;
                    required: boolean;
                    description: string;
                    schema: {
                        type: string;
                        example: number;
                        enum?: undefined;
                        default?: undefined;
                        format?: undefined;
                        minimum?: undefined;
                        maximum?: undefined;
                    };
                } | {
                    name: string;
                    in: string;
                    required: boolean;
                    description: string;
                    schema: {
                        type: string;
                        enum: string[];
                        default?: undefined;
                        example?: undefined;
                        format?: undefined;
                        minimum?: undefined;
                        maximum?: undefined;
                    };
                } | {
                    name: string;
                    in: string;
                    required: boolean;
                    description: string;
                    schema: {
                        type: string;
                        example: string;
                        enum?: undefined;
                        default?: undefined;
                        format?: undefined;
                        minimum?: undefined;
                        maximum?: undefined;
                    };
                } | {
                    name: string;
                    in: string;
                    required: boolean;
                    description: string;
                    schema: {
                        type: string;
                        format: string;
                        example: string;
                        enum?: undefined;
                        default?: undefined;
                        minimum?: undefined;
                        maximum?: undefined;
                    };
                } | {
                    name: string;
                    in: string;
                    required: boolean;
                    description: string;
                    schema: {
                        type: string;
                        minimum: number;
                        default: number;
                        enum?: undefined;
                        example?: undefined;
                        format?: undefined;
                        maximum?: undefined;
                    };
                } | {
                    name: string;
                    in: string;
                    required: boolean;
                    description: string;
                    schema: {
                        type: string;
                        minimum: number;
                        maximum: number;
                        default: number;
                        enum?: undefined;
                        example?: undefined;
                        format?: undefined;
                    };
                })[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            type: string;
                                            properties: {
                                                conversations: {
                                                    type: string;
                                                    items: {
                                                        type: string;
                                                        properties: {
                                                            id: {
                                                                type: string;
                                                                example: number;
                                                            };
                                                            status: {
                                                                type: string;
                                                                example: string;
                                                            };
                                                            created_at: {
                                                                type: string;
                                                                example: number;
                                                            };
                                                            updated_at: {
                                                                type: string;
                                                                example: number;
                                                            };
                                                            inbox_id: {
                                                                type: string;
                                                                example: number;
                                                            };
                                                            meta: {
                                                                type: string;
                                                                properties: {
                                                                    assignee: {
                                                                        type: string;
                                                                        nullable: boolean;
                                                                        properties: {
                                                                            id: {
                                                                                type: string;
                                                                                example: number;
                                                                            };
                                                                            name: {
                                                                                type: string;
                                                                                example: string;
                                                                            };
                                                                        };
                                                                    };
                                                                    sender: {
                                                                        type: string;
                                                                        properties: {
                                                                            id: {
                                                                                type: string;
                                                                                example: number;
                                                                            };
                                                                            name: {
                                                                                type: string;
                                                                                example: string;
                                                                            };
                                                                            phone_number: {
                                                                                type: string;
                                                                                example: string;
                                                                            };
                                                                        };
                                                                    };
                                                                };
                                                            };
                                                            labels: {
                                                                type: string;
                                                                items: {
                                                                    type: string;
                                                                };
                                                                example: string[];
                                                            };
                                                            kanban: {
                                                                type: string;
                                                                nullable: boolean;
                                                                description: string;
                                                                properties: {
                                                                    cardId: {
                                                                        type: string;
                                                                        example: number;
                                                                    };
                                                                    stageId: {
                                                                        type: string;
                                                                        example: number;
                                                                    };
                                                                    stageName: {
                                                                        type: string;
                                                                        example: string;
                                                                    };
                                                                    stageColor: {
                                                                        type: string;
                                                                        example: string;
                                                                    };
                                                                    funnelId: {
                                                                        type: string;
                                                                        example: number;
                                                                    };
                                                                    funnelName: {
                                                                        type: string;
                                                                        example: string;
                                                                    };
                                                                    funnelColor: {
                                                                        type: string;
                                                                        example: string;
                                                                    };
                                                                    leadStatus: {
                                                                        type: string;
                                                                        enum: string[];
                                                                        example: string;
                                                                    };
                                                                    closedAt: {
                                                                        type: string;
                                                                        nullable: boolean;
                                                                        format: string;
                                                                    };
                                                                };
                                                            };
                                                        };
                                                    };
                                                };
                                                meta: {
                                                    type: string;
                                                    properties: {
                                                        total: {
                                                            type: string;
                                                            example: number;
                                                        };
                                                        page: {
                                                            type: string;
                                                            example: number;
                                                        };
                                                        limit: {
                                                            type: string;
                                                            example: number;
                                                        };
                                                        pages: {
                                                            type: string;
                                                            example: number;
                                                        };
                                                        hasMore: {
                                                            type: string;
                                                            example: boolean;
                                                        };
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                    };
                    '401': {
                        description: string;
                    };
                    '403': {
                        description: string;
                    };
                };
            };
            post: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    ApiAccessToken: never[];
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    inbox_id: {
                                        type: string;
                                        description: string;
                                        example: number;
                                    };
                                    contact_id: {
                                        type: string;
                                        description: string;
                                        example: number;
                                    };
                                    status: {
                                        type: string;
                                        enum: string[];
                                        default: string;
                                    };
                                    additional_attributes: {
                                        type: string;
                                        description: string;
                                    };
                                    custom_attributes: {
                                        type: string;
                                        description: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '201': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                    };
                    '401': {
                        description: string;
                    };
                    '403': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
        };
        '/atendimentos/{id}': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    ApiAccessToken: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                    };
                    '401': {
                        description: string;
                    };
                    '404': {
                        description: string;
                    };
                };
            };
            patch: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    ApiAccessToken: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    status: {
                                        type: string;
                                        enum: string[];
                                        description: string;
                                    };
                                    agent_id: {
                                        type: string;
                                        description: string;
                                        example: number;
                                    };
                                    team_id: {
                                        type: string;
                                        description: string;
                                        example: number;
                                    };
                                    labels: {
                                        type: string;
                                        items: {
                                            type: string;
                                        };
                                        description: string;
                                        example: string[];
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                    };
                    '401': {
                        description: string;
                    };
                    '403': {
                        description: string;
                    };
                };
            };
            delete: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    ApiAccessToken: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                    };
                    '401': {
                        description: string;
                    };
                    '403': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
        };
        '/atendimentos/{id}/labels': {
            post: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    ApiAccessToken: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    labels: {
                                        type: string;
                                        items: {
                                            type: string;
                                        };
                                        description: string;
                                        example: string[];
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                    };
                    '401': {
                        description: string;
                    };
                };
            };
            delete: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    ApiAccessToken: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    labels: {
                                        type: string;
                                        items: {
                                            type: string;
                                        };
                                        description: string;
                                        example: string[];
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                    };
                    '401': {
                        description: string;
                    };
                };
            };
        };
        '/kanban/boards': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    $ref: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            type: string;
                                            items: {
                                                $ref: string;
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '500': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/kanban/boards/{boardId}/cards': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: ({
                    $ref: string;
                    in?: undefined;
                    name?: undefined;
                    required?: undefined;
                    schema?: undefined;
                    description?: undefined;
                } | {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                    $ref?: undefined;
                })[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            type: string;
                                            properties: {
                                                id: {
                                                    type: string;
                                                    example: number;
                                                };
                                                name: {
                                                    type: string;
                                                    example: string;
                                                };
                                                stages: {
                                                    type: string;
                                                    items: {
                                                        type: string;
                                                        properties: {
                                                            id: {
                                                                type: string;
                                                                example: number;
                                                            };
                                                            name: {
                                                                type: string;
                                                                example: string;
                                                            };
                                                            color: {
                                                                type: string;
                                                                example: string;
                                                            };
                                                            cards: {
                                                                type: string;
                                                                items: {
                                                                    $ref: string;
                                                                };
                                                            };
                                                        };
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/kanban/cards': {
            post: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    conversationId: {
                                        type: string;
                                        example: number;
                                        description: string;
                                    };
                                    stageId: {
                                        type: string;
                                        example: number;
                                        description: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '409': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/kanban/cards/{conversationId}/move': {
            put: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    stageId: {
                                        type: string;
                                        example: number;
                                        description: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/kanban/cards/{conversationId}': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            type: string;
                                            properties: {
                                                conversationId: {
                                                    type: string;
                                                    example: number;
                                                };
                                                stageId: {
                                                    type: string;
                                                    example: number;
                                                };
                                                stageName: {
                                                    type: string;
                                                    example: string;
                                                };
                                                stageColor: {
                                                    type: string;
                                                    example: string;
                                                };
                                                funnelId: {
                                                    type: string;
                                                    example: number;
                                                };
                                                funnelName: {
                                                    type: string;
                                                    example: string;
                                                };
                                                leadStatus: {
                                                    type: string;
                                                    enum: string[];
                                                    example: string;
                                                };
                                                customName: {
                                                    type: string;
                                                    nullable: boolean;
                                                    example: null;
                                                };
                                                order: {
                                                    type: string;
                                                    example: number;
                                                };
                                                createdAt: {
                                                    type: string;
                                                    format: string;
                                                };
                                                updatedAt: {
                                                    type: string;
                                                    format: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
            delete: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/kanban/cards/by-contact/{contactId}': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            type: string;
                                            items: {
                                                type: string;
                                                properties: {
                                                    conversationId: {
                                                        type: string;
                                                        example: number;
                                                    };
                                                    stageId: {
                                                        type: string;
                                                        example: number;
                                                    };
                                                    stageName: {
                                                        type: string;
                                                        example: string;
                                                    };
                                                    stageColor: {
                                                        type: string;
                                                        example: string;
                                                    };
                                                    funnelId: {
                                                        type: string;
                                                        example: number;
                                                    };
                                                    funnelName: {
                                                        type: string;
                                                        example: string;
                                                    };
                                                    leadStatus: {
                                                        type: string;
                                                        enum: string[];
                                                        example: string;
                                                    };
                                                    customName: {
                                                        type: string;
                                                        nullable: boolean;
                                                    };
                                                    order: {
                                                        type: string;
                                                    };
                                                    createdAt: {
                                                        type: string;
                                                        format: string;
                                                    };
                                                    updatedAt: {
                                                        type: string;
                                                        format: string;
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/kanban/cards/{conversationId}/items': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            type: string;
                                            items: {
                                                type: string;
                                                properties: {
                                                    id: {
                                                        type: string;
                                                        example: number;
                                                    };
                                                    title: {
                                                        type: string;
                                                        example: string;
                                                    };
                                                    description: {
                                                        type: string;
                                                        nullable: boolean;
                                                    };
                                                    value: {
                                                        type: string;
                                                        example: number;
                                                    };
                                                    quantity: {
                                                        type: string;
                                                        example: number;
                                                    };
                                                    total: {
                                                        type: string;
                                                        example: number;
                                                    };
                                                    templateId: {
                                                        type: string;
                                                        nullable: boolean;
                                                    };
                                                    order: {
                                                        type: string;
                                                        example: number;
                                                    };
                                                    createdAt: {
                                                        type: string;
                                                        format: string;
                                                    };
                                                    updatedAt: {
                                                        type: string;
                                                        format: string;
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
            post: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    templateId: {
                                        type: string;
                                        description: string;
                                        example: number;
                                    };
                                    title: {
                                        type: string;
                                        description: string;
                                        example: string;
                                    };
                                    description: {
                                        type: string;
                                        description: string;
                                    };
                                    value: {
                                        type: string;
                                        description: string;
                                        example: number;
                                    };
                                    quantity: {
                                        type: string;
                                        description: string;
                                        example: number;
                                    };
                                };
                            };
                            examples: {
                                manual: {
                                    summary: string;
                                    value: {
                                        title: string;
                                        value: number;
                                        quantity: number;
                                    };
                                };
                                from_template: {
                                    summary: string;
                                    value: {
                                        templateId: number;
                                        quantity: number;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '201': {
                        description: string;
                    };
                    '400': {
                        description: string;
                    };
                    '404': {
                        description: string;
                    };
                };
            };
        };
        '/kanban/cards/{conversationId}/items/total': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            type: string;
                                            properties: {
                                                total: {
                                                    type: string;
                                                    example: number;
                                                };
                                                itemCount: {
                                                    type: string;
                                                    example: number;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        '/kanban/cards/{conversationId}/items/{itemId}': {
            put: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    title: {
                                        type: string;
                                        example: string;
                                    };
                                    description: {
                                        type: string;
                                    };
                                    value: {
                                        type: string;
                                        example: number;
                                    };
                                    quantity: {
                                        type: string;
                                        example: number;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                    };
                    '404': {
                        description: string;
                    };
                };
            };
            delete: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                    };
                    '404': {
                        description: string;
                    };
                };
            };
        };
        '/funnels': {
            post: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    name: {
                                        type: string;
                                        example: string;
                                        description: string;
                                    };
                                    color: {
                                        type: string;
                                        example: string;
                                        description: string;
                                    };
                                    isPublic: {
                                        type: string;
                                        example: boolean;
                                        description: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/funnels/{funnelId}': {
            put: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    name: {
                                        type: string;
                                        example: string;
                                    };
                                    color: {
                                        type: string;
                                        example: string;
                                    };
                                    isPublic: {
                                        type: string;
                                        example: boolean;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
            delete: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/funnels/{funnelId}/stages': {
            post: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    name: {
                                        type: string;
                                        example: string;
                                        description: string;
                                    };
                                    color: {
                                        type: string;
                                        example: string;
                                        description: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/stages/{stageId}': {
            put: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    name: {
                                        type: string;
                                        example: string;
                                    };
                                    color: {
                                        type: string;
                                        example: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
            delete: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/scheduled-messages': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            type: string;
                                            items: {
                                                $ref: string;
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
            post: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    conversationId: {
                                        type: string;
                                        example: number;
                                        description: string;
                                    };
                                    message: {
                                        type: string;
                                        example: string;
                                        description: string;
                                    };
                                    scheduledAt: {
                                        type: string;
                                        format: string;
                                        example: string;
                                        description: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/scheduled-messages/{messageId}': {
            delete: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/internal-chats': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            type: string;
                                            items: {
                                                $ref: string;
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        '/internal-chats/{chatId}/messages': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            type: string;
                                            items: {
                                                $ref: string;
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
            post: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    content: {
                                        type: string;
                                        example: string;
                                        description: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/chatbot-flows': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        data: {
                                            type: string;
                                            items: {
                                                $ref: string;
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '500': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
            post: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    name: {
                                        type: string;
                                        example: string;
                                    };
                                    description: {
                                        type: string;
                                        example: string;
                                    };
                                    trigger: {
                                        type: string;
                                        required: string[];
                                        properties: {
                                            type: {
                                                type: string;
                                                enum: string[];
                                                example: string;
                                            };
                                            value: {
                                                oneOf: {
                                                    type: string;
                                                }[];
                                                example: string;
                                            };
                                        };
                                    };
                                    flowData: {
                                        type: string;
                                        properties: {
                                            nodes: {
                                                type: string;
                                                items: {
                                                    $ref: string;
                                                };
                                            };
                                            edges: {
                                                type: string;
                                                items: {
                                                    $ref: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '201': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/chatbot-flows/{id}': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
            put: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    name: {
                                        type: string;
                                        example: string;
                                    };
                                    description: {
                                        type: string;
                                        example: string;
                                    };
                                    trigger: {
                                        type: string;
                                        properties: {
                                            type: {
                                                type: string;
                                                enum: string[];
                                            };
                                            value: {
                                                oneOf: {
                                                    type: string;
                                                }[];
                                            };
                                        };
                                    };
                                    flowData: {
                                        type: string;
                                        properties: {
                                            nodes: {
                                                type: string;
                                                items: {
                                                    $ref: string;
                                                };
                                            };
                                            edges: {
                                                type: string;
                                                items: {
                                                    $ref: string;
                                                };
                                            };
                                        };
                                    };
                                    isActive: {
                                        type: string;
                                        example: boolean;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
            delete: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/chatbot-flows/{id}/activate': {
            patch: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    isActive: {
                                        type: string;
                                        example: boolean;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/chatbot-flows/{id}/executions': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: ({
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                        default?: undefined;
                    };
                    description: string;
                } | {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                        default: number;
                    };
                    description: string;
                })[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        data: {
                                            type: string;
                                            items: {
                                                $ref: string;
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/chatbot-flows/{id}/test': {
            post: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    conversationId: {
                                        type: string;
                                        example: number;
                                    };
                                    testContext: {
                                        type: string;
                                        example: {
                                            message: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        message: {
                                            type: string;
                                            example: string;
                                        };
                                        jobId: {
                                            type: string;
                                            example: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/chatbot-flows/executions/{id}/cancel': {
            delete: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/chatbot-flows/variables': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        data: {
                                            type: string;
                                            items: {
                                                $ref: string;
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
            post: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    name: {
                                        type: string;
                                        example: string;
                                    };
                                    defaultValue: {
                                        type: string;
                                        example: string;
                                    };
                                    description: {
                                        type: string;
                                        example: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '201': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/chatbot-flows/variables/{id}': {
            put: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    defaultValue: {
                                        type: string;
                                        example: string;
                                    };
                                    description: {
                                        type: string;
                                        example: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
            delete: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/sequences': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        data: {
                                            type: string;
                                            items: {
                                                $ref: string;
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
            post: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    name: {
                                        type: string;
                                        example: string;
                                    };
                                    description: {
                                        type: string;
                                        example: string;
                                        nullable: boolean;
                                    };
                                    trigger: {
                                        type: string;
                                        example: {
                                            type: string;
                                        };
                                    };
                                    flowData: {
                                        type: string;
                                        properties: {
                                            nodes: {
                                                type: string;
                                                items: {
                                                    $ref: string;
                                                };
                                            };
                                            edges: {
                                                type: string;
                                                items: {
                                                    $ref: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        '/sequences/{id}': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
            put: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    name: {
                                        type: string;
                                        example: string;
                                    };
                                    description: {
                                        type: string;
                                        nullable: boolean;
                                    };
                                    trigger: {
                                        type: string;
                                    };
                                    flowData: {
                                        type: string;
                                    };
                                    isActive: {
                                        type: string;
                                        example: boolean;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
            delete: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/sequences/{id}/start': {
            post: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    contactId: {
                                        type: string;
                                        example: number;
                                        description: string;
                                    };
                                    conversationId: {
                                        type: string;
                                        example: number;
                                        description: string;
                                    };
                                    context: {
                                        type: string;
                                        example: {
                                            nome: string;
                                        };
                                        description: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        executionId: {
                                            type: string;
                                            example: number;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/sequences/{id}/executions': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: ({
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                        enum?: undefined;
                        default?: undefined;
                    };
                    description: string;
                } | {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                        enum: string[];
                        default?: undefined;
                    };
                    description: string;
                } | {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                        default: number;
                        enum?: undefined;
                    };
                    description: string;
                })[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        data: {
                                            type: string;
                                            items: {
                                                type: string;
                                                properties: {
                                                    conversationId: {
                                                        type: string;
                                                        example: number;
                                                    };
                                                    contactPhone: {
                                                        type: string;
                                                        nullable: boolean;
                                                        example: string;
                                                    };
                                                    contactName: {
                                                        type: string;
                                                        nullable: boolean;
                                                        example: string;
                                                    };
                                                    status: {
                                                        type: string;
                                                        example: string;
                                                    };
                                                    currentNodeId: {
                                                        type: string;
                                                        nullable: boolean;
                                                        example: string;
                                                    };
                                                    lastUpdated: {
                                                        type: string;
                                                        format: string;
                                                    };
                                                    totalExecutions: {
                                                        type: string;
                                                        example: number;
                                                    };
                                                    executions: {
                                                        type: string;
                                                        items: {
                                                            $ref: string;
                                                        };
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        '/sequences/executions/{id}': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/sequences/executions/{id}/cancel': {
            post: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/permissions/users': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            type: string;
                                            items: {
                                                type: string;
                                                properties: {
                                                    id: {
                                                        type: string;
                                                    };
                                                    name: {
                                                        type: string;
                                                    };
                                                    email: {
                                                        type: string;
                                                    };
                                                    role: {
                                                        type: string;
                                                    };
                                                    permissions: {
                                                        $ref: string;
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        '/permissions/user/{userId}': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
            put: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    kanbanAccess: {
                                        type: string;
                                    };
                                    conexoesAccess: {
                                        type: string;
                                    };
                                    chatsInternosAccess: {
                                        type: string;
                                    };
                                    projectsAccess: {
                                        type: string;
                                    };
                                    chatbotFlowsAccess: {
                                        type: string;
                                    };
                                    permissoesAccess: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        '/permissions/me': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        '/permissions/resources': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            type: string;
                                            items: {
                                                type: string;
                                                properties: {
                                                    key: {
                                                        type: string;
                                                        example: string;
                                                    };
                                                    name: {
                                                        type: string;
                                                        example: string;
                                                    };
                                                    description: {
                                                        type: string;
                                                        example: string;
                                                    };
                                                    icon: {
                                                        type: string;
                                                        example: string;
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        '/account-permissions': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        data: {
                                            type: string;
                                            items: {
                                                type: string;
                                                properties: {
                                                    id: {
                                                        type: string;
                                                    };
                                                    name: {
                                                        type: string;
                                                    };
                                                    status: {
                                                        type: string;
                                                    };
                                                    permissions: {
                                                        $ref: string;
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '403': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/account-permissions/{accountId}': {
            put: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    kanbanEnabled: {
                                        type: string;
                                        description: string;
                                        example: boolean;
                                    };
                                    chatsInternosEnabled: {
                                        type: string;
                                        description: string;
                                        example: boolean;
                                    };
                                    conexoesEnabled: {
                                        type: string;
                                        description: string;
                                        example: boolean;
                                    };
                                    projectsEnabled: {
                                        type: string;
                                        description: string;
                                        example: boolean;
                                    };
                                    chatbotFlowsEnabled: {
                                        type: string;
                                        description: string;
                                        example: boolean;
                                    };
                                    wavoipEnabled: {
                                        type: string;
                                        description: string;
                                        example: boolean;
                                    };
                                    appointmentsEnabled: {
                                        type: string;
                                        description: string;
                                        example: boolean;
                                    };
                                    disparadorEnabled: {
                                        type: string;
                                        description: string;
                                        example: boolean;
                                    };
                                    allowedProviders: {
                                        type: string;
                                        description: string;
                                        properties: {
                                            evolution: {
                                                type: string;
                                                example: boolean;
                                            };
                                            waha: {
                                                type: string;
                                                example: boolean;
                                            };
                                            uazapi: {
                                                type: string;
                                                example: boolean;
                                            };
                                        };
                                        example: {
                                            evolution: boolean;
                                            waha: boolean;
                                            uazapi: boolean;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '403': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/account-permissions/check/{accountId}': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        data: {
                                            type: string;
                                            properties: {
                                                kanbanEnabled: {
                                                    type: string;
                                                };
                                                chatsInternosEnabled: {
                                                    type: string;
                                                };
                                                conexoesEnabled: {
                                                    type: string;
                                                };
                                                projectsEnabled: {
                                                    type: string;
                                                };
                                                chatbotFlowsEnabled: {
                                                    type: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        '/api-tokens': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    ApiAccessToken: never[];
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                        };
                                        data: {
                                            type: string;
                                            items: {
                                                type: string;
                                                properties: {
                                                    id: {
                                                        type: string;
                                                    };
                                                    name: {
                                                        type: string;
                                                    };
                                                    token: {
                                                        type: string;
                                                    };
                                                    permissions: {
                                                        type: string;
                                                        items: {
                                                            type: string;
                                                        };
                                                    };
                                                    isActive: {
                                                        type: string;
                                                    };
                                                    lastUsedAt: {
                                                        type: string;
                                                        format: string;
                                                        nullable: boolean;
                                                    };
                                                    expiresAt: {
                                                        type: string;
                                                        format: string;
                                                        nullable: boolean;
                                                    };
                                                    createdAt: {
                                                        type: string;
                                                        format: string;
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
            post: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    ApiAccessToken: never[];
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    name: {
                                        type: string;
                                        example: string;
                                        description: string;
                                    };
                                    permissions: {
                                        type: string;
                                        items: {
                                            type: string;
                                        };
                                        example: string[];
                                        description: string;
                                    };
                                    expiresAt: {
                                        type: string;
                                        format: string;
                                        nullable: boolean;
                                        description: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                        };
                                        data: {
                                            type: string;
                                            properties: {
                                                id: {
                                                    type: string;
                                                };
                                                name: {
                                                    type: string;
                                                };
                                                token: {
                                                    type: string;
                                                    description: string;
                                                };
                                                permissions: {
                                                    type: string;
                                                    items: {
                                                        type: string;
                                                    };
                                                };
                                                isActive: {
                                                    type: string;
                                                };
                                                expiresAt: {
                                                    type: string;
                                                    format: string;
                                                    nullable: boolean;
                                                };
                                                createdAt: {
                                                    type: string;
                                                    format: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '403': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/api-tokens/{id}': {
            put: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    ApiAccessToken: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    name: {
                                        type: string;
                                    };
                                    permissions: {
                                        type: string;
                                        items: {
                                            type: string;
                                        };
                                    };
                                    isActive: {
                                        type: string;
                                    };
                                    expiresAt: {
                                        type: string;
                                        format: string;
                                        nullable: boolean;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                        };
                                        data: {
                                            type: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                    };
                };
            };
            delete: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    ApiAccessToken: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                    };
                };
            };
        };
        '/api-tokens/permissions/available': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: never[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    items: {
                                        type: string;
                                        properties: {
                                            value: {
                                                type: string;
                                                example: string;
                                            };
                                            label: {
                                                type: string;
                                                example: string;
                                            };
                                            description: {
                                                type: string;
                                                example: string;
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        '/projects': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    schema: {
                        type: string;
                        enum: string[];
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            type: string;
                                            items: {
                                                $ref: string;
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
            post: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    name: {
                                        type: string;
                                        example: string;
                                    };
                                    description: {
                                        type: string;
                                        example: string;
                                    };
                                    status: {
                                        type: string;
                                        enum: string[];
                                        default: string;
                                    };
                                    deadline: {
                                        type: string;
                                        format: string;
                                    };
                                    color: {
                                        type: string;
                                        example: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/projects/{id}': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
            put: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    name: {
                                        type: string;
                                    };
                                    description: {
                                        type: string;
                                    };
                                    status: {
                                        type: string;
                                        enum: string[];
                                    };
                                    deadline: {
                                        type: string;
                                        format: string;
                                    };
                                    color: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
            delete: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/projects/{id}/details': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        '/projects/{id}/stats': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        '/projects/{id}/conversations/{conversationId}': {
            post: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
            delete: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/projects/{projectId}/tasks': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: ({
                    BearerAuth: never[];
                    ApiAccessToken?: undefined;
                } | {
                    ApiAccessToken: never[];
                    BearerAuth?: undefined;
                })[];
                parameters: ({
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                        enum?: undefined;
                    };
                    description: string;
                } | {
                    in: string;
                    name: string;
                    schema: {
                        type: string;
                        enum: string[];
                    };
                    description: string;
                    required?: undefined;
                } | {
                    in: string;
                    name: string;
                    schema: {
                        type: string;
                        enum?: undefined;
                    };
                    description: string;
                    required?: undefined;
                })[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            type: string;
                                            items: {
                                                $ref: string;
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
            post: {
                summary: string;
                description: string;
                tags: string[];
                security: ({
                    BearerAuth: never[];
                    ApiAccessToken?: undefined;
                } | {
                    ApiAccessToken: never[];
                    BearerAuth?: undefined;
                })[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    title: {
                                        type: string;
                                        minLength: number;
                                        example: string;
                                    };
                                    description: {
                                        type: string;
                                    };
                                    status: {
                                        type: string;
                                        enum: string[];
                                        default: string;
                                    };
                                    priority: {
                                        type: string;
                                        enum: string[];
                                    };
                                    dueDate: {
                                        type: string;
                                        format: string;
                                    };
                                    milestoneId: {
                                        type: string;
                                    };
                                    assignedTo: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/projects/{projectId}/tasks/{id}': {
            put: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    title: {
                                        type: string;
                                    };
                                    description: {
                                        type: string;
                                    };
                                    status: {
                                        type: string;
                                        enum: string[];
                                    };
                                    priority: {
                                        type: string;
                                        enum: string[];
                                    };
                                    dueDate: {
                                        type: string;
                                        format: string;
                                    };
                                    milestoneId: {
                                        type: string;
                                    };
                                    assignedTo: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
            delete: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/projects/{projectId}/tasks/{id}/status': {
            patch: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    status: {
                                        type: string;
                                        enum: string[];
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        '/projects/{projectId}/tasks/{id}/move': {
            patch: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    milestoneId: {
                                        type: string;
                                        nullable: boolean;
                                        description: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        '/projects/{projectId}/milestones': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            type: string;
                                            items: {
                                                $ref: string;
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
            post: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    name: {
                                        type: string;
                                        example: string;
                                    };
                                    description: {
                                        type: string;
                                    };
                                    dueDate: {
                                        type: string;
                                        format: string;
                                    };
                                    order: {
                                        type: string;
                                        default: number;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        '/projects/{projectId}/milestones/{id}': {
            put: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    name: {
                                        type: string;
                                    };
                                    description: {
                                        type: string;
                                    };
                                    dueDate: {
                                        type: string;
                                        format: string;
                                    };
                                    order: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
            delete: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/projects/{projectId}/members': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            type: string;
                                            items: {
                                                $ref: string;
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
            post: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    userId: {
                                        type: string;
                                        example: number;
                                    };
                                    role: {
                                        type: string;
                                        enum: string[];
                                        default: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/projects/{projectId}/members/{id}': {
            put: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    role: {
                                        type: string;
                                        enum: string[];
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
            delete: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/projects/{projectId}/files': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            type: string;
                                            items: {
                                                $ref: string;
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
            post: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'multipart/form-data': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    file: {
                                        type: string;
                                        format: string;
                                        description: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/projects/{projectId}/files/{id}/download': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/octet-stream': {
                                schema: {
                                    type: string;
                                    format: string;
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/projects/{projectId}/files/{id}': {
            delete: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/projects/{projectId}/discussions': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            type: string;
                                            items: {
                                                $ref: string;
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
            post: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    subject: {
                                        type: string;
                                        example: string;
                                    };
                                    description: {
                                        type: string;
                                        example: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        '/projects/{projectId}/discussions/{id}': {
            put: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    subject: {
                                        type: string;
                                    };
                                    description: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
            delete: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/projects/{projectId}/discussions/{id}/comments': {
            post: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    content: {
                                        type: string;
                                        example: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                            example: boolean;
                                        };
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        '/projects/{projectId}/discussions/{discussionId}/comments/{id}': {
            delete: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/appointments': {
            servers: {
                url: string;
                description: string;
            }[];
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: ({
                    in: string;
                    name: string;
                    schema: {
                        type: string;
                        format: string;
                        enum?: undefined;
                        default?: undefined;
                    };
                    description: string;
                } | {
                    in: string;
                    name: string;
                    schema: {
                        type: string;
                        format?: undefined;
                        enum?: undefined;
                        default?: undefined;
                    };
                    description: string;
                } | {
                    in: string;
                    name: string;
                    schema: {
                        type: string;
                        enum: string[];
                        format?: undefined;
                        default?: undefined;
                    };
                    description: string;
                } | {
                    in: string;
                    name: string;
                    schema: {
                        type: string;
                        default: number;
                        format?: undefined;
                        enum?: undefined;
                    };
                    description: string;
                })[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
            post: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    patientId: {
                                        type: string;
                                    };
                                    practitionerId: {
                                        type: string;
                                    };
                                    serviceId: {
                                        type: string;
                                    };
                                    appointmentAt: {
                                        type: string;
                                        format: string;
                                    };
                                    healthPlanId: {
                                        type: string;
                                    };
                                    notes: {
                                        type: string;
                                    };
                                    price: {
                                        type: string;
                                    };
                                    location: {
                                        type: string;
                                    };
                                    createdBy: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '201': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                    };
                    '401': {
                        description: string;
                    };
                    '409': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
        };
        '/appointments/calendar': {
            servers: {
                url: string;
                description: string;
            }[];
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: ({
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                        format: string;
                    };
                    description: string;
                } | {
                    in: string;
                    name: string;
                    schema: {
                        type: string;
                        format?: undefined;
                    };
                    description: string;
                    required?: undefined;
                })[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                    };
                    '401': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
        };
        '/appointments/{appointmentId}': {
            servers: {
                url: string;
                description: string;
            }[];
            get: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '404': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
            put: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    appointmentAt: {
                                        type: string;
                                        format: string;
                                    };
                                    endsAt: {
                                        type: string;
                                        format: string;
                                    };
                                    practitionerId: {
                                        type: string;
                                    };
                                    serviceId: {
                                        type: string;
                                    };
                                    healthPlanId: {
                                        type: string;
                                    };
                                    notes: {
                                        type: string;
                                    };
                                    price: {
                                        type: string;
                                    };
                                    location: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '404': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
            delete: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '404': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
        };
        '/appointments/{appointmentId}/status': {
            servers: {
                url: string;
                description: string;
            }[];
            patch: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    status: {
                                        type: string;
                                        enum: string[];
                                    };
                                    cancelReason: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                    };
                    '401': {
                        description: string;
                    };
                    '404': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
        };
        '/appointments/patients': {
            servers: {
                url: string;
                description: string;
            }[];
            get: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: ({
                    in: string;
                    name: string;
                    schema: {
                        type: string;
                        default?: undefined;
                    };
                    description: string;
                } | {
                    in: string;
                    name: string;
                    schema: {
                        type: string;
                        default: number;
                    };
                    description?: undefined;
                })[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
            post: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    name: {
                                        type: string;
                                    };
                                    phone: {
                                        type: string;
                                    };
                                    email: {
                                        type: string;
                                        format: string;
                                    };
                                    cpf: {
                                        type: string;
                                    };
                                    birthDate: {
                                        type: string;
                                        format: string;
                                    };
                                    address: {
                                        type: string;
                                    };
                                    healthPlanId: {
                                        type: string;
                                    };
                                    notes: {
                                        type: string;
                                    };
                                    chatwootContactId: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '201': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                    };
                    '401': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
        };
        '/appointments/patients/by-phone/{phone}': {
            servers: {
                url: string;
                description: string;
            }[];
            get: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
        };
        '/appointments/patients/{patientId}': {
            servers: {
                url: string;
                description: string;
            }[];
            get: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '404': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
            put: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    name: {
                                        type: string;
                                    };
                                    phone: {
                                        type: string;
                                    };
                                    email: {
                                        type: string;
                                        format: string;
                                    };
                                    cpf: {
                                        type: string;
                                    };
                                    birthDate: {
                                        type: string;
                                        format: string;
                                    };
                                    address: {
                                        type: string;
                                    };
                                    healthPlanId: {
                                        type: string;
                                    };
                                    notes: {
                                        type: string;
                                    };
                                    chatwootContactId: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '404': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
            delete: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '403': {
                        description: string;
                    };
                    '404': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
        };
        '/appointments/practitioners': {
            servers: {
                url: string;
                description: string;
            }[];
            get: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
            post: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    name: {
                                        type: string;
                                    };
                                    specialty: {
                                        type: string;
                                    };
                                    registrationNo: {
                                        type: string;
                                    };
                                    email: {
                                        type: string;
                                        format: string;
                                    };
                                    phone: {
                                        type: string;
                                    };
                                    color: {
                                        type: string;
                                        example: string;
                                    };
                                    workingHours: {
                                        type: string;
                                        items: {
                                            type: string;
                                        };
                                        description: string;
                                    };
                                    bufferMinutes: {
                                        type: string;
                                        default: number;
                                    };
                                    lunchStart: {
                                        type: string;
                                        example: string;
                                    };
                                    lunchEnd: {
                                        type: string;
                                        example: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '201': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                    };
                    '401': {
                        description: string;
                    };
                    '403': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
        };
        '/appointments/practitioners/{practitionerId}': {
            servers: {
                url: string;
                description: string;
            }[];
            get: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '404': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
            put: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    name: {
                                        type: string;
                                    };
                                    specialty: {
                                        type: string;
                                    };
                                    registrationNo: {
                                        type: string;
                                    };
                                    email: {
                                        type: string;
                                        format: string;
                                    };
                                    phone: {
                                        type: string;
                                    };
                                    color: {
                                        type: string;
                                    };
                                    workingHours: {
                                        type: string;
                                        items: {
                                            type: string;
                                        };
                                    };
                                    bufferMinutes: {
                                        type: string;
                                    };
                                    lunchStart: {
                                        type: string;
                                    };
                                    lunchEnd: {
                                        type: string;
                                    };
                                    isActive: {
                                        type: string;
                                    };
                                    serviceIds: {
                                        type: string;
                                        items: {
                                            type: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '403': {
                        description: string;
                    };
                    '404': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
            delete: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '403': {
                        description: string;
                    };
                    '404': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
        };
        '/appointments/practitioners/{practitionerId}/slots': {
            servers: {
                url: string;
                description: string;
            }[];
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: ({
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                        format?: undefined;
                    };
                    description: string;
                } | {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                        format: string;
                    };
                    description: string;
                } | {
                    in: string;
                    name: string;
                    schema: {
                        type: string;
                        format?: undefined;
                    };
                    description: string;
                    required?: undefined;
                })[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                    };
                    '401': {
                        description: string;
                    };
                    '404': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
        };
        '/appointments/practitioners/{practitionerId}/blocks': {
            servers: {
                url: string;
                description: string;
            }[];
            post: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    startsAt: {
                                        type: string;
                                        format: string;
                                    };
                                    endsAt: {
                                        type: string;
                                        format: string;
                                    };
                                    reason: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '201': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                    };
                    '401': {
                        description: string;
                    };
                    '403': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
        };
        '/appointments/practitioners/{practitionerId}/blocks/{blockId}': {
            servers: {
                url: string;
                description: string;
            }[];
            delete: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '403': {
                        description: string;
                    };
                    '404': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
        };
        '/appointments/services': {
            servers: {
                url: string;
                description: string;
            }[];
            get: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
            post: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    name: {
                                        type: string;
                                    };
                                    description: {
                                        type: string;
                                    };
                                    durationMinutes: {
                                        type: string;
                                        default: number;
                                    };
                                    preparationMinutes: {
                                        type: string;
                                        default: number;
                                    };
                                    color: {
                                        type: string;
                                        example: string;
                                    };
                                    defaultPrice: {
                                        type: string;
                                    };
                                    isOnline: {
                                        type: string;
                                        default: boolean;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '201': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                    };
                    '401': {
                        description: string;
                    };
                    '403': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
        };
        '/appointments/services/{serviceId}': {
            servers: {
                url: string;
                description: string;
            }[];
            get: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '404': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
            put: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    name: {
                                        type: string;
                                    };
                                    description: {
                                        type: string;
                                    };
                                    durationMinutes: {
                                        type: string;
                                    };
                                    preparationMinutes: {
                                        type: string;
                                    };
                                    color: {
                                        type: string;
                                    };
                                    defaultPrice: {
                                        type: string;
                                    };
                                    isOnline: {
                                        type: string;
                                    };
                                    isActive: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '403': {
                        description: string;
                    };
                    '404': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
            delete: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '403': {
                        description: string;
                    };
                    '404': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
        };
        '/appointments/services/{serviceId}/reminders': {
            servers: {
                url: string;
                description: string;
            }[];
            get: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '404': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
            post: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    label: {
                                        type: string;
                                    };
                                    timing: {
                                        type: string;
                                        enum: string[];
                                        default: string;
                                    };
                                    daysBefore: {
                                        type: string;
                                        default: number;
                                    };
                                    hoursBefore: {
                                        type: string;
                                        default: number;
                                    };
                                    minutesBefore: {
                                        type: string;
                                        default: number;
                                    };
                                    message: {
                                        type: string;
                                    };
                                    inboxId: {
                                        type: string;
                                    };
                                    isActive: {
                                        type: string;
                                        default: boolean;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '201': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                    };
                    '401': {
                        description: string;
                    };
                    '403': {
                        description: string;
                    };
                    '404': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
        };
        '/appointments/services/{serviceId}/reminders/{reminderId}': {
            servers: {
                url: string;
                description: string;
            }[];
            put: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    label: {
                                        type: string;
                                    };
                                    timing: {
                                        type: string;
                                        enum: string[];
                                    };
                                    daysBefore: {
                                        type: string;
                                    };
                                    hoursBefore: {
                                        type: string;
                                    };
                                    minutesBefore: {
                                        type: string;
                                    };
                                    message: {
                                        type: string;
                                    };
                                    inboxId: {
                                        type: string;
                                    };
                                    isActive: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '403': {
                        description: string;
                    };
                    '404': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
            delete: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '403': {
                        description: string;
                    };
                    '404': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
        };
        '/appointments/health-plans': {
            servers: {
                url: string;
                description: string;
            }[];
            get: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
            post: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    name: {
                                        type: string;
                                    };
                                    type: {
                                        type: string;
                                        enum: string[];
                                        default: string;
                                    };
                                    ansCode: {
                                        type: string;
                                    };
                                    paymentDays: {
                                        type: string;
                                        default: number;
                                    };
                                    requiresAuth: {
                                        type: string;
                                        default: boolean;
                                    };
                                    sessionsLimit: {
                                        type: string;
                                    };
                                    notes: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '201': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                    };
                    '401': {
                        description: string;
                    };
                    '403': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
        };
        '/appointments/health-plans/{healthPlanId}': {
            servers: {
                url: string;
                description: string;
            }[];
            get: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '404': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
            put: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    name: {
                                        type: string;
                                    };
                                    type: {
                                        type: string;
                                    };
                                    ansCode: {
                                        type: string;
                                    };
                                    paymentDays: {
                                        type: string;
                                    };
                                    requiresAuth: {
                                        type: string;
                                    };
                                    sessionsLimit: {
                                        type: string;
                                    };
                                    notes: {
                                        type: string;
                                    };
                                    isActive: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '403': {
                        description: string;
                    };
                    '404': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
            delete: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '403': {
                        description: string;
                    };
                    '404': {
                        description: string;
                    };
                    '409': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
        };
        '/appointments/waiting-list': {
            servers: {
                url: string;
                description: string;
            }[];
            get: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: ({
                    in: string;
                    name: string;
                    schema: {
                        type: string;
                        default?: undefined;
                    };
                    description: string;
                } | {
                    in: string;
                    name: string;
                    schema: {
                        type: string;
                        default: number;
                    };
                    description?: undefined;
                })[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
            post: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    patientId: {
                                        type: string;
                                    };
                                    practitionerId: {
                                        type: string;
                                    };
                                    serviceId: {
                                        type: string;
                                    };
                                    preferredDays: {
                                        type: string;
                                        items: {
                                            type: string;
                                        };
                                        description: string;
                                    };
                                    preferredPeriod: {
                                        type: string;
                                        enum: string[];
                                    };
                                    priority: {
                                        type: string;
                                        enum: string[];
                                        default: string;
                                    };
                                    notes: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '201': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                    };
                    '401': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
        };
        '/appointments/waiting-list/{waitingListId}': {
            servers: {
                url: string;
                description: string;
            }[];
            put: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    preferredDays: {
                                        type: string;
                                        items: {
                                            type: string;
                                        };
                                    };
                                    preferredPeriod: {
                                        type: string;
                                    };
                                    priority: {
                                        type: string;
                                        enum: string[];
                                    };
                                    notes: {
                                        type: string;
                                    };
                                    isActive: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '404': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
            delete: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '404': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
        };
        '/appointments/config': {
            servers: {
                url: string;
                description: string;
            }[];
            get: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
            put: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    slug: {
                                        type: string;
                                        description: string;
                                    };
                                    clinicName: {
                                        type: string;
                                    };
                                    timezone: {
                                        type: string;
                                        example: string;
                                    };
                                    onlineBookingEnabled: {
                                        type: string;
                                    };
                                    minAdvanceHours: {
                                        type: string;
                                        description: string;
                                    };
                                    maxAdvanceDays: {
                                        type: string;
                                        description: string;
                                    };
                                    requireManualApproval: {
                                        type: string;
                                    };
                                    reminderInboxId: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '403': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
        };
        '/appointments/config/reminders': {
            servers: {
                url: string;
                description: string;
            }[];
            get: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
            put: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    confirmationEnabled: {
                                        type: string;
                                    };
                                    reminder24hEnabled: {
                                        type: string;
                                    };
                                    reminder2hEnabled: {
                                        type: string;
                                    };
                                    postAppointmentEnabled: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '403': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
        };
        '/appointments/reports/overview': {
            servers: {
                url: string;
                description: string;
            }[];
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    schema: {
                        type: string;
                        format: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
        };
        '/appointments/reports/by-practitioner': {
            servers: {
                url: string;
                description: string;
            }[];
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    schema: {
                        type: string;
                        format: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
        };
        '/appointments/reports/missed': {
            servers: {
                url: string;
                description: string;
            }[];
            get: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    schema: {
                        type: string;
                        format: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                    '500': {
                        description: string;
                    };
                };
            };
        };
    };
};
//# sourceMappingURL=swagger.d.ts.map