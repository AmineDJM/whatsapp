export type Profile = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  last_seen: string
  is_online: boolean
}

export type MsgType = 'text' | 'image' | 'video' | 'audio' | 'voice_note' | 'document' | 'location' | 'system'

export type Attachment = {
  id: string
  message_id: string
  storage_path: string
  file_name: string | null
  mime_type: string | null
  size: number | null
  duration: number | null
  width: number | null
  height: number | null
}

export type Reaction = { message_id: string; user_id: string; emoji: string }

export type Message = {
  id: string
  conversation_id: string
  sender_id: string | null
  type: MsgType
  content: string | null
  reply_to_id: string | null
  created_at: string
  edited_at: string | null
  deleted_at: string | null
  metadata: Record<string, any>
  // client-side
  _status?: 'pending' | 'sent' | 'failed'
  _local?: boolean
  attachments?: Attachment[]
  reactions?: Reaction[]
  reply?: Message | null
}

export type Conversation = {
  id: string
  type: 'direct' | 'group'
  name: string | null
  avatar_url: string | null
  description: string | null
  created_by: string | null
  last_message_at: string
  // enriched
  members?: Member[]
  other?: Profile | null
  last_message?: Message | null
  unread?: number
  pinned?: boolean
  archived?: boolean
  muted_until?: string | null
  my_last_read?: string
}

export type Member = {
  conversation_id: string
  user_id: string
  role: 'admin' | 'member'
  archived: boolean
  pinned: boolean
  muted_until: string | null
  last_read_at: string
  profile?: Profile
}

export type Call = {
  id: string
  conversation_id: string | null
  caller_id: string | null
  type: 'audio' | 'video'
  status: 'ringing' | 'accepted' | 'rejected' | 'missed' | 'ended'
  started_at: string
  answered_at: string | null
  ended_at: string | null
}
