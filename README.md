# WhatsApp Clone

A realtime, multi-user WhatsApp-style messenger. **Vite + React + TypeScript + Tailwind + Supabase**, deployable as a Render static site. Realtime messaging, media, voice notes, groups, presence, typing, reactions, WebRTC audio/video calls, PWA, and a **Meta AI** assistant (OpenAI-backed).

> Educational demo. Not affiliated with WhatsApp/Meta. Transport is HTTPS/WSS; this is **not** audited Signal-grade E2EE.

## 1. Install
```bash
npm install
```

## 2. Environment variables
Copy `.env.example` to `.env` and fill in:
```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_OPENAI_API_KEY=        # optional, enables live Meta AI
```
Never expose the service-role key to the frontend.

## 3. Supabase setup (migration)

### Option A — automatic (one command) ✨
```bash
SUPABASE_ACCESS_TOKEN=sbp_xxx npm run setup
```
Get a free token at <https://supabase.com/dashboard/account/tokens>. The script
**creates the Supabase project, applies the whole migration (tables, RLS, storage
buckets, realtime, RPCs), reads the API keys, and writes your `.env`** — then prints
the exact values to paste into Render. To target an existing project instead:
`SUPABASE_PROJECT_REF=xxxx SUPABASE_ACCESS_TOKEN=sbp_xxx npm run setup`.

### Option B — manual
1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, paste and run the whole file `supabase/migrations/001_initial.sql`.
   This creates every table, index, RLS policy, trigger (auto-profile on signup),
   the `chat-media` (private) + `avatars` (public) storage buckets, realtime publication,
   and helper RPCs (`get_or_create_direct`, `create_group`).

   With the Supabase CLI instead:
   ```bash
   supabase link --project-ref YOUR_REF
   supabase db push
   ```
3. **Auth → Providers → Email**: keep "Confirm email" on (email verification) — or turn it
   off for instant demo signups. The app also supports passwordless **email OTP**.

## 4. Run locally
```bash
npm run dev        # http://localhost:5173
npm run build      # type-check + production build to dist/
```

## 5. Render deployment
- Push this repo to GitHub.
- On Render: **New → Static Site**, pick the repo (or use the included `render.yaml` Blueprint).
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Add env vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, (optional) `VITE_OPENAI_API_KEY`.
- SPA routing/refresh is handled by the `/* → /index.html` rewrite (in `render.yaml` and `public/_redirects`).
- In Supabase **Auth → URL Configuration**, add your Render URL to Site URL / redirects.

## 6. Demo flow
1. Open the deployed URL on two devices/browsers (use incognito for the 2nd).
2. Sign up **Account A** and **Account B**, verify email, pick usernames `@alice` / `@bob`.
3. Alice taps **✚ → search `@bob` → open chat**, sends "Hello Bob".
4. Bob receives it instantly (no refresh); replies, reacts, edits, deletes.
5. Share an **image / PDF / voice note**; open/download on the other side.
6. Create a **group**, message inside it.
7. Alice taps the **📞 / 🎥** icon → Bob sees a full-screen incoming call → accept → talk (WebRTC).
8. Check **Calls** tab for history. Refresh — everything persists.
9. Try **Meta AI** (top of chat list), **Status** updates, dark mode, and **Install as PWA**.

## Features
Auth (password + email OTP + verification) · unique `@usernames` · user search · 1:1 & group chats ·
optimistic realtime messaging · sent/delivered/read ticks · typing & presence · reply · reactions ·
edit · delete (me/everyone) · forward · star · in-chat search · images/videos/docs/audio · voice notes ·
location · WebRTC audio & video calls with ringing/accept/reject/history · status/stories · Meta AI ·
mute/pin/archive/block · settings & themes · PWA + notifications.

## Notes & limitations
- Calls use **public STUN only** (`stun.l.google.com`). Peer-to-peer may fail behind strict/symmetric
  NAT or corporate firewalls; works best on the same Wi-Fi or normal consumer networks. No TURN (paid).
- Web Push in the background needs VAPID keys / an edge function; in-app realtime call & message
  notifications work while the app/PWA is open.
- Meta AI calls the OpenAI API directly from the browser when `VITE_OPENAI_API_KEY` is set.
