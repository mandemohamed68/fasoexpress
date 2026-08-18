import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { X, Sparkles, Tag, ExternalLink, Copy, Check, Gift, ArrowRight } from 'lucide-react';

export default function PromoInterstitialModal() {
  const { appConfig, profile } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dontShowToday, setDontShowToday] = useState(false);

  const promo = appConfig?.promoPopup;

  // Detect and strip default legacy placeholder values if an image is attached
  const hasImageUrl = Boolean(promo?.imageUrl?.trim());

  const clean = (val?: string) => val ? val.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

  const isDefaultTitle = !promo?.title || 
    clean(promo.title).includes("offre") || 
    clean(promo.title).includes("promotion") || 
    clean(promo.title).includes("bienvenue") || 
    clean(promo.title).includes("lancement") || 
    clean(promo.title).includes("titre");

  const isDefaultDesc = !promo?.description || 
    clean(promo.description).includes("beneficiez") || 
    clean(promo.description).includes("details") || 
    clean(promo.description).includes("description");

  const isDefaultBadge = !promo?.badgeText || 
    clean(promo.badgeText).includes("offre") || 
    clean(promo.badgeText).includes("exclusive") || 
    clean(promo.badgeText).includes("speciale") || 
    clean(promo.badgeText).includes("nouveaute") || 
    clean(promo.badgeText).includes("-20%");

  const isDefaultCta = !promo?.ctaText || 
    clean(promo.ctaText).includes("profiter") || 
    clean(promo.ctaText).includes("en savoir") || 
    clean(promo.ctaText).includes("offre");

  const isDefaultCode = !promo?.promoCode || 
    clean(promo.promoCode) === "promo2026" || 
    clean(promo.promoCode) === "faso2026";

  const displayTitle = (hasImageUrl && isDefaultTitle) ? "" : (promo?.title?.trim() || "");
  const displayDesc = (hasImageUrl && isDefaultDesc) ? "" : (promo?.description?.trim() || "");
  const displayBadge = (hasImageUrl && isDefaultBadge) ? "" : (promo?.badgeText?.trim() || "");
  const displayCta = (hasImageUrl && isDefaultCta) ? "" : (promo?.ctaText?.trim() || "");
  const displayCode = (hasImageUrl && isDefaultCode) ? "" : (promo?.promoCode?.trim() || "");

  useEffect(() => {
    if (!promo || !promo.enabled) {
      setIsOpen(false);
      return;
    }

    // 1. Audience Check
    const audience = promo.targetAudience || 'all';
    if (audience === 'clients' && profile?.role !== 'client') return;
    if (audience === 'drivers' && profile?.role !== 'driver') return;
    if (audience === 'guests' && profile) return;

    // 2. Frequency Check
    const popupId = promo.id || 'default_promo';
    const storageKey = `promo_seen_${popupId}`;
    const frequency = promo.frequency || 'once_per_day';

    if (frequency === 'once_per_session') {
      const seen = sessionStorage.getItem(storageKey);
      if (seen) return;
    } else if (frequency === 'once_per_day') {
      const lastSeenStr = localStorage.getItem(storageKey);
      if (lastSeenStr) {
        const lastSeen = parseInt(lastSeenStr, 10);
        const now = Date.now();
        // 24 hours in ms
        if (now - lastSeen < 24 * 60 * 60 * 1000) {
          return;
        }
      }
    }

    // Delay slightly for smooth page entry
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 700);

    return () => clearTimeout(timer);
  }, [promo, profile]);

  if (!isOpen || !promo || !promo.enabled) {
    return null;
  }

  const handleClose = () => {
    setIsOpen(false);

    const popupId = promo.id || 'default_promo';
    const storageKey = `promo_seen_${popupId}`;
    const frequency = promo.frequency || 'once_per_day';

    if (dontShowToday || frequency === 'once_per_day') {
      localStorage.setItem(storageKey, Date.now().toString());
    } else if (frequency === 'once_per_session') {
      sessionStorage.setItem(storageKey, 'true');
    }
  };

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (promo.promoCode) {
      navigator.clipboard.writeText(promo.promoCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCtaClick = () => {
    handleClose();
    if (promo.ctaTarget) {
      if (promo.ctaTarget.startsWith('http://') || promo.ctaTarget.startsWith('https://')) {
        window.open(promo.ctaTarget, '_blank');
      } else {
        navigate(promo.ctaTarget);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 transform transition-all animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Background Banner or Image Container */}
        <div 
          className={`relative ${promo.imageUrl ? 'bg-slate-50 dark:bg-slate-950 p-2 border-b border-slate-100 dark:border-slate-800 cursor-pointer' : 'h-44 sm:h-52 bg-gradient-to-br from-orange-500 via-amber-500 to-rose-500'} w-full overflow-hidden flex items-center justify-center`}
          onClick={handleCtaClick}
        >
          {promo.imageUrl ? (
            <img 
              src={promo.imageUrl} 
              alt={promo.title || "Promotion"} 
              className="max-w-full max-h-[380px] sm:max-h-[440px] w-auto h-auto object-contain mx-auto rounded-xl shadow-sm"
              onError={(e) => {
                // Hide broken image
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="relative z-10 text-center px-6">
              <div className="w-16 h-16 mx-auto mb-2 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-lg border border-white/30">
                <Gift className="w-8 h-8 animate-bounce" />
              </div>
              {displayBadge ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[11px] font-black uppercase tracking-widest border border-white/30 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  {displayBadge}
                </span>
              ) : null}
            </div>
          )}

          {/* Close button top right */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur-md transition-all shadow-md z-20"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Decorative badge overlay if image is present AND badgeText is provided */}
          {promo.imageUrl && displayBadge ? (
            <div className="absolute top-3 left-3 z-10">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-amber-300 text-[10px] font-black uppercase tracking-wider border border-white/20 shadow-sm">
                <Sparkles className="w-3 h-3" />
                {displayBadge}
              </span>
            </div>
          ) : null}
        </div>

        {/* Content Body (Only show text blocks if provided or if no image) */}
        <div className={`text-center ${hasImageUrl && !displayTitle && !displayDesc && !displayCode && !displayCta ? 'p-3 sm:p-4' : 'p-5 sm:p-6'}`}>
          {displayTitle ? (
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
              {displayTitle}
            </h2>
          ) : null}

          {!promo.imageUrl && !displayTitle ? (
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
              Offre Spéciale !
            </h2>
          ) : null}

          {displayDesc ? (
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              {displayDesc}
            </p>
          ) : null}

          {/* Promo Code Box */}
          {displayCode ? (
            <div className="mb-5 p-3.5 bg-amber-50 dark:bg-amber-950/40 border-2 border-dashed border-amber-300 dark:border-amber-700/60 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-left">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Code Promotionnel</p>
                  <p className="text-base font-black text-slate-900 dark:text-amber-200 tracking-widest font-mono">{displayCode}</p>
                </div>
              </div>

              <button
                onClick={handleCopyCode}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-200" />
                    <span>Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copier</span>
                  </>
                )}
              </button>
            </div>
          ) : null}

          {/* Action Buttons */}
          <div className="space-y-2">
            {displayCta ? (
              <button
                onClick={handleCtaClick}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <span>{displayCta}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : null}

            <button
              onClick={handleClose}
              className="w-full py-2 px-4 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              Non merci, ignorer
            </button>
          </div>

          {/* Don't show today option */}
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-2">
            <input
              type="checkbox"
              id="dontShowToday"
              checked={dontShowToday}
              onChange={(e) => setDontShowToday(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-300 text-orange-500 focus:ring-orange-400 cursor-pointer"
            />
            <label htmlFor="dontShowToday" className="text-[11px] font-medium text-slate-400 cursor-pointer select-none">
              Ne plus afficher cette offre aujourd'hui
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
