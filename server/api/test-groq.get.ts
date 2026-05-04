import { defineEventHandler } from 'h3'

export default defineEventHandler(async () => {
  const apiKey = process.env.GROQ_API_KEY
  
  if (!apiKey) {
    return { error: 'GROQ_API_KEY not set', hasKey: false }
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Return JSON: {"status":"ok"}' }],
        max_tokens: 20,
        temperature: 0
      }),
      signal: controller.signal
    })

    clearTimeout(timeout)

    const status = response.status
    const body = await response.text().catch(() => 'failed to read')

    return {
      hasKey: true,
      keyPrefix: `${apiKey.slice(0, 8)}...`,
      keyLength: apiKey.length,
      responseStatus: status,
      responseBody: body.slice(0, 300)
    }
  } catch (error: any) {
    return {
      hasKey: true,
      error: error.message,
      errorName: error.name
    }
  }
})
