"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface FollowupsProps {
  suggestions: string[];
  onSelect: (text: string) => void;
}

export function Followups({ suggestions, onSelect }: FollowupsProps) {
  if (!suggestions.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-4 animate-in fade-in duration-500">
      {suggestions.map((suggestion) => (
        <motion.button
          key={suggestion}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(suggestion)}
          className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
        >
          {suggestion}
          <ArrowRight className="size-3" />
        </motion.button>
      ))}
    </div>
  );
}