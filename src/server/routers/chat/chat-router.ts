import { assistantPrompt } from '@/lib/prompt-utils'
import { DiffWithReplacement } from '@/lib/utils'
import {
  convertToModelMessages,
  CoreMessage,
  createIdGenerator,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  UIMessage
} from 'ai'
import { format } from 'date-fns'
import 'diff-match-patch-line-and-word'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { redis } from '../../../lib/redis'
import { j, privateProcedure } from '../../jstack'
import { create_read_website_content } from './read-website-content'
import { parseAttachments, PromptBuilder } from './utils'

import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { getAccount } from '../utils/get-account'
import { createTweetTool } from './tools/create-tweet-tool'

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

// ==================== Types ====================

export interface EditTweetToolResult {
  id: string
  improvedText: string
  diffs: DiffWithReplacement[]
}

// Custom message type that ensures all messages have an ID
export type ChatMessage = Omit<UIMessage, 'content'> & {
  content: string | UIMessage['parts']
  role: CoreMessage['role']
  id: string
  metadata?: MessageMetadata
  chatId?: string
}

export interface Chat {
  id: string
  messages: ChatMessage[]
}

export interface WebScrapingResult {
  url: string
  content?: string
  screenshot?: string
  error?: string
}

// ==================== Schemas ====================

const attachmentSchema = z.object({
  id: z.string(),
  title: z.string().optional().nullable(),
  fileKey: z.string().optional(), // only for chat attachments
  type: z.enum(['url', 'txt', 'docx', 'pdf', 'image', 'manual', 'video']),
  variant: z.enum(['knowledge', 'chat']),
})

export type TAttachment = z.infer<typeof attachmentSchema>

const messageMetadataSchema = z.object({
  attachments: z.array(attachmentSchema).optional(),
})

export type Attachment = z.infer<typeof attachmentSchema>
export type MessageMetadata = z.infer<typeof messageMetadataSchema>

const chatMessageSchema = z.object({
  id: z.string(),
  chatId: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  metadata: messageMetadataSchema.optional(),
})

export type Metadata = {
  userMessage: string
  attachments: Array<TAttachment>
  editorContent: string
}

export type MyUIMessage = UIMessage<
  Metadata,
  {
    'main-response': {
      text: string
      status: 'streaming' | 'complete'
    }
    'tool-output': {
      text: string
      status: 'processing' | 'streaming' | 'complete'
    }
    writeTweet: {
      status: 'processing'
    }
  },
  {
    readWebsiteContent: {
      input: { website_url: string }
      output: {
        url: string
        title: string
        content: string
      }
    }
  }
>

// ==================== Constants ====================

const MESSAGE_ID_PREFIXES = {
  document: 'doc:',
  meta: 'meta:',
  style: 'style:',
  system: 'system-prompt',
}

function filterVisibleMessages(messages: UIMessage[]): UIMessage[] {
  return messages.filter(
    (msg) =>
      !msg.id.startsWith(MESSAGE_ID_PREFIXES.document) &&
      !msg.id.startsWith(MESSAGE_ID_PREFIXES.meta) &&
      !msg.id.startsWith(MESSAGE_ID_PREFIXES.system),
  )
}

async function incrementChatCount(userEmail: string): Promise<void> {
  const today = format(new Date(), 'yyyy-MM-dd')
  const key = `chat:count:batch-2:${userEmail}`
  await redis.hincrby(key, today, 1)
}

// ==================== Route Handlers ====================

export const chatRouter = j.router({
  get_message_history: privateProcedure
    .input(z.object({ chatId: z.string().nullable() }))
    .get(async ({ c, input, ctx }) => {
      const { chatId } = input
      const { user } = ctx

      if (!chatId) {
        return c.superjson({ messages: [] })
      }

      const messages = await redis.get<MyUIMessage[]>(`chat:history:${chatId}`)

      if (!messages) {
        return c.superjson({ messages: [] })
      }

      // const chat = await redis.json.get<{ messages: UIMessage[] }>(
      //   `chat:${user.email}:${chatId}`,
      // )

      // const visibleMessages = chat ? filterVisibleMessages(chat.messages) : []

      return c.superjson({ messages })
    }),

  conversation: privateProcedure.post(({ c }) => {
    return c.json({ id: crypto.randomUUID() })
  }),

  chat: privateProcedure
    .input(
      z.object({
        message: z.any(),
        id: z.string(),
      }),
    )
    .post(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { id, message } = input as { message: MyUIMessage; id: string }

      const [account, history, parsedAttachments] = await Promise.all([
        getAccount({ email: user.email }),
        redis.get<MyUIMessage[]>(`chat:history:${id}`),
        parseAttachments({
          attachments: message.metadata?.attachments,
        }),
      ])

      if (!account) {
        throw new HTTPException(412, { message: 'No connected account' })
      }

      const { links, attachments } = parsedAttachments

      const content = new PromptBuilder()
      const userContent = message.parts.reduce(
        (acc, curr) => (curr.type === 'text' ? acc + curr.text : ''),
        '',
      )

      content.add(`<user_message>${userContent}</user_message>`)

      if (Boolean(links.length)) {
        const link = new PromptBuilder()
        links.forEach((l) => link.add(`<link>${l?.link}</link>`))

        content.add(
          `<attached_links note="Please read these.">${link.build()}</attached_links>`,
        )
      }

      if (Boolean(message.metadata?.editorContent)) {
        content.add(`<tweet_draft>${message.metadata?.editorContent}</tweet_draft>`)
      }

      const userMessage: MyUIMessage = {
        ...message,
        parts: [
          { type: 'text', text: `<message>${content.build()}</message>` },
          ...attachments,
        ],
      }

      const messages = [...(history ?? []), userMessage] as MyUIMessage[]

      console.log(JSON.stringify(messages, null, 2))

      const stream = createUIMessageStream<MyUIMessage>({
        originalMessages: messages,
        generateId: createIdGenerator({
          prefix: 'msg',
          size: 16,
        }),
        onFinish: async ({ messages }) => {
          await redis.set(`chat:history:${id}`, messages)
        },
        onError(error) {
          console.log('❌❌❌ ERROR:', JSON.stringify(error, null, 2))

          throw new HTTPException(500, {
            message: error instanceof Error ? error.message : 'Something went wrong.',
          })
        },
        execute: async ({ writer }) => {
          // tools
          const writeTweet = createTweetTool({
            writer,
            ctx: {
              editorContent: message.metadata?.editorContent ?? '',
              instructions: userContent,
              messages,
              userContent,
              attachments: { attachments, links },
              redisKeys: {
                style: `style:${user.email}:${account.id}`,
                account: `active-account:${user.email}`,
                websiteContent: `website-contents:${id}`,
              },
            },
          })

          const readWebsiteContent = create_read_website_content({ chatId: id })

          const result = streamText({
            model: openrouter.chat('openai/gpt-4.1', {
              // model: openrouter.chat('openrouter/horizon-alpha', {
              models: ['openai/gpt-4o'],
              reasoning: { enabled: false, effort: 'low' },
            }),
            system: assistantPrompt({ editorContent: message.metadata?.editorContent }),
            messages: convertToModelMessages(messages),
            tools: { writeTweet, readWebsiteContent },
            stopWhen: stepCountIs(3),
          })

          writer.merge(result.toUIMessageStream())
        },
      })

      return createUIMessageStreamResponse({ stream })
    }),
})
