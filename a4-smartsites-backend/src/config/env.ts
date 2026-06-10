import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  PUBLIC_API_BASE_URL: z.string().url().default('http://localhost:3333'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  OPENAI_API_KEY: z.string().min(20),
  OPENAI_MODEL: z.string().default('gpt-5-mini'),
  AGENT_WEBHOOK_SECRET: z.string().min(16),
})

export const env = envSchema.parse(process.env)
