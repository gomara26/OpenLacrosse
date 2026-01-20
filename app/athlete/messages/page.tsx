'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Conversation {
  id: string
  participant1_id: string
  participant2_id: string
  last_message_at: string | null
  other_user: {
    id: string
    first_name: string | null
    last_name: string | null
    profile_photo_url: string | null
    role: string
  }
  last_message: {
    content: string
    sender_id: string
    created_at: string
  } | null
}

interface Message {
  id: string
  sender_id: string
  content: string
  created_at: string
  read_at: string | null
}

export default function AthleteMessagesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageContent, setMessageContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [currentUser, setCurrentUser] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setCurrentUser(user.id)
      await loadConversations(user.id)
    }
    loadData()
  }, [router, supabase])

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation)
      subscribeToMessages(selectedConversation)
    }
    return () => {
      if (selectedConversation) {
        supabase.removeAllChannels()
      }
    }
  }, [selectedConversation, supabase])

  // Subscribe to all conversations to detect new messages
  useEffect(() => {
    if (!currentUser || conversations.length === 0) return

    const conversationIds = conversations.map((c) => c.id)
    if (conversationIds.length === 0) return

    const channel = supabase
      .channel('all-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=in.(${conversationIds.join(',')})`,
        },
        async (payload) => {
          const newMessage = payload.new as Message
          // If message is in current conversation, add it immediately
          if (newMessage.conversation_id === selectedConversation) {
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some((m) => m.id === newMessage.id)) return prev
              return [...prev, newMessage]
            })
          } else {
            // If message is in another conversation, auto-select it if it's from another user
            if (newMessage.sender_id !== currentUser) {
              setSelectedConversation(newMessage.conversation_id)
            }
            // Refresh conversations to update last message
            await loadConversations(currentUser)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUser, conversations, selectedConversation, supabase])

  // Auto-select first conversation if none selected
  useEffect(() => {
    if (!selectedConversation && conversations.length > 0) {
      setSelectedConversation(conversations[0].id)
    }
  }, [conversations, selectedConversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadConversations(userId: string) {
    try {
      // Fetch conversations
      const { data: convs, error: convError } = await supabase
        .from('conversations')
        .select('id, participant1_id, participant2_id, last_message_at')
        .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
        .order('last_message_at', { ascending: false, nullsFirst: false })

      if (convError) throw convError

      if (!convs || convs.length === 0) {
        setConversations([])
        setLoading(false)
        return
      }

      // Get other user IDs
      const otherUserIds = convs.map((c) =>
        c.participant1_id === userId ? c.participant2_id : c.participant1_id
      )

      // Fetch profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, profile_photo_url, role')
        .in('id', otherUserIds)

      if (profileError) throw profileError

      // Fetch last message for each conversation
      const conversationIds = convs.map((c) => c.id)
      const { data: lastMessages, error: msgError } = await supabase
        .from('messages')
        .select('conversation_id, content, sender_id, created_at')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false })

      if (msgError) throw msgError

      // Combine data
      const conversationsData = convs.map((conv) => {
        const otherUserId = conv.participant1_id === userId ? conv.participant2_id : conv.participant1_id
        const profile = profiles?.find((p) => p.id === otherUserId)
        const lastMsg = lastMessages?.find((m) => m.conversation_id === conv.id)

        return {
          id: conv.id,
          participant1_id: conv.participant1_id,
          participant2_id: conv.participant2_id,
          last_message_at: conv.last_message_at,
          other_user: profile || {
            id: otherUserId,
            first_name: null,
            last_name: null,
            profile_photo_url: null,
            role: 'coach',
          },
          last_message: lastMsg
            ? {
                content: lastMsg.content,
                sender_id: lastMsg.sender_id,
                created_at: lastMsg.created_at,
              }
            : null,
        }
      })

      setConversations(conversationsData)
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadMessages(conversationId: string) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, sender_id, content, created_at, read_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  function subscribeToMessages(conversationId: string) {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMessage.id)) return prev
            return [...prev, newMessage]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  async function sendMessage() {
    if (!messageContent.trim() || !selectedConversation || !currentUser || sending) return

    setSending(true)
    try {
      const messageText = messageContent.trim()
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation,
          sender_id: currentUser,
          content: messageText,
        })

      if (error) throw error
      
      // Optimistically add message to UI immediately
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        sender_id: currentUser,
        content: messageText,
        created_at: new Date().toISOString(),
        read_at: null,
      }
      setMessages((prev) => [...prev, tempMessage])
      setMessageContent('')
      
      // Refresh conversations to update last message
      await loadConversations(currentUser)
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  async function startConversation(otherUserId: string) {
    if (!currentUser) return

    try {
      // Use the database function to get or create conversation
      const { data, error } = await supabase.rpc('get_or_create_conversation', {
        user1_id: currentUser,
        user2_id: otherUserId,
      })

      if (error) throw error

      await loadConversations(currentUser)
      setSelectedConversation(data)
    } catch (error) {
      console.error('Error starting conversation:', error)
      alert('Failed to start conversation. Please try again.')
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`
    return date.toLocaleDateString()
  }

  const selectedConv = conversations.find((c) => c.id === selectedConversation)

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full">
      {/* Conversations List */}
      <div className="w-96 border-r border-slate-700 bg-slate-800 flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-slate-400">
              <p className="text-base">No conversations yet</p>
              <p className="text-sm mt-2">Start a conversation from the Connect page</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const otherUser = conv.other_user
              const name = `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim() || 'Coach'
              const isSelected = selectedConversation === conv.id

              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv.id)}
                  className={`w-full p-5 text-left border-b border-slate-700 hover:bg-slate-700 transition-colors ${
                    isSelected ? 'bg-slate-700' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {otherUser.profile_photo_url ? (
                      <img
                        src={otherUser.profile_photo_url}
                        alt={name}
                        className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-xl font-semibold text-slate-300">
                          {otherUser.first_name?.[0] || otherUser.last_name?.[0] || 'C'}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white text-base truncate mb-1">{name}</div>
                      {conv.last_message && (
                        <div className="text-sm text-slate-400 truncate mb-1">
                          {conv.last_message.sender_id === currentUser ? 'You: ' : ''}
                          {conv.last_message.content}
                        </div>
                      )}
                      {conv.last_message_at && (
                        <div className="text-xs text-slate-500">
                          {formatTime(conv.last_message_at)}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Message Thread */}
      <div className="flex-1 flex flex-col bg-slate-900">
        {selectedConversation && selectedConv ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-slate-700 bg-slate-800">
              <div className="flex items-center gap-3">
                {selectedConv.other_user.profile_photo_url ? (
                  <img
                    src={selectedConv.other_user.profile_photo_url}
                    alt={`${selectedConv.other_user.first_name} ${selectedConv.other_user.last_name}`}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center">
                    <span className="text-sm font-semibold text-slate-300">
                      {selectedConv.other_user.first_name?.[0] || selectedConv.other_user.last_name?.[0] || 'C'}
                    </span>
                  </div>
                )}
                <div>
                  <div className="font-semibold text-white">
                    {selectedConv.other_user.first_name} {selectedConv.other_user.last_name}
                  </div>
                  <div className="text-sm text-slate-400">Coach</div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => {
                const isOwn = message.sender_id === currentUser
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        isOwn
                          ? 'bg-orange-500 text-white'
                          : 'bg-slate-700 text-white'
                      }`}
                    >
                      <p>{message.content}</p>
                      <p className={`text-xs mt-1 ${isOwn ? 'text-orange-100' : 'text-slate-400'}`}>
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-700 bg-slate-800">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  sendMessage()
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="submit"
                  disabled={!messageContent.trim() || sending}
                  className="rounded-lg bg-orange-500 px-6 py-2 font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <svg className="mx-auto h-16 w-16 text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="text-xl font-semibold text-white mb-2">Select a conversation</h3>
              <p className="text-slate-400">Choose a conversation from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
