import re

with open('src/views/DeliveryTracking.tsx', 'r') as f:
    content = f.read()

# We can replace the exact lines by matching:
target = """                 {/* Preuve de livraison */}
                 {delivery.proofImage && (
                    <div className="bg-slate-50/80 rounded-3xl p-5 mb-6 border border-slate-100 shadow-inner">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-indigo-600" /> Photo Preuve de Livraison
                       </p>
                       <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white max-h-72 flex justify-center items-center">
                          <img 
                             src={getCleanProofImage(delivery.proofImage)} 
                             alt="Preuve de livraison" 
                             className="max-w-full max-h-72 object-contain"
                             referrerPolicy="no-referrer"
                          />
                       </div>
                    </div>
                 )}"""

replacement = """                 {/* Preuves de Récupération et de Livraison */}
                 {(delivery.pickupProofImage || delivery.deliveryProofImage || delivery.proofImage) && (
                    <div className="space-y-4 mb-6 font-sans">
                       {/* Preuve de récupération */}
                       {delivery.pickupProofImage && (
                          <div className="bg-slate-50/80 rounded-3xl p-5 border border-slate-100 shadow-inner">
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5">
                                <Camera className="w-3.5 h-3.5 text-emerald-600" /> Photo Preuve de Récupération
                             </p>
                             <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white max-h-72 flex justify-center items-center">
                                <img 
                                   src={getCleanProofImage(delivery.pickupProofImage)} 
                                   alt="Preuve de récupération" 
                                   className="max-w-full max-h-72 object-contain"
                                   referrerPolicy="no-referrer"
                                />
                             </div>
                          </div>
                       )}

                       {/* Preuve de livraison */}
                       {(delivery.deliveryProofImage || (!delivery.pickupProofImage && delivery.proofImage)) && (
                          <div className="bg-slate-50/80 rounded-3xl p-5 border border-slate-100 shadow-inner">
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5">
                                <Camera className="w-3.5 h-3.5 text-indigo-600" /> Photo Preuve de Livraison
                             </p>
                             <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white max-h-72 flex justify-center items-center">
                                <img 
                                   src={getCleanProofImage(delivery.deliveryProofImage || delivery.proofImage)} 
                                   alt="Preuve de livraison" 
                                   className="max-w-full max-h-72 object-contain"
                                   referrerPolicy="no-referrer"
                                />
                             </div>
                          </div>
                       )}
                    </div>
                 )}"""

# Normalize all spacing to make matching 100% robust
def normalize(s):
    return re.sub(r'\s+', ' ', s.strip())

norm_content = normalize(content)
norm_target = normalize(target)

if norm_target in norm_content:
    # Let's find target string precisely
    # Since we converted \r in previous command, it should match directly with simple replace
    if target in content:
        content = content.replace(target, replacement)
        print("REPLACED EXACT MATCH")
    else:
        # Fallback to replacing using a regex or simple split/joins
        start_idx = content.find("{/* Preuve de livraison */}")
        if start_idx != -1:
            # find next ")}" after start_idx
            end_idx = content.find(")}", start_idx) + 2
            content = content[:start_idx] + "{/* Preuves de Récupération et de Livraison */}" + replacement[replacement.find("{(delivery.pickupProofImage"):] + content[end_idx:]
            print("REPLACED BY DELIMITER")
        else:
            print("ERROR: marker not found")
            
    with open('src/views/DeliveryTracking.tsx', 'w') as f:
        f.write(content)
else:
    print("ERROR: Target normalization failed to find match")
