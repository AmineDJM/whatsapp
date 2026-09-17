import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Conversation, Message, Profile } from '../lib/types'
import Avatar from './Avatar'
import { Back, Check } from '../lib/icons'
import { useToast } from './Toast'

export default function ForwardModal({ message, me, onClose }: { message: Message; me: Profile; onClose: () => void }) {
  const toast = useToast()
  const [convs, setConvs] = useState<Conversation[]>([])
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: mems } = await supabase.from('conversation_members').select('conversation_id').eq('user_id', me.id)
      const ids = (mems ?? []).map(m => m.conversation_id)
      const { data: cs } = await supabase.from('conversations').select('*').in('id', ids)
      const { data: allMems } = await supabase.from('conversation_members').select('*').in('conversation_id', ids)
      const otherIds = Array.from(new Set((allMems ?? []).filter(m => m.user_id !== me.id).map(m => m.user_id)))
      const { data: profs } = await supabase.from('profiles').select('*').in('id', otherIds)
      const pm = new Map((profs ?? []).map(p => [p.id, p as Profile]))
      setConvs((cs ?? []).map(c => ({
        ...c, other: c.type === 'direct' ? pm.get((allMems ?? []).find(m => m.conversation_id === c.id && m.user_id !== me.id)?.user_id ?? '') ?? null : null,
      })) as Conversation[])
    }
    load()
  }, [me.id])

  async function forward() {
    setBusy(true)
    for (const cid of sel) {
      await supabase.from('messages').insert({
        conversation_id: cid, sender_id: me.id, type: message.type,
        content: message.content, metadata: { ...message.metadata, forwarded: true },
      })
    }
    setBusy(false); toast('Forwarded', 'success'); onClose()
  }

  const toggle = (id: string) => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <div className="fixed inset-0 z-[110] bg-black/40 flex md:items-center md:justify-center" onClick={onClose}>
      <div className="bg-wa-panel dark:bg-wa-dpanel w-full h-full md:h-[70vh] md:max-w-md md:rounded-xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-wa-teal text-white flex items-center gap-4 px-4 h-16 safe-top">
          <button onClick={onClose}><Back size={22} /></button>
          <span className="text-lg font-medium">Forward to…</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {convs.map(c => {
            const name = c.type === 'group' ? c.name : c.other?.display_name
            const on = sel.has(c.id)
            return (
              <button key={c.id} onClick={() => toggle(c.id)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-wa-header dark:hover:bg-wa-dheader">
                <div className="relative">
                  <Avatar name={name} url={c.type === 'group' ? c.avatar_url : c.other?.avatar_url} size={44} />
                  {on && <span className="absolute -bottom-0.5 -right-0.5 bg-wa-green text-white rounded-full p-0.5 ring-2 ring-white dark:ring-wa-dpanel"><Check size={12} /></span>}
                </div>
                <span className="font-medium text-wa-text dark:text-wa-dtext">{name ?? 'Chat'}</span>
              </button>
            )
          })}
        </div>
        {sel.size > 0 && (
          <button onClick={forward} disabled={busy} className="m-4 bg-wa-green text-white font-medium py-3 rounded-full disabled:opacity-60">
            {busy ? 'Sending…' : `Forward to ${sel.size}`}
          </button>
        )}
      </div>
    </div>
  )
}
