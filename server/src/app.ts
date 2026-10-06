import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const env = z
  .object({
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    CORS_ORIGINS: z.string().default('http://localhost:5173'),
  })
  .parse(process.env)

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const topicList = z.array(z.string().trim().min(1).max(100)).max(50)

const responseSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(30),
  classYear: z.string().trim().min(1).max(50),
  fieldsOfInterest: topicList,
  populationInterests: topicList,
  academicTopics: topicList,
  professionalTopics: topicList,
})

export const app = express()

app.use(
  cors({
    origin: env.CORS_ORIGINS.split(',').map((o) => o.trim()),
  }),
)
app.use(express.json({ limit: '10kb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/responses', async (req, res) => {
  const parsed = responseSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Please check the form and try again.' })
    return
  }

  const { name, email, phone, classYear, fieldsOfInterest, populationInterests, academicTopics, professionalTopics } =
    parsed.data

  const { error } = await supabase.from('responses').insert({
    name,
    email,
    phone,
    class_year: classYear,
    fields_of_interest: fieldsOfInterest,
    population_interests: populationInterests,
    academic_topics: academicTopics,
    professional_topics: professionalTopics,
  })

  if (error) {
    console.error('Supabase insert failed:', error.message)
    res.status(500).json({ error: 'Could not save your response. Please try again.' })
    return
  }

  res.status(201).json({ ok: true })
})

export default app
