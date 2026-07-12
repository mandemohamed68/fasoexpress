import re

with open('src/views/Messaging.tsx', 'r') as f:
    content = f.read()

target = '''            <button className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-200 active:scale-95 transition-all flex items-center gap-2 mx-auto">
               <Sparkles className="w-4 h-4 text-orange-400" /> Contacter le Support
            </button>'''

replacement = '''            <button 
              onClick={async () => {
                setLoading(true);
                try {
                  const newChat = await api.deliveries.create({
                    pickupAddress: "SUPPORT",
                    deliveryAddress: "SUPPORT",
                    clientName: profile.name,
                    clientPhone: profile.phone,
                    packageType: "SUPPORT",
                    pickupCode: "SUPPORT",
                    status: 'pending'
                  });
                  await fetchChats();
                  if (newChat && newChat.id) {
                    setSelectedChatDeliveryId(newChat.id);
                  }
                } catch (e) {
                  console.error(e);
                } finally {
                  setLoading(false);
                }
              }}
              className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-200 active:scale-95 transition-all flex items-center gap-2 mx-auto"
            >
               <Sparkles className="w-4 h-4 text-orange-400" /> Contacter le Support
            </button>'''

if target in content:
    content = content.replace(target, replacement)
    with open('src/views/Messaging.tsx', 'w') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("TARGET NOT FOUND")
