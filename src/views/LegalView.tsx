import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  FileText, 
  ArrowLeft, 
  Lock, 
  Printer, 
  Share2, 
  Check, 
  Search, 
  Clock, 
  Sparkles, 
  Building2, 
  Phone, 
  Mail, 
  ExternalLink,
  ChevronRight,
  BookOpen,
  Award
} from 'lucide-react';
import Markdown from 'react-markdown';
import { CLIENT_TERMS, DRIVER_TERMS, PRIVACY_POLICY } from '../data/terms';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

export default function LegalView() {
  const location = useLocation();
  const navigate = useNavigate();
  const { appConfig } = useAuth();

  const getInitialTab = (): 'client_terms' | 'driver_terms' | 'privacy' => {
    const rawPath = decodeURIComponent(location.pathname).toLowerCase();
    if (rawPath.includes('politique') || rawPath.includes('privacy') || rawPath.includes('confidentialit')) {
      return 'privacy';
    }
    if (rawPath.includes('driver') || rawPath.includes('livreur')) {
      return 'driver_terms';
    }
    return 'client_terms';
  };

  const [activeTab, setActiveTab] = useState<'client_terms' | 'driver_terms' | 'privacy'>(getInitialTab);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setActiveTab(getInitialTab());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  const handleTabChange = (tab: 'client_terms' | 'driver_terms' | 'privacy') => {
    setActiveTab(tab);
    setSearchQuery('');
    const targetPath = tab === 'privacy' 
      ? '/Politique_de_Confidentialite' 
      : tab === 'driver_terms'
      ? '/Conditions_Generales'
      : '/Conditions_Generales';
    
    if (location.pathname !== targetPath) {
      navigate(targetPath, { replace: true });
    }
  };

  const handleCopyLink = () => {
    const baseUrl = 'https://fasoexpress.net';
    const linkPath = activeTab === 'privacy' ? '/Politique_de_Confidentialite' : '/Conditions_Generales';
    const fullUrl = `${baseUrl}${linkPath}`;
    
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const contentMap = {
    client_terms: CLIENT_TERMS,
    driver_terms: DRIVER_TERMS,
    privacy: PRIVACY_POLICY,
  };

  const rawText = contentMap[activeTab];

  // Simple search filter in text lines
  const filteredText = searchQuery.trim()
    ? rawText
        .split('\n')
        .filter(line => line.toLowerCase().includes(searchQuery.toLowerCase()) || line.startsWith('#'))
        .join('\n')
    : rawText;

  // Reading time estimate (approx 200 words per min)
  const wordCount = rawText.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-8 lg:p-12 pb-24 selection:bg-orange-500 selection:text-white transition-colors duration-200">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Navigation Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2.5 text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 transition-all font-bold text-xs uppercase tracking-wider group cursor-pointer bg-white dark:bg-slate-900 px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-orange-600" />
            <span>Retour à l'accueil</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCopyLink}
              title="Copier le lien direct"
              className="p-3 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:text-orange-600 dark:hover:text-orange-400 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-2 text-xs font-bold"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4 text-orange-600" />}
              <span>{copied ? "Lien copié (https://fasoexpress.net/...)" : "Copier le Lien"}</span>
            </button>

            <button
              onClick={handlePrint}
              title="Imprimer ou enregistrer en PDF"
              className="p-3 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:text-orange-600 dark:hover:text-orange-400 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-2 text-xs font-bold"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Imprimer / PDF</span>
            </button>
          </div>
        </div>

        {/* Hero Banner Header */}
        <header className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-slate-900/5 dark:bg-slate-100/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-orange-500/10 dark:bg-orange-500/20 border border-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0 shadow-inner">
                <ShieldCheck className="w-9 h-9" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/80 px-3 py-1 rounded-full border border-orange-200/60 dark:border-orange-800/60">
                    FASO EXPRESS OFFICIAL
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight italic">
                  Cadre Légal & <span className="text-orange-600 dark:text-orange-500">Confidentialité</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                  Transparence totale pour les Clients, Livreurs Partenaires et Commerçants.
                </p>
              </div>
            </div>

            {/* Corporate Box */}
            <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-4 w-full lg:w-auto shrink-0 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-slate-400 font-extrabold uppercase tracking-widest text-[9px]">
                <Building2 className="w-3.5 h-3.5 text-orange-500" />
                <span>ÉDITEUR OFFICIEL</span>
              </div>
              <p className="font-black text-slate-900 dark:text-white text-sm">
                {appConfig?.companyName || "SAPPAY TECHNOLOGIE"}
              </p>
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px] font-medium pt-1 border-t border-slate-200/60 dark:border-slate-700">
                <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-orange-500" /> +226 72 56 76 06</span>
              </div>
            </div>
          </div>

          {/* Interactive Selector Tabs */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleTabChange('client_terms')}
                className={cn(
                  "px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2.5 cursor-pointer border shadow-sm",
                  activeTab === 'client_terms'
                    ? "bg-slate-900 text-white dark:bg-orange-500 dark:text-white border-transparent shadow-md scale-[1.02]"
                    : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <FileText className="w-4 h-4 text-orange-500" />
                <span>CGU Client & Expéditeur</span>
              </button>

              <button
                onClick={() => handleTabChange('driver_terms')}
                className={cn(
                  "px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2.5 cursor-pointer border shadow-sm",
                  activeTab === 'driver_terms'
                    ? "bg-slate-900 text-white dark:bg-orange-500 dark:text-white border-transparent shadow-md scale-[1.02]"
                    : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <BookOpen className="w-4 h-4 text-orange-500" />
                <span>CGU Livreur Partenaire</span>
              </button>

              <button
                onClick={() => handleTabChange('privacy')}
                className={cn(
                  "px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2.5 cursor-pointer border shadow-sm",
                  activeTab === 'privacy'
                    ? "bg-slate-900 text-white dark:bg-orange-500 dark:text-white border-transparent shadow-md scale-[1.02]"
                    : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <Lock className="w-4 h-4 text-orange-500" />
                <span>Politique de Confidentialité</span>
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
              <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                <Clock className="w-3.5 h-3.5 text-orange-500" /> ~{readingTime} min de lecture
              </span>
            </div>
          </div>
        </header>

        {/* Search & Filter Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un terme (ex: OTP, Remboursement, Données, Livreur, Annulation)..."
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-orange-600 dark:text-orange-400 font-bold hover:underline px-2 cursor-pointer"
            >
              Effacer la recherche
            </button>
          )}
        </div>

        {/* Content Document Card */}
        <main className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 lg:p-12 shadow-sm relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="prose prose-slate dark:prose-invert max-w-none 
                prose-headings:font-black prose-headings:tracking-tight 
                prose-h1:text-2xl sm:prose-h1:text-3xl prose-h1:text-slate-900 dark:prose-h1:text-white prose-h1:border-b prose-h1:border-slate-100 dark:prose-h1:border-slate-800 prose-h1:pb-4 prose-h1:mb-6
                prose-h3:text-lg sm:prose-h3:text-xl prose-h3:text-orange-600 dark:prose-h3:text-orange-400 prose-h3:mt-8 prose-h3:mb-3 prose-h3:font-extrabold
                prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-p:leading-relaxed prose-p:text-sm sm:prose-p:text-base
                prose-li:text-slate-600 dark:prose-li:text-slate-300 prose-li:text-sm sm:prose-li:text-base prose-li:leading-relaxed
                prose-strong:text-slate-900 dark:prose-strong:text-white prose-strong:font-bold
                prose-hr:border-slate-100 dark:prose-hr:border-slate-800 prose-hr:my-8"
            >
              <Markdown>{filteredText}</Markdown>
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Footer Direct Links & Legal Badges */}
        <footer className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-slate-600 dark:text-slate-300">
            <a 
              href="https://fasoexpress.net/Conditions_Generales" 
              onClick={(e) => { e.preventDefault(); handleTabChange('client_terms'); }}
              className="hover:text-orange-600 dark:hover:text-orange-400 underline decoration-slate-300 transition-colors flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 text-orange-500" /> https://fasoexpress.net/Conditions_Generales
            </a>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <a 
              href="https://fasoexpress.net/Politique_de_Confidentialite" 
              onClick={(e) => { e.preventDefault(); handleTabChange('privacy'); }}
              className="hover:text-orange-600 dark:hover:text-orange-400 underline decoration-slate-300 transition-colors flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 text-orange-500" /> https://fasoexpress.net/Politique_de_Confidentialite
            </a>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            © 2026 FASO EXPRESS — Édité par SAPPAY TECHNOLOGIE. Tous droits réservés.
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest">
            Support & réclamations : WhatsApp : +226 72 56 76 06
          </p>
        </footer>

      </div>
    </div>
  );
}
