'use client';
import { useState, useRef, useEffect } from 'react';
import { Send, Mic, User, Bot } from 'lucide-react';
import { ChatResponse } from '../types';

interface ChatHistoryItem {
  type: 'user' | 'bot';
  content: string;
  data?: ChatResponse;
}

interface ChatInterfaceProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  chatHistory: ChatHistoryItem[];
}

const SAMPLE_PROMPTS: string[] = [
  "I need wireless earbuds under 5000 rupees",
  "Show me smartphones with good camera under 30000",
  "Looking for laptop bags with waterproof feature",
  "Best running shoes for men with cushioning",
  "Wireless mouse for office use with silent clicks"
];

export default function ChatInterface({ onSendMessage, isLoading, chatHistory }: ChatInterfaceProps) {
  const [message, setMessage] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handlePromptClick = (prompt: string): void => {
    onSendMessage(prompt);
  };

  const handleKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl h-[600px] flex flex-col">
      {/* Chat Header */}
      <div className="border-b border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900">ShopGenie</h2>
        <p className="text-gray-600 mt-1">Ask me anything about products!</p>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {chatHistory.length === 0 && (
          <div className="text-center text-gray-500 my-8">
            <Bot size={48} className="mx-auto mb-4 text-gray-400" />
            <p>Hi! I'm here to help you find the best products.</p>
            <p>Try one of the sample queries below or ask your own question!</p>
          </div>
        )}
        
        {chatHistory.map((item, index) => (
          <div
            key={index}
            className={`flex gap-3 ${item.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {item.type === 'bot' && (
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot size={18} className="text-white" />
              </div>
            )}
            
            <div
              className={`max-w-[80%] rounded-2xl p-4 ${
                item.type === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-gray-100 text-gray-900 rounded-bl-none'
              }`}
            >
              <p className="whitespace-pre-wrap">{item.content}</p>
            </div>
            
            {item.type === 'user' && (
              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                <User size={18} className="text-white" />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <Bot size={18} className="text-white" />
            </div>
            <div className="bg-gray-100 text-gray-900 rounded-2xl rounded-bl-none p-4">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Sample Prompts */}
      {chatHistory.length === 0 && (
        <div className="px-6 pb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Try these sample queries:
          </h3>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_PROMPTS.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handlePromptClick(prompt)}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100 transition-colors disabled:opacity-50 border border-blue-200"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={message}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your product query here..."
              disabled={isLoading}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 pr-24"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
              <button
                type="button"
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Voice input (coming soon)"
              >
                <Mic size={20} />
              </button>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={!message.trim() || isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-semibold"
          >
            <Send size={18} />
            Send
          </button>
        </form>
      </div>
    </div>
  );
}