import React, { createContext, useContext, useRef } from 'react'

interface SidebarContextType {
  startNewChatRef: React.RefObject<(() => string) | null>
  clearTweetStateRef: React.RefObject<(() => void) | null>
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const startNewChatRef = useRef<(() => string) | null>(null)
  const clearTweetStateRef = useRef<(() => void) | null>(null)

  return (
    <SidebarContext.Provider
      value={{
        startNewChatRef,
        clearTweetStateRef,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebarContext() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebarContext must be used within a SidebarProvider')
  }
  return context
}
