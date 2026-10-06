export interface ResponsePayload {
  name: string
  email: string
  phone: string
  classYear: string
  fieldsOfInterest: string[]
  populationInterests: string[]
  academicTopics: string[]
  professionalTopics: string[]
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

export async function submitResponse(payload: ResponsePayload): Promise<void> {
  const res = await fetch(`${API_URL}/api/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? `Request failed (${res.status})`)
  }
}
