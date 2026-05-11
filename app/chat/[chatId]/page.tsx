// // app/chat/[chatId]/page.tsx
// "use client";

// import { useEffect, useState, useRef, useCallback } from "react";
// import { useParams, useSearchParams } from "next/navigation";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Sparkles, Send, ShoppingCart } from "lucide-react";
// import { motion } from "framer-motion";
// import { ProductCard } from "@/components/chat/product-card";
// import { Followups } from "@/components/chat/followups";
// import { ExplanationOutput } from "@/types/product";

// interface ChatMessage {
//   id: string;
//   role: "user" | "assistant";
//   content: string;
//   createdAt: string;
//   explanation?: ExplanationOutput;
// }

// export default function ChatPage() {
//   const params = useParams();
//   const chatId = params.chatId as string;
//   const searchParams = useSearchParams();
//   const initialQuery = searchParams.get("initial");

//   const [messages, setMessages] = useState<ChatMessage[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [sending, setSending] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [input, setInput] = useState("");
//   const messagesEndRef = useRef<HTMLDivElement>(null);
//   const inputRef = useRef<HTMLInputElement>(null);

//   // Fetch existing chat messages
//   useEffect(() => {
//     if (!chatId) return;
//     const fetchChat = async () => {
//       setLoading(true);
//       try {
//         const res = await fetch(`/api/chats/${chatId}`);
//         if (!res.ok) throw new Error("Chat not found");
//         const data = await res.json();
//         setMessages(data.messages as ChatMessage[]);
//       } catch (e: any) {
//         setError(e.message);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchChat();
//   }, [chatId]);

//   // Auto‑send initial message if arriving from welcome screen
//   useEffect(() => {
//     if (!initialQuery || !chatId || loading || messages.length > 0) return;

//     const sendInitialMessage = async () => {
//       setSending(true);
//       const userContent = initialQuery.trim();
//       const tempUserMsg: ChatMessage = {
//         id: `temp-${Date.now()}`,
//         role: "user",
//         content: userContent,
//         createdAt: new Date().toISOString(),
//       };
//       setMessages([tempUserMsg]);

//       try {
//         const res = await fetch(`/api/chats/${chatId}/messages`, {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ content: userContent }),
//         });
//         if (!res.ok) throw new Error("Failed");
//         const data = await res.json();
//         setMessages([
//           data.userMessage,
//           {
//             ...data.assistantMessage,
//             explanation: data.assistantMessage.explanation,
//           },
//         ]);
//         setInput("");
//       } catch (e) {
//         setError("Message failed to send. Please try again.");
//         setMessages([]);
//       } finally {
//         setSending(false);
//       }
//     };

//     sendInitialMessage();
//   }, [initialQuery, chatId, loading, messages.length]);

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages]);

//   const handleSend = useCallback(async () => {
//     if (!input.trim() || sending) return;
//     const userContent = input.trim();
//     setInput("");
//     setSending(true);

//     const tempUserMsg: ChatMessage = {
//       id: `temp-${Date.now()}`,
//       role: "user",
//       content: userContent,
//       createdAt: new Date().toISOString(),
//     };
//     setMessages((prev) => [...prev, tempUserMsg]);

//     try {
//       const res = await fetch(`/api/chats/${chatId}/messages`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ content: userContent }),
//       });
//       if (!res.ok) throw new Error("Failed to send message");
//       const data = await res.json();
//       setMessages((prev) => {
//         const withoutTemp = prev.filter((m) => m.id !== tempUserMsg.id);
//         return [
//           ...withoutTemp,
//           data.userMessage,
//           {
//             ...data.assistantMessage,
//             explanation: data.assistantMessage.explanation,
//           },
//         ];
//       });
//     } catch (e: any) {
//       setError("Message failed to send. Please try again.");
//       setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
//     } finally {
//       setSending(false);
//     }
//   }, [input, sending, chatId]);

//   const handleKeyDown = (e: React.KeyboardEvent) => {
//     if (e.key === "Enter" && !e.shiftKey) {
//       e.preventDefault();
//       handleSend();
//     }
//   };

//   return (
//     <div className="flex flex-col h-full">
//       {/* Header */}
//       <div className="bg-white border-b p-4 flex items-center gap-4 flex-shrink-0">
//         <div className="flex-1 min-w-0">
//           <h1 className="font-bold text-lg truncate">Chat</h1>
//           <p className="text-sm text-gray-500">Ask me about any product</p>
//         </div>
//         <ShoppingCart className="size-5 text-gray-400" />
//       </div>

//       {/* Messages */}
//       <div className="flex-1 overflow-y-auto p-6">
//         {loading && (
//           <div className="flex items-center justify-center h-full">
//             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
//           </div>
//         )}
//         {error && <div className="text-red-500 text-center p-4">{error}</div>}

//         {messages.map((msg) => (
//           <motion.div
//             key={msg.id}
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             className={`mb-8 ${msg.role === "user" ? "flex justify-end" : ""}`}
//           >
//             {msg.role === "user" ? (
//               <div className="max-w-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-2xl rounded-br-none">
//                 <p className="whitespace-pre-wrap">{msg.content}</p>
//               </div>
//             ) : (
//               <div className="max-w-4xl space-y-4">
//                 {msg.content && (
//                   <div className="bg-white border rounded-2xl rounded-bl-none p-4 shadow-sm">
//                     <p className="whitespace-pre-wrap">{msg.content}</p>
//                   </div>
//                 )}
//                 {msg.explanation?.productCards && msg.explanation.productCards.length > 0 && (
//                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
//                     {msg.explanation.productCards.map((card) => (
//                       <ProductCard key={card.productId} card={card} rank={card.rank} />
//                     ))}
//                   </div>
//                 )}
//                 {msg.explanation && msg.explanation.suggestedFollowups && msg.explanation.suggestedFollowups.length > 0 && (
//                   <Followups
//                     suggestions={msg.explanation.suggestedFollowups}
//                     onSelect={(q) => setInput(q)}
//                   />
//                 )}
//               </div>
//             )}
//           </motion.div>
//         ))}
//         <div ref={messagesEndRef} />
//       </div>

//       {/* Input area */}
//       <div className="border-t bg-white p-4 flex-shrink-0">
//         <div className="max-w-4xl mx-auto flex gap-3">
//           <Input
//             ref={inputRef}
//             placeholder="Ask me to compare any product..."
//             value={input}
//             onChange={(e) => setInput(e.target.value)}
//             onKeyDown={handleKeyDown}
//             disabled={sending}
//             className="flex-1 py-6 px-4 text-base"
//           />
//           <Button
//             onClick={() => handleSend()}
//             disabled={!input.trim() || sending}
//             className="bg-gradient-to-r from-purple-600 to-blue-600 px-6"
//             size="lg"
//           >
//             <Send className="size-5" />
//           </Button>
//         </div>
//       </div>
//     </div>
//   );
// }
// app/chat/[chatId]/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send } from "lucide-react";
import { motion } from "framer-motion";
import { ProductCard } from "@/components/chat/product-card";
import { Followups } from "@/components/chat/followups";
import { useChatContext } from "@/context/chatContext";
import type { ExplanationOutput } from "@/types/product";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  explanation?: ExplanationOutput;
}

export default function ChatPage() {
  const params = useParams();
  const chatId = params.chatId as string;
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("initial");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [chatTitle, setChatTitle] = useState("Chat");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialMessageSent = useRef(false);
  const isEmptyRef = useRef(false);

  const { triggerSidebarRefresh } = useChatContext();

  // Fetch chat
  useEffect(() => {
    if (!chatId) return;
    const fetchChat = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/chats/${chatId}`);
        if (!res.ok) throw new Error("Chat not found");
        const data = await res.json();
        setMessages(data.messages as ChatMessage[]);
        setChatTitle(data.title || "Chat");
        isEmptyRef.current = data.messages.length === 0;
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchChat();
  }, [chatId]);

  // Delete empty chat on unmount
  useEffect(() => {
    return () => {
      if (isEmptyRef.current && chatId) {
        fetch(`/api/chats/${chatId}`, { method: "DELETE" }).catch(() => {});
      }
    };
  }, [chatId]);

  // Auto‑send initial query
  useEffect(() => {
    if (
      !initialQuery ||
      !chatId ||
      loading ||
      initialMessageSent.current ||
      messages.length > 0
    )
      return;

    initialMessageSent.current = true;

    const sendInitialMessage = async () => {
      setSending(true);
      const userContent = initialQuery.trim();
      const tempUserMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: "user",
        content: userContent,
        createdAt: new Date().toISOString(),
      };
      setMessages([tempUserMsg]);

      try {
        const res = await fetch(`/api/chats/${chatId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: userContent }),
        });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setMessages([
          data.userMessage,
          {
            ...data.assistantMessage,
            explanation: data.assistantMessage.explanation,
          },
        ]);
        setInput("");
        triggerSidebarRefresh();       // Refresh sidebar title after first message
        isEmptyRef.current = false;    // No longer empty
      } catch (e: any) {
        setError("Message failed. Please try again.");
        setMessages([]);
        initialMessageSent.current = false;
      } finally {
        setSending(false);
      }
    };

    sendInitialMessage();
  }, [initialQuery, chatId, loading, messages.length, triggerSidebarRefresh]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || sending) return;
    const userContent = input.trim();
    setInput("");
    setSending(true);

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userContent,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetch(`/api/chats/${chatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userContent }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      const data = await res.json();
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempUserMsg.id);
        return [
          ...withoutTemp,
          data.userMessage,
          {
            ...data.assistantMessage,
            explanation: data.assistantMessage.explanation,
          },
        ];
      });
      triggerSidebarRefresh();          // Refresh after any message
      isEmptyRef.current = false;
    } catch (e: any) {
      setError("Message failed to send. Please try again.");
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setSending(false);
    }
  }, [input, sending, chatId, triggerSidebarRefresh]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white border-b p-4 flex items-center gap-3 flex-shrink-0 shadow-sm"
      >
        <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-100 to-blue-100">
          <Sparkles className="size-5 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-lg bg-gradient-to-r from-purple-700 to-blue-700 bg-clip-text text-transparent truncate">
            {chatTitle}
          </h1>
          <p className="text-xs text-gray-500">Product recommendation chat</p>
        </div>
      </motion.header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        )}
        {error && <div className="text-red-500 text-center p-4">{error}</div>}

        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-8 ${msg.role === "user" ? "flex justify-end" : ""}`}
          >
            {msg.role === "user" ? (
              <div className="max-w-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-2xl rounded-br-none shadow">
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            ) : (
              <div className="max-w-4xl space-y-4">
                {msg.content && (
                  <div className="bg-white border rounded-2xl rounded-bl-none p-4 shadow-sm">
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                )}
                {msg.explanation?.productCards && msg.explanation.productCards.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                    {msg.explanation.productCards.map((card) => (
                      <ProductCard key={card.productId} card={card} rank={card.rank} />
                    ))}
                  </div>
                )}
                {msg.explanation && msg.explanation.suggestedFollowups && msg.explanation.suggestedFollowups.length > 0 && (
                  <Followups
                    suggestions={msg.explanation.suggestedFollowups}
                    onSelect={(q) => setInput(q)}
                  />
                )}
              </div>
            )}
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="border-t bg-white p-4 flex-shrink-0"
      >
        <div className="max-w-4xl mx-auto flex gap-3">
          <Input
            ref={inputRef}
            placeholder="Ask me to compare any product..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            className="flex-1 py-6 px-4 text-base rounded-2xl border-gray-200 focus:ring-2 focus:ring-purple-500"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 rounded-2xl shadow-lg shadow-purple-200"
            size="lg"
          >
            <Send className="size-5" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}