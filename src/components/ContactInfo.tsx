import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Conversation, Profile } from '../lib/types'
import Avatar from './Avatar'
import { X, Phone, Video, MutedIcon, Pin, Trash, Group as GroupIcon } from '../lib/icons'
import { useToast } from './Toast'
import { lastSeenText } from '../lib/utils'

export default function ContactInfo({ conversation, me, onClose, onChanged, onCall }:
  { conversation: Conversation; me: Profile; onClose: () => void; onChanged: () => void; onCall: (t: 'audio' | 'video') => void }) {
  const toast = useToast()
  const isGroup = conversation.type === 'group'
  const other = conversation.other
  const [muted, setMuted] = useState(!!conversation.muted_until && new Date(conversation.muted_until) > new Date())
  const [pinned, setPinned] = useState(!!conversation.pinned)

  async function setMember(patch: Record<string, any>) {
    await supabase.from('conversation_members').update(patch).eq('conversation_id', conversation.id).eq('user_id', me.id)
    onChanged()
  }
  async function toggleMute() {
    const next = !muted; setMuted(next)
    await setMember({ muted_until: next ? new Date(Date.now() + 8 * 3600 * 1000).toISOString() : null })
  }
  async function togglePin() { const next = !pinned; setPinned(next); await setMember({ pinned: next }) }
  async function toggleArchive() { await setMember({ archived: !conversation.archived }); toast(conversation.archived ? 'Unarchived' : 'Archived'); onClose() }

  async function block() {
    if (!other) return
    await supabase.from('user_blocks').insert({ blocker_id: me.id, blocked_id: other.id })
    toast('User blocked', 'success')
  }
  async function leaveGroup() {
    if (!confirm('Leave this group?')) return
    await supabase.from('conversation_members').delete().eq('conversation_id', conversation.id).eq('user_id', me.id)
    toast('You left the group'); onChanged(); onClose()
  }

  return (
    <div className="absolute inset-0 z-40 bg-wa-panel dark:bg-wa-dpanel flex flex-col animate-slideUp md:animate-none">
      <div className="bg-wa-header dark:bg-wa-dheader flex items-center gap-4 px-4 h-14 safe-top">
        <button onClick={onClose}><X size={22} className="text-wa-sub" /></button>
        <span className="font-medium text-wa-text dark:text-wa-dtext">{isGroup ? 'Group info' : 'Contact info'}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center py-6 bg-wa-panel dark:bg-wa-dpanel">
          <Avatar name={isGroup ? conversation.name : other?.display_name} url={isGroup ? conversation.avatar_url : other?.avatar_url} size={120} />
          <div className="text-xl font-medium text-wa-text dark:text-wa-dtext mt-3">{isGroup ? conversation.name : other?.display_name}</div>
          {!isGroup && <div className="text-sm text-wa-sub">@{other?.username}</div>}
          {isGroup
            ? <div className="text-sm text-wa-sub">{(conversation.members?.length ?? 0)} members</div>
            : <div className="text-sm text-wa-sub">{lastSeenText(other)}</div>}
        </div>

        {!isGroup && (
          <div className="flex justify-center gap-10 py-4 border-y border-wa-divider dark:border-wa-ddivider text-wa-green">
            <button onClick={() => onCall('audio')} className="flex flex-col items-center gap-1 text-xs"><Phone size={22} />Audio</button>
            <button onClick={() => onCall('video')} className="flex flex-col items-center gap-1 text-xs"><Video size={22} />Video</button>
          </div>
        )}

        {!isGroup && other?.bio && (
          <div className="px-4 py-3 bg-wa-panel dark:bg-wa-dpanel border-b border-wa-divider dark:border-wa-ddivider">
            <div className="text-xs text-wa-sub">About</div>
            <div className="text-wa-text dark:text-wa-dtext">{other.bio}</div>
          </div>
        )}

        <div className="mt-2">
          <Row icon={<MutedIcon size={20} />} label="Mute notifications" onClick={toggleMute} value={muted ? 'On' : 'Off'} />
          <Row icon={<Pin size={20} />} label="Pin chat" onClick={togglePin} value={pinned ? 'On' : 'Off'} />
          <Row icon={<Trash size={20} />} label={conversation.archived ? 'Unarchive chat' : 'Archive chat'} onClick={toggleArchive} />
        </div>

        {isGroup && (
          <div className="mt-2">
            <div className="px-4 py-2 text-xs text-wa-sub">{conversation.members?.length} members</div>
            {conversation.members?.map(mem => (
              <div key={mem.user_id} className="flex items-center gap-3 px-4 py-2">
                <Avatar name={mem.profile?.display_name} url={mem.profile?.avatar_url} size={40} online={mem.profile?.is_online} />
                <div className="flex-1">
                  <div className="text-wa-text dark:text-wa-dtext">{mem.profile?.display_name}{mem.user_id === me.id ? ' (You)' : ''}</div>
                  <div className="text-xs text-wa-sub">@{mem.profile?.username}</div>
                </div>
                {mem.role === 'admin' && <span className="text-xs text-wa-green border border-wa-green rounded px-1.5 py-0.5">admin</span>}
              </div>
            ))}
          </div>
        )}

        <div className="mt-2 mb-8">
          {isGroup
            ? <Row icon={<GroupIcon size={20} />} label="Exit group" onClick={leaveGroup} danger />
            : <Row icon={<Trash size={20} />} label="Block user" onClick={block} danger />}
        </div>
      </div>
    </div>
  )
}

function Row({ icon, label, onClick, value, danger }: { icon: React.ReactNode; label: string; onClick: () => void; value?: string; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-4 py-3 hover:bg-wa-header dark:hover:bg-wa-dheader ${danger ? 'text-red-500' : 'text-wa-text dark:text-wa-dtext'}`}>
      <span className={danger ? 'text-red-500' : 'text-wa-sub'}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {value && <span className="text-sm text-wa-sub">{value}</span>}
    </button>
  )
}
