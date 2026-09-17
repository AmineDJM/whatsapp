#!/usr/bin/env node
// One-command Supabase provisioning + migration.
//
// Usage:
//   SUPABASE_ACCESS_TOKEN=sbp_xxx npm run setup
//
// Optional env:
//   SUPABASE_PROJECT_REF=xxxx     -> apply migration to an EXISTING project (skip creation)
//   SUPABASE_ORG_ID=xxxx          -> which org to create the project in (else first org)
//   SUPABASE_REGION=eu-west-1     -> project region (default us-east-1)
//   SUPABASE_DB_PASSWORD=...      -> db password (else auto-generated)
//   SUPABASE_PROJECT_NAME=...     -> project name (default whatsapp-clone)
//
// Get a free access token at: https://supabase.com/dashboard/account/tokens

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const API = 'https://api.supabase.com'
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const c = { g: '\x1b[32m', y: '\x1b[33m', r: '\x1b[31m', b: '\x1b[36m', d: '\x1b[2m', x: '\x1b[0m' }
const log = (m) => console.log(m)
const step = (m) => console.log(`${c.b}▸${c.x} ${m}`)
const ok = (m) => console.log(`${c.g}✓${c.x} ${m}`)
const die = (m) => { console.error(`${c.r}✗ ${m}${c.x}`); process.exit(1) }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

if (!TOKEN) {
  die(`Missing SUPABASE_ACCESS_TOKEN.
  1. Create one (free): ${c.b}https://supabase.com/dashboard/account/tokens${c.x}
  2. Run: ${c.y}SUPABASE_ACCESS_TOKEN=sbp_xxx npm run setup${c.x}`)
}

async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  })
  const text = await res.text()
  let body
  try { body = text ? JSON.parse(text) : null } catch { body = text }
  if (!res.ok) throw new Error(`${res.status} ${path} → ${typeof body === 'string' ? body : JSON.stringify(body)}`)
  return body
}

function genPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let s = ''
  for (let i = 0; i < 24; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s + 'x9!'
}

async function main() {
  log(`\n${c.g}🟢 WhatsApp Clone — Supabase auto-setup${c.x}\n`)

  let ref = process.env.SUPABASE_PROJECT_REF
  const dbPass = process.env.SUPABASE_DB_PASSWORD || genPassword()

  if (!ref) {
    step('Finding your organization…')
    let orgId = process.env.SUPABASE_ORG_ID
    if (!orgId) {
      const orgs = await api('/v1/organizations')
      if (!orgs?.length) die('No organizations found on this account.')
      orgId = orgs[0].id
      ok(`Using organization: ${orgs[0].name} (${orgId})`)
    }

    const name = process.env.SUPABASE_PROJECT_NAME || 'whatsapp-clone'
    const region = process.env.SUPABASE_REGION || 'us-east-1'
    step(`Creating project "${name}" in ${region} (this takes ~1–2 min)…`)
    const proj = await api('/v1/projects', {
      method: 'POST',
      body: JSON.stringify({ name, organization_id: orgId, region, db_pass: dbPass, plan: 'free' }),
    })
    ref = proj.id || proj.ref
    ok(`Project created: ${ref}`)

    step('Waiting for the database to come online…')
    for (let i = 0; i < 60; i++) {
      await sleep(5000)
      let status = 'UNKNOWN'
      try { const p = await api(`/v1/projects/${ref}`); status = p.status } catch {}
      process.stdout.write(`\r  ${c.d}status: ${status}${c.x}            `)
      if (status === 'ACTIVE_HEALTHY') break
    }
    log('')
    // Extra settle time for Postgres to accept queries
    await sleep(8000)
  } else {
    ok(`Using existing project: ${ref}`)
  }

  step('Applying database migration (tables, RLS, storage, realtime, RPCs)…')
  const sql = readFileSync(join(ROOT, 'supabase', 'migrations', '001_initial.sql'), 'utf8')
  let applied = false
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await api(`/v1/projects/${ref}/database/query`, { method: 'POST', body: JSON.stringify({ query: sql }) })
      applied = true
      break
    } catch (e) {
      if (/already exists|duplicate/i.test(String(e.message))) { applied = true; ok('Schema already present — skipping.'); break }
      if (attempt === 5) throw e
      process.stdout.write(`\r  ${c.d}db not ready yet, retry ${attempt}/5…${c.x}      `)
      await sleep(8000)
    }
  }
  if (applied) { log(''); ok('Migration applied.') }

  step('Fetching API keys…')
  let anon = ''
  try {
    const keys = await api(`/v1/projects/${ref}/api-keys?reveal=true`)
    const arr = Array.isArray(keys) ? keys : (keys?.apiKeys || [])
    const hit = arr.find((k) => (k.name || k.type || '').toLowerCase().includes('anon'))
      || arr.find((k) => (k.name || '').toLowerCase().includes('publishable'))
    anon = hit?.api_key || hit?.apiKey || hit?.hash || ''
  } catch (e) {
    log(`${c.y}  Could not auto-read keys (${e.message}). Grab the anon key from the dashboard.${c.x}`)
  }

  const url = `https://${ref}.supabase.co`
  const openai = process.env.VITE_OPENAI_API_KEY || ''
  const envPath = join(ROOT, '.env')
  const keepOpenai = existsSync(envPath) && !openai
    ? (readFileSync(envPath, 'utf8').match(/^VITE_OPENAI_API_KEY=.*$/m)?.[0] ?? 'VITE_OPENAI_API_KEY=')
    : `VITE_OPENAI_API_KEY=${openai}`
  writeFileSync(envPath, `VITE_SUPABASE_URL=${url}\nVITE_SUPABASE_ANON_KEY=${anon}\n${keepOpenai}\n`)
  ok(`Wrote ${c.b}.env${c.x}`)

  log(`\n${c.g}✅ Done!${c.x} Your project is ready.\n`)
  log(`${c.d}────────── paste these into Render → Static Site → Environment ──────────${c.x}`)
  log(`VITE_SUPABASE_URL      = ${url}`)
  log(`VITE_SUPABASE_ANON_KEY = ${anon || '(copy from dashboard → Settings → API)'}`)
  log(`${c.d}────────────────────────────────────────────────────────────────────────${c.x}`)
  log(`\nSupabase project: ${c.b}https://supabase.com/dashboard/project/${ref}${c.x}`)
  if (!process.env.SUPABASE_PROJECT_REF) log(`${c.d}DB password: ${dbPass} (saved nowhere else — keep it if you need direct DB access)${c.x}`)
  log(`\nNext: ${c.y}npm run dev${c.x}  (local)   or push to GitHub and deploy on Render.\n`)
  log(`${c.d}⚠ In Supabase → Auth → URL Configuration, add your Render URL to Site URL / Redirect URLs.${c.x}\n`)
}

main().catch((e) => die(e.message))
