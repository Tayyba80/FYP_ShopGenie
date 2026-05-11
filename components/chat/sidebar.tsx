// // components/chat/sidebar.tsx
// "use client";

// import { useEffect, useState } from "react";
// import { useRouter, useParams } from "next/navigation";
// import Link from "next/link";
// import { Button } from "@/components/ui/button";
// import { Chat } from "../../types/chats"; // your exported Chat interface
// import { Sparkles, Plus, History, Menu, X } from "lucide-react";
// import { motion, AnimatePresence } from "framer-motion";

// export function ChatSidebar({ userId }: { userId: string }) {
//   const [chats, setChats] = useState<Chat[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [sidebarOpen, setSidebarOpen] = useState(true);
//   const router = useRouter();
//   const params = useParams();
//   const currentChatId = params?.chatId as string | undefined;

//   const fetchChats = async () => {
//     try {
//       setLoading(true);
//       const res = await fetch("/api/chats");
//       if (!res.ok) throw new Error("Failed to load chats");
//       const data = await res.json();
//       setChats(data);
//     } catch (e: any) {
//       setError(e.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchChats();
//   }, []);

//   const handleNewChat = async () => {
//     const res = await fetch("/api/chats", { method: "POST" });
//     if (res.ok) {
//       const newChat = await res.json();
//       setChats((prev) => [newChat, ...prev]);
//       router.push(`/chat/${newChat.id}` as any);
//     }
//   };

//   // Revalidate list when the current chat’s title changes (e.g., after first message)
//   useEffect(() => {
//     if (currentChatId) fetchChats();
//   }, [currentChatId]);

//   return (
//     <>
//       {/* Mobile toggle button */}
//       <Button
//         variant="ghost"
//         size="sm"
//         className="fixed top-4 left-4 z-50 md:hidden"
//         onClick={() => setSidebarOpen(true)}
//       >
//         <Menu className="size-5" />
//       </Button>

//       <AnimatePresence>
//         {sidebarOpen && (
//           <motion.aside
//             initial={{ x: -300 }}
//             animate={{ x: 0 }}
//             exit={{ x: -300 }}
//             transition={{ duration: 0.3 }}
//             className="w-80 bg-white border-r flex flex-col h-full z-40 md:relative fixed inset-y-0 left-0"
//           >
//             {/* Close button on mobile */}
//             <div className="p-4 border-b flex items-center justify-between">
//               <div className="flex items-center gap-2">
//                 <Sparkles className="size-6 text-purple-600" />
//                 <span className="font-bold text-lg bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
//                   ShopGenie
//                 </span>
//               </div>
//               <Button
//                 variant="ghost"
//                 size="sm"
//                 className="md:hidden"
//                 onClick={() => setSidebarOpen(false)}
//               >
//                 <X className="size-5" />
//               </Button>
//             </div>

//             <div className="p-4">
//               <Button
//                 onClick={handleNewChat}
//                 className="w-full bg-gradient-to-r from-purple-600 to-blue-600"
//               >
//                 <Plus className="size-4 mr-2" /> New Chat
//               </Button>
//             </div>

//             {/* Chat list */}
//             <div className="flex-1 overflow-y-auto px-4 py-2">
//               {loading && (
//                 <div className="space-y-2">
//                   {[...Array(5)].map((_, i) => (
//                     <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-lg" />
//                   ))}
//                 </div>
//               )}
//               {error && <p className="text-red-500 text-sm">{error}</p>}
//               {!loading && !error && (
//                 <>
//                   <div className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-2">
//                     <History className="size-4" />
//                     Recent Chats
//                   </div>
//                   {chats.map((chat) => (
//                     <Link
//                       key={chat.id}
//                       href={`/chat/${chat.id}` as any}
//                       className={`block p-3 rounded-lg mb-1 transition-colors ${
//                         currentChatId === chat.id
//                           ? "bg-purple-50 border border-purple-200"
//                           : "hover:bg-gray-100"
//                       }`}
//                     >
//                       <div className="font-medium text-sm truncate">{chat.title || "New Chat"}</div>
//                       <div className="text-xs text-gray-500">
//                         {new Date(chat.updatedAt).toLocaleDateString()}
//                       </div>
//                     </Link>
//                   ))}
//                 </>
//               )}
//             </div>

//             {/* User profile stub */}
//             <div className="p-4 border-t">
//               <Link href="/">
//                 <Button variant="outline" size="sm" className="w-full">
//                   ← Home
//                 </Button>
//               </Link>
//             </div>
//           </motion.aside>
//         )}
//       </AnimatePresence>
//     </>
//   );
// }
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus, History, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatContext } from "@/context/chatContext";

interface Chat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export function ChatSidebar({ userId }: { userId: string }) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const router = useRouter();
  const params = useParams();
  const currentChatId = params?.chatId as string | undefined;
  const { sidebarRefreshKey } = useChatContext();

  const fetchChats = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/chats");
      if (!res.ok) throw new Error("Failed to load chats");
      const data = await res.json();
      setChats(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, [sidebarRefreshKey]);

  useEffect(() => {
    if (currentChatId) fetchChats();
  }, [currentChatId]);

  const handleNewChat = async () => {
    if (currentChatId) {
      const currentChat = chats.find((c) => c.id === currentChatId);
      if (currentChat && currentChat.messageCount === 0) {
        router.push(`/chat/${currentChatId}`);
        return;
      }
    }

    const res = await fetch("/api/chats", { method: "POST" });
    if (res.ok) {
      const newChat = await res.json();
      setChats((prev) => [newChat, ...prev]);
      router.push(`/chat/${newChat.id}`);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setSidebarOpen(true)}
      >
        <Menu className="size-5" />
      </Button>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ duration: 0.3 }}
            className="w-80 bg-white border-r flex flex-col h-full z-40 md:relative fixed inset-y-0 left-0"
          >
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="size-6 text-purple-600" />
                <span className="font-bold text-lg bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  ShopGenie
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="size-5" />
              </Button>
            </div>

            <div className="p-4">
              <Button
                onClick={handleNewChat}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600"
              >
                <Plus className="size-4 mr-2" /> New Chat
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-2">
              {loading && (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-lg" />
                  ))}
                </div>
              )}
              {error && <p className="text-red-500 text-sm">{error}</p>}
              {!loading && !error && (
                <>
                  <div className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-2">
                    <History className="size-4" />
                    Recent Chats
                  </div>
                  {chats.map((chat) => (
                    <Link
                      key={chat.id}
                      href={`/chat/${chat.id}`}
                      className={`block p-3 rounded-lg mb-1 transition-colors ${
                        currentChatId === chat.id
                          ? "bg-purple-50 border border-purple-200"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      <div className="font-medium text-sm truncate">{chat.title || "New Chat"}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(chat.updatedAt).toLocaleDateString()}
                      </div>
                    </Link>
                  ))}
                </>
              )}
            </div>

            <div className="p-4 border-t">
              <Link href="/">
                <Button variant="outline" size="sm" className="w-full">
                  ← Home
                </Button>
              </Link>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}