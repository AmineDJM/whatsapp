import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'

// Manages ephemeral + read state for the open conversation:
// - typing indicators (Realtime broadcast, never written to DB)
// - presence (who currently has the chat open)
// - members' last_read_at (for delivery/read ticks), via conversation_members realtime
export function useConversationMeta(conversationId: string | undefined, userId: string | undefined, displayName: string) {
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({}) // uid -> name
  const [reads, setReads] = useState<Record<string, string>>({}) // uid -> last_read_at
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const typingTimeouts = useRef<Record<string, number>>({})

  // initial reads
  useEffect(() => {
    if (!conversationId) return
    supabase.from('conversation_members').select('user_id,last_read_at').eq('conversation_id', conversationId)
      .then(({ data }) => {
        const map: Record<string, string> = {}
        for (const r of data ?? []) map[r.user_id] = r.last_read_at
        setReads(map)
      })
  }, [conversationId])

  useEffect(() => {
    if (!conversationId || !userId) return
    const ch = supabase.channel('room-' + conversationId, { config: { presence: { key: userId } } })
    ch.on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (payload.uid === userId) return
      setTypingUsers(prev => ({ ...prev, [payload.uid]: payload.name }))
      clearTimeout(typingTimeouts.current[payload.uid])
      typingTimeouts.current[payload.uid] = window.setTimeout(() => {
        setTypingUsers(prev => { const n = { ...prev }; delete n[payload.uid]; return n })
      }, payload.stop ? 0 : 4000)
      if (payload.stop) setTypingUsers(prev => { const n = { ...prev }; delete n[payload.uid]; return n })
    })
    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await ch.track({ online_at: Date.now() })
    })
    chanRef.current = ch

    // watch reads
    const readsCh = supabase.channel('reads-' + conversationId)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversation_members', filter: `conversation_id=eq.${conversationId}` },
        (p) => {
          const row = p.new as { user_id: string; last_read_at: string }
          setReads(prev => ({ ...prev, [row.user_id]: row.last_read_at }))
        })
      .subscribe()

    return () => { supabase.removeChannel(ch); supabase.removeChannel(readsCh); chanRef.current = null }
  }, [conversationId, userId])

  const emitTyping = useMemo(() => {
    let lastSent = 0
    return (stop = false) => {
      const now = Date.now()
      if (!stop && now - lastSent < 1500) return
      lastSent = now
      chanRef.current?.send({ type: 'broadcast', event: 'typing', payload: { uid: userId, name: displayName, stop } })
    }
  }, [userId, displayName])

  async function markRead() {
    if (!conversationId || !userId) return
    await supabase.from('conversation_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId).eq('user_id', userId)
  }

  const typingNames = Object.values(typingUsers)
  return { typingNames, reads, emitTyping, markRead }
}
