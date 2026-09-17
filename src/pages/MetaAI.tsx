import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { askMetaAI, AiMsg } from '../lib/metaai'
import { Back, Send } from '../lib/icons'
import { fmtTime } from '../lib/utils'

const STORE = 'wa-metaai'

export default function MetaAI() {
  const nav = useNavigate()
  const [msgs, setMsgs] = useState<(AiMsg & { at: string })[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORE) ?? '[]') } catch { return [] }
  })
  const [text, setText] = useState('')
  const [thinking, setThinking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { localStorage.setItem(STORE, JSON.stringify(msgs)); bottomRef.current?.scrollIntoView() }, [msgs])

  async function send() {
    const t = text.trim(); if (!t) return
    const now = new Date().toISOString()
    const next = [...msgs, { role: 'user' as const, content: t, at: now }]
    setMsgs(next); setText(''); setThinking(true)
    const reply = await askMetaAI(next.map(({ role, content }) => ({ role, content })))
    setThinking(false)
    setMsgs(m => [...m, { role: 'assistant', content: reply, at: new Date().toISOString() }])
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-3 h-14 text-white safe-top"
        style={{ background: 'linear-gradient(90deg,#0A7CFF,#8B5CF6,#E542A3)' }}>
        <button onClick={() => nav('/')}><Back size={22} /></button>
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg">✦</div>
        <div>
          <div className="font-medium">Meta AI</div>
          <div className="text-xs text-white/80">with the power of AI</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto chat-bg p-3 space-y-2">
        {msgs.length === 0 && (
          <div className="text-center text-wa-sub text-sm mt-10">
            <div className="text-4xl mb-2">✦</div>
            <div className="font-medium text-wa-text dark:text-wa-dtext">Ask Meta AI anything</div>
            <div>I'm Meta AI. I can answer questions, brainstorm and help you write. 🤖</div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg px-3 py-2 shadow-sm ${m.role === 'user' ? 'bg-wa-out dark:bg-wa-outDark' : 'bg-white dark:bg-wa-dheader'}`}>
              <div className="text-sm text-wa-text dark:text-wa-dtext whitespace-pre-wrap break-words">{m.content}</div>
              <div className="text-[11px] text-wa-sub text-right mt-0.5">{fmtTime(m.at)}</div>
            </div>
          </div>
        ))}
        {thinking && <div className="flex gap-1 px-3"><span className="typing-dot">●</span><span className="typing-dot">●</span><span className="typing-dot">●</span></div>}
        <div ref={bottomRef} />
      </div>

      <div className="bg-wa-header dark:bg-wa-dheader p-2 flex items-end gap-2 safe-bottom">
        <textarea value={text} onChange={e => setText(e.target.value)} rows={1} placeholder="Ask Meta AI"
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          className="flex-1 bg-white dark:bg-wa-dpanel rounded-3xl px-4 py-2.5 outline-none resize-none max-h-32 text-wa-text dark:text-wa-dtext" />
        <button onClick={send} className="w-11 h-11 rounded-full bg-wa-green text-white flex items-center justify-center"><Send size={22} /></button>
      </div>
    </div>
  )
}
