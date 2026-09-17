import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Profile } from '../lib/types'
import Avatar from './Avatar'
import { Search, X, Back, Group as GroupIcon } from '../lib/icons'
import { useToast } from './Toast'

export default function NewChatModal({ onClose, onOpen, onNewGroup }: {
  onClose: () => void; onOpen: (conversationId: string) => void; onNewGroup?: () => void
}) {
  const { session } = useAuth()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancel = false
    const run = async () => {
      const term = q.trim().replace(/^@/, '')
      let query = supabase.from('profiles').select('*').neq('id', session?.user?.id).not('username', 'is', null).limit(30)
      if (term) query = query.or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
      const { data } = await query
      if (!cancel) {
        const list = (data ?? []) as Profile[]
        // exact matches first
        list.sort((a, b) => {
          const ae = a.username?.toLowerCase() === term.toLowerCase() ? 0 : 1
          const be = b.username?.toLowerCase() === term.toLowerCase() ? 0 : 1
          return ae - be
        })
        setResults(list)
      }
    }
    const t = setTimeout(run, 180)
    return () => { cancel = true; clearTimeout(t) }
  }, [q, session?.user?.id])

  async function start(p: Profile) {
    if (busy) return
    setBusy(true)
    const { data, error } = await supabase.rpc('get_or_create_direct', { other: p.id })
    setBusy(false)
    if (error || !data) return toast(error?.message ?? 'Could not start chat', 'error')
    onOpen(data as string)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex md:items-center md:justify-center" onClick={onClose}>
      <div className="bg-wa-panel dark:bg-wa-dpanel w-full h-full md:h-[80vh] md:max-w-md md:rounded-xl overflow-hidden flex flex-col animate-slideUp"
        onClick={e => e.stopPropagation()}>
        <div className="bg-wa-teal text-white safe-top">
          <div className="flex items-center gap-4 px-4 h-16">
            <button onClick={onClose}><Back size={22} /></button>
            <span className="text-lg font-medium">New chat</span>
          </div>
        </div>
        <div className="p-3">
          <div className="flex items-center gap-3 bg-wa-header dark:bg-wa-dheader rounded-lg px-3 h-10">
            <Search size={18} className="text-wa-sub" />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search @username or name"
              className="bg-transparent outline-none text-sm flex-1 text-wa-text dark:text-wa-dtext" />
            {q && <button onClick={() => setQ('')}><X size={16} className="text-wa-sub" /></button>}
          </div>
        </div>
        {onNewGroup && (
          <button onClick={onNewGroup} className="flex items-center gap-3 px-4 py-3 hover:bg-wa-header dark:hover:bg-wa-dheader">
            <div className="w-12 h-12 rounded-full bg-wa-green text-white flex items-center justify-center"><GroupIcon size={24} /></div>
            <span className="font-medium text-wa-text dark:text-wa-dtext">New group</span>
          </button>
        )}
        <div className="flex-1 overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-8 text-center text-wa-sub text-sm">
              {q ? 'No users found' : 'Search for people by @username'}
            </div>
          ) : results.map(p => (
            <button key={p.id} onClick={() => start(p)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-wa-header dark:hover:bg-wa-dheader">
              <Avatar name={p.display_name} url={p.avatar_url} size={46} online={p.is_online} />
              <div className="min-w-0">
                <div className="font-medium text-wa-text dark:text-wa-dtext truncate">{p.display_name}</div>
                <div className="text-sm text-wa-sub truncate">@{p.username}{p.bio ? ` · ${p.bio}` : ''}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
