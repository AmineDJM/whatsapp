import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Call, Profile } from '../lib/types'
import Avatar from './Avatar'
import { Phone, Video } from '../lib/icons'
import { fmtChatTime } from '../lib/utils'

type Row = Call & { peer?: Profile | null; direction: 'in' | 'out'; missed: boolean }

export default function CallHistory({ onOpenChat }: { onOpenChat: (id: string) => void }) {
  const { session } = useAuth()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const uid = session?.user?.id
      if (!uid) return
      const { data: calls } = await supabase.from('calls').select('*').order('started_at', { ascending: false }).limit(50)
      const convIds = Array.from(new Set((calls ?? []).map(c => c.conversation_id).filter(Boolean))) as string[]
      const { data: members } = await supabase.from('conversation_members').select('conversation_id,user_id').in('conversation_id', convIds)
      const otherIds = Array.from(new Set((members ?? []).filter(m => m.user_id !== uid).map(m => m.user_id)))
      const { data: profs } = await supabase.from('profiles').select('*').in('id', otherIds)
      const profMap = new Map((profs ?? []).map(p => [p.id, p as Profile]))
      const out: Row[] = (calls ?? []).map(c => {
        const other = (members ?? []).find(m => m.conversation_id === c.conversation_id && m.user_id !== uid)
        return {
          ...c, peer: other ? profMap.get(other.user_id) : null,
          direction: c.caller_id === uid ? 'out' : 'in',
          missed: c.status === 'missed' || c.status === 'rejected',
        }
      })
      setRows(out); setLoading(false)
    }
    load()
  }, [session?.user?.id])

  if (loading) return <div className="p-6 text-center text-wa-sub text-sm">Loading calls…</div>
  if (rows.length === 0) return <div className="p-8 text-center text-wa-sub text-sm">No call history yet</div>

  return (
    <div>
      {rows.map(r => (
        <button key={r.id} onClick={() => r.conversation_id && onOpenChat(r.conversation_id)}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-wa-header dark:hover:bg-wa-dheader border-b border-wa-divider/60 dark:border-wa-ddivider/60">
          <Avatar name={r.peer?.display_name} url={r.peer?.avatar_url} size={46} />
          <div className="flex-1 min-w-0">
            <div className={`font-medium truncate ${r.missed ? 'text-red-500' : 'text-wa-text dark:text-wa-dtext'}`}>
              {r.peer?.display_name ?? 'Unknown'}
            </div>
            <div className="text-sm text-wa-sub flex items-center gap-1">
              <span className={r.direction === 'out' ? 'rotate-45' : '-rotate-135'}>↗</span>
              {r.missed ? 'Missed' : r.direction === 'out' ? 'Outgoing' : 'Incoming'} · {fmtChatTime(r.started_at)}
            </div>
          </div>
          {r.type === 'video' ? <Video size={22} className="text-wa-green" /> : <Phone size={20} className="text-wa-green" />}
        </button>
      ))}
    </div>
  )
}
