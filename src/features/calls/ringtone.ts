// Lightweight synthesized ringtone using Web Audio (no asset needed).
// Respects autoplay: only starts after a user gesture has occurred at least once.
let ctx: AudioContext | null = null
let interval: number | null = null

function beep(freqs: number[]) {
  if (!ctx) return
  const now = ctx.currentTime
  freqs.forEach((f, i) => {
    const o = ctx!.createOscillator()
    const g = ctx!.createGain()
    o.type = 'sine'; o.frequency.value = f
    g.gain.setValueAtTime(0, now + i * 0.25)
    g.gain.linearRampToValueAtTime(0.18, now + i * 0.25 + 0.02)
    g.gain.linearRampToValueAtTime(0, now + i * 0.25 + 0.22)
    o.connect(g); g.connect(ctx!.destination)
    o.start(now + i * 0.25); o.stop(now + i * 0.25 + 0.24)
  })
}

export function startRingtone(loud: boolean) {
  try {
    ctx = ctx ?? new (window.AudioContext || (window as any).webkitAudioContext)()
    ctx.resume?.()
    if (interval) return
    const pattern = () => beep(loud ? [880, 1046, 880] : [660, 660])
    pattern()
    interval = window.setInterval(pattern, loud ? 2000 : 3000)
  } catch { /* autoplay blocked */ }
}

export function stopRingtone() {
  if (interval) { clearInterval(interval); interval = null }
}
