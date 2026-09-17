import { useState } from 'react'
import type { Message, Profile } from '../lib/types'
import { cx, fmtTime, linkify, colorFor } from '../lib/utils'
import { Check, DoubleCheck, Clock, Reply as ReplyIcon, Forward, Star, Edit, Trash, Copy, X } from '../lib/icons'
import MediaAttachment from './MediaAttachment'

export type Tick = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

function Ticks({ t }: { t: Tick }) {
  if (t === 'pending') return <Clock size={14} className="text-wa-sub" />
  if (t === 'failed') return <span className="text-red-500 text-xs font-bold">!</span>
  if (t === 'sent') return <Check size={15} className="text-wa-sub" />
  return <DoubleCheck size={16} className={t === 'read' ? 'text-[#53BDEB]' : 'text-wa-sub'} />
}

export default function MessageBubble({
  m, isOwn, isGroup, sender, tick, meId, onReply, onReact, onEdit, onDelete, onForward, onStar, onOpenMedia, onJumpTo, starred,
}: {
  m: Message; isOwn: boolean; isGroup: boolean; sender?: Profile; tick: Tick; meId?: string
  onReply: (m: Message) => void; onReact: (id: string, e: string) => void
  onEdit: (m: Message) => void; onDelete: (m: Message) => void; onForward: (m: Message) => void
  onStar: (m: Message) => void; onOpenMedia: (url: string, type: 'image' | 'video') => void
  onJumpTo: (id: string) => void; starred: boolean
}) {
  const [menu, setMenu] = useState(false)
  const [showReactPicker, setShowReactPicker] = useState(false)
  const deleted = !!m.deleted_at
  const hasMedia = ['image', 'video', 'audio', 'voice_note', 'document', 'location'].includes(m.type)

  const grouped = (m.reactions ?? []).reduce<Record<string, number>>((a, r) => { a[r.emoji] = (a[r.emoji] ?? 0) + 1; return a }, {})
  const myReaction = (m.reactions ?? []).find(r => r.user_id === meId)?.emoji

  function copy() { if (m.content) navigator.clipboard?.writeText(m.content); setMenu(false) }

  return (
    <div id={'msg-' + m.id} className={cx('flex px-2 md:px-8 group', isOwn ? 'justify-end' : 'justify-start')}
      onContextMenu={(e) => { e.preventDefault(); setMenu(true) }}>
      <div className={cx('relative max-w-[75%] md:max-w-[65%]')}>
        <div className={cx(
          'relative rounded-lg px-2 pt-1.5 pb-1 shadow-sm',
          isOwn ? 'bg-wa-out dark:bg-wa-outDark tail-out rounded-tr-none' : 'bg-white dark:bg-wa-dheader tail-in rounded-tl-none',
        )}>
          {isGroup && !isOwn && !deleted && (
            <div className="text-[13px] font-medium mb-0.5" style={{ color: colorFor(m.sender_id) }}>
              {sender?.display_name ?? sender?.username ?? 'Member'}
            </div>
          )}

          {m.reply && !deleted && (
            <button onClick={() => onJumpTo(m.reply!.id)}
              className="flex flex-col items-start text-left w-full mb-1 rounded bg-black/5 dark:bg-white/10 border-l-4 border-wa-green px-2 py-1">
              <span className="text-xs font-medium text-wa-teal dark:text-wa-green">{m.reply.sender_id === meId ? 'You' : (sender?.display_name ?? 'Reply')}</span>
              <span className="text-xs text-wa-sub truncate max-w-[220px]">
                {m.reply.deleted_at ? 'Deleted message' : (m.reply.content ?? `[${m.reply.type}]`)}
              </span>
            </button>
          )}

          {deleted ? (
            <div className="italic text-wa-sub text-sm flex items-center gap-1 pr-14">🚫 This message was deleted</div>
          ) : (
            <>
              {hasMedia && <div className="mb-1"><MediaAttachment message={m} onOpenMedia={onOpenMedia} /></div>}
              {m.content && (
                <div className="text-sm text-wa-text dark:text-wa-dtext whitespace-pre-wrap break-words pr-14">
                  {linkify(m.content).map((part, i) => typeof part === 'string'
                    ? <span key={i}>{part}</span>
                    : <a key={i} href={part.url} target="_blank" rel="noreferrer" className="text-wa-tealLight dark:text-[#53BDEB] underline break-all">{part.url}</a>)}
                </div>
              )}
            </>
          )}

          <div className={cx('flex items-center gap-1 justify-end -mt-0.5', hasMedia && !m.content && 'absolute bottom-1 right-2 bg-black/40 rounded px-1')}>
            {m.edited_at && !deleted && <span className={cx('text-[11px]', hasMedia && !m.content ? 'text-white/80' : 'text-wa-sub')}>edited</span>}
            {starred && <Star size={11} className="text-wa-sub" />}
            <span className={cx('text-[11px]', hasMedia && !m.content ? 'text-white/90' : 'text-wa-sub')}>{fmtTime(m.created_at)}</span>
            {isOwn && !deleted && <Ticks t={tick} />}
          </div>
        </div>

        {/* reactions badge */}
        {Object.keys(grouped).length > 0 && (
          <div className={cx('absolute -bottom-3 flex gap-0.5 bg-white dark:bg-wa-dheader rounded-full px-1.5 py-0.5 shadow text-xs', isOwn ? 'right-2' : 'left-2')}>
            {Object.entries(grouped).map(([e, n]) => <span key={e}>{e}{n > 1 ? n : ''}</span>)}
          </div>
        )}

        {/* hover react + menu triggers (desktop) */}
        {!deleted && (
          <button onClick={() => setShowReactPicker(v => !v)}
            className={cx('hidden group-hover:flex absolute -top-2 items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-wa-dheader shadow text-wa-sub', isOwn ? '-left-8' : '-right-8')}>
            😊
          </button>
        )}

        {showReactPicker && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setShowReactPicker(false)} />
            <div className={cx('absolute -top-11 z-40 flex gap-1 bg-white dark:bg-wa-dheader rounded-full px-2 py-1 shadow-lg animate-pop', isOwn ? 'right-0' : 'left-0')}>
              {EMOJIS.map(e => (
                <button key={e} onClick={() => { onReact(m.id, e); setShowReactPicker(false) }}
                  className={cx('text-xl hover:scale-125 transition', myReaction === e && 'scale-125')}>{e}</button>
              ))}
            </div>
          </>
        )}

        {menu && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
            <div className={cx('absolute z-40 top-2 w-44 bg-white dark:bg-wa-dheader rounded-lg shadow-xl py-1 text-sm text-wa-text dark:text-wa-dtext', isOwn ? 'right-0' : 'left-0')}>
              <div className="flex justify-around px-2 py-1.5 border-b border-wa-divider dark:border-wa-ddivider">
                {EMOJIS.map(e => <button key={e} onClick={() => { onReact(m.id, e); setMenu(false) }} className="text-lg hover:scale-110">{e}</button>)}
              </div>
              <MI icon={<ReplyIcon size={16} />} onClick={() => { onReply(m); setMenu(false) }}>Reply</MI>
              <MI icon={<Forward size={16} />} onClick={() => { onForward(m); setMenu(false) }}>Forward</MI>
              <MI icon={<Star size={16} />} onClick={() => { onStar(m); setMenu(false) }}>{starred ? 'Unstar' : 'Star'}</MI>
              {m.content && !deleted && <MI icon={<Copy size={16} />} onClick={copy}>Copy</MI>}
              {isOwn && m.type === 'text' && !deleted && <MI icon={<Edit size={16} />} onClick={() => { onEdit(m); setMenu(false) }}>Edit</MI>}
              {!deleted && <MI icon={<Trash size={16} />} onClick={() => { onDelete(m); setMenu(false) }} danger>Delete</MI>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function MI({ children, icon, onClick, danger }: { children: React.ReactNode; icon: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={cx('w-full flex items-center gap-3 px-4 py-2 hover:bg-black/5 dark:hover:bg-white/5', danger && 'text-red-500')}>
      {icon}{children}
    </button>
  )
}
