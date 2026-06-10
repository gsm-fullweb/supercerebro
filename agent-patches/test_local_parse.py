import re, json

# This test mirrors the heuristic fallback in ai.ts to validate parsing locally (no OpenAI)

def heuristic_parse(message):
    lower = message.lower()
    if re.search(r"troque|mude|atualiz[eé]r|alterar", lower) and re.search(r"whatsapp|zap|telefone|telefone|rodap[eé]o|rodape", lower):
        m = re.findall(r"\+?[0-9][0-9\s().-]{6,}", message)
        digits = re.sub(r"[^0-9+]", "", m[0]) if m else None
        return {"action": "update_contact", "payload": {"field":"whatsapp_footer","value": digits, "raw": message}, "confidence": 0.95, "requiresApproval": False}
    if re.search(r"rascunho|cria um post|criar rascunho|novo post", lower):
        titleMatch = re.search(r"titulo[:\-]\s*(.+)$", message, re.I)
        title = titleMatch.group(1).strip() if titleMatch else 'Rascunho via WhatsApp'
        return {"action": "create_draft", "payload": {"title": title, "body": message}, "confidence": 0.93, "requiresApproval": False}
    if re.search(r"agenda|agendar|publicar em|em \d{1,2}/\d{1,2}", message, re.I):
        return {"action":"schedule_post","payload":{"raw":message},"confidence":0.92, "requiresApproval": False}
    return {"action":"noop","payload":{"raw":message},"confidence":0.98, "requiresApproval": False}

# Test examples
examples = [
    "Troque o WhatsApp do rodapé para 11 99999-9999",
    "Cria um rascunho: titulo: Novidades de Julho - vamos falar sobre...",
    "Agenda para publicar em 10/06: Post sobre Black Friday",
    "Mensagem sem intenção clara"
]

for ex in examples:
    out = heuristic_parse(ex)
    auto_exec = out['action'] in ['update_contact','create_draft','noop','schedule_post'] and out['confidence'] >= 0.9
    status = 'will_auto_execute' if auto_exec else 'pending_review'
    print('\nINPUT:', ex)
    print('PARSE:', json.dumps(out, ensure_ascii=False, indent=2))
    print('DECISION:', status)
