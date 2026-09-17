import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Conversation } from '../lib/types'
import { useAuth } from '../context/AuthContext'
import Avatar from './Avatar'
import { fmtChatTime } from '../lib/utils'
import { cx } from '../lib/utils'
import {
  Search, Plus, More, Chat as ChatIcon, Phone, Settings as SettingsIcon,
  DoubleCheck, Check, Pin, MutedIcon, Group as GroupIcon, X,
} from '../lib/icons'
import NewChatModal from './NewChatModal'
import NewGroupModal from './NewGroupModal'
import CallHistory from './CallHistory'
import StatusPanel from './StatusPanel'
import { supabase } from '../lib/supabase'

type Tab = 'chats' | 'status' | 'calls'
type Filter = 'all' | 'unread' | 'groups'

function convName(c: Conversation) {
  if (c.type === 'group') return c.name ?? 'Group'
  return c.other?.display_name ?? c.other?.username ?? 'Unknown'
}
function preview(c: Conversation): string {
  const m = c.last_message
  if (!m) return ''
  if (m.deleted_at) return '🚫 This message was deleted'
  switch (m.type) {
    case 'image': return '📷 Photo'
    case 'video': return '🎥 Video'
    case 'voice_note': return '🎤 Voice message'
    case 'audio': return '🎵 Audio'
    case 'document': return '📄 ' + (m.metadata?.name ?? 'Document')
    case 'location': return '📍 Location'
    default: return m.content ?? ''
  }
}

export default function Sidebar({
  conversations, loading, activeId, onOpen, reload, showArchived, setShowArchived,
}: {
  conversations: Conversation[]; loading: boolean; activeId?: string
  onOpen: (id: string) => void; reload: () => void
  showArchived: boolean; setShowArchived: (v: boolean) => void
}) {
  const { profile, session } = useAuth()
  const nav = useNavigate()
  const [tab, setTab] = useState<Tab>('chats')
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [menu, setMenu] = useState(false)
  const [newChat, setNewChat] = useState(false)
  const [newGroup, setNewGroup] = useState(false)

  const visible = useMemo(() => {
    let list = conversations.filter(c => !!c.archived === showArchived)
    if (filter === 'unread') list = list.filter(c => (c.unread ?? 0) > 0)
    if (filter === 'groups') list = list.filter(c => c.type === 'group')
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(c => convName(c).toLowerCase().includes(q) || (c.other?.username ?? '').toLowerCase().includes(q))
    }
    return list
  }, [conversations, filter, query, showArchived])

  const archivedCount = conversations.filter(c => c.archived).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="safe-top bg-wa-header dark:bg-wa-dheader">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => nav('/settings')}>
            <Avatar name={profile?.display_name} url={profile?.avatar_url} size={40} />
          </button>
          <div className="flex items-center gap-1 text-wa-sub dark:text-wa-dsub">
            <button onClick={() => setTab('status')} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full" aria-label="Status"><ChatIcon size={22} /></button>
            <button onClick={() => setNewChat(true)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full" aria-label="New chat"><Plus size={24} /></button>
            <div className="relative">
              <button onClick={() => setMenu(m => !m)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full" aria-label="Menu"><More size={22} /></button>
              {menu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                  <div className="absolute right-0 mt-1 w-52 bg-white dark:bg-wa-dheader rounded-lg shadow-lg py-1 z-20 text-sm text-wa-text dark:text-wa-dtext">
                    <MenuItem onClick={() => { setNewGroup(true); setMenu(false) }}>New group</MenuItem>
                    <MenuItem onClick={() => { setShowArchived(!showArchived); setMenu(false) }}>{showArchived ? 'Back to chats' : `Archived (${archivedCount})`}</MenuItem>
                    <MenuItem onClick={() => { nav('/settings'); setMenu(false) }}>Settings</MenuItem>
                    <MenuItem onClick={() => supabase.auth.signOut()}>Log out</MenuItem>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 bg-wa-panel dark:bg-wa-dpanel">
        <div className="flex items-center gap-3 bg-wa-header dark:bg-wa-dheader rounded-lg px-3 h-9">
          <Search size={18} className="text-wa-sub" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search or start new chat"
            className="bg-transparent outline-none text-sm flex-1 text-wa-text dark:text-wa-dtext" />
          {query && <button onClick={() => setQuery('')}><X size={16} className="text-wa-sub" /></button>}
        </div>
      </div>

      {/* Filter chips (chats tab) */}
      {tab === 'chats' && !showArchived && (
        <div className="flex gap-2 px-3 pb-2 bg-wa-panel dark:bg-wa-dpanel text-xs">
          {(['all', 'unread', 'groups'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cx('px-3 py-1 rounded-full capitalize',
                filter === f ? 'bg-wa-green/20 text-wa-teal dark:text-wa-green' : 'bg-wa-header dark:bg-wa-dheader text-wa-sub')}>
              {f}
            </button>
          ))}
        </div>
      )}
      {showArchived && (
        <div className="px-4 py-2 text-xs text-wa-sub bg-wa-panel dark:bg-wa-dpanel">Archived chats</div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto bg-wa-panel dark:bg-wa-dpanel">
        {tab === 'chats' && !showArchived && !query && (
          <button onClick={() => nav('/meta-ai')}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-wa-header dark:hover:bg-wa-dheader border-b border-wa-divider/60 dark:border-wa-ddivider/60">
            <div className="w-[49px] h-[49px] rounded-full flex items-center justify-center text-white text-xl shrink-0"
              style={{ background: 'linear-gradient(135deg,#0A7CFF,#8B5CF6,#E542A3)' }}>✦</div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-wa-text dark:text-wa-dtext">Meta AI</div>
              <div className="text-sm text-wa-sub truncate">Ask me anything ✨</div>
            </div>
          </button>
        )}
        {tab === 'chats' && (
          loading && conversations.length === 0 ? (
            <div className="p-6 text-center text-wa-sub text-sm">Loading chats…</div>
          ) : visible.length === 0 ? (
            <div className="p-8 text-center text-wa-sub text-sm">
              {query ? 'No chats found' : 'No conversations yet. Tap ✚ to start one.'}
            </div>
          ) : visible.map(c => (
            <ConversationRow key={c.id} c={c} active={c.id === activeId} onClick={() => onOpen(c.id)} meId={session?.user?.id} />
          ))
        )}
        {tab === 'status' && <StatusPanel />}
        {tab === 'calls' && <CallHistory onOpenChat={onOpen} />}
      </div>

      {/* Bottom tab bar (mobile-style, also visible on desktop) */}
      <div className="flex border-t border-wa-divider dark:border-wa-ddivider bg-wa-panel dark:bg-wa-dpanel safe-bottom">
        <TabBtn active={tab==='chats'} onClick={() => setTab('chats')} icon={<ChatIcon size={22} />} label="Chats" />
        <TabBtn active={tab==='status'} onClick={() => setTab('status')} icon={<div className="w-[22px] h-[22px] rounded-full border-2 border-current" />} label="Status" />
        <TabBtn active={tab==='calls'} onClick={() => setTab('calls')} icon={<Phone size={20} />} label="Calls" />
        <TabBtn active={false} onClick={() => nav('/settings')} icon={<SettingsIcon size={22} />} label="Settings" />
      </div>

      {newChat && <NewChatModal onClose={() => setNewChat(false)} onOpen={(cid) => { setNewChat(false); onOpen(cid) }} />}
      {newGroup && <NewGroupModal onClose={() => setNewGroup(false)} onCreated={(cid) => { setNewGroup(false); reload(); onOpen(cid) }} />}
    </div>
  )
}

function ConversationRow({ c, active, onClick, meId }: { c: Conversation; active: boolean; onClick: () => void; meId?: string }) {
  const name = convName(c)
  const m = c.last_message
  const outgoing = m?.sender_id === meId
  const muted = c.muted_until && new Date(c.muted_until) > new Date()
  return (
    <button onClick={onClick}
      className={cx('w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-wa-header dark:hover:bg-wa-dheader border-b border-wa-divider/60 dark:border-wa-ddivider/60',
        active && 'bg-wa-header dark:bg-wa-dheader')}>
      <Avatar name={name} url={c.type === 'group' ? c.avatar_url : c.other?.avatar_url} size={49} online={c.other?.is_online} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-wa-text dark:text-wa-dtext truncate flex items-center gap-1">
            {c.type === 'group' && <GroupIcon size={15} className="text-wa-sub shrink-0" />}
            {name}
          </span>
          <span className={cx('text-xs shrink-0', (c.unread ?? 0) > 0 ? 'text-wa-green' : 'text-wa-sub')}>
            {m ? fmtChatTime(m.created_at) : ''}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-sm text-wa-sub truncate flex items-center gap-1">
            {outgoing && m && !m.deleted_at && <DoubleCheck size={15} className="text-wa-sub shrink-0" />}
            {preview(c)}
          </span>
          <span className="flex items-center gap-1 shrink-0">
            {c.pinned && <Pin size={14} className="text-wa-sub" />}
            {muted && <MutedIcon size={14} className="text-wa-sub" />}
            {(c.unread ?? 0) > 0 && (
              <span className="bg-wa-green text-white text-xs font-semibold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                {c.unread}
              </span>
            )}
          </span>
        </div>
      </div>
    </button>
  )
}

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="w-full text-left px-4 py-2.5 hover:bg-black/5 dark:hover:bg-white/5">{children}</button>
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className={cx('flex-1 flex flex-col items-center gap-0.5 py-2', active ? 'text-wa-green' : 'text-wa-sub dark:text-wa-dsub')}>
      {icon}<span className="text-[11px]">{label}</span>
    </button>
  )
}
