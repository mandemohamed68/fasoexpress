import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronDown, ShieldCheck, CreditCard, Truck, UserCheck, Search } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: FAQItem[];
}

export default function StaticFAQ() {
  const [activeCategory, setActiveCategory] = useState<string>('general');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const categories: FAQCategory[] = [
    {
      id: 'general',
      title: 'Général',
      icon: <HelpCircle className="w-5 h-5" />,
      items: [
        {
          question: "Qu'est-ce que FASO EXPRESS ?",
          answer: "FASO EXPRESS est la plateforme logistique de référence au Burkina Faso pour la mise en relation en temps réel entre expéditeurs (particuliers et entreprises) et livreurs professionnels indépendants ou flottes logistiques."
        },
        {
          question: "Dans quelles villes le service est-il disponible ?",
          answer: "Le service est pleinement opérationnel dans toute la ville de Ouagadougou et ses environs. Nous étendons progressivement nos activités à Bobo-Dioulasso, Koudougou et d'autres grandes agglomérations du Burkina Faso."
        },
        {
          question: "Quels types de colis puis-je faire livrer ?",
          answer: "Vous pouvez faire livrer tout pli, colis, repas, marchandise ou document respectant les lois en vigueur. Le poids et le volume doivent être compatibles avec le véhicule choisi (moto, tricycle, ou camion)."
        }
      ]
    },
    {
      id: 'client',
      title: 'Espace Client',
      icon: <UserCheck className="w-5 h-5" />,
      items: [
        {
          question: "Comment créer une demande de livraison ?",
          answer: "Rendez-vous sur votre tableau de bord, cliquez sur 'Nouvelle Livraison'. Indiquez les adresses précises de départ et d'arrivée, les coordonnées des personnes de contact, la description du colis, le type de véhicule requis, puis procédez au paiement pour valider la commande."
        },
        {
          question: "Comment puis-je suivre mon colis en temps réel ?",
          answer: "Dès que le livreur accepte la course, vous pouvez suivre sa position géographique exacte sur la carte interactive depuis l'onglet 'Mes Courses'. Des notifications instantanées vous informent également de chaque changement d'étape (Ramassage, En cours, Livré)."
        },
        {
          question: "À quoi servent les codes de sécurité ?",
          answer: "Chaque livraison génère deux codes de sécurité uniques : le Code de Ramassage (à fournir au livreur lors de la prise du colis) et le Code de Livraison (à fournir au destinataire, qui le transmettra au livreur à l'arrivée). Ce système garantit que le colis est remis aux bonnes personnes."
        }
      ]
    },
    {
      id: 'driver',
      title: 'Espace Livreur',
      icon: <Truck className="w-5 h-5" />,
      items: [
        {
          question: "Comment devenir partenaire livreur ?",
          answer: "Inscrivez-vous sur l'application en sélectionnant le rôle 'Livreur'. Vous devez soumettre vos documents d'identité, permis de conduire et justificatifs de votre véhicule (carte grise, assurance). Une fois votre dossier validé par l'administration, vous pourrez vous connecter et commencer à recevoir des courses."
        },
        {
          question: "Comment suis-je rémunéré ?",
          answer: "Vos gains sont calculés en fonction de la distance réelle de la course, du poids du colis et du type de véhicule. Ils sont crédités sur votre portefeuille virtuel immédiatement après la validation du Code de Livraison final."
        },
        {
          question: "Puis-je gérer mes horaires de travail ?",
          answer: "Absolument. Vous êtes totalement indépendant. Activez le bouton 'Online' dans votre tableau de bord pour être visible et recevoir des demandes de courses. Désactivez-le ('Offline') à tout moment pour faire une pause."
        }
      ]
    },
    {
      id: 'payment',
      title: 'Paiements & Tarifs',
      icon: <CreditCard className="w-5 h-5" />,
      items: [
        {
          question: "Quels sont les moyens de paiement acceptés ?",
          answer: "Nous acceptons les principaux moyens de paiement mobiles locaux au Burkina Faso : Orange Money, Moov Money, Telecel Cash, ainsi que les cartes bancaires et virements via la passerelle sécurisée Coris/SapPay. Le paiement en espèces à la livraison est également pris en charge."
        },
        {
          question: "Comment les tarifs de livraison sont-ils calculés ?",
          answer: "Notre algorithme calcule un tarif transparent basé sur : une prise en charge de base par véhicule, un coût kilométrique (par exemple 150 F par km pour les motos), des frais supplémentaires selon le poids du colis, et une majoration optionnelle pour les livraisons urgentes (+500 F)."
        },
        {
          question: "Les transactions sont-elles sécurisées ?",
          answer: "Oui. Toutes les transactions numériques sont protégées par notre système de séquestre sécurisé. Les fonds ne sont débloqués et versés au livreur qu'une fois la livraison entièrement complétée et validée par le code de livraison."
        }
      ]
    }
  ];

  // Filter items based on search query
  const allFilteredItems = searchQuery.trim() === '' 
    ? categories.find(c => c.id === activeCategory)?.items || []
    : categories.flatMap(c => c.items).filter(
        item => 
          item.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
          item.answer.toLowerCase().includes(searchQuery.toLowerCase())
      );

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 lg:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">FAQ Complète FASO EXPRESS</h3>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
            Trouvez rapidement des réponses à toutes vos questions
          </p>
        </div>
        
        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher une question..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setExpandedIndex(null);
            }}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-orange-500 dark:focus:border-orange-500 transition-colors"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600"
            >
              Effacer
            </button>
          )}
        </div>
      </div>

      {searchQuery.trim() === '' && (
        /* Categories Selector */
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-4 mb-6">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setExpandedIndex(null);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                activeCategory === cat.id
                  ? 'bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-500/10'
                  : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {cat.icon}
              {cat.title}
            </button>
          ))}
        </div>
      )}

      {searchQuery.trim() !== '' && (
        <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-6">
          Résultats de recherche pour "{searchQuery}" ({allFilteredItems.length}) :
        </p>
      )}

      {/* Accordion Questions List */}
      <div className="space-y-3.5">
        {allFilteredItems.length > 0 ? (
          allFilteredItems.map((item, index) => {
            const isExpanded = expandedIndex === index;
            return (
              <div 
                key={index}
                className={`border rounded-2xl transition-all duration-300 ${
                  isExpanded 
                    ? 'border-orange-500/20 bg-orange-500/[0.01] shadow-sm' 
                    : 'border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700'
                }`}
              >
                <button
                  onClick={() => setExpandedIndex(isExpanded ? null : index)}
                  className="w-full flex items-center justify-between text-left p-4 sm:p-5 font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base cursor-pointer"
                >
                  <span className="pr-4 leading-tight">{item.question}</span>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 text-slate-500 shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-orange-600 border-orange-100' : ''}`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-5 sm:px-5 sm:pb-6 text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-50/50 dark:border-slate-850 pt-4">
                        {item.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 text-slate-400 dark:text-slate-600">
            <p className="text-sm font-bold uppercase tracking-wider">Aucune question trouvée</p>
            <p className="text-xs mt-1">Essayez de reformuler votre recherche.</p>
          </div>
        )}
      </div>
    </div>
  );
}
