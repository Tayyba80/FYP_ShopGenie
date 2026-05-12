"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  TrendingUp,
  DollarSign,
  Star,
  ShoppingCart,
  Send,
} from "lucide-react";

const suggestions = [
  { icon: TrendingUp, label: "Trending Products", query: "trending electronics" },
  { icon: DollarSign, label: "Best Deals", query: "best deals under $50" },
  { icon: Star, label: "Top Rated", query: "top rated laptops" },
  { icon: ShoppingCart, label: "Categories", query: "wireless headphones" },
];

export default function WelcomePage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreateChat = async (query: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/chats", { method: "POST" });
      if (!res.ok) throw new Error("Failed to create chat");
      const chat = await res.json();
      router.push(`/chat/${chat.id}?initial=${encodeURIComponent(query)}`);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    handleCreateChat(trimmed);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="flex flex-col h-full items-center justify-center px-4 py-12 bg-gradient-to-b from-purple-50/50 to-white"
    >
      {/* Top branding */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center max-w-2xl"
      >
        <div className="flex items-center justify-center gap-3 mb-6">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="size-10 text-purple-600" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            ShopGenie
          </h1>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
          Find the Best Products, Instantly
        </h2>
        <p className="text-gray-500 text-base md:text-lg">
          I compare thousands of products across 100+ stores to find the perfect
          match for your needs and budget.
        </p>
      </motion.div>

      {/* Suggestion cards */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl w-full mt-10"
      >
        {suggestions.map((item, idx) => (
          <button
            key={idx}
            onClick={() => handleCreateChat(item.query)}
            disabled={loading}
            className="group p-4 bg-white border rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col items-center gap-3 hover:-translate-y-1 hover:border-purple-200"
          >
            <div className="p-2 bg-purple-100 rounded-full group-hover:bg-purple-200 transition-colors">
              <item.icon className="size-6 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-gray-700 text-center">
              {item.label}
            </span>
          </button>
        ))}
      </motion.div>

      {/* Input bar at bottom */}
      <div className="mt-12 w-full max-w-2xl">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <Input
            placeholder="Ask me to compare any product..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1 py-6 px-4 text-base rounded-2xl border-gray-200 shadow-sm focus:ring-2 focus:ring-purple-500"
          />
          <Button
            type="submit"
            disabled={!input.trim() || loading}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-6 rounded-2xl"
            size="lg"
          >
            <Send className="size-5" />
          </Button>
        </form>
        <p className="text-center text-xs text-gray-400 mt-3">
          ShopGenie aggregates data from Amazon, eBay, Walmart, and 100+ retailers
        </p>
      </div>
    </motion.div>
  );
}