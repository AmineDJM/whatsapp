import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useConversations } from '../features/chat/useConversations'
import Sidebar from '../components/Sidebar'
import ChatView from '../components/ChatView'
import { Chat as ChatIcon } from '../lib/icons'

export default function Home() {
  const { session, profile } = useAuth()
  const { id } = useParams()
  const nav = useNavigate()
  const { conversations, loading, reload } = useConversations(session?.user?.id)
  const [showArchived, setShowArchived] = useState(false)

  const active = conversations.find(c => c.id === id) ?? null

  return (
    <div className="h-full flex bg-wa-header dark:bg-wa-dbg">
      {/* Sidebar: full width on mobile when no chat open; fixed width on desktop */}
      <div className={`${id ? 'hidden md:flex' : 'flex'} w-full md:w-[400px] lg:w-[440px] shrink-0 border-r border-wa-divider dark:border-wa-ddivider flex-col bg-wa-panel dark:bg-wa-dpanel`}>
        <Sidebar
          conversations={conversations}
          loading={loading}
          activeId={id}
          onOpen={(cid) => nav('/chat/' + cid)}
          reload={reload}
          showArchived={showArchived}
          setShowArchived={setShowArchived}
        />
      </div>

      {/* Chat pane */}
      <div className={`${id ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>
        {active ? (
          <ChatView key={active.id} conversation={active} me={profile!} onBack={() => nav('/')} onChanged={reload} />
        ) : (
          <Placeholder />
        )}
      </div>
    </div>
  )
}

function Placeholder() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-wa-header dark:bg-wa-dbg border-b-4 border-wa-green text-center px-8">
      <div className="w-24 h-24 rounded-full bg-wa-divider dark:bg-wa-dheader flex items-center justify-center text-wa-sub mb-6">
        <ChatIcon size={48} />
      </div>
      <h2 className="text-2xl font-light text-wa-text dark:text-wa-dtext">WhatsApp Web</h2>
      <p className="text-wa-sub mt-2 max-w-sm text-sm">
        Send and receive messages, share media, and make calls. Select a chat to start messaging.
      </p>
    </div>
  )
}
