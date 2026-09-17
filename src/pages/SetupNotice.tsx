export default function SetupNotice() {
  return (
    <div className="h-full flex items-center justify-center bg-wa-bg p-6">
      <div className="max-w-md bg-white rounded-xl shadow p-6 space-y-3">
        <div className="text-2xl">🟢 WhatsApp Clone</div>
        <p className="text-wa-text font-medium">Supabase is not configured yet.</p>
        <p className="text-sm text-wa-sub">Create a <code>.env</code> file (copy from <code>.env.example</code>) with:</p>
        <pre className="bg-gray-100 rounded p-3 text-xs overflow-auto">VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...</pre>
        <p className="text-sm text-wa-sub">Then run the migration in <code>supabase/migrations/001_initial.sql</code> and restart the dev server. See the README for the full setup flow.</p>
      </div>
    </div>
  )
}
