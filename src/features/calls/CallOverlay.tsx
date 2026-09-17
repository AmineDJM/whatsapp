import { useEffect, useRef, useState } from 'react'
import { useCall } from './CallProvider'
import Avatar from '../../components/Avatar'
import { Phone, PhoneEnd, Mic, MicOff, Video, VideoOff } from '../../lib/icons'
import { fmtDuration } from '../../lib/utils'
import { startRingtone, stopRingtone } from './ringtone'

export default function CallOverlay() {
  const { state, localStream, remoteStream, accept, reject, hangup, toggleMute, toggleCamera } = useCall()
  const localRef = useRef<HTMLVideoElement>(null)
  const remoteRef = useRef<HTMLVideoElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (state.phase === 'incoming' || state.phase === 'outgoing') startRingtone(state.phase === 'incoming')
    else stopRingtone()
    return () => stopRingtone()
  }, [state.phase])

  useEffect(() => {
    if (localRef.current && localStream) localRef.current.srcObject = localStream
  }, [localStream, state.phase])
  useEffect(() => {
    if (remoteRef.current && remoteStream) remoteRef.current.srcObject = remoteStream
    if (remoteAudioRef.current && remoteStream) remoteAudioRef.current.srcObject = remoteStream
  }, [remoteStream])

  useEffect(() => {
    if (state.phase !== 'active') return
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - (state.startedAt ?? Date.now())) / 1000)), 500)
    return () => clearInterval(t)
  }, [state.phase, state.startedAt])

  const isVideo = state.type === 'video'
  const statusText = state.phase === 'incoming' ? `Incoming ${isVideo ? 'video' : 'voice'} call`
    : state.phase === 'outgoing' ? 'Ringing…'
    : state.phase === 'connecting' ? 'Connecting…'
    : state.phase === 'active' ? fmtDuration(elapsed)
    : 'Call ended'

  return (
    <div className="fixed inset-0 z-[200] bg-wa-teal text-white flex flex-col safe-top safe-bottom animate-slideUp">
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {isVideo && state.phase === 'active' && (
        <>
          <video ref={remoteRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover bg-black" />
          <video ref={localRef} autoPlay playsInline muted
            className="absolute top-4 right-4 w-28 h-40 rounded-lg object-cover border-2 border-white/40 z-10 bg-black" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent h-24" />
        </>
      )}
      {isVideo && state.phase !== 'active' && localStream && (
        <video ref={localRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover bg-black opacity-60" />
      )}

      <div className="relative flex-1 flex flex-col items-center justify-center gap-4 px-6">
        {!(isVideo && state.phase === 'active') && (
          <>
            <Avatar name={state.peer?.display_name} url={state.peer?.avatar_url} size={120} />
            <div className="text-2xl font-medium">{state.peer?.display_name ?? 'Unknown'}</div>
          </>
        )}
        <div className={`text-white/80 ${isVideo && state.phase === 'active' ? 'absolute top-6 left-1/2 -translate-x-1/2' : ''}`}>
          {statusText}
        </div>
      </div>

      <div className="relative pb-10 pt-4 flex items-center justify-center gap-6">
        {state.phase === 'incoming' ? (
          <>
            <button onClick={reject} aria-label="Decline"
              className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg active:scale-95">
              <PhoneEnd size={28} />
            </button>
            <button onClick={accept} aria-label="Accept"
              className="w-16 h-16 rounded-full bg-wa-green flex items-center justify-center shadow-lg animate-ring">
              {isVideo ? <Video size={28} /> : <Phone size={28} />}
            </button>
          </>
        ) : (
          <>
            <button onClick={toggleMute} aria-label="Mute"
              className={`w-14 h-14 rounded-full flex items-center justify-center ${state.muted ? 'bg-white text-wa-teal' : 'bg-white/20'}`}>
              {state.muted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            {isVideo && (
              <button onClick={toggleCamera} aria-label="Camera"
                className={`w-14 h-14 rounded-full flex items-center justify-center ${state.cameraOff ? 'bg-white text-wa-teal' : 'bg-white/20'}`}>
                {state.cameraOff ? <VideoOff size={24} /> : <Video size={24} />}
              </button>
            )}
            <button onClick={hangup} aria-label="End call"
              className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg active:scale-95">
              <PhoneEnd size={28} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
