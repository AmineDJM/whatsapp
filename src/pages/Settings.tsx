import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import Avatar from '../components/Avatar'
import { Back, Edit, Check } from '../lib/icons'
import { useToast } from '../components/Toast'
import { uuid, extOf } from '../lib/utils'

export default function Settings() {
  const { profile, session, refreshProfile } = useAuth()
  const { mode, setMode } = useTheme()
  const nav = useNavigate()
  const toast = useToast()
  const [editing, setEditing] = useState<'name' | 'bio' | null>(null)
  const [name, setName] = useState(profile?.display_name ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [notif, setNotif] = useState(Notification?.permission === 'granted')

  async function save(field: 'display_name' | 'bio', value: string) {
    await supabase.from('profiles').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', session!.user.id)
    await refreshProfile(); setEditing(null); toast('Saved', 'success')
  }

  async function changeAvatar(file: File) {
    const path = `${session!.user.id}/${uuid()}.${extOf(file.name)}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) return toast(error.message, 'error')
    const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', session!.user.id)
    await refreshProfile(); toast('Photo updated', 'success')
  }

  async function requestNotif() {
    const p = await Notification.requestPermission()
    setNotif(p === 'granted')
    toast(p === 'granted' ? 'Notifications enabled' : 'Notifications blocked', p === 'granted' ? 'success' : 'error')
  }

  return (
    <div className="h-full flex flex-col bg-wa-panel dark:bg-wa-dpanel md:max-w-md md:mx-auto md:border-x border-wa-divider dark:border-wa-ddivider">
      <div className="bg-wa-teal text-white flex items-center gap-4 px-4 h-16 safe-top">
        <button onClick={() => nav('/')}><Back size={22} /></button>
        <span className="text-lg font-medium">Settings</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center gap-4 p-4 border-b border-wa-divider dark:border-wa-ddivider">
          <label className="relative cursor-pointer">
            <Avatar name={profile?.display_name} url={profile?.avatar_url} size={64} />
            <span className="absolute bottom-0 right-0 bg-wa-green text-white rounded-full p-1"><Edit size={12} /></span>
            <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && changeAvatar(e.target.files[0])} />
          </label>
          <div>
            <div className="font-medium text-lg text-wa-text dark:text-wa-dtext">{profile?.display_name}</div>
            <div className="text-sm text-wa-sub">@{profile?.username}</div>
          </div>
        </div>

        <Section title="Profile">
          <Field label="Display name" value={name} editing={editing === 'name'}
            onEdit={() => setEditing('name')} onChange={setName} onSave={() => save('display_name', name)} />
          <Field label="About" value={bio} editing={editing === 'bio'} placeholder="Hey there! I am using WhatsApp."
            onEdit={() => setEditing('bio')} onChange={setBio} onSave={() => save('bio', bio)} />
          <div className="px-4 py-3 text-sm"><span className="text-wa-sub">Username</span><div className="text-wa-text dark:text-wa-dtext">@{profile?.username}</div></div>
        </Section>

        <Section title="Theme">
          <div className="flex gap-2 px-4 py-3">
            {(['light', 'dark', 'system'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg capitalize text-sm ${mode === m ? 'bg-wa-green text-white' : 'bg-wa-header dark:bg-wa-dheader text-wa-sub'}`}>{m}</button>
            ))}
          </div>
        </Section>

        <Section title="Notifications">
          <button onClick={requestNotif} className="w-full flex items-center justify-between px-4 py-3">
            <span className="text-wa-text dark:text-wa-dtext">Browser notifications</span>
            <span className={`text-sm ${notif ? 'text-wa-green' : 'text-wa-sub'}`}>{notif ? 'Enabled' : 'Enable'}</span>
          </button>
        </Section>

        <div className="p-4">
          <button onClick={() => supabase.auth.signOut()} className="w-full text-red-500 font-medium py-3 border border-red-200 rounded-lg">Log out</button>
        </div>
        <div className="px-4 pb-8 text-center text-xs text-wa-sub">WhatsApp Clone · Educational demo</div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-2">
      <div className="px-4 py-1.5 text-xs text-wa-green font-medium">{title}</div>
      <div className="bg-wa-panel dark:bg-wa-dpanel">{children}</div>
    </div>
  )
}

function Field({ label, value, editing, onEdit, onChange, onSave, placeholder }:
  { label: string; value: string; editing: boolean; onEdit: () => void; onChange: (v: string) => void; onSave: () => void; placeholder?: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex-1">
        <div className="text-xs text-wa-sub">{label}</div>
        {editing ? (
          <input autoFocus value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            className="w-full bg-transparent border-b border-wa-green outline-none text-wa-text dark:text-wa-dtext" />
        ) : (
          <div className="text-wa-text dark:text-wa-dtext">{value || placeholder}</div>
        )}
      </div>
      <button onClick={editing ? onSave : onEdit} className="text-wa-sub">{editing ? <Check size={20} /> : <Edit size={18} />}</button>
    </div>
  )
}
