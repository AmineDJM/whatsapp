// Minimal inline SVG icon set (WhatsApp-like). Stroke inherits currentColor.
type P = { className?: string; size?: number }
const S = (size = 24) => ({ width: size, height: size, viewBox: '0 0 24 24' })

export const Search = ({ className, size }: P) => (
  <svg {...S(size)} className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
)
export const Back = ({ className, size }: P) => (
  <svg {...S(size)} className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
)
export const Send = ({ className, size }: P) => (
  <svg {...S(size)} className={className} fill="currentColor"><path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" /></svg>
)
export const Mic = ({ className, size }: P) => (
  <svg {...S(size)} className={className} fill="currentColor"><path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3z" /><path d="M17 11a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z" /></svg>
)
export const Attach = ({ className, size }: P) => (
  <svg {...S(size)} className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.4 11.05 12.25 20.2a5.5 5.5 0 0 1-7.78-7.78l9.19-9.19a3.5 3.5 0 1 1 4.95 4.95l-9.2 9.19a1.5 1.5 0 0 1-2.12-2.12l8.49-8.49" /></svg>
)
export const Emoji = ({ className, size }: P) => (
  <svg {...S(size)} className={className} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M8.5 14.5a5 5 0 0 0 7 0" /><circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" /></svg>
)
export const Phone = ({ className, size }: P) => (
  <svg {...S(size)} className={className} fill="currentColor"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.4 0 .8-.3 1z" /></svg>
)
export const Video = ({ className, size }: P) => (
  <svg {...S(size)} className={className} fill="currentColor"><path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z" /></svg>
)
export const VideoOff = ({ className, size }: P) => (
  <svg {...S(size)} className={className} fill="currentColor"><path d="M3.3 2 2 3.3 5.7 7H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12c.2 0 .4 0 .5-.1l4.2 4.2 1.3-1.3L3.3 2zM21 7l-4 4V7l4-4v8l-4-4" /></svg>
)
export const MicOff = ({ className, size }: P) => (
  <svg {...S(size)} className={className} fill="currentColor"><path d="M3.3 2 2 3.3l6 6V11a3 3 0 0 0 3 3c.4 0 .7 0 1-.2l1.6 1.6A5 5 0 0 1 7 11H5a7 7 0 0 0 4.5 6.5l.5.2V21h2v-3.1l3 3L20.7 22 3.3 2zM15 11V6a3 3 0 0 0-6 0v.2L15 12v-1z" /></svg>
)
export const PhoneEnd = ({ className, size }: P) => (
  <svg {...S(size)} className={className} fill="currentColor"><path d="M12 9c-1.6 0-3.2.3-4.7.8V13c0 .4-.2.7-.5.9-.9.5-1.7 1.1-2.5 1.9-.2.2-.4.3-.7.3s-.5-.1-.7-.3L.3 13.3a1 1 0 0 1 0-1.4C3.3 9 7.4 7.5 12 7.5s8.7 1.5 11.7 4.4a1 1 0 0 1 0 1.4l-2.6 2.5c-.2.2-.4.3-.7.3s-.5-.1-.7-.3c-.8-.8-1.6-1.4-2.5-1.9-.3-.2-.5-.5-.5-.9V9.8C15.2 9.3 13.6 9 12 9z" /></svg>
)
export const More = ({ className, size }: P) => (
  <svg {...S(size)} className={className} fill="currentColor"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
)
export const Check = ({ className, size }: P) => (
  <svg {...S(size)} className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6" /></svg>
)
export const DoubleCheck = ({ className, size }: P) => (
  <svg viewBox="0 0 24 24" width={size ?? 18} height={size ?? 18} className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12l4.5 4.5L14 8" /><path d="M8 15.5 9.5 17 22 4.5" /></svg>
)
export const Clock = ({ className, size }: P) => (
  <svg {...S(size)} className={className} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="8" /><path strokeLinecap="round" d="M12 8v4l2.5 1.5" /></svg>
)
export const Plus = ({ className, size }: P) => (
  <svg {...S(size)} className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
)
export const Camera = ({ className, size }: P) => (
  <svg {...S(size)} className={className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.2" /></svg>
)
export const Doc = ({ className, size }: P) => (
  <svg {...S(size)} className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" /><path d="M14 3v5h5" /></svg>
)
export const Play = ({ className, size }: P) => (
  <svg {...S(size)} className={className} fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
)
export const Pause = ({ className, size }: P) => (
  <svg {...S(size)} className={className} fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
)
export const Trash = ({ className, size }: P) => (
  <svg {...S(size)} className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" /></svg>
)
export const Reply = ({ className, size }: P) => (
  <svg {...S(size)} className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 5 5v3" /></svg>
)
export const Pin = ({ className, size }: P) => (
  <svg {...S(size)} className={className} fill="currentColor"><path d="M14 4l6 6-3 1-4 4-1 5-2-2-3.5 3.5L2 21l1.5-1.5L7 16l-2-2 5-1 4-4 1-3z" /></svg>
)
export const MutedIcon = ({ className, size }: P) => (
  <svg {...S(size)} className={className} fill="currentColor"><path d="M3.3 2 2 3.3 6 7.3V13l-2 2v1h11.7l4 4 1.3-1.3L3.3 2zM12 20a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zM18 13V9a6 6 0 0 0-4.3-5.7 1.7 1.7 0 1 0-3.3 0c-.2 0-.3.1-.5.1L18 13z" /></svg>
)
export const Location = ({ className, size }: P) => (
  <svg {...S(size)} className={className} fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" /></svg>
)
export const Group = ({ className, size }: P) => (
  <svg {...S(size)} className={className} fill="currentColor"><path d="M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 2c-2.7 0-8 1.3-8 4v2h8v-2c0-1 .4-1.9 1-2.6-.3 0-.7-.4-1-.4zm8 0c-.3 0-.7 0-1 .1.9.7 1 1.6 1 2.5v2h8v-2c0-2.7-5.3-4.6-8-4.6z" /></svg>
)
export const Chat = ({ className, size }: P) => (
  <svg {...S(size)} className={className} fill="currentColor"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" /></svg>
)
export const Settings = ({ className, size }: P) => (
  <svg {...S(size)} className={className} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 2.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 7 2.6h.1A1.6 1.6 0 0 0 8 1.1V1a2 2 0 1 1 4 0v.1A1.6 1.6 0 0 0 15 2.6a1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V7a1.6 1.6 0 0 0 1.5 1H23a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></svg>
)
export const X = ({ className, size }: P) => (
  <svg {...S(size)} className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
)
export const Download = ({ className, size }: P) => (
  <svg {...S(size)} className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16" /></svg>
)
export const Edit = ({ className, size }: P) => (
  <svg {...S(size)} className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
)
export const Forward = ({ className, size }: P) => (
  <svg {...S(size)} className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14l5-5-5-5" /><path d="M20 9H9a5 5 0 0 0-5 5v3" /></svg>
)
export const Star = ({ className, size }: P) => (
  <svg {...S(size)} className={className} fill="currentColor"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7L12 2z" /></svg>
)
export const Copy = ({ className, size }: P) => (
  <svg {...S(size)} className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></svg>
)
