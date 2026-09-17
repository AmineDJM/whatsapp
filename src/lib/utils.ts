export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

export function fmtTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function fmtChatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return fmtTime(iso)
  const yest = new Date(now); yest.setDate(now.getDate() - 1)
  if (d.toDateString() === yest.toDateString()) return 'Yesterday'
  const diff = (now.getTime() - d.getTime()) / 86400000
  if (diff < 7) return d.toLocaleDateString([], { weekday: 'long' })
  return d.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export function dateSeparator(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return 'Today'
  const yest = new Date(now); yest.setDate(now.getDate() - 1)
  if (d.toDateString() === yest.toDateString()) return 'Yesterday'
  const diff = (now.getTime() - d.getTime()) / 86400000
  if (diff < 7) return d.toLocaleDateString([], { weekday: 'long' })
  return d.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })
}

export function dayKey(iso: string) {
  return new Date(iso).toDateString()
}

export function lastSeenText(p?: { is_online?: boolean; last_seen?: string } | null) {
  if (!p) return ''
  if (p.is_online) return 'online'
  if (!p.last_seen) return ''
  const d = new Date(p.last_seen)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const t = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (sameDay) return `last seen today at ${t}`
  const yest = new Date(now); yest.setDate(now.getDate() - 1)
  if (d.toDateString() === yest.toDateString()) return `last seen yesterday at ${t}`
  return `last seen ${d.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' })}`
}

export function initials(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
}

const palette = ['#25D366', '#128C7E', '#075E54', '#34B7F1', '#DFA000', '#B23A48', '#6A4C93', '#1B998B']
export function colorFor(id?: string | null) {
  if (!id) return palette[0]
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return palette[h % palette.length]
}

export function fmtSize(bytes?: number | null) {
  if (!bytes) return ''
  const u = ['B', 'KB', 'MB', 'GB']
  let i = 0, n = bytes
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++ }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${u[i]}`
}

export function fmtDuration(sec?: number | null) {
  if (sec == null) return '0:00'
  const s = Math.floor(sec)
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

export function uuid() {
  return (crypto as any).randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export function extOf(name: string) {
  const m = name.match(/\.([a-zA-Z0-9]+)$/)
  return m ? m[1].toLowerCase() : 'bin'
}

export function linkify(text: string): (string | { url: string })[] {
  const re = /(https?:\/\/[^\s]+)/g
  const out: (string | { url: string })[] = []
  let last = 0, m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push({ url: m[0] })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
