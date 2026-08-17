import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Phone, MessageSquare, Mail, Facebook, 
  ArrowLeft, LifeBuoy, ShieldCheck, Clock, MapPin, Headset, 
  ExternalLink, HelpCircle, Send, CheckCircle2, AlertCircle, Copy, Check
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  formatPhoneDisplay, 
  getParsedPhoneList, 
  getPrimaryCleanPhone, 
  buildWhatsAppLink, 
  buildTelLink 
} from '../utils/phoneUtils';

export default function AssistanceView() {
  const { appConfig } = useAuth();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [ticketSent, setTicketSent] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    name: '',
    phone: '',
    subject: 'Problème de livraison',
    message: ''
  });

  const phoneRaw = appConfig?.contactPhone || '72567606';
  const parsedPhones = getParsedPhoneList(phoneRaw);
  const isPhoneActive = appConfig?.contactPhoneActive !== false;

  const whatsappRaw = appConfig?.contactWhatsapp || '72567606';
  const parsedWhatsapps = getParsedPhoneList(whatsappRaw);
  const primaryWhatsapp = getPrimaryCleanPhone(whatsappRaw);
  const isWhatsappActive = appConfig?.contactWhatsappActive !== false;

  const facebook = appConfig?.contactFacebook || 'https://facebook.com/fasoexpress';
  const isFacebookActive = appConfig?.contactFacebookActive !== false;

  const messenger = appConfig?.contactMessenger || 'https://m.me/fasoexpress';
  const isMessengerActive = appConfig?.contactMessengerActive !== false;

  const email = appConfig?.contactEmail || 'contact@fasoexpress.net';
  const isEmailActive = appConfig?.contactEmailActive !== false;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    toast.success(`${text} copié dans le presse-papier !`);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.name || !ticketForm.phone || !ticketForm.message) {
      toast.error('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    const whatsappMessage = `*Demande d'Assistance FasoExpress*%0A%0A*Nom:* ${encodeURIComponent(ticketForm.name)}%0A*Téléphone:* ${encodeURIComponent(ticketForm.phone)}%0A*Objet:* ${encodeURIComponent(ticketForm.subject)}%0A*Message:* ${encodeURIComponent(ticketForm.message)}`;
    
    // Redirect to WhatsApp with prefilled message using valid primary clean number
    window.open(`https://wa.me/226${primaryWhatsapp}?text=${whatsappMessage}`, '_blank');
    setTicketSent(true);
    toast.success('Votre message est prêt à être envoyé sur WhatsApp !');
  };

  const channels = [
    {
      id: 'whatsapp',
      title: 'WhatsApp Support',
      subtitle: 'Assistance instantanée, envoi de photos et localisation GPS',
      displayValue: formatPhoneDisplay(whatsappRaw),
      rawValue: formatPhoneDisplay(whatsappRaw),
      href: buildWhatsAppLink(whatsappRaw, "Bonjour l'équipe FasoExpress, j'ai besoin d'une assistance pour ma livraison."),
      active: isWhatsappActive,
      icon: MessageSquare,
      badge: 'Réponse Ultra Rapide',
      themeColor: 'from-emerald-500 to-teal-600',
      btnText: 'Ouvrir WhatsApp',
      btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      multipleActions: parsedWhatsapps.length > 1 ? parsedWhatsapps.map(item => ({
        label: `WhatsApp ${item.clean}`,
        href: item.waHref
      })) : undefined
    },
    {
      id: 'messenger',
      title: 'Facebook Messenger',
      subtitle: 'Discutez en direct avec nos agents via Messenger',
      displayValue: 'm.me/fasoexpress',
      rawValue: messenger.startsWith('http') ? messenger : `https://${messenger}`,
      href: messenger.startsWith('http') ? messenger : `https://${messenger}`,
      active: isMessengerActive,
      icon: MessageSquare,
      badge: 'En Ligne',
      themeColor: 'from-sky-500 to-blue-600',
      btnText: 'Ouvrir Messenger',
      btnBg: 'bg-sky-600 hover:bg-sky-700 text-white'
    },
    {
      id: 'phone',
      title: 'Appel Téléphonique Direct',
      subtitle: 'Pour vos urgences de livraison et réclamations directes',
      displayValue: formatPhoneDisplay(phoneRaw),
      rawValue: formatPhoneDisplay(phoneRaw),
      href: buildTelLink(phoneRaw),
      active: isPhoneActive,
      icon: Phone,
      badge: '7j/7 • 24h/24',
      themeColor: 'from-orange-500 to-amber-600',
      btnText: 'Appeler Maintenant',
      btnBg: 'bg-orange-600 hover:bg-orange-700 text-white',
      multipleActions: parsedPhones.length > 1 ? parsedPhones.map(item => ({
        label: `Appeler ${item.clean}`,
        href: item.telHref
      })) : undefined
    },
    {
      id: 'facebook',
      title: 'Page Facebook Officielle',
      subtitle: 'Actualités, informations du réseau et messagerie Facebook',
      displayValue: 'Faso Express Officiel',
      rawValue: facebook.startsWith('http') ? facebook : `https://${facebook}`,
      href: facebook.startsWith('http') ? facebook : `https://${facebook}`,
      active: isFacebookActive,
      icon: Facebook,
      badge: 'Communauté',
      themeColor: 'from-blue-600 to-indigo-700',
      btnText: 'Visiter la Page',
      btnBg: 'bg-blue-600 hover:bg-blue-700 text-white'
    },
    {
      id: 'email',
      title: 'Support par Email',
      subtitle: 'Pour vos demandes de partenariat, factures et réclamations écrites',
      displayValue: email,
      rawValue: email,
      href: `mailto:${email}?subject=${encodeURIComponent('Demande de support - FasoExpress')}`,
      active: isEmailActive,
      icon: Mail,
      badge: 'Support Pro',
      themeColor: 'from-rose-500 to-red-600',
      btnText: 'Envoyer un Email',
      btnBg: 'bg-rose-600 hover:bg-rose-700 text-white'
    }
  ];

  const faqs = [
    {
      q: "Comment suivre ma livraison en temps réel ?",
      a: "Dès que le livreur accepte votre commande, vous pouvez suivre son déplacement en temps réel sur la carte interactive depuis l'onglet 'Suivi' ou en saisissant le numéro de votre colis."
    },
    {
      q: "À quoi sert le code OTP de livraison ?",
      a: "C'est un code de sécurité confidentiel à 4 chiffres généré pour votre commande. Le livreur doit le saisir lors de la remise pour clôturer officiellement la course et sécuriser votre colis."
    },
    {
      q: "Quels sont les modes de paiement disponibles ?",
      a: "Nous acceptons tous les paiements Mobile Money (Orange Money, Moov Money, Telecel Cash, Coris Money) ainsi que le paiement en espèces directement à la livraison."
    },
    {
      q: "Que faire si mon livreur a du retard ou ne répond pas ?",
      a: "Vous pouvez contacter directement notre service client au (+226) 72 56 76 06 ou via WhatsApp pour une réattribution immédiate de votre course."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider hover:border-orange-500 hover:text-orange-400 transition-all shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à l'accueil</span>
          </Link>

          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-black tracking-wide">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>SUPPORT EN LIGNE (24h/24 & 7j/7)</span>
          </div>
        </div>

        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-850 via-slate-800 to-orange-950/40 p-8 sm:p-12 border border-slate-700 shadow-2xl">
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-400 text-xs font-black uppercase tracking-widest">
              <LifeBuoy className="w-4 h-4" />
              <span>Centre d'Assistance & Service Client</span>
            </div>
            
            <h1 className="text-3xl sm:text-5xl font-black italic tracking-tight text-white leading-tight">
              Besoin d'aide ? <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
                Nous sommes à votre écoute.
              </span>
            </h1>
            
            <p className="text-slate-300 text-sm sm:text-base font-medium leading-relaxed">
              Pour toute question sur une livraison en cours, un problème avec un livreur, un paiement ou une demande de partenariat, contactez notre équipe disponible 7j/7 au Burkina Faso.
            </p>
          </div>

          <div className="absolute right-[-30px] bottom-[-30px] opacity-10 pointer-events-none">
            <Headset className="w-80 h-80 text-orange-500" />
          </div>
        </div>

        {/* Canaux de contact directs */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-white italic tracking-tight flex items-center gap-2.5">
              <Headset className="w-6 h-6 text-orange-500" />
              <span>Nos Canaux de Contact Officiels</span>
            </h2>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider hidden sm:inline-block">
              Cliquez pour contacter
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {channels.map((channel) => {
              const Icon = channel.icon;
              return (
                <div
                  key={channel.id}
                  className="rounded-3xl bg-slate-800/90 border border-slate-700/80 p-6 shadow-lg hover:border-slate-600 transition-all duration-200 flex flex-col justify-between space-y-6 group"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${channel.themeColor} text-white shadow-lg shadow-black/20`}>
                        <Icon className="w-7 h-7" />
                      </div>
                      <span className="px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700 text-slate-300 text-[11px] font-black uppercase tracking-wider">
                        {channel.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-white group-hover:text-orange-400 transition-colors">
                        {channel.title}
                      </h3>
                      <p className="text-slate-400 text-xs font-medium mt-1 leading-relaxed">
                        {channel.subtitle}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-750 flex items-center justify-between">
                      <span className="text-sm font-black text-orange-400 font-mono tracking-wide">
                        {channel.displayValue}
                      </span>
                      <button
                        onClick={() => handleCopy(channel.rawValue, channel.id)}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                        title="Copier le contact"
                      >
                        {copiedField === channel.id ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {channel.multipleActions && channel.multipleActions.length > 1 ? (
                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                      {channel.multipleActions.map((action, actionIdx) => (
                        <a
                          key={actionIdx}
                          href={action.href}
                          target={action.href.startsWith('http') ? '_blank' : '_self'}
                          rel="noopener noreferrer"
                          className={`flex-1 py-3 px-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition-all ${channel.btnBg}`}
                        >
                          <span>{action.label}</span>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <a
                      href={channel.href}
                      target={channel.href.startsWith('http') ? '_blank' : '_self'}
                      rel="noopener noreferrer"
                      className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all ${channel.btnBg}`}
                    >
                      <span>{channel.btnText}</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Formulaire de Message Rapide / Ticket WhatsApp */}
        <div className="rounded-3xl bg-slate-800/80 border border-slate-700 p-6 sm:p-8 shadow-xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-white italic tracking-tight flex items-center gap-2">
              <Send className="w-5 h-5 text-orange-500" />
              <span>Envoyer un message rapide au Support</span>
            </h2>
            <p className="text-slate-400 text-xs font-medium">
              Remplissez ce formulaire court pour être pris en charge immédiatement par notre équipe sur WhatsApp.
            </p>
          </div>

          <form onSubmit={handleTicketSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-300">Votre Nom Complet *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Mohamed Ouedraogo"
                  value={ticketForm.name}
                  onChange={(e) => setTicketForm({ ...ticketForm, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-300">Votre Numéro de Téléphone *</label>
                <input
                  type="tel"
                  required
                  placeholder="Ex: 70 00 00 00"
                  value={ticketForm.phone}
                  onChange={(e) => setTicketForm({ ...ticketForm, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-300">Objet de la demande</label>
              <select
                value={ticketForm.subject}
                onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-orange-500"
              >
                <option value="Problème de livraison en cours">Problème de livraison en cours</option>
                <option value="Colis non reçu / Retard">Colis non reçu / Retard livreur</option>
                <option value="Question sur le paiement Mobile Money">Question sur le paiement Mobile Money</option>
                <option value="Devenir Livreur Partenaire">Devenir Livreur Partenaire</option>
                <option value="Partenariat Entreprise / E-commerce">Partenariat Entreprise / E-commerce</option>
                <option value="Autre demande">Autre demande</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-300">Votre Message / Précisions *</label>
              <textarea
                required
                rows={3}
                placeholder="Décrivez votre situation ou mentionnez le numéro de votre colis..."
                value={ticketForm.message}
                onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-orange-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-orange-500/20 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Transmettre ma demande au Support WhatsApp</span>
            </button>
          </form>
        </div>

        {/* FAQ */}
        <div className="space-y-4">
          <h2 className="text-xl font-black text-white italic tracking-tight flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-orange-500" />
            <span>Foire Aux Questions Fréquentes</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {faqs.map((faq, idx) => (
              <div 
                key={idx}
                className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2"
              >
                <h3 className="text-sm font-black text-orange-400 flex items-start gap-2">
                  <span>Q.</span>
                  <span>{faq.q}</span>
                </h3>
                <p className="text-slate-300 text-xs font-medium leading-relaxed pl-4">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center pt-6 border-t border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-widest space-y-1">
          <div>FASO EXPRESS • Ouagadougou & Bobo-Dioulasso, Burkina Faso</div>
          <div>Plateforme de Livraison Express 100% Burkinabè</div>
        </div>

      </div>
    </div>
  );
}
