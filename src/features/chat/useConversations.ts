import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Conversation, Member, Message, Profile } from '../../lib/types'

// Loads the current user's conversation list, enriched with members, last message,
// unread counts, and keeps it live via realtime.
export function useConversations(userId: string | undefined) {
  const [items, setItems] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const loadingRef = useRef(false)

  const load = useCallback(async () => {
    if (!userId || loadingRef.current) return
    loadingRef.current = true
    // my memberships
    const { data: myMembers } = await supabase
      .from('conversation_members')
      .select('conversation_id, archived, pinned, muted_until, last_read_at, role')
      .eq('user_id', userId)
    const convIds = (myMembers ?? []).map(m => m.conversation_id)
    if (convIds.length === 0) { setItems([]); setLoading(false); loadingRef.current = false; return }

    const [{ data: convs }, { data: members }] = await Promise.all([
      supabase.from('conversations').select('*').in('id', convIds),
      supabase.from('conversation_members').select('*').in('conversation_id', convIds),
    ])
    // profiles of all members
    const memberUserIds = Array.from(new Set((members ?? []).map(m => m.user_id)))
    const { data: profiles } = await supabase.from('profiles').select('*').in('id', memberUserIds)
    const profMap = new Map((profiles ?? []).map(p => [p.id, p as Profile]))

    // last messages (fetch recent per conversation)
    const { data: lastMsgs } = await supabase
      .from('messages')
      .select('*')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false })
      .limit(convIds.length * 4)
    const lastByConv = new Map<string, Message>()
    for (const m of (lastMsgs ?? []) as Message[]) {
      if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m)
    }

    const myMemMap = new Map((myMembers ?? []).map(m => [m.conversation_id, m]))

    // unread counts
    const unreadEntries = await Promise.all(convIds.map(async cid => {
      const mine = myMemMap.get(cid)
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', cid)
        .gt('created_at', mine?.last_read_at ?? '1970-01-01')
        .neq('sender_id', userId)
      return [cid, count ?? 0] as const
    }))
    const unreadMap = new Map(unreadEntries)

    const enriched: Conversation[] = (convs ?? []).map(c => {
      const mems: Member[] = (members ?? []).filter(m => m.conversation_id === c.id)
        .map(m => ({ ...m, profile: profMap.get(m.user_id) }))
      const other = c.type === 'direct'
        ? mems.find(m => m.user_id !== userId)?.profile ?? null
        : null
      const mine = myMemMap.get(c.id)
      return {
        ...c,
        members: mems,
        other,
        last_message: lastByConv.get(c.id) ?? null,
        unread: unreadMap.get(c.id) ?? 0,
        pinned: mine?.pinned ?? false,
        archived: mine?.archived ?? false,
        muted_until: mine?.muted_until ?? null,
        my_last_read: mine?.last_read_at,
      }
    })
    enriched.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    })
    setItems(enriched)
    setLoading(false)
    loadingRef.current = false
  }, [userId])

  useEffect(() => { load() }, [load])

  // Realtime: any message insert / conversation change / membership change -> reload (debounced)
  useEffect(() => {
    if (!userId) return
    let t: number | undefined
    const bump = () => { clearTimeout(t); t = window.setTimeout(load, 250) }
    const ch = supabase
      .channel('conv-list-' + userId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_members' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, bump)
      .subscribe()
    return () => { clearTimeout(t); supabase.removeChannel(ch) }
  }, [userId, load])

  return { conversations: items, loading, reload: load, setConversations: setItems }
}
