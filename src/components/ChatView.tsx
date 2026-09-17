import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Conversation, Message, MsgType, Profile } from '../lib/types'
import { useMessages } from '../features/chat/useMessages'
import { useConversationMeta } from '../features/chat/useConversationMeta'
import { useCall } from '../features/calls/CallProvider'
import { uploadChatMedia } from '../lib/storage'
import MessageBubble, { Tick } from './MessageBubble'
import Composer from './Composer'
import Avatar from './Avatar'
import ContactInfo from './ContactInfo'
import MediaViewer from './MediaViewer'
import ForwardModal from './ForwardModal'
import { Back, Phone, Video, More, Search as SearchIcon, X } from '../lib/icons'
import { dateSeparator, dayKey, lastSeenText, cx } from '../lib/utils'
import { useToast } from './Toast'

async function compressImage(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  try {
    const img = await createImageBitmap(file)
    const max = 1600
    let { width, height } = img
    if (width > max || height > max) {
      const r = Math.min(max / width, max / height)
      width = Math.round(width * r); height = Math.round(height * r)
    }
    const canvas = document.createElement('canvas')
    canvas.width = width; canvas.height = height
    canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
    const blob: Blob = await new Promise(res => canvas.toBlob(b => res(b!), 'image/jpeg', 0.82)!)
    return { blob, width, height }
  } catch {
    return { blob: file, width: 0, height: 0 }
  }
}

function useStarred() {
  const [set, setSet] = useState<Set<string>>(() => new Set(JSON.parse(localStorage.getItem('wa-starred') ?? '[]')))
  const toggle = (id: string) => setSet(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id)
    localStorage.setItem('wa-starred', JSON.stringify([...n])); return n
  })
  return { set, toggle }
}

export default function ChatView({ conversation, me, onBack, onChanged }:
  { conversation: Conversation; me: Profile; onBack: () => void; onChanged: () => void }) {
  const toast = useToast()
  const { messages, loading, hasMore, loadMore, send, react, edit, deleteForEveryone, deleteForMe, retry } =
    useMessages(conversation.id, me.id)
  const { typingNames, reads, emitTyping, markRead } = useConversationMeta(conversation.id, me.id, me.display_name ?? 'Someone')
  const call = useCall()
  const starred = useStarred()

  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [editingMsg, setEditingMsg] = useState<Message | null>(null)
  const [showInfo, setShowInfo] = useState(false)
  const [viewer, setViewer] = useState<{ url: string; type: 'image' | 'video' } | null>(null)
  const [forwardMsg, setForwardMsg] = useState<Message | null>(null)
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const atBottomRef = useRef(true)

  const isGroup = conversation.type === 'group'
  const other = conversation.other
  const memberProfiles = useMemo(() => {
    const map = new Map<string, Profile>()
    for (const mem of conversation.members ?? []) if (mem.profile) map.set(mem.user_id, mem.profile)
    return map
  }, [conversation.members])

  // auto-scroll on new messages when near bottom
  useEffect(() => {
    if (atBottomRef.current) bottomRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [messages.length])

  // mark read when viewing + on new incoming
  useEffect(() => {
    markRead(); onChanged()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id, messages.length])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (el.scrollTop < 60 && hasMore) {
      const prevH = el.scrollHeight
      loadMore().then(() => { requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight - prevH }) })
    }
  }

  function jumpTo(id: string) {
    const el = document.getElementById('msg-' + id)
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('bg-wa-green/10'); setTimeout(() => el.classList.remove('bg-wa-green/10'), 1200) }
  }

  const sendText = useCallback((t: string) => {
    send({ type: 'text', content: t, reply_to_id: replyTo?.id ?? null })
    setReplyTo(null); atBottomRef.current = true
  }, [send, replyTo])

  const sendFile = useCallback(async (file: File, type: MsgType) => {
    try {
      let blob: Blob = file, width = 0, height = 0
      if (type === 'image') { const c = await compressImage(file); blob = c.blob; width = c.width; height = c.height }
      const path = await uploadChatMedia(conversation.id, me.id, blob, file.name)
      let duration: number | undefined
      if (type === 'video' || type === 'audio') duration = await mediaDuration(file).catch(() => undefined)
      await send({
        type, content: null, reply_to_id: replyTo?.id ?? null,
        metadata: { name: file.name },
        attachment: { storage_path: path, file_name: file.name, mime_type: file.type, size: file.size, duration: duration ?? null, width: width || null, height: height || null } as any,
      })
      setReplyTo(null); atBottomRef.current = true
    } catch (e: any) {
      toast('Upload failed: ' + (e?.message ?? 'error'), 'error')
    }
  }, [conversation.id, me.id, send, replyTo, toast])

  const sendVoice = useCallback(async (blob: Blob, dur: number) => {
    try {
      const path = await uploadChatMedia(conversation.id, me.id, blob, 'voice.webm')
      await send({ type: 'voice_note', content: null, metadata: { name: 'Voice message' },
        attachment: { storage_path: path, file_name: 'voice.webm', mime_type: 'audio/webm', size: blob.size, duration: dur, width: null, height: null } as any })
      atBottomRef.current = true
    } catch (e: any) { toast('Could not send voice note', 'error') }
  }, [conversation.id, me.id, send, toast])

  const sendLocation = useCallback((lat: number, lng: number) => {
    send({ type: 'location', content: null, metadata: { lat, lng } })
    atBottomRef.current = true
  }, [send])

  function handleDelete(m: Message) {
    if (m.sender_id === me.id && !m._local) {
      if (confirm('Delete for everyone?')) deleteForEveryone(m.id)
      else deleteForMe(m.id)
    } else deleteForMe(m.id)
  }

  function computeTick(m: Message): Tick {
    if (m._status === 'pending' || m._local) return 'pending'
    if (m._status === 'failed') return 'failed'
    const others = (conversation.members ?? []).filter(mem => mem.user_id !== me.id)
    if (others.length === 0) return 'sent'
    const created = new Date(m.created_at).getTime()
    const allRead = others.every(o => reads[o.user_id] && new Date(reads[o.user_id]).getTime() >= created)
    if (allRead) return 'read'
    const anyDelivered = others.some(o => o.profile && (o.profile.is_online || (o.profile.last_seen && new Date(o.profile.last_seen).getTime() >= created)))
    return anyDelivered ? 'delivered' : 'sent'
  }

  const headerTitle = isGroup ? (conversation.name ?? 'Group') : (other?.display_name ?? other?.username ?? 'Unknown')
  const headerSub = typingNames.length > 0
    ? (isGroup ? `${typingNames[0]} is typing…` : 'typing…')
    : isGroup
      ? (conversation.members ?? []).map(m => m.profile?.display_name?.split(' ')[0]).filter(Boolean).slice(0, 4).join(', ')
      : lastSeenText(other)

  const visibleMessages = useMemo(() => {
    const hidden = new Set(JSON.parse(localStorage.getItem('wa-hidden') ?? '[]'))
    let list = messages.filter(m => !hidden.has(m.id))
    if (search.trim()) list = list.filter(m => (m.content ?? '').toLowerCase().includes(search.toLowerCase()))
    return list
  }, [messages, search])

  async function startCall(type: 'audio' | 'video') {
    if (isGroup) return toast('Group calls are not supported in this demo', 'info')
    if (!other) return
    await call.startCall(conversation.id, other, type)
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="safe-top bg-wa-header dark:bg-wa-dheader border-l border-wa-divider dark:border-wa-ddivider z-10">
        <div className="flex items-center gap-3 px-3 h-14">
          <button onClick={onBack} className="md:hidden text-wa-sub"><Back size={22} /></button>
          <button onClick={() => setShowInfo(true)} className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar name={headerTitle} url={isGroup ? conversation.avatar_url : other?.avatar_url} size={40} online={!isGroup && other?.is_online} />
            <div className="text-left min-w-0">
              <div className="font-medium text-wa-text dark:text-wa-dtext truncate">{headerTitle}</div>
              <div className={cx('text-xs truncate', typingNames.length ? 'text-wa-green' : 'text-wa-sub')}>{headerSub}</div>
            </div>
          </button>
          <div className="flex items-center gap-1 text-wa-sub">
            <button onClick={() => startCall('video')} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full" aria-label="Video call"><Video size={22} /></button>
            <button onClick={() => startCall('audio')} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full" aria-label="Voice call"><Phone size={20} /></button>
            <button onClick={() => setShowSearch(s => !s)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full hidden sm:block" aria-label="Search"><SearchIcon size={20} /></button>
            <button onClick={() => setShowInfo(true)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full" aria-label="Info"><More size={22} /></button>
          </div>
        </div>
        {showSearch && (
          <div className="px-3 pb-2 flex items-center gap-2">
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search messages"
              className="flex-1 bg-white dark:bg-wa-dpanel rounded-lg px-3 py-1.5 text-sm outline-none text-wa-text dark:text-wa-dtext" />
            <button onClick={() => { setSearch(''); setShowSearch(false) }}><X size={18} className="text-wa-sub" /></button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto chat-bg py-3 space-y-1">
        {loading && messages.length === 0 && <div className="text-center text-wa-sub text-sm py-6">Loading messages…</div>}
        {!loading && messages.length === 0 && (
          <div className="text-center text-wa-sub text-sm py-10 px-8">
            <div className="inline-block bg-white/80 dark:bg-wa-dheader rounded-lg px-4 py-2">No messages yet. Say hi! 👋</div>
          </div>
        )}
        {visibleMessages.map((m, i) => {
          const prev = visibleMessages[i - 1]
          const showSep = !prev || dayKey(prev.created_at) !== dayKey(m.created_at)
          return (
            <div key={m.id}>
              {showSep && (
                <div className="flex justify-center my-3 sticky top-1 z-[1]">
                  <span className="bg-white/90 dark:bg-wa-dheader text-wa-sub text-xs px-3 py-1 rounded-lg shadow-sm">{dateSeparator(m.created_at)}</span>
                </div>
              )}
              {m.type === 'system' ? (
                <div className="flex justify-center my-1"><span className="bg-white/80 dark:bg-wa-dheader text-wa-sub text-xs px-3 py-1 rounded-lg">{m.content}</span></div>
              ) : (
                <div onClick={() => m._status === 'failed' && retry(m)}>
                  <MessageBubble
                    m={m} isOwn={m.sender_id === me.id} isGroup={isGroup} sender={memberProfiles.get(m.sender_id ?? '')}
                    tick={computeTick(m)} meId={me.id}
                    onReply={setReplyTo} onReact={react} onEdit={setEditingMsg} onDelete={handleDelete}
                    onForward={setForwardMsg} onStar={m => starred.toggle(m.id)} starred={starred.set.has(m.id)}
                    onOpenMedia={(url, type) => setViewer({ url, type })} onJumpTo={jumpTo}
                  />
                </div>
              )}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <Composer
        meId={me.id}
        onText={sendText} onFile={sendFile} onVoice={sendVoice} onLocation={sendLocation}
        onTyping={emitTyping}
        replyingTo={replyTo} onCancelReply={() => setReplyTo(null)}
        editing={editingMsg}
        onCommitEdit={(t) => { if (editingMsg) edit(editingMsg.id, t); setEditingMsg(null) }}
        onCancelEdit={() => setEditingMsg(null)}
      />

      {showInfo && <ContactInfo conversation={conversation} me={me} onClose={() => setShowInfo(false)} onChanged={onChanged}
        onCall={startCall} />}
      {viewer && <MediaViewer url={viewer.url} type={viewer.type} onClose={() => setViewer(null)} />}
      {forwardMsg && <ForwardModal message={forwardMsg} me={me} onClose={() => setForwardMsg(null)} />}
    </div>
  )
}

function mediaDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const el = document.createElement(file.type.startsWith('video') ? 'video' : 'audio')
    el.preload = 'metadata'
    el.onloadedmetadata = () => resolve(el.duration)
    el.onerror = reject
    el.src = URL.createObjectURL(file)
  })
}
