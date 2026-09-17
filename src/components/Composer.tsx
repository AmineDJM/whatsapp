import { useEffect, useRef, useState } from 'react'
import type { Message, MsgType } from '../lib/types'
import { Emoji, Attach, Send, Mic, Camera, Doc, Location as LocIcon, X, Trash } from '../lib/icons'
import { cx, fmtDuration } from '../lib/utils'
import { useToast } from './Toast'

const EMOJI_SET = '😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 😉 😍 🥰 😘 😜 🤩 🤔 🤗 🤭 😐 😴 😎 🥳 😢 😭 😤 😡 👍 👎 👏 🙏 💪 🔥 🎉 ❤️ 🧡 💛 💚 💙 💜 🖤 💯 ✅ ❌ ⭐ 🌟 🎂 🍕 ☕ 🚀'.split(' ')

export default function Composer({
  onText, onFile, onVoice, onLocation, onTyping, replyingTo, onCancelReply, editing, onCommitEdit, onCancelEdit, meId, disabled,
}: {
  onText: (t: string) => void
  onFile: (f: File, type: MsgType) => void
  onVoice: (b: Blob, dur: number) => void
  onLocation: (lat: number, lng: number) => void
  onTyping: (stop?: boolean) => void
  replyingTo: Message | null
  onCancelReply: () => void
  editing: Message | null
  onCommitEdit: (t: string) => void
  onCancelEdit: () => void
  meId?: string
  disabled?: boolean
}) {
  const toast = useToast()
  const [text, setText] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [showAttach, setShowAttach] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const fileRefs = {
    media: useRef<HTMLInputElement>(null),
    doc: useRef<HTMLInputElement>(null),
    camera: useRef<HTMLInputElement>(null),
    audio: useRef<HTMLInputElement>(null),
  }

  // voice recording
  const [recording, setRecording] = useState(false)
  const [recSec, setRecSec] = useState(0)
  const recRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    if (editing) { setText(editing.content ?? ''); taRef.current?.focus() }
  }, [editing])

  function submit() {
    const t = text.trim()
    if (!t) return
    if (editing) { onCommitEdit(t); setText(''); return }
    onText(t)
    setText('')
    onTyping(true)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) {
      e.preventDefault(); submit()
    }
  }

  function handleFiles(files: FileList | null, forced?: MsgType) {
    if (!files) return
    for (const f of Array.from(files)) {
      let type: MsgType = forced ?? 'document'
      if (!forced) {
        if (f.type.startsWith('image/')) type = 'image'
        else if (f.type.startsWith('video/')) type = 'video'
        else if (f.type.startsWith('audio/')) type = 'audio'
      }
      onFile(f, type)
    }
    setShowAttach(false)
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : ''
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunksRef.current = []
      cancelledRef.current = false
      rec.ondataavailable = e => e.data.size && chunksRef.current.push(e.data)
      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        if (timerRef.current) clearInterval(timerRef.current)
        const dur = recSecRef.current
        if (!cancelledRef.current && chunksRef.current.length) {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
          onVoice(blob, dur)
        }
        setRecording(false); setRecSec(0); recSecRef.current = 0
      }
      rec.start()
      recRef.current = rec
      setRecording(true)
      recSecRef.current = 0; setRecSec(0)
      timerRef.current = window.setInterval(() => { recSecRef.current += 1; setRecSec(recSecRef.current) }, 1000)
    } catch {
      toast('Microphone unavailable or permission denied', 'error')
    }
  }
  const recSecRef = useRef(0)
  function stopRecording(cancel: boolean) {
    cancelledRef.current = cancel
    recRef.current?.stop()
  }

  function sendLocation() {
    setShowAttach(false)
    if (!navigator.geolocation) return toast('Geolocation not supported', 'error')
    navigator.geolocation.getCurrentPosition(
      pos => onLocation(pos.coords.latitude, pos.coords.longitude),
      () => toast('Location permission denied', 'error'),
    )
  }

  function onPaste(e: React.ClipboardEvent) {
    const img = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))
    if (img) { const f = img.getAsFile(); if (f) onFile(f, 'image') }
  }

  const hasText = text.trim().length > 0

  return (
    <div className="bg-wa-header dark:bg-wa-dheader safe-bottom">
      {editing && (
        <Bar onClose={onCancelEdit} title="Editing message" text={editing.content ?? ''} />
      )}
      {replyingTo && !editing && (
        <Bar onClose={onCancelReply} title={replyingTo.sender_id === meId ? 'You' : 'Reply'}
          text={replyingTo.deleted_at ? 'Deleted' : (replyingTo.content ?? `[${replyingTo.type}]`)} />
      )}

      {recording ? (
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => stopRecording(true)} className="text-red-500"><Trash size={24} /></button>
          <div className="flex items-center gap-2 flex-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-wa-text dark:text-wa-dtext font-mono">{fmtDuration(recSec)}</span>
            <span className="text-wa-sub text-sm">Recording…</span>
          </div>
          <button onClick={() => stopRecording(false)} className="w-11 h-11 rounded-full bg-wa-green text-white flex items-center justify-center"><Send size={22} /></button>
        </div>
      ) : (
        <div className="flex items-end gap-1.5 px-2 py-2">
          <div className="relative flex items-end flex-1 bg-white dark:bg-wa-dpanel rounded-3xl px-2 py-1">
            <button onClick={() => { setShowEmoji(v => !v); setShowAttach(false) }} className="p-2 text-wa-sub shrink-0" aria-label="Emoji"><Emoji size={24} /></button>
            <button onClick={() => { setShowAttach(v => !v); setShowEmoji(false) }} className="p-2 text-wa-sub shrink-0" aria-label="Attach"><Attach size={24} /></button>
            <textarea
              ref={taRef} value={text} disabled={disabled}
              onChange={e => { setText(e.target.value); onTyping() }}
              onKeyDown={onKeyDown} onPaste={onPaste}
              placeholder="Type a message" rows={1}
              className="flex-1 resize-none bg-transparent outline-none py-2 max-h-32 text-wa-text dark:text-wa-dtext text-[15px]" />
            <button onClick={() => fileRefs.camera.current?.click()} className="p-2 text-wa-sub shrink-0 hidden sm:block" aria-label="Camera"><Camera size={22} /></button>

            {showEmoji && (
              <div className="absolute bottom-14 left-0 w-72 max-h-56 overflow-y-auto bg-white dark:bg-wa-dheader rounded-xl shadow-xl p-2 grid grid-cols-8 gap-1 z-30">
                {EMOJI_SET.map(e => (
                  <button key={e} onClick={() => { setText(t => t + e); taRef.current?.focus() }} className="text-xl hover:scale-110">{e}</button>
                ))}
              </div>
            )}
            {showAttach && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowAttach(false)} />
                <div className="absolute bottom-14 left-10 bg-white dark:bg-wa-dheader rounded-xl shadow-xl p-2 z-30 grid grid-cols-1 gap-0.5 w-52 animate-pop">
                  <AttachItem color="#7F66FF" icon={<Doc size={20} />} label="Document" onClick={() => fileRefs.doc.current?.click()} />
                  <AttachItem color="#E542A3" icon={<Camera size={20} />} label="Photos & Videos" onClick={() => fileRefs.media.current?.click()} />
                  <AttachItem color="#0EA5E9" icon={<Camera size={20} />} label="Camera" onClick={() => fileRefs.camera.current?.click()} />
                  <AttachItem color="#F97316" icon={<Mic size={20} />} label="Audio" onClick={() => fileRefs.audio.current?.click()} />
                  <AttachItem color="#22C55E" icon={<LocIcon size={20} />} label="Location" onClick={sendLocation} />
                </div>
              </>
            )}
          </div>

          {hasText || editing ? (
            <button onClick={submit} className="w-11 h-11 rounded-full bg-wa-green text-white flex items-center justify-center shrink-0" aria-label="Send"><Send size={22} /></button>
          ) : (
            <button onClick={startRecording} className="w-11 h-11 rounded-full bg-wa-green text-white flex items-center justify-center shrink-0" aria-label="Record"><Mic size={22} /></button>
          )}
        </div>
      )}

      <input ref={fileRefs.media} type="file" accept="image/*,video/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
      <input ref={fileRefs.doc} type="file" className="hidden" onChange={e => handleFiles(e.target.files, 'document')} />
      <input ref={fileRefs.camera} type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={e => handleFiles(e.target.files)} />
      <input ref={fileRefs.audio} type="file" accept="audio/*" className="hidden" onChange={e => handleFiles(e.target.files, 'audio')} />
    </div>
  )
}

function Bar({ onClose, title, text }: { onClose: () => void; title: string; text: string }) {
  return (
    <div className="flex items-center gap-2 mx-2 mt-2 bg-white dark:bg-wa-dpanel rounded-lg border-l-4 border-wa-green px-3 py-1.5">
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-wa-teal dark:text-wa-green">{title}</div>
        <div className="text-xs text-wa-sub truncate">{text}</div>
      </div>
      <button onClick={onClose} className="text-wa-sub"><X size={18} /></button>
    </div>
  )
}

function AttachItem({ color, icon, label, onClick }: { color: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">
      <span className="w-9 h-9 rounded-full flex items-center justify-center text-white" style={{ background: color }}>{icon}</span>
      <span className="text-sm text-wa-text dark:text-wa-dtext">{label}</span>
    </button>
  )
}
