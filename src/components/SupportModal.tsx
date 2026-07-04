import React from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Phone, MessageSquare, Mail, Facebook, 
  ArrowRight, ShieldAlert, LifeBuoy 
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SupportModal({ isOpen, onClose }: SupportModalProps) {
  const { appConfig } = useAuth();

  if (!isOpen) return null;

  // Read config values and active toggles (defaulting to true if not explicitly set to false)
  const phone = appConfig?.contactPhone || '72567606';
  const isPhoneActive = appConfig?.contactPhoneActive !== false;

  const whatsapp = appConfig?.contactWhatsapp || '72567606';
  const isWhatsappActive = appConfig?.contactWhatsappActive !== false;

  const facebook = appConfig?.contactFacebook || 'https://facebook.com/fasoexpress';
  const isFacebookActive = appConfig?.contactFacebookActive !== false;

  const messenger = appConfig?.contactMessenger || 'https://m.me/fasoexpress';
  const isMessengerActive = appConfig?.contactMessengerActive !== false;

  const email = appConfig?.contactEmail || 'nmetechnologiegroup@gmail.com';
  const isEmailActive = appConfig?.contactEmailActive !== false;

  // Build the support list dynamically
  const supportMethods = [
    {
      id: 'phone',
      label: 'Service Téléphonique',
      value: phone,
      href: `tel:+226${phone.replace(/[^0-9]/g, '')}`,
      active: isPhoneActive && !!phone,
      icon: Phone,
      color: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900',
      hoverColor: 'hover:border-indigo-300 hover:bg-indigo-50/20'
    },
    {
      id: 'whatsapp',
      label: 'Support WhatsApp',
      value: whatsapp,
      href: `https://wa.me/226${whatsapp.replace(/[^0-9]/g, '')}`,
      active: isWhatsappActive && !!whatsapp,
      icon: MessageSquare,
      color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900',
      hoverColor: 'hover:border-emerald-300 hover:bg-emerald-50/20'
    },
    {
      id: 'messenger',
      label: 'Facebook Messenger',
      value: 'Nous écrire',
      href: messenger.startsWith('http') ? messenger : `https://${messenger}`,
      active: isMessengerActive && !!messenger,
      icon: MessageSquare,
      color: 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-900',
      hoverColor: 'hover:border-sky-300 hover:bg-sky-50/20'
    },
    {
      id: 'facebook',
      label: 'Page Facebook',
      value: 'Faso Express',
      href: facebook.startsWith('http') ? facebook : `https://${facebook}`,
      active: isFacebookActive && !!facebook,
      icon: Facebook,
      color: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900',
      hoverColor: 'hover:border-blue-300 hover:bg-blue-50/20'
    },
    {
      id: 'email',
      label: 'Support par E-mail',
      value: email,
      href: `mailto:${email}`,
      active: isEmailActive && !!email,
      icon: Mail,
      color: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900',
      hoverColor: 'hover:border-rose-300 hover:bg-rose-50/20'
    },
  ].filter(method => method.active);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 z-10"
        >
          {/* Header Graphic */}
          <div className="bg-gradient-to-r from-orange-500 to-rose-500 p-6 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all text-white active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                <LifeBuoy className="w-6 h-6 animate-spin-slow" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight uppercase">Centre de Support</h3>
                <p className="text-white/80 text-[10px] font-bold uppercase tracking-wider">Faso Express à votre écoute</p>
              </div>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-6">
            {supportMethods.length > 0 ? (
              <div className="space-y-4">
                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center mb-4">
                  Choisissez un canal pour nous contacter directement
                </p>

                <div className="space-y-3">
                  {supportMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <a
                        key={method.id}
                        href={method.href}
                        target={method.id !== 'phone' && method.id !== 'email' ? '_blank' : undefined}
                        rel="noopener noreferrer"
                        className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border bg-white dark:bg-slate-800 transition-all duration-200 group",
                          "border-slate-100 dark:border-slate-700/60 shadow-sm",
                          method.hoverColor
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border shrink-0", method.color)}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                              {method.label}
                            </p>
                            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                              {method.value}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all" />
                      </a>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center flex flex-col items-center justify-center">
                <div className="w-14 h-14 bg-amber-50 dark:bg-amber-950/20 text-amber-500 border border-amber-100 dark:border-amber-900 rounded-2xl flex items-center justify-center mb-4">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">Canaux de support désactivés</h4>
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500 max-w-xs mt-2 leading-relaxed">
                  L'administrateur a temporairement restreint les accès directs de support. Veuillez réessayer ultérieurement.
                </p>
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-relaxed">
              FASO EXPRESS - SÉCURISÉ & TOUJOURS DISPONIBLE
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
