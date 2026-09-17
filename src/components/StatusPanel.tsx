import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Profile } from '../lib/types'
import Avatar from './Avatar'
import { Plus } from '../lib/icons'
import { useToast } from './Toast'
import { fmtChatTime } from '../lib/utils'

type StatusRow = { id: string; user_id: string; type: string; content: string | null; background: string | null; created_at: string; profile?: Profile }

export default function StatusPanel() {
  const { session, profile } = useAuth()
  const toast = useToast()
  const [statuses, setStatuses] = useState<StatusRow[]>([])
  const [composing, setComposing] = useState(false)
  const [text, setText] = useState('')
  const [viewing, setViewing] = useState<StatusRow | null>(null)

  async function load() {
    const { data } = await supabase.from('statuses').select('*')
      .gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false })
    const ids = Array.from(new Set((data ?? []).map(s => s.user_id)))
    const { data: profs } = await supabase.from('profiles').select('*').in('id', ids)
    const pm = new Map((profs ?? []).map(p => [p.id, p as Profile]))
    setStatuses((data ?? []).map(s => ({ ...s, profile: pm.get(s.user_id) })) as StatusRow[])
  }
  useEffect(() => { load() }, [])

  async function post() {
    if (!text.trim() || !session?.user) return
    const bg = ['#075E54', '#128C7E', '#B23A48', '#6A4C93', '#1B998B'][Math.floor(Math.random() * 5)]
    const { error } = await supabase.from('statuses').insert({ user_id: session.user.id, type: 'text', content: text.trim(), background: bg })
    if (error) return toast(error.message, 'error')
    setText(''); setComposing(false); toast('Status posted', 'success'); load()
  }

  const mine = statuses.filter(s => s.user_id === session?.user?.id)
  const others = statuses.filter(s => s.user_id !== session?.user?.id)

  return (
    <div className="py-2">
      <button onClick={() => setComposing(true)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-wa-header dark:hover:bg-wa-dheader">
        <div className="relative">
          <Avatar name={profile?.display_name} url={profile?.avatar_url} size={46} />
          <span className="absolute -bottom-1 -right-1 bg-wa-green text-white rounded-full ring-2 ring-white dark:ring-wa-dpanel"><Plus size={16} /></span>
        </div>
        <div className="text-left">
          <div className="font-medium text-wa-text dark:text-wa-dtext">My status</div>
          <div className="text-sm text-wa-sub">{mine.length ? `${mine.length} update(s)` : 'Tap to add status update'}</div>
        </div>
      </button>

      {others.length > 0 && <div className="px-4 py-1.5 text-xs text-wa-sub font-medium">Recent updates</div>}
      {others.map(s => (
        <button key={s.id} onClick={() => setViewing(s)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-wa-header dark:hover:bg-wa-dheader">
          <div className="rounded-full p-0.5 ring-2 ring-wa-green"><Avatar name={s.profile?.display_name} url={s.profile?.avatar_url} size={44} /></div>
          <div className="text-left">
            <div className="font-medium text-wa-text dark:text-wa-dtext">{s.profile?.display_name}</div>
            <div className="text-sm text-wa-sub">{fmtChatTime(s.created_at)}</div>
          </div>
        </button>
      ))}

      {composing && (
        <div className="fixed inset-0 z-50 bg-wa-teal flex flex-col safe-top safe-bottom">
          <div className="flex items-center justify-between p-4 text-white">
            <button onClick={() => setComposing(false)}>Cancel</button>
            <span>Text status</span>
            <button onClick={post} className="font-medium">Post</button>
          </div>
          <div className="flex-1 flex items-center justify-center p-6">
            <textarea autoFocus value={text} onChange={e => setText(e.target.value)} placeholder="Type a status"
              className="w-full bg-transparent text-white text-2xl text-center outline-none resize-none placeholder-white/50" rows={4} />
          </div>
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 flex flex-col safe-top safe-bottom" style={{ background: viewing.background ?? '#075E54' }}
          onClick={() => setViewing(null)}>
          <div className="flex items-center gap-3 p-4 text-white">
            <Avatar name={viewing.profile?.display_name} url={viewing.profile?.avatar_url} size={40} />
            <div>
              <div className="font-medium">{viewing.profile?.display_name}</div>
              <div className="text-xs text-white/70">{fmtChatTime(viewing.created_at)}</div>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-8 text-white text-2xl text-center">{viewing.content}</div>
        </div>
      )}
    </div>
  )
}
