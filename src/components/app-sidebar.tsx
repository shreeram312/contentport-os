'use client'

import { ArrowUp, Paperclip, Plus, Square, X } from 'lucide-react'
import { useCallback, useContext, useEffect } from 'react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { useAttachments } from '@/hooks/use-attachments'
import { useChatContext } from '@/hooks/use-chat'
import { useTweets } from '@/hooks/use-tweets'
import { client } from '@/lib/client'
import { MultipleEditorStorePlugin } from '@/lib/lexical-plugins/multiple-editor-plugin'
import PlaceholderPlugin from '@/lib/placeholder-plugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  COMMAND_PRIORITY_HIGH,
  KEY_ENTER_COMMAND,
} from 'lexical'
import { useRouter, useSearchParams } from 'next/navigation'
import { AttachmentItem } from './attachment-item'
import { Messages } from './chat/messages'
import { KnowledgeSelector, SelectedKnowledgeDocument } from './knowledge-selector'
import DuolingoButton from './ui/duolingo-button'
import {
  FileUpload,
  FileUploadContext,
  FileUploadTrigger
} from './ui/file-upload'
import { PromptSuggestion } from './ui/prompt-suggestion'

const ChatInput = ({
  onSubmit,
  onStop,
  disabled,
  handleFilesAdded,
}: {
  onSubmit: (text: string, editorContent: string) => void
  onStop: () => void
  disabled: boolean
  handleFilesAdded: (files: File[]) => void
}) => {
  const [editor] = useLexicalComposerContext()
  const { isDragging } = useContext(FileUploadContext)

  const { attachments, removeAttachment, addKnowledgeAttachment, hasUploading } =
    useAttachments()

  const { shadowEditor } = useTweets()

  const handleSubmit = () => {
    const editorContent = shadowEditor.read(() => $getRoot().getTextContent().trim())

    const text = editor.read(() => $getRoot().getTextContent().trim())

    onSubmit(text, editorContent)

    editor.update(() => {
      const root = $getRoot()
      root.clear()
      root.append($createParagraphNode())
    })
  }

  useEffect(() => {
    const removeCommand = editor?.registerCommand(
      KEY_ENTER_COMMAND,
      (event: KeyboardEvent | null) => {
        if (event && !event.shiftKey) {
          event.preventDefault()

          const editorContent = shadowEditor.read(() =>
            $getRoot().getTextContent().trim(),
          )

          editor.update(() => {
            const root = $getRoot()
            const text = root.getTextContent().trim()
            if (!text) return

            onSubmit(text, editorContent)

            root.clear()
            const paragraph = $createParagraphNode()
            root.append(paragraph)
          })
        }

        return true
      },
      COMMAND_PRIORITY_HIGH,
    )

    return () => {
      removeCommand?.()
    }
  }, [editor, onSubmit])

  const handleAddKnowledgeDoc = useCallback(
    (doc: SelectedKnowledgeDocument) => {
      addKnowledgeAttachment(doc)
    },
    [addKnowledgeAttachment],
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      const files: File[] = []
      Array.from(items).forEach((item) => {
        if (item.kind === 'file') {
          const file = item.getAsFile()
          if (file) {
            files.push(file)
          }
        }
      })

      if (files.length > 0) {
        e.preventDefault()
        handleFilesAdded(files)
      }
    },
    [handleFilesAdded],
  )

  return (
    <div>
      <div className="mb-2 flex gap-2 items-center">
        {attachments.map((attachment, i) => {
          const onRemove = () => removeAttachment({ id: attachment.id })
          return (
            <motion.div
              key={attachment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2, delay: i * 0.1 }}
            >
              <AttachmentItem
                onRemove={onRemove}
                key={attachment.id}
                attachment={attachment}
              />
            </motion.div>
          )
        })}
      </div>

      <div className="space-y-3">
        <div
          className={`relative transition-all rounded-xl duration-300 ease-out ${
            isDragging ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-gray-100' : ''
          }`}
        >
          {isDragging && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50/90 to-blue-50/90 backdrop-blur-md rounded-xl z-20 border-2 border-dashed border-indigo-300">
              <div className="flex items-center gap-2 text-indigo-700">
                <Paperclip className="size-5" />
                <p className="font-medium">Drop files to attach</p>
              </div>
              <p className="text-sm text-indigo-500 mt-1">
                Supports images, documents, and more
              </p>
            </div>
          )}
          <div className="relative">
            <div
              className={`rounded-xl bg-white border-2 shadow-[0_2px_0_#E5E7EB] font-medium transition-all duration-300 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-600 ${
                isDragging
                  ? 'border-indigo-200 shadow-[0_4px_12px_rgba(99,102,241,0.15)]'
                  : 'border-gray-200'
              }`}
            >
              <PlainTextPlugin
                contentEditable={
                  <ContentEditable
                    autoFocus
                    className="w-full px-4 py-3 outline-none min-h-[4.5rem] text-base placeholder:text-gray-400"
                    style={{ minHeight: '4.5rem' }}
                    onPaste={handlePaste}
                  />
                }
                ErrorBoundary={LexicalErrorBoundary}
              />
              <PlaceholderPlugin placeholder="Tweet about..." />
              <HistoryPlugin />
              <MultipleEditorStorePlugin id="app-sidebar" />

              <div className="flex items-center justify-between px-3 pb-3">
                <div className="flex gap-1.5 items-center">
                  <FileUploadTrigger asChild>
                    <DuolingoButton type="button" variant="secondary" size="icon">
                      <Paperclip className="text-stone-600 size-5" />
                    </DuolingoButton>
                  </FileUploadTrigger>

                  <KnowledgeSelector onSelectDocument={handleAddKnowledgeDoc} />
                </div>

                {disabled ? (
                  <DuolingoButton
                    onClick={onStop}
                    variant="icon"
                    size="icon"
                    aria-label="Stop message"
                  >
                    <Square className="size-3 fill-white" />
                  </DuolingoButton>
                ) : (
                  <DuolingoButton
                    disabled={hasUploading}
                    onClick={handleSubmit}
                    variant="icon"
                    size="icon"
                    aria-label="Send message"
                  >
                    <ArrowUp className="size-5" />
                  </DuolingoButton>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AppSidebar({ children }: { children: React.ReactNode }) {
  const { toggleSidebar } = useSidebar()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [editor] = useLexicalComposerContext()

  const { messages, status, sendMessage, startNewChat, id, stop } = useChatContext()
  const { attachments, removeAttachment, addChatAttachment, addKnowledgeAttachment } =
    useAttachments()

  console.log({ attachments })

  const updateURL = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams)
      params.set(key, value)
      router.replace(`${window.location.pathname}?${params.toString()}`, {
        scroll: false,
      })
    },
    [searchParams, router],
  )

  const handleSubmit = useCallback(
    async (text: string, editorContent: string) => {
      if (!text.trim()) return

      if (!Boolean(searchParams.get('chatId'))) {
        updateURL('chatId', id)
      }

      sendMessage({ text, metadata: { attachments, editorContent, userMessage: text } })

      // Batch attachment removals to prevent multiple rapid state updates
      if (attachments.length > 0) {
        requestAnimationFrame(() => {
          attachments.forEach((a) => {
            removeAttachment({ id: a.id })
          })
        })
      }
    },
    [searchParams, updateURL, id, sendMessage, attachments, removeAttachment],
  )

  const handleNewChat = useCallback(() => {
    startNewChat()
  }, [startNewChat])

  const handleFilesAdded = useCallback(
    (files: File[]) => {
      files.forEach(addChatAttachment)
    },
    [addChatAttachment],
  )

  const { data: knowledgeData } = useQuery({
    queryKey: ['knowledge-documents'],
    queryFn: async () => {
      const res = await client.knowledge.list.$get()
      return await res.json()
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  const exampleDocuments = knowledgeData?.documents?.filter((doc) => doc.isExample) || []

  return (
    <>
      {children}

      <Sidebar side="right" collapsible="offcanvas">
        <SidebarHeader className="flex flex-col border-b border-stone-200 bg-stone-100 items-center justify-end gap-2 px-4">
          <div className="w-full flex items-center justify-between">
            <p className="text-sm/6 font-medium">Assistant</p>
            <div className="flex gap-2">
              <DuolingoButton
                onClick={handleNewChat}
                size="sm"
                variant="secondary"
                title="New Chat"
                className="inline-flex items-center gap-1.5"
              >
                <Plus className="size-4" />
                <p className="text-sm">New Chat</p>
              </DuolingoButton>
              <DuolingoButton
                onClick={toggleSidebar}
                variant="secondary"
                className="aspect-square"
                size="icon"
                title="Close Sidebar"
              >
                <X className="size-4" />
              </DuolingoButton>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="relative h-full py-0 bg-gray-50 bg-opacity-25">
          {messages.length === 0 ? (
            <div className="absolute z-10 p-3 pb-5 inset-x-0 bottom-0">
              <p className="text-sm text-gray-500 mb-2">Examples</p>
              <div className="space-y-2">
                <PromptSuggestion
                  onClick={() => {
                    attachments.forEach((attachment) => {
                      removeAttachment({ id: attachment.id })
                    })

                    const blogDoc = exampleDocuments.find(
                      (doc) => doc.title?.includes('Zod') || doc.type === 'url',
                    )

                    editor.update(() => {
                      const root = $getRoot()
                      const paragraph = $createParagraphNode()
                      const text = $createTextNode(
                        'Suggest a tweet about the Zod 4.0 release: https://zod.dev/v4',
                      )
                      root.clear()
                      paragraph.append(text)
                      paragraph.selectEnd()
                      root.append(paragraph)
                    })

                    editor.focus()
                  }}
                >
                  Suggest a tweet about the Zod 4.0 release
                </PromptSuggestion>

                <PromptSuggestion
                  onClick={() => {
                    attachments.forEach((attachment) => {
                      removeAttachment({ id: attachment.id })
                    })

                    editor.update(() => {
                      const root = $getRoot()
                      const paragraph = $createParagraphNode()
                      const text = $createTextNode(
                        'Draft 2 tweets about imposter syndrome in tech',
                      )
                      root.clear()
                      paragraph.append(text)
                      paragraph.selectEnd()
                      root.append(paragraph)
                    })

                    editor.focus()
                  }}
                >
                  Draft 2 tweets about imposter syndrome in tech
                </PromptSuggestion>

                <PromptSuggestion
                  onClick={() => {
                    attachments.forEach((attachment) => {
                      removeAttachment({ id: attachment.id })
                    })

                    editor.update(() => {
                      const root = $getRoot()
                      const paragraph = $createParagraphNode()
                      const text = $createTextNode(
                        'Draft a tweet about 3 productivity tips for remote devs',
                      )
                      root.clear()
                      paragraph.append(text)
                      paragraph.selectEnd()
                      root.append(paragraph)
                    })

                    editor.focus()
                  }}
                >
                  Draft a tweet about 3 productivity tips for remote devs
                </PromptSuggestion>

                <PromptSuggestion
                  onClick={() => {
                    attachments.forEach((attachment) => {
                      removeAttachment({ id: attachment.id })
                    })

                    editor.update(() => {
                      const root = $getRoot()
                      const paragraph = $createParagraphNode()
                      const text = $createTextNode(
                        'Tweet about a complex programming concept in simple terms',
                      )
                      root.clear()
                      paragraph.append(text)
                      paragraph.selectEnd()
                      root.append(paragraph)
                    })

                    editor.focus()
                  }}
                >
                  Tweet about a complex programming concept in simple terms
                </PromptSuggestion>
              </div>
            </div>
          ) : null}

          <SidebarGroup className="h-full py-0 px-0">
            <div className="h-full space-y-6">
              <Messages status={status} messages={messages} />
            </div>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="relative p-3 border-t border-t-gray-300 bg-gray-100">
          {/* <Improvements /> */}

          <FileUpload onFilesAdded={handleFilesAdded}>
            <ChatInput
              onStop={stop}
              onSubmit={handleSubmit}
              handleFilesAdded={handleFilesAdded}
              disabled={status === 'submitted' || status === 'streaming'}
            />
          </FileUpload>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </>
  )
}
