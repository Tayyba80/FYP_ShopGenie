"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signOut, useSession } from "next-auth/react";
import {
  Sparkles,
  Plus,
  History,
  Menu,
  X,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatContext } from "@/context/chatContext";

interface Chat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function ChatSidebar({ user: initialUser }: SidebarProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [chatMenuOpenId, setChatMenuOpenId] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const chatMenuRef = useRef<{ [id: string]: HTMLDivElement | null }>({});

  const router = useRouter();
  const params = useParams();
  const currentChatId = params?.chatId as string | undefined;
  const { sidebarRefreshKey, triggerSidebarRefresh } = useChatContext();
  const { data: session } = useSession();

  // Use session user if available, otherwise fall back to the prop (e.g., SSR)
  const user = session?.user || initialUser;

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

  // Close both menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
      // Chat menu: close if target is not inside the corresponding menu
      if (chatMenuOpenId) {
        const ref = chatMenuRef.current[chatMenuOpenId];
        if (ref && !ref.contains(event.target as Node)) {
          setChatMenuOpenId(null);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [chatMenuOpenId]);

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

  const handleProfileSettings = () => {
    router.push("/profile");
    setProfileMenuOpen(false);
  };

  const handleLogout = () => {
    setProfileMenuOpen(false);
    signOut({ callbackUrl: "/login" });
  };

  const handleDeleteChat = async (chatId: string) => {
    setChatMenuOpenId(null);
    try {
      const res = await fetch(`/api/chats/${chatId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete chat");
      // Remove from local state
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      // If the deleted chat is currently active, navigate to welcome page
      if (currentChatId === chatId) {
        router.push("/chat");
      }
    } catch (e) {
      console.error("Delete chat error:", e);
    }
  };

  const userInitial =
    user.name?.charAt(0).toUpperCase() ||
    user.email?.charAt(0).toUpperCase() ||
    "U";

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
            {/* Header */}
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

            {/* New Chat */}
            <div className="p-4">
              <Button
                onClick={handleNewChat}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600"
              >
                <Plus className="size-4 mr-2" /> New Chat
              </Button>
            </div>

            {/* Chat List */}
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
                    <div
                      key={chat.id}
                      className={`relative group rounded-lg mb-1 transition-colors ${
                        currentChatId === chat.id
                          ? "bg-purple-50 border border-purple-200"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      <Link
                        href={`/chat/${chat.id}`}
                        className="block p-3 pr-10" // extra padding for the button
                      >
                        <div className="font-medium text-sm truncate">
                          {chat.title || "New Chat"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(chat.updatedAt).toLocaleDateString()}
                        </div>
                      </Link>
                      {/* Three‑dot button for chat deletion */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setChatMenuOpenId(
                            chat.id === chatMenuOpenId ? null : chat.id
                          );
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="size-4 text-gray-500" />
                      </button>

                      {/* Dropdown for this chat */}
                      {chatMenuOpenId === chat.id && (
                        <div
                          ref={(el) => {
                            chatMenuRef.current[chat.id] = el;
                          }}
                          className="absolute right-2 top-10 bg-white border rounded-lg shadow-lg py-1 z-50 min-w-[100px]"
                        >
                          <button
                            onClick={() => handleDeleteChat(chat.id)}
                            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* User Profile */}
            <div className="p-4 border-t relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                  {user.image ? (
                    <img
                      src={user.image}
                      alt="avatar"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    userInitial
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {user.name || "User"}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {user.email}
                  </div>
                </div>
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <MoreHorizontal className="size-5 text-gray-500" />
                </button>
              </div>

              {/* Profile Dropdown */}
              {profileMenuOpen && (
                <div
                  ref={menuRef}
                  className="absolute bottom-full left-4 right-4 mb-2 bg-white border rounded-lg shadow-lg py-1 z-50"
                >
                  <button
                    onClick={handleProfileSettings}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <svg
                      className="size-4 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    Profile Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <svg
                      className="size-4 text-red-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}