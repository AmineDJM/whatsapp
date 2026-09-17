import { X, Download } from '../lib/icons'

export default function MediaViewer({ url, type, onClose }: { url: string; type: 'image' | 'video'; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[120] bg-black/95 flex flex-col safe-top safe-bottom" onClick={onClose}>
      <div className="flex justify-end gap-2 p-4 text-white" onClick={e => e.stopPropagation()}>
        <a href={url} download target="_blank" rel="noreferrer" className="p-2 hover:bg-white/10 rounded-full"><Download size={22} /></a>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X size={22} /></button>
      </div>
      <div className="flex-1 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
        {type === 'image'
          ? <img src={url} className="max-w-full max-h-full object-contain" />
          : <video src={url} controls autoPlay playsInline className="max-w-full max-h-full" />}
      </div>
    </div>
  )
}
