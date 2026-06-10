#!/usr/bin/env node

/**
 * MVP seguro para campanha laticinios -> ChatHook.
 *
 * Padrao: dry-run. Nao envia nada sem --send.
 * Use --create-draft para criar a campanha e importar contatos sem iniciar envio.
 *
 * Env necessarias para envio real:
 * - CHATHOOK_URL=https://...
 * - CHATHOOK_TOKEN=...
 * - CHATHOOK_INBOX_ID=194 (padrao: Rafael / +55 11 95558-5460)
 * - CHATHOOK_EMAIL_INBOX_ID=174 (padrao: Email Fullweb / suporte@fullweb.com.br)
 * - CHATHOOK_ACCOUNT_ID=123 (opcional, vira header X-Account-ID)
 *
 * Entrada:
 * - arquivo Markdown gerado em grupos-laticinios.md
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const args = new Set(process.argv.slice(2));
const send = args.has('--send');
const createDraft = args.has('--create-draft');
const groupArg = process.argv.find((arg) => arg.startsWith('--group='));
const groupNumber = groupArg ? Number(groupArg.split('=')[1]) : 1;

const baseDir = path.resolve('/root/.openclaw/workspace/memory/projects/laticinios-prospeccao');
const inputPath = path.join(baseDir, 'grupos-laticinios.md');
const outDir = path.join(baseDir, 'automation', 'out');

const now = new Date();
const stamp = now.toISOString().replace(/[:.]/g, '-');
const businessWindow = {
  start: '08:00',
  end: '18:00',
  timezone: 'America/Sao_Paulo',
};

const campaignIdentity = {
  senderEmail: 'suporte@fullweb.com.br',
  emailInboxId: 174,
  emailLabel: 'Email Fullweb',
  whatsappInboxId: 194,
  whatsappLabel: 'Rafael',
  whatsappNumber: '+55 11 95558-5460',
};

const initialEmail = {
  subject: '7 dias gratis para organizar pedidos do seu laticinio no WhatsApp',
  body: [
    'Ola, tudo bem?',
    '',
    'Sou Richard Portela. Trabalho com automacao comercial e organizacao de atendimento pelo WhatsApp para empresas de alimentos e laticinios.',
    '',
    'Estou liberando para alguns laticinios um teste de 7 dias do ChatHook para organizar pedidos, entregas, cobrancas e recompra em um funil simples.',
    '',
    'A ideia e ajudar sua equipe a nao perder pedidos no WhatsApp e lembrar automaticamente quem precisa de retorno.',
    '',
    'Posso te enviar um exemplo pratico de como ficaria esse funil?',
    '',
    'Richard Portela',
    'ChatHook - WhatsApp organizado como CRM comercial',
  ].join('\n'),
};

const initialMessage = [
  'Olá, tudo bem? Sou Richard Portela.',
  'Estou oferecendo para alguns laticínios um teste de 7 dias do ChatHook para organizar pedidos, clientes, cobrança e recompra pelo WhatsApp.',
  'A ideia é simples: separar pedidos, entregas, cobranças e recompra em um funil.',
  'Posso te mandar um exemplo prático?'
].join(' ');

const followUpMessage = [
  'Passando só para reforçar: posso te mostrar um exemplo simples de como organizar os pedidos do laticínio pelo WhatsApp em 7 dias sem custo?'
].join(' ');

function normalizeBrazilPhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length > 10) digits = digits.slice(1);
  if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
    digits = `55${digits}`;
  }
  return digits;
}

function parseMoney(value) {
  if (!value || value === '-') return null;
  const n = Number(String(value).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function parseLeadLine(line) {
  const match = line.match(/^- (\d+)\. (.*?) \| (.*?)\/(.*?) \| tel: (.*?) \| valor: R\$ (.*?) \| ultima compra: (.*?) \| potencial: (.*)$/);
  if (!match) return null;
  const [, rank, empresa, cidade, estado, phoneRaw, valorRaw, ultimaCompra, potencial] = match;
  const phone = normalizeBrazilPhone(phoneRaw);
  if (phone.length < 8) return null;
  return {
    rank: Number(rank),
    name: empresa.trim(),
    phone,
    extraData: {
      empresa: empresa.trim(),
      cidade: cidade.trim(),
      estado: estado.trim(),
      valor: parseMoney(valorRaw.trim()),
      ultima_compra: ultimaCompra.trim() === '-' ? null : ultimaCompra.trim(),
      potencial: potencial.trim(),
      grupo: groupNumber,
      origem: 'campanha_laticinios_7dias',
    },
  };
}

function extractGroup(markdown, group) {
  const marker = `## Grupo ${group} -`;
  const start = markdown.indexOf(marker);
  if (start === -1) {
    throw new Error(`Grupo ${group} nao encontrado em ${inputPath}`);
  }
  const rest = markdown.slice(start);
  const next = rest.indexOf('\n## Grupo ', 1);
  const block = next === -1 ? rest : rest.slice(0, next);
  return block
    .split('\n')
    .map(parseLeadLine)
    .filter(Boolean)
    .slice(0, 30);
}

async function requestJson(url, token, method, body, accountId) {
  const headers = {
    'Content-Type': 'application/json',
    api_access_token: token,
  };
  if (accountId) headers['X-Account-ID'] = accountId;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${method} ${url} -> ${res.status}: ${JSON.stringify(data).slice(0, 500)}`);
  }
  return data;
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });

  const markdown = await fs.readFile(inputPath, 'utf8');
  const leads = extractGroup(markdown, groupNumber);

  const chathookUrl = process.env.CHATHOOK_URL?.replace(/\/$/, '');
  const token = process.env.CHATHOOK_TOKEN;
  const inboxId = process.env.CHATHOOK_INBOX_ID ? Number(process.env.CHATHOOK_INBOX_ID) : campaignIdentity.whatsappInboxId;
  const emailInboxId = process.env.CHATHOOK_EMAIL_INBOX_ID ? Number(process.env.CHATHOOK_EMAIL_INBOX_ID) : campaignIdentity.emailInboxId;
  const accountId = process.env.CHATHOOK_ACCOUNT_ID || '';

  const campaignPayload = {
    name: `Laticinios - 7 dias gratis - Grupo ${groupNumber} - ${now.toISOString().slice(0, 10)}`,
    description: 'Campanha controlada de 30 leads/dia. Abordagem consultiva, sem mencionar Newvac.',
    sourceType: 'csv',
    sourceConfig: {
      origin: 'supabase_clients',
      group: groupNumber,
      limit: 30,
      businessWindow,
      identity: campaignIdentity,
      email: initialEmail,
    },
    inboxIds: inboxId ? [inboxId] : [],
    rotationMode: 'round_robin',
    delayMinSeconds: 180,
    delayMaxSeconds: 420,
    pauseEveryN: 10,
    pauseForSeconds: 1800,
    windowStart: businessWindow.start,
    windowEnd: businessWindow.end,
    allowedDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
    followUpEnabled: true,
    followUpConfig: {
      waitHours: 24,
      maxAttempts: 1,
      messages: [followUpMessage],
    },
    enableSpintax: false,
    metadata: {
      senderEmail: campaignIdentity.senderEmail,
      emailInboxId,
      emailLabel: campaignIdentity.emailLabel,
      whatsappLabel: campaignIdentity.whatsappLabel,
      whatsappNumber: campaignIdentity.whatsappNumber,
    },
    messages: [
      {
        type: 'text',
        content: initialMessage,
      },
    ],
  };

  const contactsPayload = leads.map((lead) => ({
    phone: lead.phone,
    name: lead.name,
    extraData: lead.extraData,
  }));

  const dryRunReport = {
    mode: send ? 'send' : createDraft ? 'create-draft' : 'dry-run',
    createdAt: now.toISOString(),
    group: groupNumber,
    totalLeads: leads.length,
    campaignPayload,
    contactsPreview: contactsPayload.slice(0, 30),
    safety: {
      dailyLimit: 30,
      senderEmail: campaignIdentity.senderEmail,
      emailInboxId,
      emailLabel: campaignIdentity.emailLabel,
      emailFirst: true,
      whatsappInboxId: inboxId,
      whatsappLabel: campaignIdentity.whatsappLabel,
      whatsappNumber: campaignIdentity.whatsappNumber,
      window: `${businessWindow.start}-${businessWindow.end}`,
      timezone: businessWindow.timezone,
      days: 'mon-fri',
      pauseEveryN: 10,
      pauseForSeconds: 1800,
      followUpAfterHours: 24,
      maxFollowUpAttempts: 1,
      stopOnReply: true,
      blacklistSupportedByChatHook: true,
    },
  };

  const reportPath = path.join(outDir, `campaign-group-${groupNumber}-${stamp}.json`);
  await fs.writeFile(reportPath, JSON.stringify(dryRunReport, null, 2));

  if (!send && !createDraft) {
    console.log(JSON.stringify({
      ok: true,
      mode: 'dry-run',
      group: groupNumber,
      totalLeads: leads.length,
      reportPath,
      next: 'Revise o JSON. Para envio real, defina CHATHOOK_URL e CHATHOOK_TOKEN; CHATHOOK_INBOX_ID pode sobrescrever o padrao 194. Rode com --send.',
    }, null, 2));
    return;
  }

  if (!chathookUrl || !token || !inboxId) {
    throw new Error('Para --send, defina CHATHOOK_URL e CHATHOOK_TOKEN. CHATHOOK_INBOX_ID e opcional; padrao 194.');
  }

  const created = await requestJson(`${chathookUrl}/api/campaigns`, token, 'POST', campaignPayload, accountId);
  const campaignId = created?.data?.id;
  if (!campaignId) {
    throw new Error(`Campanha criada sem id esperado: ${JSON.stringify(created)}`);
  }

  const imported = await requestJson(`${chathookUrl}/api/campaigns/${campaignId}/import-contacts`, token, 'POST', {
    contacts: contactsPayload,
  }, accountId);

  if (createDraft && !send) {
    const draftReportPath = path.join(outDir, `campaign-group-${groupNumber}-${stamp}-draft.json`);
    await fs.writeFile(draftReportPath, JSON.stringify({ created, imported }, null, 2));

    console.log(JSON.stringify({
      ok: true,
      mode: 'create-draft',
      campaignId,
      imported,
      reportPath,
      draftReportPath,
      next: 'Campanha criada/importada em rascunho. Nao foi iniciada.',
    }, null, 2));
    return;
  }

  const start = await requestJson(`${chathookUrl}/api/campaigns/${campaignId}/start`, token, 'POST', {}, accountId);

  const sentReportPath = path.join(outDir, `campaign-group-${groupNumber}-${stamp}-sent.json`);
  await fs.writeFile(sentReportPath, JSON.stringify({ created, imported, start }, null, 2));

  console.log(JSON.stringify({
    ok: true,
    mode: 'send',
    campaignId,
    imported,
    start,
    reportPath,
    sentReportPath,
  }, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err.message }, null, 2));
  process.exit(1);
});
