import { PropsWithChildren, memo } from 'react'
import { motion } from 'framer-motion'
import { Icons } from '../icons'
import { AccountAvatar, AccountHandle, AccountName } from '@/hooks/account-ctx'
import { ChevronsLeft, RotateCcw } from 'lucide-react'
import DuolingoButton from '../ui/duolingo-button'
import { useTweets } from '@/hooks/use-tweets'
import { $createParagraphNode, $createTextNode, $getRoot } from 'lexical'

export const TweetMockup = memo(
  ({
    children,
    text,
    isLoading = false,
  }: PropsWithChildren<{ isLoading?: boolean; text?: string }>) => {
    const { shadowEditor } = useTweets()
    const containerVariants = {
      hidden: { opacity: 0, y: 20, scale: 0.95 },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          type: 'spring',
          duration: 0.6,
          bounce: 0.1,
          staggerChildren: 0.1,
          delayChildren: 0.2,
        },
      },
    }

    const apply = () => {
      shadowEditor.update(
        () => {
          const root = $getRoot()
          const paragraph = $createParagraphNode()
          const textNode = $createTextNode(text)

          root.clear()

          paragraph.append(textNode)
          root.append(paragraph)
        },
        { tag: 'force-sync' },
      )
    }

    return (
      <motion.div
        variants={isLoading ? containerVariants : undefined}
        initial={isLoading ? 'hidden' : false}
        animate={isLoading ? 'visible' : false}
        className="w-full min-w-0 py-3 px-4 rounded-2xl border border-black border-opacity-[0.01] bg-clip-padding group isolate bg-white shadow-[0_1px_1px_rgba(0,0,0,0.05),0_4px_6px_rgba(34,42,53,0.04),0_24px_68px_rgba(47,48,55,0.05),0_2px_3px_rgba(0,0,0,0.04)]"
      >
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <AccountAvatar className="size-8" />
            <div className="flex flex-col">
              <AccountName animate className="leading-[1.2] text-sm" />
              <AccountHandle className="text-sm leading-[1.2]" />
            </div>
          </div>

          {!isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
              }}
              className="flex items-center gap-2"
            >
              <DuolingoButton
                onClick={apply}
                variant="secondary"
                size="sm"
                className="text-sm w-fit h-8 px-2"
              >
                <ChevronsLeft className="size-4 mr-1" /> Apply
              </DuolingoButton>
            </motion.div>
          )}
        </div>

        <div className="w-full flex flex-col items-start">
          <div className="w-full flex-1 py-2.5">
            <div className="mt-1 text-slate-800 text-[15px] space-y-3 whitespace-pre-wrap">
              {isLoading ? (
                <div className="space-y-2">
                  <motion.div
                    initial={{ opacity: 0, y: 0 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="h-4 bg-gray-200 rounded animate-pulse"
                    style={{ width: '85%' }}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="h-4 bg-gray-200 rounded animate-pulse"
                    style={{ width: '92%' }}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                    className="h-4 bg-gray-200 rounded animate-pulse"
                    style={{ width: '78%' }}
                  />
                </div>
              ) : (
                children
              )}
            </div>
          </div>
        </div>
      </motion.div>
    )
  },
)

TweetMockup.displayName = 'TweetMockup'
