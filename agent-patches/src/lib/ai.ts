import fetch from 'node-fetch';

interface InterpretArgs {
  message: string;
  siteSlug: string;
  fromPhone: string;
}

interface Interpretation {
  action: string;
  payload: any;
  confidence: number;
  requiresApproval: boolean;
}

const ALLOWED_ACTIONS = ['update_contact', 'create_draft', 'noop', 'schedule_post', 'publish_post', 'delete_post', 'update_site_settings'];
const SENSITIVE_ACTIONS = ['publish_post', 'delete_post', 'update_site_settings'];
const SAFE_AUTO_EXECUTE = ['update_contact', 'create_draft', 'noop', 'schedule_post'];

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini';
const DEFAULT_TEMPERATURE = Number(process.env.OPENAI_TEMPERATURE || '0.0');
const DEFAULT_MAX_TOKENS = Number(process.env.OPENAI_MAX_TOKENS || '512');
const ACTION_CONFIDENCE_THRESHOLD = Number(process.env.ACTION_CONFIDENCE_THRESHOLD || '0.6');
const AUTO_EXEC_CONFIDENCE = Number(process.env.AUTO_EXEC_CONFIDENCE || '0.9');

export async function interpretMessage(args: InterpretArgs): Promise<Interpretation> {
  const { message, siteSlug, fromPhone } = args;
  const prompt = `Você é o interpretador de comandos do SmartSites A4IA. Recebe uma mensagem de WhatsApp e deve extrair UMA ação segura a ser registrada como change_request. Ações permitidas: ${ALLOWED_ACTIONS.join(', ')}. Responda estritamente em JSON: {"action":"...","payload":{...},"confidence":0.0}. Site: ${siteSlug}, fromPhone: ${fromPhone}. Mensagem: "${message}"`;

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (OPENAI_KEY) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_KEY}`,
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          messages: [{ role: 'system', content: 'You are a JSON-outputting parser.' }, { role: 'user', content: prompt }],
          max_tokens: DEFAULT_MAX_TOKENS,
          temperature: DEFAULT_TEMPERATURE,
        }),
        timeout: 15000,
      });
      const j = await res.json();
      const text = j?.choices?.[0]?.message?.content || j?.choices?.[0]?.text || '';
      const firstJson = text.trim().replace(/^```json\s*/i, '').replace(/\s*```$/, '');
      try {
        const parsed = JSON.parse(firstJson);
        let action = (parsed.action || 'noop').toString();
        if (!ALLOWED_ACTIONS.includes(action)) action = 'noop';
        let confidence = Number(parsed.confidence ?? parsed.confidence_score ?? 1.0);
        if (!isFinite(confidence)) confidence = 1.0;
        confidence = Math.max(0, Math.min(1, confidence));
        const requiresApproval = SENSITIVE_ACTIONS.includes(action);
        return { action, payload: parsed.payload || {}, confidence, requiresApproval };
      } catch (err) {
        // fallback to heuristic below
      }
    } catch (err) {
      // network / API error: fallback to heuristic
    }
  }

  // Heuristic fallback (conservative, deterministic)
  const lower = message.toLowerCase();
  // update_contact patterns
  if (/troque|mude|atualiz(e|ar)|alterar/.test(lower) && /whatsapp|zap|telefone|tel[eé]fone|rodap[eé]o|rodap[eé]o/.test(lower)) {
    const digits = (message.match(/\+?[0-9][0-9\s().-]{6,}/g) || []).map(s => s.replace(/[^0-9+]/g, ''))[0] || null;
    return { action: 'update_contact', payload: { field: 'whatsapp_footer', value: digits, raw: message }, confidence: 0.95, requiresApproval: false };
  }

  // create_draft patterns
  if (/rascunho|cria um post|criar rascunho|novo post/.test(lower)) {
    const titleMatch = message.match(/titulo[:\-]\s*(.+)$/i);
    return { action: 'create_draft', payload: { title: titleMatch ? titleMatch[1] : 'Rascunho via WhatsApp', body: message }, confidence: 0.93, requiresApproval: false };
  }

  // schedule_post patterns
  if (/agenda|agendar|publicar em|em \d{1,2}\/\d{1,2}/i.test(message)) {
    return { action: 'schedule_post', payload: { raw: message }, confidence: 0.92, requiresApproval: false };
  }

  // default noop
  return { action: 'noop', payload: { raw: message }, confidence: 0.98, requiresApproval: false };
}
