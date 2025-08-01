import { MyUIMessage } from '@/server/routers/chat/chat-router'
import { ChatStatus } from 'ai'
import { memo, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import { ChatContainerContent, ChatContainerRoot } from '../ui/chat-container'
import { LoadingMessage } from './loading-message'
import { MessageWrapper } from './message-wrapper'
import { StreamingMessage } from './streaming-message'
import { TweetMockup } from './tweet-mockup'
import { WebsiteMockup } from './website-mockup'

export const Messages = memo(
  ({
    messages,
    error,
    status,
  }: {
    messages: MyUIMessage[]
    error?: Error
    status: ChatStatus
  }) => {
    const lastUserMessageIndex = useMemo(
      () => messages.findLastIndex((m) => m.role === 'user'),
      [messages],
    )

    const visibleMessages = useMemo(
      () =>
        messages.filter((message) =>
          message.parts.some((part) => part.type === 'text' && Boolean(part.text)),
        ),
      [messages],
    )

    const showLoadingMessage = useMemo(() => {
      return (
        !error &&
        (status === 'submitted' ||
          (status === 'streaming' &&
            !Boolean(
              messages[messages.length - 1]?.parts.some(
                (part) => part.type === 'text' && Boolean(part.text),
              ),
            )))
      )
    }, [error, status, messages])

    const hasImageAttachment = useMemo(() => {
      return Boolean(
        messages[lastUserMessageIndex]?.metadata?.attachments.some(
          (a) => a.type === 'image',
        ),
      )
    }, [messages, lastUserMessageIndex])

    return (
      <>
        <ChatContainerRoot className="h-full overflow-y-auto">
          <ChatContainerContent className="space-y-6 px-4 pt-6 pb-6">
            {visibleMessages.map((message, index) => {
              const isUser = message.role === 'user'

              return (
                <div
                  key={message.id}
                  data-message-index={index}
                  data-message-role={message.role}
                >
                  <MessageWrapper
                    id={message.id}
                    metadata={message.metadata}
                    disableAnimation={message.role === 'assistant'}
                    isUser={isUser}
                    showOptions={
                      (message.role === 'assistant' &&
                        (status === 'ready' || status === 'error')) ||
                      index !== messages.length - 1
                    }
                    animateLogo={
                      index === messages.length - 1 &&
                      (status === 'submitted' || status === 'streaming')
                    }
                  >
                    {message.parts.map((part, i) => {
                      if (part.type === 'tool-readWebsiteContent') {
                        if (
                          part.state === 'input-available' ||
                          part.state === 'input-streaming'
                        ) {
                          return <WebsiteMockup key={i} isLoading />
                        }

                        if (part.output) {
                          return (
                            <WebsiteMockup
                              key={i}
                              url={part.output.url}
                              title={part.output.title}
                            >
                              <div className="line-clamp-3">
                                <ReactMarkdown>
                                  {part.output.content.slice(0, 250)}
                                </ReactMarkdown>
                              </div>
                            </WebsiteMockup>
                          )
                        }

                        return null
                      }

                      if (part.type === 'data-tool-output') {
                        if (part.data.status === 'processing') {
                          return <TweetMockup key={i} isLoading />
                        }

                        return (
                          <TweetMockup key={i} text={part.data.text}>
                            <StreamingMessage animate={true} text={part.data.text} />
                          </TweetMockup>
                        )
                      }

                      if (part.type === 'text') {
                        if (!part.text) return null

                        return (
                          <div className="whitespace-pre-wrap" key={i}>
                            <StreamingMessage
                              markdown
                              animate={message.role === 'assistant'}
                              text={message.metadata?.userMessage || part.text}
                            />
                          </div>
                        )
                      }

                      return null
                    })}
                  </MessageWrapper>
                </div>
              )
            })}

            {showLoadingMessage && (
              <div data-message-index={visibleMessages.length} data-loading="true">
                <LoadingMessage hasImage={hasImageAttachment} status={status} />
              </div>
            )}
          </ChatContainerContent>
        </ChatContainerRoot>
      </>
    )
  },
)

Messages.displayName = 'Messages'
