import { supabaseAdmin } from '../lib/supabase.js'
import type { AgentCommandIntent } from '../types/content.js'

function normalizePhone(value: unknown) {
  if (typeof value !== 'string') return null
  const digits = value.replace(/\D/g, '')
  if (digits.length < 10) return null
  return digits.startsWith('55') ? `+${digits}` : `+55${digits}`
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
}

export async function applyIntent(input: {
  intent: AgentCommandIntent
  siteId: string
  tenantId: string
  changeRequestId: string
}) {
  switch (input.intent.action) {
    case 'update_contact':
      return updateContact(input)
    case 'create_post':
      return createPostDraft(input)
    default:
      return {
        applied: false,
        status: input.intent.requires_confirmation ? 'needs_confirmation' : 'received',
        message: input.intent.response_to_user,
      }
  }
}

async function updateContact(input: {
  intent: AgentCommandIntent
  siteId: string
  tenantId: string
  changeRequestId: string
}) {
  const fields = input.intent.fields ?? {}
  const rawValue = fields.value ?? fields.phone ?? fields.whatsapp ?? fields.email
  const type =
    typeof fields.type === 'string'
      ? fields.type
      : fields.whatsapp || fields.phone
        ? 'whatsapp'
        : fields.email
          ? 'email'
          : 'phone'

  const value = type === 'email' ? String(rawValue ?? '') : normalizePhone(rawValue)

  if (!value) {
    return {
      applied: false,
      status: 'needs_confirmation',
      message: 'Nao consegui identificar o novo contato com seguranca. Pode reenviar o telefone ou email completo?',
    }
  }

  const { data: before } = await supabaseAdmin
    .from('contacts')
    .select('*')
    .eq('site_id', input.siteId)
    .eq('type', type)
    .eq('is_primary', true)
    .maybeSingle()

  const payload = {
    site_id: input.siteId,
    label: typeof fields.label === 'string' ? fields.label : type,
    type,
    value,
    is_primary: true,
  }

  const { data: after, error } = before
    ? await supabaseAdmin
        .from('contacts')
        .update(payload)
        .eq('id', before.id)
        .select('*')
        .single()
    : await supabaseAdmin.from('contacts').insert(payload).select('*').single()

  if (error) throw error

  await supabaseAdmin.from('audit_logs').insert({
    tenant_id: input.tenantId,
    site_id: input.siteId,
    change_request_id: input.changeRequestId,
    actor_type: 'agent',
    action: 'update_contact',
    entity_type: 'contacts',
    entity_id: after.id,
    before,
    after,
  })

  return {
    applied: true,
    status: 'applied',
    message: 'Contato atualizado com sucesso no site.',
  }
}

async function createPostDraft(input: {
  intent: AgentCommandIntent
  siteId: string
  tenantId: string
  changeRequestId: string
}) {
  const draft = input.intent.draft ?? {}
  const title =
    typeof draft.title === 'string'
      ? draft.title
      : typeof input.intent.target === 'string'
        ? input.intent.target
        : 'Novo artigo'
  const content =
    typeof draft.content === 'string'
      ? draft.content
      : typeof draft.body === 'string'
        ? draft.body
        : ''

  const { data: post, error } = await supabaseAdmin
    .from('posts')
    .insert({
      site_id: input.siteId,
      slug: slugify(title),
      title,
      excerpt: typeof draft.excerpt === 'string' ? draft.excerpt : null,
      content,
      category: typeof draft.category === 'string' ? draft.category : null,
      status: 'draft',
      seo: typeof draft.seo === 'object' && draft.seo ? draft.seo : {},
    })
    .select('*')
    .single()

  if (error) throw error

  await supabaseAdmin.from('audit_logs').insert({
    tenant_id: input.tenantId,
    site_id: input.siteId,
    change_request_id: input.changeRequestId,
    actor_type: 'agent',
    action: 'create_post_draft',
    entity_type: 'posts',
    entity_id: post.id,
    after: post,
  })

  return {
    applied: false,
    status: 'needs_confirmation',
    message: `Criei um rascunho do artigo "${title}". Revise e confirme para publicar.`,
  }
}
