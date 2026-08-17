import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { 
  Phone, MessageSquare, Mail, Facebook, 
  ArrowLeft, LifeBuoy, ShieldCheck, Clock, MapPin, Headset, ExternalLink, HelpCircle
} from 'lucide-react';

export default function AssistanceView() {
  const { appConfig } = useAuth();

  const phone = appConfig?.contactPhone || '72567606';
  const isPhoneActive = appConfig?.contactPhoneActive !== false;

  const whatsapp = appConfig?.contactWhatsapp || '72567606';
  const isWhatsappActive = appConfig?.contactWhatsappActive !== false;

  const facebook = appConfig?.contactFacebook || 'https://facebook.com/fasoexpress';
  const isFacebookActive = appConfig?.contactFacebookActive !== false;

  const messenger = appConfig?.contactMessenger || 'https://m.me/fasoexpress';
  const isMessengerActive = appConfig?.contactMessengerActive !== false;

  const email = appConfig?.contactEmail || '';
  const isEmailActive = appConfig?.contactEmailActive !== false && !!email;

  const supportMethods = [
    {
      id: 'phone',
      title: 'Service Téléphonique Direct',
      subtitle: 'Pour vos urgences et appels directs',
      value: phone,
      href: `tel:+226${phone.replace(/[^0-9]/g, '')}`,
      active: isPhoneActive && !!phone,
      icon: Phone,
      badge: '7j/7 • 24h/24',
      color: 'bg-orange-500 text-white',
      cardBg: 'hover:border-orange-500/40 hover:shadow-orange-500/10'
    },
    {
      id: 'whatsapp',
      title: 'Support WhatsApp Chat',
      subtitle: 'Assistance rapide, envoi de pièces et localisation',
      value: whatsapp,
      href: `https://wa.me/226${whatsapp.replace(/[^0-9]/g, '')}`,
      active: isWhatsappActive && !!whatsapp,
      icon: MessageSquare,
      badge: 'Réponse Rapide',
      color: 'bg-emerald-500 text-white',
      cardBg: 'hover:border-emerald-500/40 hover:shadow-emerald-500/10'
    },
    {
      id: 'messenger',
      title: 'Facebook Messenger',
      subtitle: 'Discuter avec notre équipe de support',
      value: 'Envoyer un message',
      href: messenger.startsWith('http') ? messenger : `https://${messenger}`,
      active: isMessengerActive && !!messenger,
      icon: MessageSquare,
      badge: 'En Ligne',
      color: 'bg-sky-500 text-white',
      cardBg: 'hover:border-sky-500/40 hover:shadow-sky-500/10'
    },
    {
      id: 'facebook',
      title: 'Page Officielle Facebook',
      subtitle: 'Actualités, offres et informations',
      value: 'Faso Express Officiel',
      href: facebook.startsWith('http') ? facebook : `https://${facebook}`,
      active: isFacebookActive && !!facebook,
      icon: Facebook,
      badge: 'Communauté',
      color: 'bg-blue-600 text-white',
      cardBg: 'hover:border-blue-500/40 hover:shadow-blue-500/10'
    },
    {
      id: 'email',
      title: 'Support par Courriel',
      subtitle: 'Pour vos réclamations et partenariats',
      value: email,
      href: `mailto:${email}`,
      active: isEmailActive && !!email,
      icon: Mail,
      badge: 'Email Pro',
      color: 'bg-rose-500 text-white',
      cardBg: 'hover:border-rose-500/40 hover:shadow-rose-500/10'
    },
  ].filter(method => method.active);

  const faqs = [
    {
      q: "Comment suivre ma livraison en temps réel ?",
      a: "Dès que le livreur accepte votre course, vous pouvez suivre son déplacement directement sur la carte interactive depuis l'onglet 'Suivi' ou en saisissant l'identifiant de votre colis."
    },
    {
      q: "À quoi sert le code OTP de livraison ?",
      a: "C'est un code secret à 4 chiffres généré pour chaque course. Le livreur doit saisir ce code lors de la remise du colis pour valider officiellement la livraison."
    },
    {
      q: "Quels sont les modes de paiement acceptés ?",
      a: "Nous acceptons les paiements Mobile Money (Orange Money, Moov Money, Telecel Cash, Coris Money) ainsi que le paiement en espèces à la livraison."
    },
    {
      q: "Que faire si mon livreur a du retard ?",
      a: "Vous pouvez contacter le livreur directement depuis l'application via le bouton d'appel, ou joindre notre centre de support téléphonique au 72 56 76 06."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider hover:border-orange-500 transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à l'accueil</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Support Disponible</span>
          </div>
        </div>

        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950 text-white p-8 sm:p-12 shadow-2xl border border-slate-800">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-black uppercase tracking-widest mb-4">
              <LifeBuoy className="w-4 h-4" />
              <span>Centre de Support & Assistance</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black italic tracking-tight mb-4">
              Comment pouvons-nous vous aider aujourd'hui ?
            </h1>
            <p className="text-slate-300 text-sm sm:text-base font-medium leading-relaxed">
              L'équipe FasoExpress est à votre entière disposition pour répondre à toutes vos questions, suivre vos colis et résoudre vos soucis de livraison.
            </p>
          </div>
          
          <div className="absolute right-[-40px] bottom-[-40px] opacity-10 pointer-events-none">
            <Headset className="w-80 h-80 text-orange-500" />
          </div>
        </div>

        {/* Contact Grid */}
        <div className="space-y-4">
          <h2 className="text-xl font-black text-slate-900 dark:text-white italic tracking-tight flex items-center gap-2">
            <Headset className="w-5 h-5 text-orange-500" />
            <span>Nos Canaux de Contact Direct</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {supportMethods.map((method) => {
              const Icon = method.icon;
              return (
                <a
                  key={method.id}
                  href={method.href}
                  target={method.href.startsWith('http') ? '_blank' : '_self'}
                  rel="noopener noreferrer"
                  className={`p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-200 flex flex-col justify-between group cursor-pointer ${method.cardBg}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-2xl ${method.color} shadow-lg shadow-orange-500/10`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider">
                      {method.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1 group-hover:text-orange-500 transition-colors flex items-center gap-1.5">
                      <span>{method.title}</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mb-3">
                      {method.subtitle}
                    </p>
                    <div className="text-base font-black text-slate-900 dark:text-orange-400 italic">
                      {method.value}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="space-y-4 pt-4">
          <h2 className="text-xl font-black text-slate-900 dark:text-white italic tracking-tight flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-orange-500" />
            <span>Questions Fréquemment Posées</span>
          </h2>

          <div className="grid grid-cols-1 gap-4">
            {faqs.map((faq, idx) => (
              <div 
                key={idx}
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2"
              >
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-start gap-2">
                  <span className="text-orange-500 font-extrabold">Q.</span>
                  <span>{faq.q}</span>
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-xs font-medium leading-relaxed pl-5">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center pt-8 border-t border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-widest">
          FASO EXPRESS • Service Client & Assistance Disponible 7j/7
        </div>

      </div>
    </div>
  );
}
