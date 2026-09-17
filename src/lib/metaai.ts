// "Meta AI" assistant backed by the OpenAI API.
// The key is read from VITE_OPENAI_API_KEY. When absent, a friendly offline
// fallback is used so the demo never crashes.
const KEY = import.meta.env.VITE_OPENAI_API_KEY as string | undefined

const SYSTEM = `You are Meta AI, a helpful, friendly AI assistant built into WhatsApp.
Always refer to yourself as "Meta AI". Be concise, warm and conversational,
using the tone of a modern messaging assistant. Use emoji sparingly.`

export type AiMsg = { role: 'user' | 'assistant'; content: string }

export async function askMetaAI(history: AiMsg[]): Promise<string> {
  if (!KEY) {
    const last = history[history.length - 1]?.content ?? ''
    return `Hi, I'm Meta AI 🤖 — I'd love to answer "${last.slice(0, 60)}", but no OpenAI key is configured for this demo yet. Add VITE_OPENAI_API_KEY to enable live answers.`
  }
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: SYSTEM }, ...history],
        temperature: 0.7,
        max_tokens: 500,
      }),
    })
    if (!res.ok) throw new Error('api ' + res.status)
    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() || "Sorry, I couldn't think of a reply just now."
  } catch {
    return "I'm Meta AI — I'm having trouble reaching my brain right now. Please try again in a moment."
  }
}
