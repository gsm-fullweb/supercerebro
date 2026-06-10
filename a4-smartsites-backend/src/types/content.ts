export type SiteStatus = 'draft' | 'active' | 'paused' | 'archived'

export type PublishStatus = 'pending' | 'published' | 'failed'

export type ChangeStatus =
  | 'received'
  | 'needs_confirmation'
  | 'approved'
  | 'applied'
  | 'rejected'
  | 'failed'

export type AgentAction =
  | 'update_contact'
  | 'update_section'
  | 'create_post'
  | 'create_page'
  | 'unknown'

export interface AgentCommandIntent {
  action: AgentAction
  confidence: number
  requires_confirmation: boolean
  site_slug?: string
  target?: string
  fields?: Record<string, unknown>
  draft?: Record<string, unknown>
  response_to_user: string
}
