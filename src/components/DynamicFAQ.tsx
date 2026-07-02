import React, { useState } from 'react';
import { MessageSquare, X, Send, Bot, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function DynamicFAQ() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    { role: 'bot', text: 'Bonjour ! Comment puis-je vous aider avec notre service de livraison Faso Express ?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const getBaseUrl = () => {
    return localStorage.getItem('custom_api_base') || "http://41.78.54.60:3006/api";
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userMessage = query.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setQuery('');
    setIsLoading(true);

    try {
      const url = getBaseUrl().replace('/api', '/api/faq');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMessage })
      });
      const data = await response.json();
      
      if (response.ok && data.answer) {
        setMessages(prev => [...prev, { role: 'bot', text: data.answer }]);
      } else {
        setMessages(prev => [...prev, { role: 'bot', text: "Désolé, je ne peux pas répondre pour le moment." }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'bot', text: "Erreur de connexion. Veuillez réessayer." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 lg:bottom-24 z-[100] w-14 h-14 bg-indigo-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:bg-indigo-700 transition-colors"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 right-6 lg:right-6 lg:bottom-40 z-[100] w-[350px] max-w-[calc(100vw-48px)] h-[500px] max-h-[70vh] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-indigo-600 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-6 h-6" />
                <div>
                  <h3 className="font-black tracking-tight">Assistant Faso</h3>
                  <p className="text-[10px] text-indigo-200">En ligne</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto bg-slate-50 flex flex-col gap-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white text-slate-800 border border-slate-100 rounded-tl-sm shadow-sm'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white p-3 rounded-2xl rounded-tl-sm border border-slate-100 shadow-sm">
                    <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100">
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Posez votre question..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-4 pr-12 text-sm outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!query.trim() || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-600 disabled:text-slate-400"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
