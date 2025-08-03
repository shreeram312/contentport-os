import { createStylePrompt, editToolSystemPrompt } from '@/lib/prompt-utils'
import { redis } from '@/lib/redis'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import {
  convertToModelMessages,
  generateId,
  streamText,
  tool,
  UIMessageStreamWriter,
} from 'ai'
import { HTTPException } from 'hono/http-exception'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { Account } from '../../settings-router'
import { Style } from '../../style-router'
import { MyUIMessage } from '../chat-router'
import { WebsiteContent } from '../read-website-content'
import { parseAttachments } from '../utils'
import { format } from 'date-fns'

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

interface Context {
  writer: UIMessageStreamWriter
  ctx: {
    plan: 'free' | 'pro'
    editorContent: string
    instructions: string
    userContent: string
    messages: MyUIMessage[]
    attachments: Awaited<ReturnType<typeof parseAttachments>>
    redisKeys: {
      style: string
      account: string
      websiteContent: string
    }
  }
}

export const createTweetTool = ({ writer, ctx }: Context) => {
  return tool({
    description: 'my tool',
    inputSchema: z.object({
      instruction: z.string().describe(
        `Capture the user's instruction EXACTLY as they wrote it - preserve every detail including:
    - Exact wording and phrasing
    - Original capitalization (lowercase, UPPERCASE, Title Case)
    - Punctuation and special characters
    - Typos or informal language
    - Numbers and formatting
    
    DO NOT paraphrase, summarize, or clean up the instruction in any way.
    
    <examples>
    <example>
    <user_message>make a tweet about AI being overhyped tbh</user_message>
    <instruction>make a tweet about AI being overhyped tbh</instruction>
    </example>
    
    <example>
    <user_message>make 2 tweets about why nextjs 15 is AMAZING!!!</user_message>
    <instruction>tweet about why nextjs 15 is AMAZING!!!</instruction>
    </example>
    
    <example>
    <user_message>write something funny about debugging at 3am</user_message>
    <instruction>write something funny about debugging at 3am</instruction>
    </example>
    </examples>
    
    Remember: This tool creates/edits ONE tweet per call. If the user requests multiple drafts, frame the instruction for one specific draft only.`,
      ),
      tweetContent: z
        .string()
        .optional()
        .describe(
          "Optional: If a user wants changes to a specific tweet, write that tweet's content here. Copy it EXACTLY 1:1 without ANY changes whatsoever - same casing, formatting, etc. If user is not talking about a specific previously generated tweet, leave undefined.",
        ),
      imageDescriptions: z
        .array(z.string())
        .optional()
        .default([])
        .describe(
          'Optional: If a user attached image(s), explain their content in high detail to be used as context while writing the tweet.',
        ),
    }),
    execute: async ({ instruction, tweetContent, imageDescriptions }) => {
      const generationId = nanoid()

      writer.write({
        type: 'data-tool-output',
        id: generationId,
        data: {
          text: '',
          status: 'processing',
        },
      })

      const [style, account, websiteContent] = await Promise.all([
        redis.json.get<Style>(ctx.redisKeys.style),
        redis.json.get<Account>(ctx.redisKeys.account),
        redis.lrange<WebsiteContent>(ctx.redisKeys.websiteContent, 0, -1),
      ])

      if (!style || !account) {
        throw new Error('Style or account not found')
      }

      if (websiteContent) {
        await redis.del(ctx.redisKeys.websiteContent)
      }

      const prompt = new XmlPrompt()

      prompt.open('prompt', { date: format(new Date(), 'yyyy-MM-dd') })

      // system
      prompt.open('system')
      prompt.text(editToolSystemPrompt({ name: account.name }))
      prompt.close('system')

      // history
      if (ctx.messages.length > 1) {
        prompt.open('history')
        ctx.messages.forEach((msg) => {
          prompt.open('response_pair')
          msg.parts.forEach((part) => {
            if (part.type === 'text' && msg.role === 'user') {
              prompt.open('user_message')
              prompt.tag('user_request', part.text)

              if (Boolean(websiteContent.length)) {
                websiteContent.forEach(({ url, title, content }) => {
                  if (content && title) {
                    prompt.tag('attached_website_content', content, { url, title })
                  }
                })
              }

              prompt.close('user_message')
            }

            if (part.type === 'data-tool-output') {
              prompt.tag('response_tweet', part.data.text)
            }
          })
          prompt.close('response_pair')
        })
        prompt.close('history')
      }

      // current job
      prompt.tag('current_user_request', instruction ?? ctx.userContent)

      if (ctx.editorContent && !Boolean(tweetContent)) {
        prompt.tag('current_tweet_draft', ctx.editorContent)
      }

      if (tweetContent) {
        prompt.tag('user_is_referencing_tweet', tweetContent)
      }

      // style
      prompt.tag('style', createStylePrompt({ account, style }))

      prompt.close('prompt')

      const messages: MyUIMessage[] = [
        {
          id: generateId(),
          role: 'user',
          parts: [
            { type: 'text', text: prompt.toString() },
            ...ctx.attachments.attachments.filter((a) => a.type === 'text'),
            ...(imageDescriptions ?? []).map((text) => ({
              type: 'text' as const,
              text: `<user_attached_image_description note="The user attached an image to this message. For conveniece, you'll see a textual description of the image. It may or may not be directly relevant to your created tweet.">${text}</user_attached_image_description>`,
            })),
          ],
        },
      ]

      const modelName =
        ctx.plan === 'pro' ? 'anthropic/claude-sonnet-4' : 'openrouter/horizon-beta'

      const model = openrouter.chat(modelName, {
        reasoning: { enabled: false, effort: 'low' },
        models: [
          'openrouter/horizon-alpha',
          'anthropic/claude-3.7-sonnet',
          'openai/o4-mini',
        ],
      })

      const result = streamText({
        model,
        system: editToolSystemPrompt({ name: account.name }),
        messages: convertToModelMessages(messages),
        onError(error) {
          console.log('❌❌❌ ERROR:', JSON.stringify(error, null, 2))

          throw new HTTPException(500, {
            message: error instanceof Error ? error.message : 'Something went wrong.',
          })
        },
      })

      let fullText = ''

      for await (const textPart of result.textStream) {
        fullText += textPart
        writer.write({
          type: 'data-tool-output',
          id: generationId,
          data: {
            text: fullText,
            status: 'streaming',
          },
        })
      }

      writer.write({
        type: 'data-tool-output',
        id: generationId,
        data: {
          text: fullText,
          status: 'complete',
        },
      })

      return fullText
    },
  })
}

export class XmlPrompt {
  private parts: string[] = []

  tag(name: string, content: string, attrs?: Record<string, string | number>): this {
    const attrStr = this.buildAttrs(attrs)
    this.parts.push(`<${name}${attrStr}>${content}</${name}>`)
    return this
  }

  open(name: string, attrs?: Record<string, string | number>): this {
    const attrStr = this.buildAttrs(attrs)
    this.parts.push(`<${name}${attrStr}>`)
    return this
  }

  close(name: string): this {
    this.parts.push(`</${name}>`)
    return this
  }

  text(content: string): this {
    this.parts.push(content)
    return this
  }

  toString(): string {
    return this.parts.join('\n')
  }

  private buildAttrs(attrs?: Record<string, string | number>): string {
    if (!attrs) return ''
    return Object.entries(attrs)
      .map(([k, v]) => ` ${k}="${v}"`)
      .join('')
  }
}
