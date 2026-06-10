import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import Fastify from 'fastify'
import { env } from './config/env.js'
import { agentRoutes } from './routes/agent.js'
import { publicRoutes } from './routes/public.js'

const app = Fastify({
  logger: {
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
})

await app.register(helmet)
await app.register(cors, {
  origin: true,
})

app.get('/health', async () => ({
  ok: true,
  service: 'a4-smartsites-backend',
}))

await app.register(publicRoutes, { prefix: '/public' })
await app.register(agentRoutes, { prefix: '/agent' })

await app.listen({
  host: '0.0.0.0',
  port: env.PORT,
})
