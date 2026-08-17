import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { StatusBar, Style } from '@capacitor/status-bar';

// Helper to calculate a matching darker shade for hover states
function darkenColor(hex: string, percent: number): string {
  try {
    hex = hex.replace(/^\s*#|\s*$/g, '');
    if (hex.length === 3) {
      hex = hex.replace(/(.)/g, '$1$1');
    }
    let r = parseInt(hex.substr(0, 2), 16);
    let g = parseInt(hex.substr(2, 2), 16);
    let b = parseInt(hex.substr(4, 2), 16);

    r = Math.max(0, Math.min(255, Math.round(r * (1 - percent))));
    g = Math.max(0, Math.min(255, Math.round(g * (1 - percent))));
    b = Math.max(0, Math.min(255, Math.round(b * (1 - percent))));

    const rHex = r.toString(16).padStart(2, '0');
    const gHex = g.toString(16).padStart(2, '0');
    const bHex = b.toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
  } catch (e) {
    return '#ea580c'; // Fallback
  }
}

// Helper to calculate hex to rgb string for rgba CSS usage
function hexToRgb(hex: string): string {
  try {
    hex = hex.replace(/^\s*#|\s*$/g, '');
    if (hex.length === 3) {
      hex = hex.replace(/(.)/g, '$1$1');
    }
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `${r}, ${g}, ${b}`;
  } catch (e) {
    return '249, 115, 22';
  }
}

// Helper to detect if a color is dark (for status bar icon contrast)
function isColorDark(hex: string): boolean {
  try {
    hex = hex.replace(/^\s*#|\s*$/g, '');
    if (hex.length === 3) {
      hex = hex.replace(/(.)/g, '$1$1');
    }
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    // HSP equation
    const hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
    return hsp < 127.5;
  } catch (e) {
    return true;
  }
}

export default function BrandingThemeManager() {
  const { appConfig } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const theme = appConfig?.brandingTheme || 'standard';
  const appName = appConfig?.appName || 'FASO EXPRESS';
  const appSlogan = appConfig?.appSlogan;
  const logoUrl = appConfig?.logoUrl;
  
  // Decide which specific visual effect to run
  const showSnow = appConfig?.fallingSnow || theme === 'christmas';
  const showFireworks = appConfig?.fireworks || theme === 'newyear';
  const showHearts = theme === 'valentines';
  const showRain = theme === 'rainy';
  const showHarmattan = theme === 'harmattan';
  const showRamadan = theme === 'ramadan';
  const showBurkina = theme === 'burkina';
  const showSpring = theme === 'spring';
  const showDecorations = appConfig?.decorationsEnabled;

  const hasAnyEffect = showSnow || showFireworks || showHearts || showRain || showHarmattan || showRamadan || showBurkina || showSpring;

  // 1. Dynamic CSS Custom Properties, Mobile Theme Color & Native StatusBar Integration
  useEffect(() => {
    const root = document.documentElement;

    let primary = '#f97316';      // default orange-500
    let primaryDark = '#ea580c';  // default orange-600

    if (theme === 'christmas') {
      primary = '#ef4444';      // Christmas Red
      primaryDark = '#b91c1c';  // Darker Red
    } else if (theme === 'newyear') {
      primary = '#d97706';      // Festive Gold
      primaryDark = '#92400e';  // Bronze Gold
    } else if (theme === 'independenceday' || theme === 'burkina') {
      primary = '#10b981';      // Burkina Green
      primaryDark = '#ef4444';  // Burkina Red
    } else if (theme === 'valentines') {
      primary = '#db2777';      // Valentine Pink
      primaryDark = '#9d174d';  // Dark Valentine Pink
    } else if (theme === 'rainy') {
      primary = '#0284c7';      // Ocean Rain Blue
      primaryDark = '#0369a1';  // Darker Rain Blue
    } else if (theme === 'harmattan') {
      primary = '#d97706';      // Warm Sand/Amber
      primaryDark = '#78350f';  // Earthy Brown
    } else if (theme === 'ramadan') {
      primary = '#059669';      // Emerald Green
      primaryDark = '#047857';  // Forest Green
    } else if (theme === 'spring') {
      primary = '#ec4899';      // Blossom Pink
      primaryDark = '#059669';  // Leaf Green
    } else if (theme === 'custom') {
      primary = appConfig?.primaryColor || '#f97316';
      primaryDark = appConfig?.secondaryColor || darkenColor(primary, 0.15);
    } else {
      // Standard / classic (Default)
      primary = appConfig?.primaryColor || '#f97316';
      primaryDark = appConfig?.secondaryColor || darkenColor(primary, 0.15);
    }

    const rgb = hexToRgb(primary);

    // Set properties on document root for Tailwind CSS and styling
    root.style.setProperty('--color-primary', primary);
    root.style.setProperty('--color-primary-dark', primaryDark);
    root.style.setProperty('--primary-rgb', rgb);

    // --- Dynamic Mobile Browser & OS Meta Tags ---
    let metaThemeColor = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.content = primary;

    let metaAppleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement | null;
    if (!metaAppleTitle) {
      metaAppleTitle = document.createElement('meta');
      metaAppleTitle.name = 'apple-mobile-web-app-title';
      document.head.appendChild(metaAppleTitle);
    }
    metaAppleTitle.content = appName;

    // Dynamic document title
    document.title = appSlogan ? `${appName} • ${appSlogan}` : appName;

    // Dynamic favicon if logoUrl is customized
    if (logoUrl) {
      let iconLink = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
      if (!iconLink) {
        iconLink = document.createElement('link');
        iconLink.rel = 'icon';
        document.head.appendChild(iconLink);
      }
      iconLink.href = logoUrl;
    }

    // --- Dynamic Native Mobile Capacitor Status Bar (Android / iOS) ---
    try {
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
        StatusBar.setBackgroundColor({ color: primary }).catch(() => {});
        const dark = isColorDark(primary);
        StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {});
      }
    } catch (e) {
      // Graceful fallback for web/PWA
    }
  }, [theme, appConfig?.primaryColor, appConfig?.secondaryColor, appName, appSlogan, logoUrl]);

  // 2. High-Performance Mobile-Optimized Canvas Animation Engine
  useEffect(() => {
    if (!hasAnyEffect) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const isMobileScreen = width < 768;

    // Dynamic scale or particle arrays based on active theme and screen size
    const particles: any[] = [];
    const maxParticles = isMobileScreen 
      ? (showRain ? 60 : (showHarmattan ? 70 : (showFireworks ? 0 : 35)))
      : (showRain ? 120 : (showHarmattan ? 150 : (showFireworks ? 0 : 60)));

    // Particle factory
    const createParticle = (isInit = false) => {
      const x = Math.random() * width;
      const y = isInit ? Math.random() * height : -20;
      
      if (showSnow) {
        return {
          type: 'snow',
          x,
          y,
          radius: Math.random() * 3 + 1,
          speed: Math.random() * 1.5 + 0.5,
          drift: Math.random() * 1 - 0.5,
          opacity: Math.random() * 0.6 + 0.3,
        };
      }
      if (showHearts) {
        return {
          type: 'heart',
          x,
          y: isInit ? Math.random() * height : height + 20, // Rise from bottom
          size: Math.random() * (isMobileScreen ? 10 : 12) + 5,
          speed: -(Math.random() * 1.2 + 0.4),
          drift: Math.random() * 0.6 - 0.3,
          opacity: Math.random() * 0.5 + 0.4,
          color: Math.random() > 0.5 ? '#db2777' : '#f43f5e',
        };
      }
      if (showRain) {
        return {
          type: 'rain',
          x,
          y: isInit ? Math.random() * height : -50,
          length: Math.random() * 18 + 12,
          speed: Math.random() * 8 + 12,
          opacity: Math.random() * 0.4 + 0.2,
          splashes: [],
        };
      }
      if (showHarmattan) {
        return {
          type: 'harmattan',
          x: isInit ? Math.random() * width : -20, // horizontal wind
          y: Math.random() * height,
          radius: Math.random() * 2 + 0.5,
          speedX: Math.random() * 2 + 1.5,
          speedY: Math.random() * 0.4 - 0.2,
          opacity: Math.random() * 0.4 + 0.1,
          color: Math.random() > 0.6 ? '#f59e0b' : '#d97706',
        };
      }
      if (showRamadan) {
        return {
          type: 'ramadan',
          x,
          y,
          size: Math.random() * 6 + 4,
          speed: Math.random() * 0.2 + 0.1,
          twinkleSpeed: Math.random() * 0.05 + 0.02,
          twinkleDir: 1,
          opacity: Math.random() * 0.8 + 0.2,
          shape: Math.random() > 0.85 ? 'moon' : 'star',
        };
      }
      if (showBurkina) {
        return {
          type: 'burkina',
          x,
          y,
          size: Math.random() * 8 + 5,
          speed: Math.random() * 1.5 + 1.0,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: Math.random() * 0.05 - 0.025,
          color: Math.random() > 0.66 ? '#10b981' : (Math.random() > 0.5 ? '#ef4444' : '#eab308'),
          shape: Math.random() > 0.5 ? 'confetti' : 'star',
        };
      }
      if (showSpring) {
        return {
          type: 'spring',
          x,
          y,
          size: Math.random() * 7 + 4,
          speed: Math.random() * 1.0 + 0.5,
          waveSpeed: Math.random() * 0.02 + 0.01,
          wavePhase: Math.random() * Math.PI * 2,
          rotation: Math.random() * Math.PI,
          rotSpeed: Math.random() * 0.02,
          opacity: Math.random() * 0.7 + 0.3,
        };
      }
      return null;
    };

    // Populate initial particles
    for (let i = 0; i < maxParticles; i++) {
      const p = createParticle(true);
      if (p) particles.push(p);
    }

    // --- Special Fireworks engine components ---
    interface FireworkParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      alpha: number;
      decay: number;
      color: string;
      size: number;
    }
    interface Rocket {
      x: number;
      y: number;
      tx: number;
      ty: number;
      speed: number;
      angle: number;
      color: string;
    }

    const fireworkParticles: FireworkParticle[] = [];
    const rockets: Rocket[] = [];
    const fwColors = ['#ffd700', '#ff4500', '#00ff00', '#00ffff', '#ff00ff', '#ff1493', '#ffffff'];

    const spawnRocket = () => {
      if (rockets.length >= (isMobileScreen ? 2 : 3)) return;
      const x = Math.random() * width;
      const tx = x + (Math.random() * 160 - 80);
      const ty = Math.random() * (height * 0.4) + height * 0.1;
      const color = fwColors[Math.floor(Math.random() * fwColors.length)];
      rockets.push({
        x,
        y: height,
        tx,
        ty,
        speed: Math.random() * 3 + 5,
        angle: Math.atan2(ty - height, tx - x),
        color,
      });
    };

    const explode = (x: number, y: number, color: string) => {
      const count = isMobileScreen ? 25 : 40;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4.5 + 1.2;
        fireworkParticles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          decay: Math.random() * 0.02 + 0.012,
          color,
          size: Math.random() * 2 + 1,
        });
      }
    };

    // Handle Window Resize
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    let frameTick = 0;

    // --- Main Loop ---
    const drawAndLoop = () => {
      frameTick++;

      // Clear Canvas
      if (showFireworks) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'source-over';
      } else {
        ctx.clearRect(0, 0, width, height);
      }

      // 1. Process Standard Particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (p.type === 'snow') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
          ctx.fill();

          p.y += p.speed;
          p.x += p.drift;

          if (p.y > height) {
            particles[i] = createParticle(false);
          }
        } 
        else if (p.type === 'heart') {
          // Draw heart using curves
          ctx.save();
          ctx.globalAlpha = p.opacity;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          const scale = p.size / 10;
          ctx.translate(p.x, p.y);
          ctx.moveTo(0, -scale * 3);
          ctx.bezierCurveTo(-scale * 5, -scale * 7, -scale * 10, -scale * 2, 0, scale * 6);
          ctx.bezierCurveTo(scale * 10, -scale * 2, scale * 5, -scale * 7, 0, -scale * 3);
          ctx.fill();
          ctx.restore();

          p.y += p.speed;
          p.x += Math.sin(p.y / 40) * 0.3;

          if (p.y < -20) {
            particles[i] = createParticle(false);
          }
        }
        else if (p.type === 'rain') {
          // Draw rain streak
          ctx.beginPath();
          ctx.strokeStyle = `rgba(186, 230, 253, ${p.opacity})`;
          ctx.lineWidth = 1.2;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - 2, p.y + p.length);
          ctx.stroke();

          // Draw splash ripples if near the bottom
          if (p.y + p.length > height - 10) {
            p.splashes.push({ radius: 1, maxRadius: Math.random() * 10 + 5, alpha: 0.8 });
            p.y = -50;
            p.x = Math.random() * width;
          } else {
            p.y += p.speed;
            p.x -= 0.5;
          }

          // Draw the splash rings
          for (let sIdx = p.splashes.length - 1; sIdx >= 0; sIdx--) {
            const spl = p.splashes[sIdx];
            ctx.beginPath();
            ctx.ellipse(p.x, height - 5, spl.radius, spl.radius * 0.3, 0, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(186, 230, 253, ${spl.alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();

            spl.radius += 1.5;
            spl.alpha -= 0.08;
            if (spl.alpha <= 0 || spl.radius > spl.maxRadius) {
              p.splashes.splice(sIdx, 1);
            }
          }
        }
        else if (p.type === 'harmattan') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.opacity;
          ctx.fill();
          ctx.globalAlpha = 1;

          p.x += p.speedX;
          p.y += p.speedY;

          if (p.x > width) {
            particles[i] = createParticle(false);
          }
        }
        else if (p.type === 'ramadan') {
          ctx.save();
          ctx.globalAlpha = p.opacity;
          ctx.fillStyle = '#fef08a';

          if (p.shape === 'moon') {
            ctx.translate(p.x, p.y);
            ctx.beginPath();
            ctx.arc(0, 0, p.size, -Math.PI / 2, Math.PI / 2, false);
            ctx.bezierCurveTo(p.size * 0.4, p.size, p.size * 0.4, -p.size, 0, -Math.PI / 2);
            ctx.fill();
          } else {
            ctx.translate(p.x, p.y);
            ctx.beginPath();
            ctx.moveTo(0, -p.size);
            ctx.quadraticCurveTo(0, 0, p.size, 0);
            ctx.quadraticCurveTo(0, 0, 0, p.size);
            ctx.quadraticCurveTo(0, 0, -p.size, 0);
            ctx.quadraticCurveTo(0, 0, 0, -p.size);
            ctx.fill();
          }
          ctx.restore();

          p.opacity += p.twinkleSpeed * p.twinkleDir;
          if (p.opacity >= 0.95) { p.twinkleDir = -1; }
          else if (p.opacity <= 0.15) { p.twinkleDir = 1; }

          p.y += p.speed;
          if (p.y > height + 20) {
            particles[i] = createParticle(false);
          }
        }
        else if (p.type === 'burkina') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;

          if (p.shape === 'star') {
            ctx.beginPath();
            for (let k = 0; k < 5; k++) {
              ctx.lineTo(Math.cos((18 + k * 72) * Math.PI / 180) * p.size, -Math.sin((18 + k * 72) * Math.PI / 180) * p.size);
              ctx.lineTo(Math.cos((54 + k * 72) * Math.PI / 180) * (p.size/2), -Math.sin((54 + k * 72) * Math.PI / 180) * (p.size/2));
            }
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          }
          ctx.restore();

          p.y += p.speed;
          p.rotation += p.rotSpeed;

          if (p.y > height + 20) {
            particles[i] = createParticle(false);
          }
        }
        else if (p.type === 'spring') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.globalAlpha = p.opacity;
          
          ctx.fillStyle = '#fbcfe8';
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#f472b6';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(-p.size, 0);
          ctx.lineTo(p.size, 0);
          ctx.stroke();

          ctx.restore();

          p.y += p.speed;
          p.x += Math.sin(p.wavePhase + p.y * p.waveSpeed) * 0.4;
          p.rotation += p.rotSpeed;

          if (p.y > height + 20) {
            particles[i] = createParticle(false);
          }
        }
      }

      // 2. Process Fireworks
      if (showFireworks) {
        if (frameTick % (isMobileScreen ? 45 : 35) === 0) {
          spawnRocket();
        }

        for (let j = rockets.length - 1; j >= 0; j--) {
          const r = rockets[j];
          const rSpeedX = Math.cos(r.angle) * r.speed;
          const rSpeedY = Math.sin(r.angle) * r.speed;
          r.x += rSpeedX;
          r.y += rSpeedY;

          ctx.beginPath();
          ctx.arc(r.x, r.y, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = r.color;
          ctx.shadowBlur = 8;
          ctx.shadowColor = r.color;
          ctx.fill();

          const dist = Math.hypot(r.tx - r.x, r.ty - r.y);
          if (dist < 8 || r.y <= r.ty) {
            explode(r.x, r.y, r.color);
            rockets.splice(j, 1);
          }
        }

        for (let k = fireworkParticles.length - 1; k >= 0; k--) {
          const fp = fireworkParticles[k];
          fp.x += fp.vx;
          fp.y += fp.vy;
          fp.vy += 0.04;
          fp.alpha -= fp.decay;

          if (fp.alpha <= 0) {
            fireworkParticles.splice(k, 1);
            continue;
          }

          ctx.save();
          ctx.globalAlpha = fp.alpha;
          ctx.beginPath();
          ctx.arc(fp.x, fp.y, fp.size, 0, Math.PI * 2);
          ctx.fillStyle = fp.color;
          ctx.shadowBlur = 4;
          ctx.shadowColor = fp.color;
          ctx.fill();
          ctx.restore();
        }

        ctx.shadowBlur = 0;
      }

      animationId = requestAnimationFrame(drawAndLoop);
    };

    drawAndLoop();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [hasAnyEffect, showSnow, showFireworks, showHearts, showRain, showHarmattan, showRamadan, showBurkina, showSpring]);

  // Render Corner Ornaments based on active seasonal theme
  const renderCornerDecorations = () => {
    if (!showDecorations || theme === 'standard' || theme === 'classic') return null;

    if (theme === 'christmas') {
      return (
        <div className="fixed top-0 left-0 right-0 h-0 pointer-events-none z-[9999] flex justify-between px-2">
          {/* Top Left Ornament */}
          <div className="w-14 sm:w-16 h-14 sm:h-16 opacity-95 animate-bounce" style={{ animationDuration: '3s' }}>
            <svg viewBox="0 0 100 100" className="w-full h-full filter drop-shadow-md">
              <rect x="48" y="0" width="4" height="40" fill="#94a3b8" />
              <circle cx="50" cy="55" r="20" fill="#ef4444" />
              <path d="M45,45 Q50,30 55,45 Z" fill="#eab308" />
              <path d="M35,55 C35,65 65,65 65,55" stroke="#ffffff" strokeWidth="2" strokeDasharray="4,4" fill="none" />
            </svg>
          </div>
          {/* Top Right Ornament */}
          <div className="w-14 sm:w-16 h-14 sm:h-16 opacity-95 animate-bounce" style={{ animationDuration: '4s' }}>
            <svg viewBox="0 0 100 100" className="w-full h-full filter drop-shadow-md">
              <rect x="48" y="0" width="4" height="45" fill="#94a3b8" />
              <circle cx="50" cy="60" r="18" fill="#10b981" />
              <path d="M45,50 Q50,35 55,50 Z" fill="#eab308" />
              <circle cx="50" cy="60" r="8" fill="#fbbf24" />
            </svg>
          </div>
        </div>
      );
    }

    if (theme === 'newyear') {
      return (
        <div className="fixed top-0 left-0 right-0 h-0 pointer-events-none z-[9999] flex justify-between px-2 sm:px-4 pt-1">
          <div className="text-[11px] sm:text-[14px] font-black tracking-widest text-[#fef08a] animate-pulse bg-slate-900/80 px-2.5 py-1 rounded-full border border-[#fef08a]/20">✨ Bonne Année 2026 ! ✨</div>
          <div className="text-[11px] sm:text-[14px] font-black tracking-widest text-[#fef08a] animate-pulse bg-slate-900/80 px-2.5 py-1 rounded-full border border-[#fef08a]/20">🎉 Meilleurs Vœux 🎉</div>
        </div>
      );
    }

    if (theme === 'valentines') {
      return (
        <div className="fixed top-0 left-0 right-0 h-0 pointer-events-none z-[9999] flex justify-between px-4 sm:px-6 pt-2">
          <div className="w-6 sm:w-8 h-6 sm:h-8 animate-pulse text-pink-500">
            <svg fill="currentColor" viewBox="0 0 24 24" className="w-full h-full filter drop-shadow">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
          <div className="w-6 sm:w-8 h-6 sm:h-8 animate-pulse text-rose-500" style={{ animationDelay: '1s' }}>
            <svg fill="currentColor" viewBox="0 0 24 24" className="w-full h-full filter drop-shadow">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
        </div>
      );
    }

    if (theme === 'ramadan') {
      return (
        <div className="fixed top-0 left-0 right-0 h-0 pointer-events-none z-[9999] flex justify-between px-4 sm:px-6 pt-3">
          <div className="w-7 sm:w-10 h-7 sm:h-10 text-emerald-300">
            <svg fill="currentColor" viewBox="0 0 24 24" className="w-full h-full drop-shadow">
              <path d="M12 2l2.4 5.3 5.3 2.4-5.3 2.4-2.4 5.3-2.4-5.3-5.3-2.4 5.3-2.4z"/>
            </svg>
          </div>
          <div className="w-7 sm:w-10 h-7 sm:h-10 text-amber-300 animate-pulse">
            <svg fill="currentColor" viewBox="0 0 24 24" className="w-full h-full drop-shadow">
              <path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.39 5.39 0 01-4.4 2.26 5.4 5.4 0 010-10.8c1.37 0 2.6.51 3.53 1.36C19.11 3.44 15.79 3 12 3z"/>
            </svg>
          </div>
        </div>
      );
    }

    if (theme === 'burkina') {
      return (
        <div className="fixed top-0 left-0 right-0 h-0 pointer-events-none z-[9999] flex justify-between px-4 sm:px-6 pt-2">
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-emerald-500/20">
            <span className="w-2.5 h-1.5 bg-[#ef4444] inline-block" />
            <span className="w-2.5 h-1.5 bg-[#10b981] inline-block" />
            <span className="text-[9px] sm:text-[10px] font-black text-white tracking-widest uppercase">Faso Uni 🇧🇫</span>
          </div>
          <div className="text-[#fbbf24] animate-spin text-[14px] sm:text-[16px] leading-none" style={{ animationDuration: '10s' }}>★</div>
        </div>
      );
    }

    if (theme === 'spring') {
      return (
        <div className="fixed top-0 left-0 right-0 h-0 pointer-events-none z-[9999] flex justify-between px-4 sm:px-6 pt-1">
          <span className="text-[14px] sm:text-[16px] animate-bounce">🌸</span>
          <span className="text-[14px] sm:text-[16px] animate-bounce" style={{ animationDelay: '0.5s' }}>🌿</span>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        className={`fixed inset-0 w-full h-full pointer-events-none z-[45] ${hasAnyEffect ? 'block' : 'hidden'}`}
      />
      {renderCornerDecorations()}
    </>
  );
}
