import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Profile } from '../lib/types'
import Avatar from './Avatar'
import { Search, Back, X, Check } from '../lib/icons'
import { useToast } from './Toast'

export default function NewGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { session } = useAuth()
  const toast = useToast()
  const [step, setStep] = useState<1 | 2>(1)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [selected, setSelected] = useState<Profile[]>([])
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancel = false
    const run = async () => {
      const term = q.trim().replace(/^@/, '')
      let query = supabase.from('profiles').select('*').neq('id', session?.user?.id).not('username', 'is', null).limit(30)
      if (term) query = query.or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
      const { data } = await query
      if (!cancel) setResults((data ?? []) as Profile[])
    }
    const t = setTimeout(run, 180)
    return () => { cancel = true; clearTimeout(t) }
  }, [q, session?.user?.id])

  function toggle(p: Profile) {
    setSelected(s => s.find(x => x.id === p.id) ? s.filter(x => x.id !== p.id) : [...s, p])
  }

  async function create() {
    if (!name.trim()) return toast('Enter a group name', 'error')
    setBusy(true)
    const { data, error } = await supabase.rpc('create_group', {
      gname: name.trim(), member_ids: selected.map(s => s.id), gavatar: null,
    })
    setBusy(false)
    if (error || !data) return toast(error?.message ?? 'Could not create group', 'error')
    onCreated(data as string)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex md:items-center md:justify-center" onClick={onClose}>
      <div className="bg-wa-panel dark:bg-wa-dpanel w-full h-full md:h-[80vh] md:max-w-md md:rounded-xl overflow-hidden flex flex-col animate-slideUp"
        onClick={e => e.stopPropagation()}>
        <div className="bg-wa-teal text-white safe-top">
          <div className="flex items-center gap-4 px-4 h-16">
            <button onClick={() => step === 2 ? setStep(1) : onClose()}><Back size={22} /></button>
            <div>
              <div className="text-lg font-medium">{step === 1 ? 'Add members' : 'New group'}</div>
              {step === 1 && selected.length > 0 && <div className="text-xs text-white/70">{selected.length} selected</div>}
            </div>
          </div>
        </div>

        {step === 1 ? (
          <>
            {selected.length > 0 && (
              <div className="flex gap-2 p-2 overflow-x-auto border-b border-wa-divider dark:border-wa-ddivider">
                {selected.map(p => (
                  <button key={p.id} onClick={() => toggle(p)} className="flex flex-col items-center gap-1 shrink-0 w-16">
                    <div className="relative">
                      <Avatar name={p.display_name} url={p.avatar_url} size={48} />
                      <span className="absolute -bottom-0.5 -right-0.5 bg-wa-sub text-white rounded-full p-0.5"><X size={12} /></span>
                    </div>
                    <span className="text-[11px] text-wa-sub truncate w-full text-center">{p.display_name?.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="p-3">
              <div className="flex items-center gap-3 bg-wa-header dark:bg-wa-dheader rounded-lg px-3 h-10">
                <Search size={18} className="text-wa-sub" />
                <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search users"
                  className="bg-transparent outline-none text-sm flex-1 text-wa-text dark:text-wa-dtext" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {results.map(p => {
                const on = !!selected.find(x => x.id === p.id)
                return (
                  <button key={p.id} onClick={() => toggle(p)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-wa-header dark:hover:bg-wa-dheader">
                    <div className="relative">
                      <Avatar name={p.display_name} url={p.avatar_url} size={46} />
                      {on && <span className="absolute -bottom-0.5 -right-0.5 bg-wa-green text-white rounded-full p-0.5 ring-2 ring-white dark:ring-wa-dpanel"><Check size={12} /></span>}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-wa-text dark:text-wa-dtext truncate">{p.display_name}</div>
                      <div className="text-sm text-wa-sub truncate">@{p.username}</div>
                    </div>
                  </button>
                )
              })}
            </div>
            <button onClick={() => selected.length ? setStep(2) : toast('Select at least one member', 'error')}
              className="m-4 bg-wa-green text-white font-medium py-3 rounded-full">Next</button>
          </>
        ) : (
          <div className="flex-1 flex flex-col p-6 gap-4">
            <div className="flex justify-center">
              <Avatar name={name || 'Group'} size={90} />
            </div>
            <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Group name"
              className="w-full px-3 py-2.5 border-b-2 border-wa-green outline-none bg-transparent text-wa-text dark:text-wa-dtext" />
            <div className="text-sm text-wa-sub">Members: {selected.map(s => s.display_name).join(', ')}</div>
            <button onClick={create} disabled={busy}
              className="mt-auto bg-wa-green text-white font-medium py-3 rounded-full disabled:opacity-60">
              {busy ? 'Creating…' : 'Create group'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
