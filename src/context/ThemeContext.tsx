import { createContext, useContext, useEffect, useState } from 'react'

type Mode = 'light' | 'dark' | 'system'
const Ctx = createContext<{ mode: Mode; setMode: (m: Mode) => void }>({ mode: 'system', setMode: () => {} })
export function useTheme() { return useContext(Ctx) }

function apply(mode: Mode) {
  const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = mode === 'dark' || (mode === 'system' && sysDark)
  document.documentElement.classList.toggle('dark', dark)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', dark ? '#0B141A' : '#075E54')
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>(() => (localStorage.getItem('wa-theme') as Mode) || 'system')
  useEffect(() => {
    apply(mode)
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => mode === 'system' && apply('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [mode])
  const setMode = (m: Mode) => { localStorage.setItem('wa-theme', m); setModeState(m) }
  return <Ctx.Provider value={{ mode, setMode }}>{children}</Ctx.Provider>
}
