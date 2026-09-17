import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import Avatar from '../components/Avatar'
import { uuid, extOf } from '../lib/utils'

export default function Onboarding() {
  const { session, refreshProfile } = useAuth()
  const toast = useToast()
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function pickAvatar(f: File | null) {
    setAvatarFile(f)
    setAvatarPreview(f ? URL.createObjectURL(f) : null)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const uname = username.trim().toLowerCase().replace(/^@/, '')
    if (!/^[a-z0-9_.]{3,30}$/.test(uname)) return toast('Username: 3–30 chars, letters/numbers/_/. only', 'error')
    if (!displayName.trim()) return toast('Enter a display name', 'error')
    if (!session?.user) return
    setBusy(true)
    try {
      let avatar_url: string | null = null
      if (avatarFile) {
        const path = `${session.user.id}/${uuid()}.${extOf(avatarFile.name)}`
        const { error: upErr } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true })
        if (!upErr) avatar_url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
      }
      const { error } = await supabase.from('profiles').update({
        username: uname, display_name: displayName.trim(), bio: bio.trim() || null,
        ...(avatar_url ? { avatar_url } : {}), updated_at: new Date().toISOString(),
      }).eq('id', session.user.id)
      if (error) {
        if (error.code === '23505' || /duplicate|unique/i.test(error.message)) toast('That username is taken', 'error')
        else toast(error.message, 'error')
        return
      }
      await refreshProfile()
      toast('Profile created', 'success')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="h-full bg-wa-bg flex flex-col">
      <div className="h-28 bg-wa-teal flex items-end pb-4 justify-center text-white font-medium">Profile info</div>
      <div className="flex-1 -mt-8 px-4 flex justify-center">
        <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-xl shadow-lg p-6 space-y-4 h-fit">
          <label className="flex flex-col items-center gap-2 cursor-pointer">
            <Avatar name={displayName || 'You'} url={avatarPreview} size={88} />
            <span className="text-xs text-wa-green font-medium">Add profile photo</span>
            <input type="file" accept="image/*" className="hidden" onChange={e => pickAvatar(e.target.files?.[0] ?? null)} />
          </label>
          <div>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Display name" autoFocus
              className="w-full px-3 py-2.5 rounded-lg border border-wa-divider focus:border-wa-green outline-none" />
          </div>
          <div className="flex items-center rounded-lg border border-wa-divider focus-within:border-wa-green px-3">
            <span className="text-wa-sub">@</span>
            <input value={username} onChange={e => setUsername(e.target.value.replace(/\s/g,''))} placeholder="username"
              className="w-full py-2.5 pl-1 outline-none" />
          </div>
          <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="About (optional)" rows={2}
            className="w-full px-3 py-2 rounded-lg border border-wa-divider focus:border-wa-green outline-none resize-none" />
          <button disabled={busy} className="w-full bg-wa-green text-white font-semibold py-2.5 rounded-lg disabled:opacity-60">
            {busy ? 'Saving…' : 'Continue'}
          </button>
          <button type="button" onClick={() => supabase.auth.signOut()} className="w-full text-wa-sub text-sm">Sign out</button>
        </form>
      </div>
    </div>
  )
}
