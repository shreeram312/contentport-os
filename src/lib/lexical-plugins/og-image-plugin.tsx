import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useEffect, useRef } from 'react'
import {
  PASTE_COMMAND,
  $getRoot,
  $isTextNode,
  KEY_ENTER_COMMAND,
  KEY_SPACE_COMMAND,
} from 'lexical'

interface OGImagePluginProps {
  onUrlDetected?: (url: string) => void
  onUrlRemoved?: () => void
}

export default function OGImagePlugin({
  onUrlDetected,
  onUrlRemoved,
}: OGImagePluginProps) {
  const [editor] = useLexicalComposerContext()
  const lastProcessedUrl = useRef<string | null>(null)

  // Helper function to extract URLs from text
  const extractUrls = (text: string): string[] => {
    const urlRegex =
      /https?:\/\/[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+[^\s]*/
    const matches = text.match(urlRegex)
    return matches ? matches : []
  }

  // Helper function to check if URL exists in editor content
  const checkUrlExists = (url: string): boolean => {
    const root = $getRoot()
    const allTextNodes = root.getAllTextNodes()

    for (const node of allTextNodes) {
      if ($isTextNode(node)) {
        const text = node.getTextContent()
        if (text.includes(url)) {
          return true
        }
      }
    }
    return false
  }

  // Helper function to check for new URLs in editor content
  const checkForNewUrl = () => {
    editor.getEditorState().read(() => {
      const root = $getRoot()
      const allTextNodes = root.getAllTextNodes()
      let fullText = ''

      // Get all text content
      for (const node of allTextNodes) {
        if ($isTextNode(node)) {
          fullText += node.getTextContent()
        }
      }

      // Extract URLs from the full text
      const urls = extractUrls(fullText)

      if (urls.length > 0) {
        const firstUrl = urls[0]
        if (firstUrl && firstUrl !== lastProcessedUrl.current) {
          try {
            new URL(firstUrl) // validate
            lastProcessedUrl.current = firstUrl
            onUrlDetected?.(firstUrl)
          } catch {
            console.log('OG Plugin: Invalid typed URL')
          }
        }
      }
    })
  }

  useEffect(() => {
    // 1️⃣ Paste detection
    const removePasteListener = editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        const clipboardData = (event as ClipboardEvent).clipboardData
        if (!clipboardData) return false

        const pastedText = clipboardData.getData('text').trim()
        if (!pastedText) return false

        const urls = extractUrls(pastedText)

        if (urls.length > 0) {
          const firstUrl = urls[0]
          if (firstUrl) {
            // Ensure firstUrl is defined
            try {
              new URL(firstUrl) // validate
              if (lastProcessedUrl.current !== firstUrl) {
                lastProcessedUrl.current = firstUrl
                onUrlDetected?.(firstUrl)
              }
            } catch {
              console.log('OG Plugin: Invalid pasted URL')
            }
          }
        }

        return false
      },
      1,
    )

    // 2️ URL detection on Enter/Space after typing
    const removeEnterListener = editor.registerCommand(
      KEY_ENTER_COMMAND,
      () => {
        checkForNewUrl()
        return false
      },
      1,
    )

    const removeSpaceListener = editor.registerCommand(
      KEY_SPACE_COMMAND,
      () => {
        checkForNewUrl()
        return false
      },
      1,
    )

    // 3️ Remove OG if URL no longer exists in editor
    const removeTextChangeListener = editor.registerTextContentListener(() => {
      editor.getEditorState().read(() => {
        if (!lastProcessedUrl.current) return

        // Check if the URL still exists in the editor
        if (!checkUrlExists(lastProcessedUrl.current)) {
          lastProcessedUrl.current = null
          onUrlRemoved?.()
        }
      })
    })

    return () => {
      removePasteListener()
      removeEnterListener()
      removeSpaceListener()
      removeTextChangeListener()
    }
  }, [editor, onUrlDetected, onUrlRemoved])

  return null
}
