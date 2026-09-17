import { supabase } from './supabase'

const cache = new Map<string, { url: string; exp: number }>()

// Signed URL for private chat-media, cached for ~50 min.
export async function signedUrl(path: string): Promise<string> {
  const now = Date.now()
  const hit = cache.get(path)
  if (hit && hit.exp > now) return hit.url
  const { data, error } = await supabase.storage.from('chat-media').createSignedUrl(path, 3600)
  if (error || !data) return ''
  cache.set(path, { url: data.signedUrl, exp: now + 50 * 60 * 1000 })
  return data.signedUrl
}

export async function uploadChatMedia(conversationId: string, userId: string, file: Blob, filename: string) {
  const ext = filename.includes('.') ? filename.split('.').pop() : 'bin'
  const id = (crypto as any).randomUUID?.() ?? Math.random().toString(36).slice(2)
  const path = `${conversationId}/${userId}/${id}.${ext}`
  const { error } = await supabase.storage.from('chat-media').upload(path, file, {
    contentType: (file as File).type || 'application/octet-stream', upsert: false,
  })
  if (error) throw error
  return path
}
