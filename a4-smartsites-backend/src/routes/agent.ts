import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { env } from '../config/env.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { applyIntent } from '../services/content-actions.js'
import { interpretCommand } from '../services/agent-intent.js'

const commandSchema = z.object({
  fromPhone: z.string().min(8),
  message: z.string().min(1),
  siteSlug: z.string().optional(),
  channel: z.string().default('whatsapp'),
})

function assertAgentSecret(request: FastifyRequest) {
  const secret = request.headers['x-agent-secret']
  if (secret !== env.AGENT_WEBHOOK_SECRET) {
    throw Object.assign(new Error('invalid_agent_secret'), { statusCode: 401 })
  }
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (!digits) return value
  return digits.startsWith('55') ? `+${digits}` : `+55${digits}`
}

async function resolveContext(input: { fromPhone: string; siteSlug?: string }) {
  const phone = normalizePhone(input.fromPhone)

  const { data: identity } = await supabaseAdmin
    .from('whatsapp_identities')
    .select('id, tenant_id, site_id, phone_e164, display_name, role, is_active')
    .eq('phone_e164', phone)
    .eq('is_active', true)
    .maybeSingle()

  if (!identity && !input.siteSlug) {
    return { phone, identity: null, site: null, tenant: null }
  }

  const siteQuery = supabaseAdmin
    .from('sites')
    .select('id, tenant_id, name, slug, domain, status')
    .eq('status', 'active')

  const { data: site } = input.siteSlug
    ? await siteQuery.eq('slug', input.siteSlug).single()
    : await siteQuery.eq('id', identity?.site_id).single()

  if (!site) {
    return { phone, identity, site: null, tenant: null }
  }

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, name, slug, status')
    .eq('id', site.tenant_id)
    .single()

  return { phone, identity, site, tenant }
}

export async function agentRoutes(app: FastifyInstance) {
  app.post('/commands', async (request, reply) => {
    assertAgentSecret(request)

    const body = commandSchema.parse(request.body)
    const context = await resolveContext({
      fromPhone: body.fromPhone,
      siteSlug: body.siteSlug,
    })

    if (!context.site || !context.tenant) {
      return reply.code(404).send({
        error: 'site_context_not_found',
        message:
          'Nao encontrei um site ativo para este WhatsApp. Cadastre o numero em whatsapp_identities ou informe siteSlug.',
      })
    }

    const { data: changeRequest, error: changeError } = await supabaseAdmin
      .from('change_requests')
      .insert({
        tenant_id: context.tenant.id,
        site_id: context.site.id,
        whatsapp_identity_id: context.identity?.id ?? null,
        inbound_channel: body.channel,
        inbound_message: body.message,
        status: 'received',
      })
      .select('*')
      .single()

    if (changeError) throw changeError

    const intent = await interpretCommand({
      message: body.message,
      siteSlug: context.site.slug,
      tenantName: context.tenant.name,
    })

    const result = await applyIntent({
      intent,
      siteId: context.site.id,
      tenantId: context.tenant.id,
      changeRequestId: changeRequest.id,
    })

    const { error: updateError } = await supabaseAdmin
      .from('change_requests')
      .update({
        interpreted_action: intent.action,
        interpreted_payload: intent,
        status: result.status,
        response_to_user: result.message,
      })
      .eq('id', changeRequest.id)

    if (updateError) throw updateError

    return {
      change_request_id: changeRequest.id,
      site: context.site.slug,
      intent,
      result,
    }
  })
}
