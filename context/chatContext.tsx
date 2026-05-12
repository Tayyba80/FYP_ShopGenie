"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface ChatContextType {
  sidebarRefreshKey: number;
  triggerSidebarRefresh: () => void;
}

const ChatContext = createContext<ChatContextType>({
  sidebarRefreshKey: 0,
  triggerSidebarRefresh: () => {},
});

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);

  const triggerSidebarRefresh = useCallback(() => {
    setSidebarRefreshKey((prev) => prev + 1);
  }, []);

  return (
    <ChatContext.Provider value={{ sidebarRefreshKey, triggerSidebarRefresh }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  return useContext(ChatContext);
}