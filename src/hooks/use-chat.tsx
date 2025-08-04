import { client } from '@/lib/client'
import { MyUIMessage } from '@/server/routers/chat/chat-router'
import { useChat } from '@ai-sdk/react'
import { useQuery } from '@tanstack/react-query'
import { DefaultChatTransport } from 'ai'
import { nanoid } from 'nanoid'
import { Options, useQueryState } from 'nuqs'
import { createContext, PropsWithChildren, useContext, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'

interface ChatContext extends ReturnType<typeof useChat<MyUIMessage>> {
  startNewChat: (id?: string) => Promise<void>
  setId: (
    value: string | ((old: string) => string | null) | null,
    options?: Options,
  ) => Promise<URLSearchParams>
}

const ChatContext = createContext<ChatContext | null>(null)

const defaultValue = nanoid()

export const ChatProvider = ({ children }: PropsWithChildren) => {
  const [id, setId] = useQueryState('chatId', {
    defaultValue,
  })

  const startNewChat = async (id?: string) => {
    setId(nanoid())
  }

  const chat = useChat<MyUIMessage>({
    id,
    transport: new DefaultChatTransport({
      api: '/api/chat/chat',
      prepareSendMessagesRequest({ messages, id }) {
        return { body: { message: messages[messages.length - 1], id } }
      },
    }),
    messages: [],
    onError: ({ message }) => {
      toast.error(message)
    },
  })

  useQuery({
    queryKey: ['initial-messages', id],
    queryFn: async () => {
      const res = await client.chat.get_message_history.$get({ chatId: id })
      const data = await res.json()

      chat.setMessages(data.messages)

      return data
    },
    initialData: { messages: [] },
  })

  return (
    <ChatContext.Provider value={{ ...chat, startNewChat, setId }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChatContext() {
  const context = useContext(ChatContext)

  if (!context) {
    throw new Error('useChat must be used within a ChatProvider')
  }

  return context
}
