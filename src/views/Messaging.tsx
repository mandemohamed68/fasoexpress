import React, { useState, useEffect } from 'react';
import { api } from '../services/apiService';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, ArrowRight, Package } from 'lucide-react';
import { Chat } from '../components/Chat';

export default function Messaging() {
  const { profile } = useAuth();
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChatDeliveryId, setSelectedChatDeliveryId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    const fetchChats = async () => {
      try {
        const jobs = await api.deliveries.list();
        const supportChats = jobs.filter((d: any) => 
          d.pickupCode === 'SUPPORT' && 
          (d.clientId === profile.userId || d.driverId === profile.userId)
        );
        setChats(supportChats);
      } catch (e) {
        console.error("Error fetching support chats", e);
      }
    };
    fetchChats();
  }, [profile]);

  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-black text-slate-950 tracking-tighter uppercase mb-8">Messagerie</h1>
      <div className="space-y-4">
        {chats.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucune discussion de support pour le moment.</p>
          </div>
        ) : (
          chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setSelectedChatDeliveryId(chat.id)}
              className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-200 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <p className="font-black text-slate-900 uppercase tracking-tight">Support Faso Express</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Course #{chat.id.slice(-6)}</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300" />
            </button>
          ))
        )}
      </div>

      {selectedChatDeliveryId && (
        <Chat
          deliveryId={selectedChatDeliveryId}
          currentUser={profile}
          isOpen={true}
          onClose={() => setSelectedChatDeliveryId(null)}
        />
      )}
    </div>
  );
}
