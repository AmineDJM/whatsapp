import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { Profile } from '../../lib/types'
import CallOverlay from './CallOverlay'

type CallType = 'audio' | 'video'
type Phase = 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'active' | 'ended'

type CallState = {
  phase: Phase
  callId: string | null
  peer: Profile | null
  conversationId: string | null
  type: CallType
  isCaller: boolean
  muted: boolean
  cameraOff: boolean
  startedAt: number | null
}

type Api = {
  state: CallState
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  startCall: (conversationId: string, peer: Profile, type: CallType) => Promise<void>
  accept: () => Promise<void>
  reject: () => void
  hangup: () => void
  toggleMute: () => void
  toggleCamera: () => void
}

const ICE: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

const Ctx = createContext<Api | null>(null)
export function useCall() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useCall outside provider')
  return c
}

const initial: CallState = {
  phase: 'idle', callId: null, peer: null, conversationId: null,
  type: 'audio', isCaller: false, muted: false, cameraOff: false, startedAt: null,
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { session, profile } = useAuth()
  const myId = session?.user?.id
  const [state, setState] = useState<CallState>(initial)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const callChanRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const pendingIce = useRef<RTCIceCandidateInit[]>([])
  const ringTimeout = useRef<number | null>(null)
  const incomingInfo = useRef<{ callId: string; peer: Profile; type: CallType; conversationId: string } | null>(null)

  const cleanup = useCallback((phase: Phase = 'idle') => {
    pcRef.current?.getSenders().forEach(s => s.track?.stop())
    pcRef.current?.close()
    pcRef.current = null
    localStream?.getTracks().forEach(t => t.stop())
    if (callChanRef.current) { supabase.removeChannel(callChanRef.current); callChanRef.current = null }
    if (ringTimeout.current) { clearTimeout(ringTimeout.current); ringTimeout.current = null }
    pendingIce.current = []
    setLocalStream(null); setRemoteStream(null)
    setState(s => ({ ...initial, phase }))
    if (phase === 'ended') setTimeout(() => setState(initial), 1200)
  }, [localStream])

  const makePc = useCallback((stream: MediaStream) => {
    const pc = new RTCPeerConnection(ICE)
    stream.getTracks().forEach(t => pc.addTrack(t, stream))
    const remote = new MediaStream()
    setRemoteStream(remote)
    pc.ontrack = (e) => { e.streams[0].getTracks().forEach(t => remote.addTrack(t)); setRemoteStream(new MediaStream(remote.getTracks())) }
    pc.onicecandidate = (e) => {
      if (e.candidate) callChanRef.current?.send({ type: 'broadcast', event: 'ice', payload: { candidate: e.candidate } })
    }
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setState(s => ({ ...s, phase: 'active', startedAt: s.startedAt ?? Date.now() }))
      if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
        if (pcRef.current) endCall(false)
      }
    }
    pcRef.current = pc
    return pc
  }, [])

  const drainIce = useCallback(async () => {
    const pc = pcRef.current
    if (!pc || !pc.remoteDescription) return
    for (const c of pendingIce.current) { try { await pc.addIceCandidate(c) } catch {} }
    pendingIce.current = []
  }, [])

  // Subscribe to a per-call channel with signaling handlers.
  const joinCallChannel = useCallback((callId: string, asCaller: boolean) => {
    const ch = supabase.channel('call-' + callId)
    ch.on('broadcast', { event: 'accept' }, async () => {
      // caller creates offer once callee accepted
      const pc = pcRef.current
      if (!pc || !asCaller) return
      setState(s => ({ ...s, phase: 'connecting' }))
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      ch.send({ type: 'broadcast', event: 'offer', payload: { sdp: offer } })
    })
    ch.on('broadcast', { event: 'offer' }, async ({ payload }) => {
      const pc = pcRef.current
      if (!pc || asCaller) return
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
      await drainIce()
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      ch.send({ type: 'broadcast', event: 'answer', payload: { sdp: answer } })
      setState(s => ({ ...s, phase: 'connecting' }))
    })
    ch.on('broadcast', { event: 'answer' }, async ({ payload }) => {
      const pc = pcRef.current
      if (!pc || !asCaller) return
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
      await drainIce()
    })
    ch.on('broadcast', { event: 'ice' }, async ({ payload }) => {
      const pc = pcRef.current
      if (!pc) return
      if (pc.remoteDescription) { try { await pc.addIceCandidate(payload.candidate) } catch {} }
      else pendingIce.current.push(payload.candidate)
    })
    ch.on('broadcast', { event: 'reject' }, () => { updateCall(callId, 'rejected'); cleanup('ended') })
    ch.on('broadcast', { event: 'end' }, () => { cleanup('ended') })
    ch.subscribe()
    callChanRef.current = ch
    return ch
  }, [cleanup, drainIce])

  async function updateCall(callId: string, status: string, extra: Record<string, any> = {}) {
    await supabase.from('calls').update({ status, ...extra }).eq('id', callId)
  }

  async function getMedia(type: CallType) {
    return navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video' ? { facingMode: 'user', width: { ideal: 1280 } } : false,
    })
  }

  const startCall = useCallback(async (conversationId: string, peer: Profile, type: CallType) => {
    if (!myId || !profile) return
    let stream: MediaStream
    try { stream = await getMedia(type) }
    catch { alert('Cannot access ' + (type === 'video' ? 'camera/microphone' : 'microphone') + '. Check permissions.'); return }
    setLocalStream(stream)
    const { data: call } = await supabase.from('calls').insert({
      conversation_id: conversationId, caller_id: myId, type, status: 'ringing',
    }).select().single()
    if (!call) { stream.getTracks().forEach(t => t.stop()); return }
    setState({ ...initial, phase: 'outgoing', callId: call.id, peer, conversationId, type, isCaller: true })
    makePc(stream)
    joinCallChannel(call.id, true)
    // ring the peer on their personal channel
    const ring = supabase.channel('user-' + peer.id)
    ring.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        ring.send({ type: 'broadcast', event: 'ring', payload: {
          callId: call.id, type, conversationId,
          caller: { id: myId, display_name: profile.display_name, username: profile.username, avatar_url: profile.avatar_url },
        }})
        setTimeout(() => supabase.removeChannel(ring), 1500)
      }
    })
    // timeout -> missed
    ringTimeout.current = window.setTimeout(() => {
      if (pcRef.current && pcRef.current.connectionState !== 'connected') {
        callChanRef.current?.send({ type: 'broadcast', event: 'end', payload: {} })
        updateCall(call.id, 'missed', { ended_at: new Date().toISOString() })
        cleanup('ended')
      }
    }, 35000)
  }, [myId, profile, makePc, joinCallChannel, cleanup])

  const accept = useCallback(async () => {
    const info = incomingInfo.current
    if (!info) return
    let stream: MediaStream
    try { stream = await getMedia(info.type) }
    catch { alert('Cannot access ' + (info.type === 'video' ? 'camera/microphone' : 'microphone')); reject(); return }
    setLocalStream(stream)
    setState(s => ({ ...s, phase: 'connecting' }))
    makePc(stream)
    joinCallChannel(info.callId, false)
    await updateCall(info.callId, 'accepted', { answered_at: new Date().toISOString() })
    // notify caller we accepted (may need to wait for channel subscribe)
    setTimeout(() => callChanRef.current?.send({ type: 'broadcast', event: 'accept', payload: {} }), 300)
  }, [makePc, joinCallChannel])

  const reject = useCallback(() => {
    const info = incomingInfo.current
    if (!info) { cleanup(); return }
    const ch = supabase.channel('call-' + info.callId)
    ch.subscribe((s) => {
      if (s === 'SUBSCRIBED') { ch.send({ type: 'broadcast', event: 'reject', payload: {} }); setTimeout(() => supabase.removeChannel(ch), 500) }
    })
    updateCall(info.callId, 'rejected', { ended_at: new Date().toISOString() })
    cleanup('ended')
  }, [cleanup])

  const endCall = useCallback((notify = true) => {
    if (notify && callChanRef.current) callChanRef.current.send({ type: 'broadcast', event: 'end', payload: {} })
    if (state.callId) updateCall(state.callId, state.phase === 'active' ? 'ended' : (state.isCaller ? 'missed' : 'rejected'), { ended_at: new Date().toISOString() })
    cleanup('ended')
  }, [state.callId, state.phase, state.isCaller, cleanup])

  const hangup = useCallback(() => endCall(true), [endCall])

  const toggleMute = useCallback(() => {
    setState(s => {
      const next = !s.muted
      localStream?.getAudioTracks().forEach(t => (t.enabled = !next))
      return { ...s, muted: next }
    })
  }, [localStream])

  const toggleCamera = useCallback(() => {
    setState(s => {
      const next = !s.cameraOff
      localStream?.getVideoTracks().forEach(t => (t.enabled = !next))
      return { ...s, cameraOff: next }
    })
  }, [localStream])

  // Personal channel: listen for incoming calls
  useEffect(() => {
    if (!myId) return
    const ch = supabase.channel('user-' + myId)
    ch.on('broadcast', { event: 'ring' }, ({ payload }) => {
      if (pcRef.current || state.phase !== 'idle') {
        // busy: auto-reject
        const rc = supabase.channel('call-' + payload.callId)
        rc.subscribe(s => { if (s === 'SUBSCRIBED') { rc.send({ type: 'broadcast', event: 'reject', payload: {} }); setTimeout(() => supabase.removeChannel(rc), 400) } })
        return
      }
      incomingInfo.current = { callId: payload.callId, peer: payload.caller, type: payload.type, conversationId: payload.conversationId }
      setState({ ...initial, phase: 'incoming', callId: payload.callId, peer: payload.caller, conversationId: payload.conversationId, type: payload.type, isCaller: false })
    })
    ch.subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [myId, state.phase])

  return (
    <Ctx.Provider value={{ state, localStream, remoteStream, startCall, accept, reject, hangup, toggleMute, toggleCamera }}>
      {children}
      {state.phase !== 'idle' && <CallOverlay />}
    </Ctx.Provider>
  )
}
