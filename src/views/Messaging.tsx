import React, { useState, useEffect } from 'react';
import { api } from '../services/apiService';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, ArrowRight, ArrowLeft, Headphones, Sparkles, MessageCircle } from 'lucide-react';
import { Chat } from '../components/Chat';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function Messaging() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChatDeliveryId, setSelectedChatDeliveryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchChats = async () => {
    if (!profile) return;
    try {
      const jobs = await api.deliveries.list();
      const supportChats = jobs.filter((d: any) => 
        d.pickupCode === 'SUPPORT' && 
        (d.clientId === profile.userId || d.driverId === profile.userId)
      );
      setChats(supportChats);
    } catch (e) {
      console.error("Error fetching support chats", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
    const interval = setInterval(fetchChats, 8000);
    return () => clearInterval(interval);
  }, [profile]);

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 pt-12 pb-8 px-6 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
           <button onClick={() => navigate(-1)} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 active:scale-90 transition-all border border-slate-100 shadow-sm">
             <ArrowLeft className="w-5 h-5" />
           </button>
           <div>
             <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Support.</h1>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Assistance directe Faso Express</p>
           </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto py-8 px-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
             <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
             <p className="text-[10px] font-black uppercase tracking-widest">Recherche des chats...</p>
          </div>
        ) : chats.length === 0 ? (
          <div className="bg-white rounded-[40px] p-12 text-center shadow-xl shadow-slate-200/50 border border-slate-100 border-dashed">
            <div className="w-20 h-20 bg-indigo-50 rounded-[30px] flex items-center justify-center mx-auto mb-6">
              <Headphones className="w-10 h-10 text-indigo-400 animate-pulse" />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Besoin d'aide ?</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed mb-8 max-w-[200px] mx-auto">
              Nos agents sont là pour vous accompagner en cas de problème.
            </p>
            <button className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-200 active:scale-95 transition-all flex items-center gap-2 mx-auto">
               <Sparkles className="w-4 h-4 text-orange-400" /> Contacter le Support
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2 mb-2">
               <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Discussions en cours ({chats.length})</h2>
            </div>
            {chats.map((chat) => (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={chat.id}
                onClick={() => setSelectedChatDeliveryId(chat.id)}
                className="w-full flex items-center justify-between p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:scale-[1.01] hover:border-indigo-100 transition-all group text-left"
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center relative shadow-inner">
                    <MessageCircle className="w-7 h-7" />
                    {chat.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-white animate-bounce" />
                    )}
                  </div>
                  <div>
                    <p className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none mb-1">Support Client</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-lg uppercase tracking-widest">En ligne</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Course #{chat.id.slice(-6)}</span>
                    </div>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                   <ArrowRight className="w-5 h-5" />
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedChatDeliveryId && (
          <Chat
            deliveryId={selectedChatDeliveryId}
            currentUser={profile}
            isOpen={true}
            onClose={() => setSelectedChatDeliveryId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
