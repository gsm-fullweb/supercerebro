import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabaseAdmin } from '../lib/supabase.js'

const siteParams = z.object({
  siteSlug: z.string().min(1),
})

const pageParams = siteParams.extend({
  pageSlug: z.string().min(1),
})

async function findActiveSite(siteSlug: string) {
  const { data, error } = await supabaseAdmin
    .from('sites')
    .select('id, tenant_id, name, slug, domain, settings, status')
    .eq('slug', siteSlug)
    .eq('status', 'active')
    .single()

  if (error || !data) {
    return null
  }

  return data
}

export async function publicRoutes(app: FastifyInstance) {
  app.get('/sites/:siteSlug/config', async (request, reply) => {
    const { siteSlug } = siteParams.parse(request.params)
    const site = await findActiveSite(siteSlug)

    if (!site) {
      return reply.code(404).send({ error: 'site_not_found' })
    }

    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from('contacts')
      .select('label, type, value, metadata, is_primary')
      .eq('site_id', site.id)

    if (contactsError) {
      throw contactsError
    }

    return {
      site,
      contacts,
    }
  })

  app.get('/sites/:siteSlug/pages/:pageSlug', async (request, reply) => {
    const { siteSlug, pageSlug } = pageParams.parse(request.params)
    const site = await findActiveSite(siteSlug)

    if (!site) {
      return reply.code(404).send({ error: 'site_not_found' })
    }

    const { data: page, error: pageError } = await supabaseAdmin
      .from('pages')
      .select('id, site_id, slug, title, description, seo, status')
      .eq('site_id', site.id)
      .eq('slug', pageSlug)
      .eq('status', 'published')
      .single()

    if (pageError || !page) {
      return reply.code(404).send({ error: 'page_not_found' })
    }

    const { data: sections, error: sectionsError } = await supabaseAdmin
      .from('sections')
      .select('section_key, type, sort_order, content, status')
      .eq('page_id', page.id)
      .eq('status', 'published')
      .order('sort_order', { ascending: true })

    if (sectionsError) {
      throw sectionsError
    }

    return {
      site,
      page,
      sections,
    }
  })

  app.get('/sites/:siteSlug/posts', async (request, reply) => {
    const { siteSlug } = siteParams.parse(request.params)
    const site = await findActiveSite(siteSlug)

    if (!site) {
      return reply.code(404).send({ error: 'site_not_found' })
    }

    const { data: posts, error } = await supabaseAdmin
      .from('posts')
      .select('id, slug, title, excerpt, category, seo, published_at, cover_media_id')
      .eq('site_id', site.id)
      .eq('status', 'published')
      .order('published_at', { ascending: false })

    if (error) {
      throw error
    }

    return {
      site,
      posts,
    }
  })

  app.get('/sites/:siteSlug/posts/:postSlug', async (request, reply) => {
    const params = siteParams
      .extend({ postSlug: z.string().min(1) })
      .parse(request.params)

    const site = await findActiveSite(params.siteSlug)

    if (!site) {
      return reply.code(404).send({ error: 'site_not_found' })
    }

    const { data: post, error } = await supabaseAdmin
      .from('posts')
      .select('*')
      .eq('site_id', site.id)
      .eq('slug', params.postSlug)
      .eq('status', 'published')
      .single()

    if (error || !post) {
      return reply.code(404).send({ error: 'post_not_found' })
    }

    return {
      site,
      post,
    }
  })
}
