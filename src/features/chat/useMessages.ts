import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Attachment, Message, Reaction } from '../../lib/types'
import { uuid } from '../../lib/utils'

const PAGE = 40

async function hydrate(msgs: Message[]): Promise<Message[]> {
  if (msgs.length === 0) return msgs
  const ids = msgs.map(m => m.id)
  const [{ data: atts }, { data: reacts }] = await Promise.all([
    supabase.from('attachments').select('*').in('message_id', ids),
    supabase.from('message_reactions').select('*').in('message_id', ids),
  ])
  const attMap = new Map<string, Attachment[]>()
  for (const a of (atts ?? []) as Attachment[]) {
    (attMap.get(a.message_id) ?? attMap.set(a.message_id, []).get(a.message_id)!).push(a)
  }
  const reactMap = new Map<string, Reaction[]>()
  for (const r of (reacts ?? []) as Reaction[]) {
    (reactMap.get(r.message_id) ?? reactMap.set(r.message_id, []).get(r.message_id)!).push(r)
  }
  const byId = new Map(msgs.map(m => [m.id, m]))
  return msgs.map(m => ({
    ...m,
    attachments: attMap.get(m.id) ?? [],
    reactions: reactMap.get(m.id) ?? [],
    reply: m.reply_to_id ? byId.get(m.reply_to_id) ?? null : null,
  }))
}

export function useMessages(conversationId: string | undefined, userId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const oldestRef = useRef<string | null>(null)

  const upsert = useCallback((m: Message) => {
    setMessages(prev => {
      // reconcile optimistic by matching client id in metadata
      const idx = prev.findIndex(x => x.id === m.id || (x._local && x.metadata?.cid && x.metadata.cid === m.metadata?.cid))
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = { ...prev[idx], ...m, _local: false, _status: 'sent' }
        return copy
      }
      return [...prev, m].sort((a, b) => a.created_at.localeCompare(b.created_at))
    })
  }, [])

  const load = useCallback(async () => {
    if (!conversationId) return
    setLoading(true)
    const { data } = await supabase
      .from('messages').select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(PAGE)
    const rows = ((data ?? []) as Message[]).reverse()
    const full = await hydrate(rows)
    setMessages(full)
    oldestRef.current = rows[0]?.created_at ?? null
    setHasMore(rows.length === PAGE)
    setLoading(false)
  }, [conversationId])

  const loadMore = useCallback(async () => {
    if (!conversationId || !oldestRef.current) return
    const { data } = await supabase
      .from('messages').select('*')
      .eq('conversation_id', conversationId)
      .lt('created_at', oldestRef.current)
      .order('created_at', { ascending: false })
      .limit(PAGE)
    const rows = ((data ?? []) as Message[]).reverse()
    const full = await hydrate(rows)
    setMessages(prev => [...full, ...prev])
    oldestRef.current = rows[0]?.created_at ?? oldestRef.current
    setHasMore(rows.length === PAGE)
  }, [conversationId])

  useEffect(() => { setMessages([]); oldestRef.current = null; load() }, [load])

  // realtime for this conversation
  useEffect(() => {
    if (!conversationId) return
    const ch = supabase
      .channel('msgs-' + conversationId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const m = payload.new as Message
          const [full] = await hydrate([m])
          upsert(full)
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as Message
          setMessages(prev => prev.map(x => x.id === m.id ? { ...x, ...m } : x))
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' },
        async (payload) => {
          const r = (payload.new ?? payload.old) as Reaction
          const { data } = await supabase.from('message_reactions').select('*').eq('message_id', r.message_id)
          setMessages(prev => prev.map(x => x.id === r.message_id ? { ...x, reactions: (data ?? []) as Reaction[] } : x))
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [conversationId, upsert])

  const send = useCallback(async (payload: {
    type: Message['type']; content?: string | null; reply_to_id?: string | null
    metadata?: Record<string, any>; attachment?: Omit<Attachment, 'id' | 'message_id'>
  }) => {
    if (!conversationId || !userId) return
    const cid = uuid()
    const optimistic: Message = {
      id: 'local-' + cid, conversation_id: conversationId, sender_id: userId,
      type: payload.type, content: payload.content ?? null, reply_to_id: payload.reply_to_id ?? null,
      created_at: new Date().toISOString(), edited_at: null, deleted_at: null,
      metadata: { ...(payload.metadata ?? {}), cid }, _local: true, _status: 'pending',
      attachments: payload.attachment ? [{ ...payload.attachment, id: 'a', message_id: 'local' } as Attachment] : [],
      reactions: [],
      reply: payload.reply_to_id ? messages.find(m => m.id === payload.reply_to_id) ?? null : null,
    }
    setMessages(prev => [...prev, optimistic])

    const { data, error } = await supabase.from('messages').insert({
      conversation_id: conversationId, sender_id: userId, type: payload.type,
      content: payload.content ?? null, reply_to_id: payload.reply_to_id ?? null,
      metadata: { ...(payload.metadata ?? {}), cid },
    }).select().single()

    if (error || !data) {
      setMessages(prev => prev.map(m => m.id === optimistic.id ? { ...m, _status: 'failed' } : m))
      return
    }
    if (payload.attachment) {
      await supabase.from('attachments').insert({ ...payload.attachment, message_id: data.id })
    }
    setMessages(prev => prev.map(m => m.id === optimistic.id
      ? { ...(data as Message), _local: false, _status: 'sent', attachments: optimistic.attachments, reactions: [], reply: optimistic.reply }
      : m))
  }, [conversationId, userId, messages])

  const react = useCallback(async (messageId: string, emoji: string) => {
    if (!userId) return
    const msg = messages.find(m => m.id === messageId)
    const mine = msg?.reactions?.find(r => r.user_id === userId)
    if (mine && mine.emoji === emoji) {
      await supabase.from('message_reactions').delete().eq('message_id', messageId).eq('user_id', userId)
    } else {
      await supabase.from('message_reactions').upsert({ message_id: messageId, user_id: userId, emoji })
    }
  }, [userId, messages])

  const edit = useCallback(async (messageId: string, content: string) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content, edited_at: new Date().toISOString() } : m))
    await supabase.from('messages').update({ content, edited_at: new Date().toISOString() }).eq('id', messageId)
  }, [])

  const deleteForEveryone = useCallback(async (messageId: string) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, deleted_at: new Date().toISOString(), content: null } : m))
    await supabase.from('messages').update({ deleted_at: new Date().toISOString(), content: null, type: 'text' }).eq('id', messageId)
    await supabase.from('attachments').delete().eq('message_id', messageId)
  }, [])

  const deleteForMe = useCallback((messageId: string) => {
    const hidden = JSON.parse(localStorage.getItem('wa-hidden') ?? '[]')
    localStorage.setItem('wa-hidden', JSON.stringify([...hidden, messageId]))
    setMessages(prev => prev.filter(m => m.id !== messageId))
  }, [])

  const retry = useCallback(async (m: Message) => {
    setMessages(prev => prev.filter(x => x.id !== m.id))
    await send({ type: m.type, content: m.content, reply_to_id: m.reply_to_id ?? undefined, metadata: m.metadata })
  }, [send])

  return { messages, loading, hasMore, loadMore, send, react, edit, deleteForEveryone, deleteForMe, retry }
}
