'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MessageCircle, Send, ArrowLeft } from 'lucide-react'

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
  conversation_id?: string
}

export default function CoachMessagesPage() {
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
  const [showConversationsList, setShowConversationsList] = useState(false)
  const hasInitializedRef = useRef(false)

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
            if (newMessage.sender_id !== currentUser && newMessage.conversation_id) {
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

  // Auto-select first conversation if none selected (only on desktop, not mobile)
  useEffect(() => {
    if (!hasInitializedRef.current && !selectedConversation && conversations.length > 0) {
      // Only auto-select on desktop
      if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
        setSelectedConversation(conversations[0].id)
      }
      hasInitializedRef.current = true
    }
  }, [conversations, selectedConversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadConversations(userId: string) {
    try {
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

      const otherUserIds = convs.map((c) =>
        c.participant1_id === userId ? c.participant2_id : c.participant1_id
      )

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, profile_photo_url, role')
        .in('id', otherUserIds)

      if (profileError) throw profileError

      const conversationIds = convs.map((c) => c.id)
      const { data: lastMessages, error: msgError } = await supabase
        .from('messages')
        .select('conversation_id, content, sender_id, created_at')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false })

      if (msgError) throw msgError

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
            role: 'player',
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
      
      // Get conversation to find the other participant (player)
      const { data: conversation } = await supabase
        .from('conversations')
        .select('participant1_id, participant2_id')
        .eq('id', selectedConversation)
        .single()

      const otherUserId = conversation?.participant1_id === currentUser 
        ? conversation.participant2_id 
        : conversation?.participant1_id

      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation,
          sender_id: currentUser,
          content: messageText,
        })

      if (error) throw error

      // Update athlete_status to "messaged" if other user is a player
      if (otherUserId) {
        const { data: otherUserProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', otherUserId)
          .single()

        if (otherUserProfile?.role === 'player') {
          await supabase
            .from('school_matches')
            .update({ athlete_status: 'messaged' })
            .eq('player_id', otherUserId)
            .eq('coach_id', currentUser)
        }
      }
      
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
    <div className="flex h-screen w-full relative">
      {/* Mobile overlay */}
      {showConversationsList && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setShowConversationsList(false)}
        />
      )}

      {/* Conversations List */}
      <div className={`absolute lg:relative w-full lg:w-96 border-r border-slate-700 bg-slate-800 flex flex-col flex-shrink-0 h-full z-50 transition-transform duration-300 ${
        showConversationsList ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-4 sm:p-5 border-b border-slate-700 flex items-center gap-3">
          <button
            onClick={() => setShowConversationsList(false)}
            className="lg:hidden rounded-lg p-2 text-slate-400 hover:bg-slate-700 hover:text-white"
            aria-label="Close conversations"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-slate-400">
              <p className="text-base">No conversations yet</p>
              <p className="text-sm mt-2">Start a conversation from the Search Athletes page</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const otherUser = conv.other_user
              const name = `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim() || 'Athlete'
              const isSelected = selectedConversation === conv.id

              return (
                <button
                  key={conv.id}
                  onClick={() => {
                    setSelectedConversation(conv.id)
                    setShowConversationsList(false)
                  }}
                  className={`w-full p-3 sm:p-4 lg:p-5 text-left border-b border-slate-700 hover:bg-slate-700 transition-colors ${
                    isSelected ? 'bg-slate-700' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    {otherUser.profile_photo_url ? (
                      <img
                        src={otherUser.profile_photo_url}
                        alt={name}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg sm:text-xl font-semibold text-slate-300">
                          {otherUser.first_name?.[0] || otherUser.last_name?.[0] || 'A'}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white text-sm sm:text-base truncate mb-0.5 sm:mb-1">{name}</div>
                      {conv.last_message && (
                        <div className="text-xs sm:text-sm text-slate-400 truncate mb-0.5 sm:mb-1">
                          {conv.last_message.sender_id === currentUser ? 'You: ' : ''}
                          {conv.last_message.content}
                        </div>
                      )}
                      {conv.last_message_at && (
                        <div className="text-[10px] sm:text-xs text-slate-500">
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
      <div className={`flex-1 flex flex-col bg-slate-900 w-full transition-opacity duration-300 ${
        showConversationsList ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}>
        {selectedConversation && selectedConv ? (
          <>
            {/* Header */}
            <div className="p-3 sm:p-4 border-b border-slate-700 bg-slate-800 relative z-10">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowConversationsList(true)
                    setTimeout(() => {
                      setSelectedConversation(null)
                    }, 300)
                  }}
                  className="lg:hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white active:bg-slate-600 mr-1 flex-shrink-0 touch-manipulation relative z-20"
                  aria-label="Back to conversations"
                  type="button"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                {selectedConv.other_user.profile_photo_url ? (
                  <img
                    src={selectedConv.other_user.profile_photo_url}
                    alt={`${selectedConv.other_user.first_name} ${selectedConv.other_user.last_name}`}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs sm:text-sm font-semibold text-slate-300">
                      {selectedConv.other_user.first_name?.[0] || selectedConv.other_user.last_name?.[0] || 'A'}
                    </span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-white text-sm sm:text-base truncate">
                    {selectedConv.other_user.first_name} {selectedConv.other_user.last_name}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-400">Athlete</div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
              {messages.map((message) => {
                const isOwn = message.sender_id === currentUser
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] sm:max-w-xs lg:max-w-md px-3 sm:px-4 py-2 rounded-lg ${
                        isOwn
                          ? 'bg-orange-500 text-white'
                          : 'bg-slate-700 text-white'
                      }`}
                    >
                      <p className="text-sm sm:text-base break-words">{message.content}</p>
                      <p className={`text-[10px] sm:text-xs mt-1 ${isOwn ? 'text-orange-100' : 'text-slate-400'}`}>
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 sm:p-4 border-t border-slate-700 bg-slate-800">
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
                  className="flex-1 rounded-lg bg-slate-700 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="submit"
                  disabled={!messageContent.trim() || sending}
                  className="flex items-center gap-1.5 sm:gap-2 rounded-lg bg-orange-500 px-4 sm:px-6 py-2 sm:py-2.5 font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {sending ? (
                    <span className="hidden sm:inline">Sending...</span>
                  ) : (
                    <>
                      <Send className="h-4 w-4 flex-shrink-0" />
                      <span className="hidden sm:inline">Send</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </>
        ) : !showConversationsList ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <MessageCircle className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-slate-400 mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Select a conversation</h3>
              <p className="text-sm sm:text-base text-slate-400">Choose a conversation from the list to start messaging</p>
              <button
                onClick={() => setShowConversationsList(true)}
                className="mt-4 lg:hidden rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
              >
                View Conversations
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
