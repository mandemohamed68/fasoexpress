import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, ShoppingBag, Truck, CheckCircle2, Navigation, ShieldCheck, MapPin, Key, Clock, Award } from 'lucide-react';

interface GuideStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  details: string[];
}

export default function UserGuide() {
  const [activeTab, setActiveTab] = useState<'client' | 'driver'>('client');
  const [activeStep, setActiveStep] = useState<number>(0);

  const clientSteps: GuideStep[] = [
    {
      title: "1. Enregistrez votre demande",
      description: "Saisissez les adresses et informations de contact pour le ramassage et la livraison.",
      icon: <MapPin className="w-6 h-6 text-orange-600" />,
      details: [
        "Sélectionnez le type de véhicule adapté (moto, tricycle, camion).",
        "Précisez la nature de l'expédition (colis, documents, nourriture).",
        "Renseignez les numéros de téléphone de l'expéditeur et du destinataire au Burkina Faso."
      ]
    },
    {
      title: "2. Choisissez le mode de paiement",
      description: "Payez de manière sécurisée en ligne ou sélectionnez le paiement en espèces.",
      icon: <ShieldCheck className="w-6 h-6 text-emerald-600" />,
      details: [
        "Paiement mobile disponible via Orange Money, Moov Money ou Telecel Cash.",
        "Paiement par carte bancaire ou virement via SapPay.",
        "Les fonds numériques sont sécurisés par notre système de séquestre jusqu'à la livraison."
      ]
    },
    {
      title: "3. Suivez la course en temps réel",
      description: "Suivez le déplacement précis de votre livreur sur notre carte interactive.",
      icon: <Navigation className="w-6 h-6 text-blue-600" />,
      details: [
        "Visualisez instantanément où se trouve votre colis.",
        "Recevez des alertes SMS et notifications push à chaque étape.",
        "Communiquez directement avec votre livreur par chat ou téléphone."
      ]
    },
    {
      title: "4. Sécurisez la réception",
      description: "Utilisez le système exclusif de double code pour valider la livraison.",
      icon: <Key className="w-6 h-6 text-indigo-600" />,
      details: [
        "Donnez le Code de Ramassage au livreur lorsqu'il prend votre colis.",
        "Le destinataire fournit le Code de Livraison à l'arrivée pour finaliser la course.",
        "Cette double vérification assure la sécurité absolue de votre marchandise."
      ]
    }
  ];

  const driverSteps: GuideStep[] = [
    {
      title: "1. Connectez-vous sur la plateforme",
      description: "Activez votre disponibilité pour commencer à recevoir des demandes de courses.",
      icon: <Clock className="w-6 h-6 text-indigo-600" />,
      details: [
        "Basculez le bouton 'Online' dans votre tableau de bord livreur.",
        "Gérez librement votre temps et vos horaires de travail.",
        "Consultez les détails de la course et le gain estimé avant d'accepter."
      ]
    },
    {
      title: "2. Récupérez le colis en sécurité",
      description: "Rendez-vous au point de ramassage indiqué et vérifiez le colis.",
      icon: <ShoppingBag className="w-6 h-6 text-orange-600" />,
      details: [
        "Suivez l'itinéraire suggéré vers l'adresse d'expédition.",
        "Demandez le Code de Ramassage unique au client pour démarrer officiellement le trajet.",
        "Vérifiez l'état général et l'emballage du colis."
      ]
    },
    {
      title: "3. Effectuez le trajet l'esprit tranquille",
      description: "Suivez la navigation GPS et conduisez prudemment vers la destination.",
      icon: <Navigation className="w-6 h-6 text-emerald-600" />,
      details: [
        "Votre position est partagée avec le client pour instaurer une confiance totale.",
        "Signalez tout ralentissement ou problème en un clic via l'application.",
        "Respectez scrupuleusement le code de la route burkinabè."
      ]
    },
    {
      title: "4. Validez et encaissez vos gains",
      description: "Remettez le colis au destinataire et obtenez le code de validation.",
      icon: <Award className="w-6 h-6 text-amber-600" />,
      details: [
        "Entrez le Code de Livraison transmis par le destinataire pour clôturer la course.",
        "Vos gains sont crédités instantanément dans votre portefeuille virtuel.",
        "Demandez votre retrait mobile (Orange/Moov) à tout moment de la semaine."
      ]
    }
  ];

  const currentSteps = activeTab === 'client' ? clientSteps : driverSteps;
  const currentStepData = currentSteps[activeStep];

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 sm:p-6 lg:p-8">
      {/* Title */}
      <div className="text-center mb-6 sm:mb-8">
        <span className="px-3 py-1 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.25em] rounded-full inline-block">
          FASO EXPRESS • MODE D'EMPLOI
        </span>
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic mt-3">
          Guide de Démarrage Rapide
        </h3>
        <p className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
          Apprenez à maîtriser l'application en quelques étapes simples
        </p>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 mb-6 sm:mb-8 max-w-md mx-auto">
        <button
          onClick={() => {
            setActiveTab('client');
            setActiveStep(0);
          }}
          className={`flex-1 py-2.5 sm:py-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'client'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md border border-slate-200/20'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Compass className="w-3.5 h-3.5 sm:w-4 h-4" />
          Espace Client
        </button>
        <button
          onClick={() => {
            setActiveTab('driver');
            setActiveStep(0);
          }}
          className={`flex-1 py-2.5 sm:py-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'driver'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md border border-slate-200/20'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Truck className="w-3.5 h-3.5 sm:w-4 h-4" />
          Espace Livreur
        </button>
      </div>

      {/* Interactive Step Carousel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
        {/* Left Column - Steps Navigation */}
        <div className="lg:col-span-5 flex flex-col gap-2.5 justify-center">
          {currentSteps.map((step, idx) => (
            <div key={idx} className="flex flex-col gap-2">
              <button
                onClick={() => setActiveStep(idx)}
                className={`flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                  activeStep === idx
                    ? 'bg-orange-500/[0.03] border-orange-500 shadow-sm'
                    : 'bg-transparent border-slate-100 dark:border-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700'
                }`}
              >
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all text-xs sm:text-base ${
                  activeStep === idx
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-400 border-slate-100 dark:border-slate-800'
                }`}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`text-xs sm:text-sm font-black uppercase tracking-tight transition-all truncate ${
                    activeStep === idx ? 'text-orange-600 dark:text-orange-400' : 'text-slate-800 dark:text-slate-200'
                  }`}>
                    {step.title}
                  </h4>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                    {step.description}
                  </p>
                </div>
              </button>

              {/* Mobile details (accordion style) */}
              <AnimatePresence>
                {activeStep === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="lg:hidden overflow-hidden bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800"
                  >
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-800 text-indigo-500">
                          {step.icon}
                        </div>
                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">
                          Étape {idx + 1} de 4
                        </span>
                      </div>
                      {step.details.map((detail, dIdx) => (
                        <div key={dIdx} className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
                            {detail}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Right Column - Step Details Panel (Hidden on mobile, uses accordion instead) */}
        <div className="lg:col-span-7 hidden lg:block">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTab}-${activeStep}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.28, ease: "easeInOut" }}
              className="bg-slate-50 dark:bg-slate-950/50 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 sm:p-8 h-full flex flex-col justify-between"
            >
              <div>
                {/* Step Icon Accent */}
                <div className="w-14 h-14 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center shadow-xl border border-slate-100 dark:border-slate-800 mb-6">
                  {currentStepData.icon}
                </div>

                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-2">
                  Étape {activeStep + 1} de 4
                </span>
                <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic mb-3">
                  {currentStepData.title}
                </h4>
                <p className="text-sm font-bold text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                  {currentStepData.description}
                </p>

                {/* Checklist details */}
                <div className="space-y-3.5">
                  {currentStepData.details.map((detail, dIdx) => (
                    <div key={dIdx} className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
                        {detail}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Progress dots at the bottom */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200/50 dark:border-slate-800/80">
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3].map((dotIdx) => (
                    <button
                      key={dotIdx}
                      onClick={() => setActiveStep(dotIdx)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        activeStep === dotIdx ? 'w-6 bg-orange-500' : 'w-1.5 bg-slate-200 dark:bg-slate-800'
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => {
                    if (activeStep < 3) setActiveStep(prev => prev + 1);
                    else setActiveStep(0);
                  }}
                  className="text-xs font-black uppercase tracking-wider text-orange-600 hover:text-orange-700 dark:text-orange-400 transition-colors"
                >
                  {activeStep === 3 ? "Recommencer" : "Suivant →"}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
