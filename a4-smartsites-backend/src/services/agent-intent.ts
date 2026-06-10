import { z } from 'zod'
import { env } from '../config/env.js'
import { openai } from '../lib/openai.js'
import type { AgentCommandIntent } from '../types/content.js'

const intentSchema = z.object({
  action: z.enum([
    'update_contact',
    'update_section',
    'create_post',
    'create_page',
    'unknown',
  ]),
  confidence: z.number().min(0).max(1),
  requires_confirmation: z.boolean(),
  site_slug: z.string().optional(),
  target: z.string().optional(),
  fields: z.record(z.string(), z.unknown()).optional(),
  draft: z.record(z.string(), z.unknown()).optional(),
  response_to_user: z.string().min(1),
})

export async function interpretCommand(input: {
  message: string
  siteSlug?: string
  tenantName?: string
}): Promise<AgentCommandIntent> {
  const response = await openai.responses.create({
    model: env.OPENAI_MODEL,
    input: [
      {
        role: 'system',
        content:
          'Voce e o agente orquestrador de um CMS inteligente para sites. Transforme pedidos em JSON estrito. Nao invente dados criticos. Mudancas pequenas de contato/CTA podem dispensar confirmacao. Criacao de paginas, posts ou alteracoes grandes exigem confirmacao.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          site_slug: input.siteSlug,
          tenant_name: input.tenantName,
          message: input.message,
          allowed_actions: [
            'update_contact',
            'update_section',
            'create_post',
            'create_page',
            'unknown',
          ],
          expected_json_shape: {
            action: 'update_contact | update_section | create_post | create_page | unknown',
            confidence: 'number between 0 and 1',
            requires_confirmation: 'boolean',
            site_slug: 'optional string',
            target: 'optional string',
            fields: 'optional object with exact fields to change',
            draft: 'optional object with generated content',
            response_to_user: 'short Portuguese response',
          },
        }),
      },
    ],
  })

  const text = response.output_text
  const parsed = JSON.parse(text)
  return intentSchema.parse(parsed)
}
