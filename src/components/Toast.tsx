import { createContext, useCallback, useContext, useRef, useState } from 'react'

type Toast = { id: number; text: string; kind: 'info' | 'error' | 'success' }
const Ctx = createContext<(text: string, kind?: Toast['kind']) => void>(() => {})

export function useToast() { return useContext(Ctx) }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(1)
  const push = useCallback((text: string, kind: Toast['kind'] = 'info') => {
    const id = idRef.current++
    setToasts(t => [...t, { id, text, kind }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200)
  }, [])
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="fixed z-[100] left-1/2 -translate-x-1/2 top-4 flex flex-col gap-2 items-center pointer-events-none safe-top">
        {toasts.map(t => (
          <div key={t.id}
            className={`px-4 py-2 rounded-lg text-sm shadow-lg text-white animate-pop ${
              t.kind === 'error' ? 'bg-red-600' : t.kind === 'success' ? 'bg-wa-tealLight' : 'bg-black/80'
            }`}>
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
