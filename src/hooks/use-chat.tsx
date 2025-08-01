import { client } from '@/lib/client'
import { MyUIMessage } from '@/server/routers/chat/chat-router'
import { useChat } from '@ai-sdk/react'
import { useQuery } from '@tanstack/react-query'
import { DefaultChatTransport } from 'ai'
import { nanoid } from 'nanoid'
import { useQueryState } from 'nuqs'
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useRef
} from 'react'
import toast from 'react-hot-toast'

interface ChatContext extends ReturnType<typeof useChat<MyUIMessage>> {
  startNewChat: (id?: string) => Promise<void>
}

const ChatContext = createContext<ChatContext | null>(null)

const defaultValue = nanoid()

export const ChatProvider = ({ children }: PropsWithChildren) => {
  const isInitialized = useRef(false)

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
    onError: ({ message }) => {
      toast.error(message)
    },
  })

  const { data } = useQuery({
    queryKey: ['initial-messages'],
    queryFn: async () => {
      const res = await client.chat.get_message_history.$get({ chatId: id })
      const data = await res.json()

      return data
    },
    initialData: { messages: [] },
  })

  useEffect(() => {
    if (Boolean(data.messages.length) && !isInitialized.current) {
      chat.setMessages(data.messages)
      isInitialized.current = true
    }
  }, [chat, data])

  return (
    <ChatContext.Provider value={{ ...chat, startNewChat }}>
      {children}
    </ChatContext.Provider>
  )
}

// export const ChatProvider = ({ children }: PropsWithChildren) => {
//   const [chatId, setChatId] = useQueryState('chatId')
//   const {
//     draftCheckpoint,
//     tweetId,
//     listImprovements,
//     showImprovementsInEditor,
//     setDrafts,
//     improvementRef,
//     clearToolError,
//     shadowEditor,
//   } = useTweets()

//   const tweetIdRef = useRef(tweetId)

//   useEffect(() => {
//     tweetIdRef.current = tweetId
//   }, [tweetId])

//   const startNewChat = async (opts?: StartNewChatOpts) => {
//     await setChatId(opts?.newId || null)
//     result.setInput('')

//     return opts?.newId || null
//   }

//   const { data } = useQuery({
//     queryKey: ['get-chat-messages', chatId],
//     queryFn: async () => {
//       const res = await client.chat.get_chat_messages.$get({ chatId })
//       return await res.json()
//     },
//   })

//   const result = aisdk_useChat({
//     initialMessages: data?.messages ?? [],
//     id: chatId ?? undefined,
//     maxSteps: 5,
//     api: '/api/chat/generate',
//     sendExtraMessageFields: true,
//     onError(error) {
//       toast.error(error.message)
//     },
//     onResponse(res) {
//       const response = res.clone()
//       registerStreamHooks(response, {
//         onThreeDrafts: async (data: ThreeDrafts) => {
//           const currentContent = shadowEditor.read(() => $getRoot().getTextContent())
//           draftCheckpoint.current = currentContent
//           setDrafts(data)
//           clearToolError('three_drafts')
//         },
//         onTweetResult: async ({
//           id,
//           diffs,
//         }: {
//           id: string
//           isDraft: boolean
//           diffs: DiffWithReplacement[]
//           improvedText: string
//         }) => {
//           improvementRef.current = diffs
//           listImprovements(diffs)
//           showImprovementsInEditor(diffs)
//         },
//       })
//     },
//     onFinish: () => {
//       clearStreamHooks()
//     },
//     experimental_prepareRequestBody({ messages, requestBody }) {
//       return {
//         messages: undefined,
//         ...requestBody,
//       }
//     },
//   })

//   return (
//     <ChatContext.Provider
//       value={{ ...result, startNewChat, setChatId, chatId } as TChatContext}
//     >
//       {children}
//     </ChatContext.Provider>
//   )
// }

export function useChatContext() {
  const context = useContext(ChatContext)

  if (!context) {
    throw new Error('useChat must be used within a ChatProvider')
  }

  return context
}
