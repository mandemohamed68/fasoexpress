import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/apiService';
import { AppConfig } from '../types';

export const FlashTicker: React.FC = () => {
  const { profile, appConfig: config } = useAuth();

  if (!config?.flashInfoActive || !config.flashInfoMessages || config.flashInfoMessages.length === 0) return null;

  // Check audience - Allow during loading if audience is 'all'
  if (config.flashInfoAudience === 'client' && profile?.role !== 'client') return null;
  if (config.flashInfoAudience === 'driver' && profile?.role !== 'driver') return null;

  const bgColor = config.flashInfoColor || '#f97316';

  return (
    <div className="w-full z-[60] h-7 sm:h-8 flex items-center overflow-hidden pointer-events-none border-y border-white/10 shadow-inner" style={{ backgroundColor: bgColor }}>
      <div className="flex whitespace-nowrap w-full">
        <motion.div
          animate={{ x: ["100%", "-100%"] }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="flex gap-20 items-center px-4"
        >
          {config.flashInfoMessages.map((msg, i) => (
            <span key={i} className="text-white text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-4 drop-shadow-sm">
              <span className="w-1 h-1 rounded-full bg-white/60" />
              {msg}
            </span>
          ))}
          {config.flashInfoMessages.length < 3 && config.flashInfoMessages.map((msg, i) => (
            <span key={`dup-${i}`} className="text-white text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-4 drop-shadow-sm">
              <span className="w-1 h-1 rounded-full bg-white/60" />
              {msg}
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
};
