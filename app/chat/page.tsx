"use client";

import { motion } from "motion/react";
import Link from "next/link";
import {
  Sparkles,
  Send,
  History,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Star,
  Menu,
  X,
} from "lucide-react";
import { Button } from "../../src/app/components/ui/button";
import { Input } from "../../src/app/components/ui/input";
import { useState } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatHistory {
  id: string;
  title: string;
  date: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I'm ShopGenie, your AI shopping assistant. Tell me what product you're looking for and I'll help you find the best option across all major retailers!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const chatHistory: ChatHistory[] = [
    { id: "1", title: "Best wireless headphones", date: "Today" },
    { id: "2", title: "Gaming laptop comparison", date: "Yesterday" },
    { id: "3", title: "Kitchen mixer reviews", date: "Mar 12" },
    { id: "4", title: "Running shoes under $100", date: "Mar 10" },
    { id: "5", title: "4K TV 55 inch", date: "Mar 8" },
  ];

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages([...messages, userMessage]);
    setInput("");

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I'm analyzing ${input} across all major retailers. Here are my top recommendations:\n\n🏆 **Best Overall**: Product A - $299\n- 4.8★ rating (2,450 reviews)\n- Free shipping\n- Available on Amazon\n\n💰 **Best Value**: Product B - $199\n- 4.5★ rating (1,200 reviews)\n- 20% off today\n- Available on Walmart\n\n⭐ **Premium Choice**: Product C - $449\n- 4.9★ rating (850 reviews)\n- Extended warranty included\n- Available on Best Buy`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 1000);
  };

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: sidebarOpen ? 0 : -300 }}
        transition={{ duration: 0.3 }}
        className={`w-80 bg-white border-r flex flex-col h-full z-20 ${
          sidebarOpen ? "absolute md:relative" : "hidden"
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="size-6 text-purple-600" />
            </motion.div>
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

        {/* New Chat Button */}
        <div className="p-4">
          <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600">
            + New Chat
          </Button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto px-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-2">
              <History className="size-4" />
              Recent Chats
            </div>
            {chatHistory.map((chat, index) => (
              <motion.button
                key={chat.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02, x: 4 }}
                className="w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="font-medium text-sm truncate">{chat.title}</div>
                <div className="text-xs text-gray-500">{chat.date}</div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold">
              JD
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">John Doe</div>
              <div className="text-xs text-gray-500">Premium Member</div>
            </div>
          </div>
          <div className="mt-3">
            <Link href="/">
              <Button variant="outline" size="sm" className="w-full">
                ← Home
              </Button>
            </Link>
          </div>
        </div>
      </motion.aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <motion.header
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white border-b p-4 flex items-center gap-4 flex-shrink-0"
        >
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg">AI Shopping Assistant</h1>
            <p className="text-sm text-gray-500">
              Compare products from 100+ retailers instantly
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <ShoppingCart className="size-4 mr-2" />
              Cart (0)
            </Button>
          </div>
        </motion.header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex gap-4 ${
                  message.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === "assistant"
                      ? "bg-gradient-to-br from-purple-100 to-blue-100"
                      : "bg-gradient-to-br from-gray-100 to-gray-200"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <Sparkles className="size-5 text-purple-600" />
                  ) : (
                    <span className="text-sm font-bold text-gray-600">You</span>
                  )}
                </div>

                {/* Message Content */}
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  className={`flex-1 max-w-2xl ${
                    message.role === "user" ? "flex justify-end" : ""
                  }`}
                >
                  <div
                    className={`p-4 rounded-2xl ${
                      message.role === "assistant"
                        ? "bg-white border shadow-sm"
                        : "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </div>
                  <div className="text-xs text-gray-400 mt-1 px-2">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </motion.div>
              </motion.div>
            ))}

            {/* Quick Actions */}
            {messages.length === 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4"
              >
                {[
                  { icon: TrendingUp, label: "Trending Products" },
                  { icon: DollarSign, label: "Best Deals" },
                  { icon: Star, label: "Top Rated" },
                  { icon: ShoppingCart, label: "Categories" },
                ].map((action, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-4 bg-white border rounded-xl hover:shadow-md transition-shadow flex flex-col items-center gap-2"
                  >
                    <action.icon className="size-6 text-purple-600" />
                    <span className="text-sm font-medium">{action.label}</span>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="border-t bg-white p-4 flex-shrink-0"
        >
          <div className="max-w-4xl mx-auto flex gap-3">
            <Input
              placeholder="Ask me to compare any product..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              className="flex-1 py-6 px-4 text-base"
            />
            <Button
              onClick={handleSend}
              className="bg-gradient-to-r from-purple-600 to-blue-600 px-6"
              size="lg"
            >
              <Send className="size-5" />
            </Button>
          </div>
          <div className="max-w-4xl mx-auto mt-2 text-xs text-gray-400 text-center">
            ShopGenie aggregates data from Amazon, eBay, Walmart, and 100+ retailers
          </div>
        </motion.div>
      </div>
    </div>
  );
}
