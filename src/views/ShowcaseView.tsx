import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Truck, Package, MapPin, ShieldCheck, ArrowRight, Phone, CheckCircle2, 
  Smartphone, Zap, Award, Users, CreditCard, ChevronDown, ChevronRight, 
  Clock, Lock, MessageSquare, Navigation, FileText, ExternalLink, HelpCircle, 
  Building2, UserCheck, Shield, Check, Headset, Receipt, Bike, Box, Download, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import SupportModal from '../components/SupportModal';

const logoImg = '/LOGOFASO.png';

export default function ShowcaseView() {
  const { user, appConfig } = useAuth();
  const navigate = useNavigate();
  const [supportOpen, setSupportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'clients' | 'merchants' | 'drivers'>('all');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const contactPhone = appConfig?.contactPhone || '72567606';

  const vehicles = [
    {
      type: 'Moto Express',
      tag: 'Livraison Rapide',
      icon: <Bike className="w-8 h-8 text-orange-600" />,
      capacity: 'Jusqu\'à 20 kg',
      ideal: 'Plis, documents confidentiels, repas, médicaments & petits colis',
      speed: '15 - 30 minutes',
      badgeBg: 'bg-orange-100 text-orange-800 border-orange-200'
    },
    {
      type: 'Tricycle Cargo',
      tag: 'Volume Moyen',
      icon: <Box className="w-8 h-8 text-amber-600" />,
      capacity: 'Jusqu\'à 500 kg',
      ideal: 'Sacs de riz/céréales, petit électroménager, cartons volumineux & matériel',
      speed: '30 - 45 minutes',
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-200'
    },
    {
      type: 'Camion / Camionnette',
      tag: 'Grand Volume',
      icon: <Truck className="w-8 h-8 text-blue-600" />,
      capacity: 'Jusqu\'à 3.5 Tonnes',
      ideal: 'Déménagements, mobilier complet, palettes & fret d\'entreprise',
      speed: 'Immédiat ou sur réservation',
      badgeBg: 'bg-blue-100 text-blue-800 border-blue-200'
    }
  ];

  const features = [
    {
      icon: <Navigation className="w-6 h-6 text-orange-600" />,
      title: 'Suivi GPS Temps Réel',
      desc: 'Visualisez le trajet exact de votre coursier en direct sur une carte interactive du ramassage à la destination.',
      category: 'clients'
    },
    {
      icon: <Lock className="w-6 h-6 text-emerald-600" />,
      title: 'Remise Sécurisée par OTP',
      desc: 'Sérénité absolue : le colis ne peut être validé que lorsque le destinataire transmet son code secret reçu par SMS.',
      category: 'clients'
    },
    {
      icon: <CreditCard className="w-6 h-6 text-purple-600" />,
      title: 'Paiements Mobiles & Espèces',
      desc: 'Payez en toute simplicité via Orange Money, Moov Money, SapPay ou directement en espèces à la livraison.',
      category: 'clients'
    },
    {
      icon: <Zap className="w-6 h-6 text-amber-600" />,
      title: 'Attribution Intelligente',
      desc: 'Un algorithme performant confie instantanément votre mission au livreur certifié le plus proche.',
      category: 'drivers'
    },
    {
      icon: <FileText className="w-6 h-6 text-sky-600" />,
      title: 'Historique & Tableau de Bord',
      desc: 'Consultez le détail de toutes vos expéditions, l\'état des livraisons en cours et l\'historique complet de vos transactions.',
      category: 'merchants'
    },
    {
      icon: <Headset className="w-6 h-6 text-indigo-600" />,
      title: 'Support Client Dédié',
      desc: 'Une équipe d\'assistance réactive disponible 7j/7 pour vous accompagner à chaque étape de vos courses.',
      category: 'clients'
    }
  ];

  const processSteps = [
    {
      step: '01',
      title: 'Création de la Demande',
      desc: 'Indiquez les adresses de ramassage et de livraison sur la carte interactive et sélectionnez le type de véhicule adapté.',
      icon: <MapPin className="w-6 h-6 text-orange-600" />
    },
    {
      step: '02',
      title: 'Attribution du Coursier',
      desc: 'La course est affectée au livreur certifié disponible le plus proche de votre zone d\'expédition.',
      icon: <UserCheck className="w-6 h-6 text-amber-600" />
    },
    {
      step: '03',
      title: 'Traçabilité GPS en Direct',
      desc: 'Suivez le déplacement du colis sur la carte en temps réel et partagez le suivi avec le destinataire.',
      icon: <Navigation className="w-6 h-6 text-blue-600" />
    },
    {
      step: '04',
      title: 'Validation par Code OTP',
      desc: 'La remise est clôturée uniquement après saisie du code secret transmis au destinataire.',
      icon: <ShieldCheck className="w-6 h-6 text-emerald-600" />
    }
  ];

  const commitments = [
    {
      title: "Transparence Tarifaire",
      desc: "Les prix sont calculés en fonction de la distance et du véhicule choisi avant la confirmation. Aucun frais masqué.",
      icon: <Receipt className="w-6 h-6 text-orange-600" />
    },
    {
      title: "Protection par Code OTP",
      desc: "Chaque expédition nécessite la validation obligatoire d'un code secret confidentiel transmis au destinataire.",
      icon: <Shield className="w-6 h-6 text-emerald-600" />
    },
    {
      title: "Livreurs Partenaires Vérifiés",
      desc: "Vérification rigoureuse des pièces d'identité, permis de conduire et documents de bord de tous les transporteurs.",
      icon: <UserCheck className="w-6 h-6 text-blue-600" />
    },
    {
      title: "Assistance & Support Direct",
      desc: "Notre centre de support technique intervient directement en cas de besoin par téléphone ou messagerie.",
      icon: <Headset className="w-6 h-6 text-amber-600" />
    }
  ];

  const faqs = [
    {
      q: "Comment commander une livraison sur FASO EXPRESS ?",
      a: "Sur l'application, cliquez sur 'Nouvelle Livraison', sélectionnez les points de départ et d'arrivée sur la carte, choisissez votre véhicule (Moto, Tricycle ou Camion), puis validez. Un coursier certifié acceptera la mission immédiatement."
    },
    {
      q: "Comment fonctionne la sécurité par code OTP ?",
      a: "Lors de la création de la livraison, un code secret OTP à 4 chiffres est généré. Il est transmis au destinataire. À l'arrivée du colis, le livreur saisit ce code dans son application. La livraison ne peut être clôturée qu'après la validation de ce code."
    },
    {
      q: "Quels sont les moyens de paiement acceptés ?",
      a: "Vous pouvez régler vos livraisons via Mobile Money (Orange Money, Moov Money, SapPay) ou payer directement en espèces à la réception du colis."
    },
    {
      q: "Comment devenir livreur partenaire sur FASO EXPRESS ?",
      a: "Inscrivez-vous directement sur l'application en sélectionnant le profil 'Livreur'. Soumettez vos pièces justificatives (Pièce d'identité, Permis de conduire, Photo du véhicule). Une fois votre dossier validé, vous pourrez commencer à effectuer des courses et percevoir vos revenus."
    }
  ];

  const filteredFeatures = activeTab === 'all' 
    ? features 
    : features.filter(f => f.category === activeTab);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans relative selection:bg-orange-500 selection:text-white">
      
      {/* Subtle Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-200/30 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-1/3 left-0 w-[450px] h-[450px] bg-amber-200/20 rounded-full blur-[160px] pointer-events-none" />

      {/* HEADER / NAVBAR */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5 transition-all shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo & Identity */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 p-0.5 shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <img src={logoImg} alt="FasoExpress" className="w-full h-full object-cover rounded-[10px]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-slate-900 italic">FASO<span className="text-orange-600">EXPRESS</span></span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest -mt-1">Plateforme Logistique</span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-slate-600">
            <a href="#fonctionnement" className="hover:text-orange-600 transition-colors">Fonctionnement</a>
            <a href="#flotte" className="hover:text-orange-600 transition-colors">Flotte & Tarifs</a>
            <a href="#services" className="hover:text-orange-600 transition-colors">Services</a>
            <a href="#engagements" className="hover:text-orange-600 transition-colors">Engagements</a>
            <a href="#faq" className="hover:text-orange-600 transition-colors">FAQ</a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSupportOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200 flex items-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5 text-orange-600" />
              <span className="hidden sm:inline">Support Direct</span>
            </button>

            {user ? (
              <button 
                onClick={() => navigate('/client')} 
                className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-orange-600/20 transition-all flex items-center gap-2 active:scale-95"
              >
                Mon Espace
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button 
                onClick={() => navigate('/')} 
                className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-orange-600/20 transition-all flex items-center gap-2 active:scale-95"
              >
                Accéder à l'App
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1">

        {/* HERO SECTION */}
        <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 px-4 sm:px-8 max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100/80 border border-orange-200 text-orange-800 text-xs font-bold uppercase tracking-widest mb-6 shadow-sm"
            >
              <ShieldCheck className="w-4 h-4 text-orange-600" />
              <span>Infrastructures Logistiques & Transport Urbain</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight italic leading-none mb-6"
            >
              La Solution Professionnelle pour Vos Livraisons <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-500">Urbaines & Fret</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-slate-600 text-base sm:text-xl font-medium max-w-3xl mx-auto leading-relaxed mb-10"
            >
              Commandez un transporteur qualifié en temps réel. Suivez l'itinéraire exact de vos colis sur carte GPS et sécurisez chaque remise grâce à une confirmation par code OTP.
            </motion.p>

            {/* CTAs */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap items-center justify-center gap-4 mb-14"
            >
              <button
                onClick={() => navigate(user ? '/client/new' : '/')}
                className="px-8 py-4 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-orange-600/20 transition-all flex items-center gap-3 active:scale-95"
              >
                <Package className="w-5 h-5" />
                <span>Expédier un Colis</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                onClick={() => navigate('/')}
                className="px-8 py-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-black text-sm uppercase tracking-widest border border-slate-300 shadow-sm transition-all flex items-center gap-3 active:scale-95"
              >
                <Truck className="w-5 h-5 text-orange-600" />
                <span>Espace Transporteur</span>
              </button>
            </motion.div>

            {/* Corporate Metrics Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <span className="block text-2xl sm:text-3xl font-black text-slate-900 mb-1">100%</span>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Traçabilité GPS</span>
              </div>
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <span className="block text-2xl sm:text-3xl font-black text-orange-600 mb-1">&lt; 30 min</span>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Délai Moyen Réseau</span>
              </div>
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <span className="block text-2xl sm:text-3xl font-black text-emerald-600 mb-1">OTP</span>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sécurité Remise</span>
              </div>
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <span className="block text-2xl sm:text-3xl font-black text-amber-600 mb-1">7j / 7</span>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Support Client</span>
              </div>
            </div>

            {/* AFFICHE PROMOTIONNELLE & DE PRÉSENTATION */}
            <div className="mt-12 max-w-4xl mx-auto bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-2xl overflow-hidden relative group border border-slate-800 text-left">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-6">
                <div>
                  <span className="text-orange-400 font-black text-xs uppercase tracking-widest block mb-1">Affiche Officielle de Présentation</span>
                  <h3 className="text-xl sm:text-2xl font-black italic tracking-tight">Support Visuel FasoExpress</h3>
                </div>
                <a 
                  href="/fasoexpress_promo.jpg" 
                  download="Affiche_FasoExpress_HD.jpg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-orange-600/30 active:scale-95 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Télécharger l'Affiche (HD)</span>
                </a>
              </div>

              <div className="rounded-2xl overflow-hidden border border-slate-700/60 shadow-inner bg-slate-950 flex items-center justify-center">
                <img 
                  src="/fasoexpress_promo.jpg" 
                  alt="Affiche de Présentation FasoExpress" 
                  className="w-full h-auto object-cover max-h-[500px]"
                />
              </div>
            </div>

          </div>
        </section>

        {/* PROCESSUS ET FONCTIONNEMENT */}
        <section id="fonctionnement" className="py-16 sm:py-24 px-4 sm:px-8 bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto">
            
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-orange-600 font-bold text-xs uppercase tracking-widest mb-2 block">Processus Clé en Main</span>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 italic tracking-tight mb-4">Comment Fonctionne la Plateforme</h2>
              <p className="text-slate-600 text-sm sm:text-base font-medium">Un déroulement clair en 4 étapes pour expédier et recevoir vos marchandises sans contrainte.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {processSteps.map((s, idx) => (
                <div key={idx} className="p-7 rounded-3xl bg-slate-50 border border-slate-200 flex flex-col justify-between hover:border-orange-300 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-sm">
                        {s.icon}
                      </div>
                      <span className="text-2xl font-black text-slate-300">{s.step}</span>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-3">{s.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* FLOTTE ET VEHICULES */}
        <section id="flotte" className="py-16 sm:py-24 px-4 sm:px-8 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-orange-600 font-bold text-xs uppercase tracking-widest mb-2 block">Capacités de Transport</span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 italic tracking-tight mb-4">Une Flotte Adaptée à Tous les Volumes</h2>
            <p className="text-slate-600 text-sm sm:text-base font-medium">Sélectionnez le type de véhicule correspondant exactement au poids et aux dimensions de vos marchandises.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {vehicles.map((v, i) => (
              <div key={i} className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-xl hover:border-orange-300 transition-all duration-300 group">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                      {v.icon}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${v.badgeBg}`}>
                      {v.tag}
                    </span>
                  </div>

                  <h3 className="text-2xl font-black text-slate-900 mb-1">{v.type}</h3>
                  <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-6">Capacité utile : {v.capacity}</p>

                  <div className="space-y-3.5 text-slate-700 text-sm mb-8">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Usage :</strong> {v.ideal}</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span><strong>Délai estimé :</strong> {v.speed}</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => navigate(user ? '/client/new' : '/')}
                  className="w-full py-3.5 rounded-2xl bg-slate-50 border border-slate-200 group-hover:bg-orange-600 group-hover:border-orange-600 group-hover:text-white text-slate-900 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Commander {v.type}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* FONCTIONNALITES TECH */}
        <section id="services" className="py-16 sm:py-24 px-4 sm:px-8 bg-white border-t border-slate-200">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-orange-600 font-bold text-xs uppercase tracking-widest mb-2 block">Fonctionnalités & Outils</span>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 italic tracking-tight mb-4">Technologies au Service de Vos Envois</h2>
              <p className="text-slate-600 text-sm sm:text-base font-medium">Une suite d'outils digitaux conçue pour la fiabilité des opérations logistiques.</p>

              {/* Filter Tabs */}
              <div className="flex items-center justify-center gap-2 mt-8 p-1.5 rounded-2xl bg-slate-100 border border-slate-200 max-w-md mx-auto">
                {[
                  { id: 'all', label: 'Toutes' },
                  { id: 'clients', label: 'Expéditeurs' },
                  { id: 'merchants', label: 'Commerçants' },
                  { id: 'drivers', label: 'Transporteurs' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                      activeTab === tab.id 
                        ? 'bg-orange-600 text-white shadow-sm' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFeatures.map((f, i) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={i} 
                  className="p-7 rounded-3xl bg-slate-50 border border-slate-200 hover:border-orange-200 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-5 shadow-sm">
                      {f.icon}
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">{f.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* NOS ENGAGEMENTS QUALITE */}
        <section id="engagements" className="py-16 sm:py-24 px-4 sm:px-8 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-orange-600 font-bold text-xs uppercase tracking-widest mb-2 block">Garantie & Rigueur</span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 italic tracking-tight mb-4">Nos Engagements de Service</h2>
            <p className="text-slate-600 text-sm sm:text-base font-medium">Une infrastructure pensée pour garantir la sécurité juridique, financière et matérielle de chaque expédition.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {commitments.map((c, idx) => (
              <div key={idx} className="p-7 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between hover:border-orange-200 transition-all">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-6">
                    {c.icon}
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mb-3">{c.title}</h3>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ SECTION */}
        <section id="faq" className="py-16 sm:py-24 px-4 sm:px-8 bg-white border-t border-slate-200">
          <div className="max-w-4xl mx-auto">
            
            <div className="text-center mb-16">
              <span className="text-orange-600 font-bold text-xs uppercase tracking-widest mb-2 block">Réponses aux Questions</span>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 italic tracking-tight mb-4">Foire Aux Questions</h2>
              <p className="text-slate-600 text-sm font-medium">Retrouvez toutes les informations sur l'utilisation et les modalités de paiement.</p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div key={idx} className="rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden transition-all">
                  <button 
                    onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                    className="w-full p-6 text-left font-black text-slate-900 text-base sm:text-lg flex items-center justify-between gap-4 hover:bg-slate-100 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-5 h-5 text-orange-600 transition-transform ${openFaqIndex === idx ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {openFaqIndex === idx && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-6 pb-6 text-slate-600 text-sm font-medium leading-relaxed border-t border-slate-200 pt-4"
                      >
                        {faq.a}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* BANNIERE CALL-TO-ACTION FINAL */}
        <section className="py-16 sm:py-20 px-4 sm:px-8 max-w-7xl mx-auto">
          <div className="p-8 sm:p-14 rounded-[36px] bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 text-white relative overflow-hidden shadow-xl shadow-orange-600/20">
            <div className="relative z-10 max-w-3xl">
              <span className="px-3 py-1 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider mb-4 inline-block">Plateforme Active</span>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight italic mb-4 leading-tight">
                Gérez Vos Expéditions en Toute Confiance
              </h2>
              <p className="text-orange-100 text-sm sm:text-base font-medium mb-8">
                Profitez d'un service logistique performant, structuré et sécurisé sur mobile et ordinateur.
              </p>
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={() => navigate('/')} 
                  className="px-8 py-4 rounded-2xl bg-white text-slate-900 font-black text-sm uppercase tracking-wider shadow-md hover:bg-slate-100 transition-all active:scale-95"
                >
                  Accéder à l'Application
                </button>
                <button 
                  onClick={() => setSupportOpen(true)} 
                  className="px-8 py-4 rounded-2xl bg-black/20 hover:bg-black/30 text-white font-black text-sm uppercase tracking-wider border border-white/30 transition-all active:scale-95"
                >
                  Contacter le Support
                </button>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-4 sm:px-8 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="FasoExpress" className="w-8 h-8 rounded-lg object-cover" />
            <div className="flex flex-col">
              <span className="font-black text-white text-sm">FASO EXPRESS</span>
              <span className="text-[10px] text-slate-400">Édité par SAPPAY TECHNOLOGIE</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 font-bold text-slate-300">
            <a href="https://fasoexpress.net/Conditions_Generales" target="_blank" rel="noopener noreferrer" className="hover:text-orange-400 transition-colors">Conditions Générales</a>
            <a href="https://fasoexpress.net/Politique_de_Confidentialite" target="_blank" rel="noopener noreferrer" className="hover:text-orange-400 transition-colors">Politique de Confidentialité</a>
            <button onClick={() => setSupportOpen(true)} className="hover:text-orange-400 transition-colors">Assistance & Support</button>
          </div>

          <div className="text-slate-500 text-[11px] font-medium text-center md:text-right">
            © {new Date().getFullYear()} FASO EXPRESS. Tous droits réservés.
          </div>
        </div>
      </footer>

      {/* Support Modal */}
      <SupportModal isOpen={supportOpen} onClose={() => setSupportOpen(false)} />
    </div>
  );
}
