"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evoGoPool = exports.chatwootPool = void 0;
const client_1 = require("@prisma/client");
const pg_1 = require("pg");
const prisma = new client_1.PrismaClient();
// Conexão com o banco de dados do Chatwoot para queries diretas
const chatwootDbUrl = process.env.CHATWOOT_DATABASE_URL || '';
exports.chatwootPool = chatwootDbUrl
    ? new pg_1.Pool({ connectionString: chatwootDbUrl })
    : null;
// Conexão com o banco de dados da Evolution Go para queries diretas
const evoGoDbUrl = process.env.EVOGO_DATABASE_URL || '';
exports.evoGoPool = evoGoDbUrl
    ? new pg_1.Pool({ connectionString: evoGoDbUrl })
    : null;
exports.default = prisma;
//# sourceMappingURL=database.js.map