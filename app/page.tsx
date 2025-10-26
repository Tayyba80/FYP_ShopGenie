'use client';
import { useState } from 'react';
import ChatInterface from './components/ChatInterface';
import ResultDisplay from './components/ResultsDisplay';
import { ChatResponse } from '@/app/types';

export default function Home() {
  const [results, setResults] = useState<ChatResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<Array<{type: 'user' | 'bot', content: string, data?: ChatResponse}>>([]);

  const handleUserQuery = async (userMessage: string): Promise<void> => {
    setIsLoading(true);
    
    // Add user message to chat history
    setChatHistory(prev => [...prev, { type: 'user', content: userMessage }]);
    console.log('User Message:', userMessage);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: ChatResponse = await response.json();
      setResults(data);
      
      // Add bot response to chat history
      setChatHistory(prev => [...prev, { 
        type: 'bot', 
        content: `Found ${data.totalResults} products for "${data.originalQuery}"`,
        data 
      }]);
    } catch (error) {
      console.error('Error:', error);
      setChatHistory(prev => [...prev, { 
        type: 'bot', 
        content: 'Sorry, I encountered an error while processing your request.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            ShopAssist
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your AI-powered shopping assistant that finds the best products across multiple platforms
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chat Section */}
          <div className="lg:col-span-2">
            <ChatInterface 
              onSendMessage={handleUserQuery} 
              isLoading={isLoading}
              chatHistory={chatHistory}
            />
          </div>
          
          {/* Results Section */}
          <div className="lg:col-span-1">
            {results && (
              <ResultDisplay results={results} />
            )}
            
            {/* Features Overview */}
            {!results && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  How It Works
                </h3>
                <div className="space-y-3">
                  {[
                    'Tell me what you need',
                    'I search multiple stores',
                    'Get ranked results with explanations',
                    'Find your perfect product!'
                  ].map((step, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <span className="text-gray-700">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}