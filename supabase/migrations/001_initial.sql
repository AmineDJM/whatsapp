-- ============================================================================
-- WhatsApp Clone — Initial schema
-- Tables, indexes, constraints, functions, triggers, RLS policies.
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists citext;

-- ----------------------------------------------------------------------------
-- PROFILES
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username    citext unique,
  display_name text,
  avatar_url  text,
  bio         text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  is_online   boolean not null default false,
  constraint username_format check (
    username is null or username ~ '^[a-zA-Z0-9_.]{3,30}$'
  )
);

-- ----------------------------------------------------------------------------
-- CONVERSATIONS
-- ----------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default uuid_generate_v4(),
  type text not null default 'direct' check (type in ('direct','group')),
  name text,
  avatar_url text,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin','member')),
  joined_at timestamptz not null default now(),
  muted_until timestamptz,
  archived boolean not null default false,
  pinned boolean not null default false,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists cm_user_idx on public.conversation_members(user_id);
create index if not exists cm_conv_idx on public.conversation_members(conversation_id);

-- ----------------------------------------------------------------------------
-- MESSAGES
-- ----------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  type text not null default 'text'
    check (type in ('text','image','video','audio','voice_note','document','location','system')),
  content text,
  reply_to_id uuid references public.messages(id) on delete set null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists msg_conv_idx on public.messages(conversation_id, created_at desc);
create index if not exists msg_sender_idx on public.messages(sender_id);

-- ----------------------------------------------------------------------------
-- ATTACHMENTS
-- ----------------------------------------------------------------------------
create table if not exists public.attachments (
  id uuid primary key default uuid_generate_v4(),
  message_id uuid not null references public.messages(id) on delete cascade,
  storage_path text not null,
  file_name text,
  mime_type text,
  size bigint,
  duration numeric,
  width int,
  height int,
  created_at timestamptz not null default now()
);
create index if not exists att_msg_idx on public.attachments(message_id);

-- ----------------------------------------------------------------------------
-- REACTIONS
-- ----------------------------------------------------------------------------
create table if not exists public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
create index if not exists react_msg_idx on public.message_reactions(message_id);

-- ----------------------------------------------------------------------------
-- READS (per-message read receipts)
-- ----------------------------------------------------------------------------
create table if not exists public.message_reads (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

-- ----------------------------------------------------------------------------
-- CALLS
-- ----------------------------------------------------------------------------
create table if not exists public.calls (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid references public.conversations(id) on delete set null,
  caller_id uuid references public.profiles(id) on delete set null,
  type text not null default 'audio' check (type in ('audio','video')),
  status text not null default 'ringing'
    check (status in ('ringing','accepted','rejected','missed','ended')),
  started_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz
);
create index if not exists calls_conv_idx on public.calls(conversation_id, started_at desc);

create table if not exists public.call_participants (
  call_id uuid not null references public.calls(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz,
  left_at timestamptz,
  primary key (call_id, user_id)
);

-- ----------------------------------------------------------------------------
-- BLOCKS / PREFERENCES / PUSH
-- ----------------------------------------------------------------------------
create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  theme text not null default 'system',
  read_receipts boolean not null default true,
  notifications boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- STATUSES (secondary)
-- ----------------------------------------------------------------------------
create table if not exists public.statuses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'text' check (type in ('text','image')),
  content text,
  storage_path text,
  background text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);
create index if not exists status_user_idx on public.statuses(user_id, created_at desc);

create table if not exists public.status_views (
  status_id uuid not null references public.statuses(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (status_id, viewer_id)
);

-- ============================================================================
-- HELPER FUNCTIONS (SECURITY DEFINER to avoid RLS recursion)
-- ============================================================================
create or replace function public.is_member(conv uuid, uid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists(
    select 1 from public.conversation_members
    where conversation_id = conv and user_id = uid
  );
$$;

create or replace function public.is_admin(conv uuid, uid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists(
    select 1 from public.conversation_members
    where conversation_id = conv and user_id = uid and role = 'admin'
  );
$$;

-- New user -> profile row
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  insert into public.user_preferences (user_id) values (new.id) on conflict do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Bump conversation.last_message_at on new message
create or replace function public.bump_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations
    set last_message_at = new.created_at, updated_at = now()
    where id = new.conversation_id;
  return new;
end; $$;

drop trigger if exists on_message_insert on public.messages;
create trigger on_message_insert
  after insert on public.messages
  for each row execute function public.bump_conversation();

-- Find or create a direct conversation between two users (prevents duplicates)
create or replace function public.get_or_create_direct(other uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  conv uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  select c.id into conv
  from public.conversations c
  where c.type = 'direct'
    and exists(select 1 from public.conversation_members m where m.conversation_id=c.id and m.user_id=me)
    and exists(select 1 from public.conversation_members m where m.conversation_id=c.id and m.user_id=other)
    and (select count(*) from public.conversation_members m where m.conversation_id=c.id) = 2
  limit 1;

  if conv is not null then return conv; end if;

  insert into public.conversations(type, created_by) values('direct', me) returning id into conv;
  insert into public.conversation_members(conversation_id, user_id, role)
    values (conv, me, 'member'), (conv, other, 'member');
  return conv;
end; $$;

-- Create a group with member ids
create or replace function public.create_group(gname text, member_ids uuid[], gavatar text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); conv uuid; mid uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  insert into public.conversations(type, name, avatar_url, created_by)
    values('group', gname, gavatar, me) returning id into conv;
  insert into public.conversation_members(conversation_id, user_id, role) values(conv, me, 'admin');
  foreach mid in array member_ids loop
    if mid <> me then
      insert into public.conversation_members(conversation_id, user_id, role)
      values(conv, mid, 'member') on conflict do nothing;
    end if;
  end loop;
  return conv;
end; $$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.attachments enable row level security;
alter table public.message_reactions enable row level security;
alter table public.message_reads enable row level security;
alter table public.calls enable row level security;
alter table public.call_participants enable row level security;
alter table public.user_blocks enable row level security;
alter table public.user_preferences enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.statuses enable row level security;
alter table public.status_views enable row level security;

-- PROFILES: readable by all authenticated (for search), writable by owner
create policy profiles_select on public.profiles for select using (auth.role() = 'authenticated');
create policy profiles_update on public.profiles for update using (auth.uid() = id);
create policy profiles_insert on public.profiles for insert with check (auth.uid() = id);

-- CONVERSATIONS
create policy conv_select on public.conversations for select
  using (public.is_member(id, auth.uid()));
create policy conv_insert on public.conversations for insert with check (auth.uid() = created_by);
create policy conv_update on public.conversations for update
  using (public.is_member(id, auth.uid()));

-- CONVERSATION MEMBERS
create policy cm_select on public.conversation_members for select
  using (public.is_member(conversation_id, auth.uid()));
create policy cm_insert on public.conversation_members for insert
  with check (user_id = auth.uid() or public.is_admin(conversation_id, auth.uid()) or public.is_member(conversation_id, auth.uid()));
create policy cm_update on public.conversation_members for update
  using (user_id = auth.uid() or public.is_admin(conversation_id, auth.uid()));
create policy cm_delete on public.conversation_members for delete
  using (user_id = auth.uid() or public.is_admin(conversation_id, auth.uid()));

-- MESSAGES
create policy msg_select on public.messages for select
  using (public.is_member(conversation_id, auth.uid()));
create policy msg_insert on public.messages for insert
  with check (sender_id = auth.uid() and public.is_member(conversation_id, auth.uid()));
create policy msg_update on public.messages for update
  using (sender_id = auth.uid() or public.is_member(conversation_id, auth.uid()));

-- ATTACHMENTS
create policy att_select on public.attachments for select
  using (exists(select 1 from public.messages m where m.id = message_id and public.is_member(m.conversation_id, auth.uid())));
create policy att_insert on public.attachments for insert
  with check (exists(select 1 from public.messages m where m.id = message_id and m.sender_id = auth.uid()));

-- REACTIONS
create policy react_select on public.message_reactions for select
  using (exists(select 1 from public.messages m where m.id = message_id and public.is_member(m.conversation_id, auth.uid())));
create policy react_all on public.message_reactions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- READS
create policy reads_select on public.message_reads for select
  using (exists(select 1 from public.messages m where m.id = message_id and public.is_member(m.conversation_id, auth.uid())));
create policy reads_insert on public.message_reads for insert with check (user_id = auth.uid());

-- CALLS
create policy calls_select on public.calls for select
  using (public.is_member(conversation_id, auth.uid()));
create policy calls_insert on public.calls for insert
  with check (caller_id = auth.uid() and public.is_member(conversation_id, auth.uid()));
create policy calls_update on public.calls for update
  using (public.is_member(conversation_id, auth.uid()));

create policy cp_select on public.call_participants for select
  using (exists(select 1 from public.calls c where c.id = call_id and public.is_member(c.conversation_id, auth.uid())));
create policy cp_all on public.call_participants for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- BLOCKS
create policy blocks_all on public.user_blocks for all
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
create policy blocks_select on public.user_blocks for select
  using (blocker_id = auth.uid() or blocked_id = auth.uid());

-- PREFERENCES
create policy prefs_all on public.user_preferences for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- PUSH
create policy push_all on public.push_subscriptions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- STATUSES
create policy status_select on public.statuses for select using (auth.role() = 'authenticated');
create policy status_ins on public.statuses for insert with check (user_id = auth.uid());
create policy status_del on public.statuses for delete using (user_id = auth.uid());
create policy sview_all on public.status_views for all
  using (viewer_id = auth.uid()) with check (viewer_id = auth.uid());
create policy sview_select on public.status_views for select using (auth.role() = 'authenticated');

-- ============================================================================
-- REALTIME
-- ============================================================================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.message_reactions;
alter publication supabase_realtime add table public.message_reads;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.conversation_members;
alter publication supabase_realtime add table public.calls;
alter publication supabase_realtime add table public.profiles;

-- ============================================================================
-- STORAGE
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- chat-media: members of the conversation (path = conversationId/userId/uuid.ext) can read;
-- uploader can write their own folder.
create policy "chat-media read" on storage.objects for select
  using (
    bucket_id = 'chat-media'
    and public.is_member( ((storage.foldername(name))[1])::uuid, auth.uid() )
  );
create policy "chat-media insert" on storage.objects for insert
  with check (
    bucket_id = 'chat-media'
    and auth.uid() = ((storage.foldername(name))[2])::uuid
    and public.is_member( ((storage.foldername(name))[1])::uuid, auth.uid() )
  );

-- avatars: public read, owner write (path = userId/uuid.ext)
create policy "avatars read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars insert" on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid() = ((storage.foldername(name))[1])::uuid);
create policy "avatars update" on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid() = ((storage.foldername(name))[1])::uuid);
