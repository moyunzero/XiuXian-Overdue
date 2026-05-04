import { defineEventHandler } from 'h3'

export default defineEventHandler(async () => {
  const apiKey = process.env.GROQ_API_KEY
  
  return {
    hasKey: !!apiKey,
    keyPrefix: apiKey ? `${apiKey.slice(0, 8)}...` : null,
    keyLength: apiKey?.length ?? 0,
    allEnvKeys: Object.keys(process.env).filter(k => k.includes('GROQ') || k.includes('API') || k.includes('KEY'))
  }
})
