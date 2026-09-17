import { useEffect, useRef, useState } from 'react'
import type { Attachment, Message } from '../lib/types'
import { signedUrl } from '../lib/storage'
import { Doc, Download, Play, Pause, Location as LocIcon } from '../lib/icons'
import { fmtSize, fmtDuration } from '../lib/utils'

export default function MediaAttachment({ message, onOpenMedia }:
  { message: Message; onOpenMedia: (url: string, type: 'image' | 'video') => void }) {
  const att = message.attachments?.[0]
  const [url, setUrl] = useState<string>(att && (att as any).localUrl ? (att as any).localUrl : '')

  useEffect(() => {
    let on = true
    if (att && !(att as any).localUrl && att.storage_path) {
      signedUrl(att.storage_path).then(u => { if (on) setUrl(u) })
    }
    return () => { on = false }
  }, [att?.storage_path])

  if (message.type === 'location') {
    const { lat, lng } = message.metadata ?? {}
    const href = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`
    return (
      <a href={href} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden w-56">
        <div className="h-28 bg-wa-green/20 flex items-center justify-center text-wa-teal"><LocIcon size={40} /></div>
        <div className="px-2 py-1.5 text-xs text-wa-sub">📍 {lat?.toFixed?.(4)}, {lng?.toFixed?.(4)} · Open map</div>
      </a>
    )
  }

  if (!att) return null

  if (message.type === 'image') {
    return (
      <button onClick={() => url && onOpenMedia(url, 'image')} className="block rounded-lg overflow-hidden max-w-[260px]">
        {url ? <img src={url} className="w-full max-h-80 object-cover" loading="lazy" />
          : <div className="w-56 h-56 bg-black/10 animate-pulse rounded-lg" />}
      </button>
    )
  }

  if (message.type === 'video') {
    return (
      <div className="rounded-lg overflow-hidden max-w-[260px] relative">
        {url ? <video src={url} controls playsInline className="w-full max-h-80" preload="metadata" />
          : <div className="w-56 h-40 bg-black/10 animate-pulse rounded-lg" />}
        {att.duration ? <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[11px] px-1.5 rounded">{fmtDuration(att.duration)}</span> : null}
      </div>
    )
  }

  if (message.type === 'voice_note' || message.type === 'audio') {
    return <AudioPlayer url={url} duration={att.duration ?? undefined} voice={message.type === 'voice_note'} />
  }

  // document
  return (
    <a href={url || undefined} target="_blank" rel="noreferrer" download={att.file_name ?? undefined}
      className="flex items-center gap-3 bg-black/5 dark:bg-white/5 rounded-lg p-2.5 min-w-[220px] max-w-[280px]">
      <div className="w-10 h-10 rounded bg-wa-teal/10 text-wa-teal flex items-center justify-center shrink-0"><Doc size={22} /></div>
      <div className="min-w-0 flex-1">
        <div className="text-sm text-wa-text dark:text-wa-dtext truncate">{att.file_name ?? 'Document'}</div>
        <div className="text-xs text-wa-sub">{(att.file_name?.split('.').pop() ?? '').toUpperCase()} · {fmtSize(att.size)}</div>
      </div>
      <Download size={20} className="text-wa-sub shrink-0" />
    </a>
  )
}

function AudioPlayer({ url, duration, voice }: { url: string; duration?: number; voice?: boolean }) {
  const ref = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [rate, setRate] = useState(1)
  const [cur, setCur] = useState(0)

  const toggle = () => {
    const a = ref.current
    if (!a) return
    if (playing) a.pause()
    else a.play()
  }
  const cycleRate = () => {
    const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1
    setRate(next)
    if (ref.current) ref.current.playbackRate = next
  }

  return (
    <div className="flex items-center gap-2 min-w-[200px] max-w-[260px]">
      <audio ref={ref} src={url || undefined} preload="metadata"
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setProgress(0) }}
        onTimeUpdate={e => { const a = e.currentTarget; setCur(a.currentTime); setProgress(a.duration ? a.currentTime / a.duration : 0) }} />
      <button onClick={toggle} className="w-9 h-9 rounded-full bg-wa-green text-white flex items-center justify-center shrink-0">
        {playing ? <Pause size={18} /> : <Play size={18} />}
      </button>
      <div className="flex-1">
        <div className="h-1 bg-black/15 dark:bg-white/20 rounded-full relative">
          <div className="absolute inset-y-0 left-0 bg-wa-green rounded-full" style={{ width: `${progress * 100}%` }} />
          <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-wa-green" style={{ left: `calc(${progress * 100}% - 5px)` }} />
        </div>
        <div className="flex justify-between text-[11px] text-wa-sub mt-1">
          <span>{voice ? '🎤 ' : ''}{fmtDuration(playing || cur ? cur : duration)}</span>
          <button onClick={cycleRate} className="font-medium">{rate}x</button>
        </div>
      </div>
    </div>
  )
}
