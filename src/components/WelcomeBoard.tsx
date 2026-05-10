import { useState, useEffect, CSSProperties } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { storage, Slide, getWordArtStyle, getWordArtClass } from '../lib/storage';
import { TEMPLATES } from '../constants';

function getBackgroundStyle(value: string, gradient?: string): CSSProperties {
  if (!value) return gradient ? { background: gradient } : {};
  if (value.startsWith('http') || value.startsWith('/') || value.startsWith('data:')) {
    return {
      backgroundImage: gradient ? `url(${value}), ${gradient}` : `url(${value})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  return { background: value };
}

export default function WelcomeBoard() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [settings, setSettings] = useState({ rotationSpeed: 10, autoPlay: true });

  useEffect(() => {
    const init = async () => {
      setSlides(await storage.getActiveSlides());
      setSettings(await storage.getSettings());
    };
    init();
    
    // Check for updates every 10 seconds
    const interval = setInterval(async () => {
      setSlides(await storage.getActiveSlides());
      setSettings(await storage.getSettings());
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (slides.length <= 1 || !settings.autoPlay) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, settings.rotationSpeed * 1000);

    return () => clearInterval(timer);
  }, [slides, settings]);

  if (slides.length === 0) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#050505]">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className="text-center"
        >
          <div className="w-24 h-24 mb-8 mx-auto border-t-2 border-white/20 rounded-full animate-spin"></div>
          <h2 className="text-white font-serif italic text-2xl opacity-50">載入中...</h2>
          <p className="text-gray-500 text-xs mt-4 uppercase tracking-[0.5em]">Modern Welcome System Activated</p>
        </motion.div>
      </div>
    );
  }

  const currentSlide = slides[currentIndex];
  const template = currentSlide.templateId ? TEMPLATES.find(t => t.id === currentSlide.templateId) : null;
  const theme = template?.theme || {
    textColor: 'text-white',
    accentColor: 'bg-white',
    fontFamily: 'sans',
    overlayOpacity: 0.1,
    titleSize: 'text-4xl md:text-6xl'
  };

  return (
    <div className="h-screen w-full relative bg-black overflow-hidden font-sans">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          {/* Background */}
          <div className="absolute inset-0 z-0 bg-[#0A0A0A]">
            <div 
              className="w-full h-full"
              style={getBackgroundStyle(currentSlide.imageUrl, template?.backgroundGradient)}
            />
            <div 
              className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent z-10" 
              style={{ opacity: theme.overlayOpacity * 2 }} 
            />
            <div 
              className="absolute inset-0 bg-black/10 z-10" 
              style={{ opacity: theme.overlayOpacity }}
            />
          </div>

          {/* Content Overlay */}
          <div className="absolute inset-0 z-20 pointer-events-none">
            {(currentSlide.lines || []).length === 0 ? (
              <div 
                className={`flex flex-col items-center w-full ${theme.textColor}`}
                style={{ paddingTop: `${currentSlide.verticalPadding ?? 70}%` }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 1 }}
                  className="text-center px-12"
                >
                  <div className="flex items-center gap-3 mb-2 justify-center">
                    <div className={`w-8 h-[1px] opacity-60 ${theme.textColor === 'text-white' ? 'bg-white' : 'bg-black'}`} />
                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.5em] opacity-80">WELCOME</span>
                  </div>
                  <h1 className={`${theme.titleSize} font-bold leading-tight tracking-tight mb-2 drop-shadow-lg ${theme.fontFamily === 'serif' ? 'font-serif' : 'font-sans'}`}>
                    {currentSlide.title || '歡迎光臨'}
                  </h1>
                  {currentSlide.subtitle && (
                    <p className={`text-lg md:text-xl font-light max-w-xl mx-auto leading-relaxed italic ${theme.fontFamily === 'serif' ? 'font-serif' : 'font-sans'} opacity-80`}>
                      {currentSlide.subtitle}
                    </p>
                  )}
                </motion.div>
              </div>
            ) : (
              currentSlide.lines.map((line, idx) => (
                <motion.div
                  key={line.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: line.opacity || 1, y: 0 }}
                  transition={{ delay: 0.5 + idx * 0.1, duration: 0.8 }}
                  className={`absolute ${theme.textColor}`}
                  style={{ 
                    left: `${line.x}%`, 
                    top: `${line.y}%`,
                    transform: `translate(${line.align === 'center' ? '-50%' : line.align === 'right' ? '-100%' : '0'}, -50%)`
                  }}
                >
                  {line.type === 'business-card' ? (
                      <div 
                        className={`flex flex-col gap-2 ${line.align === 'center' ? 'items-center' : line.align === 'right' ? 'items-end' : 'items-start'}`}
                        style={{ opacity: line.opacity }}
                      >
                        <div 
                          className={`${line.nameSize || line.fontSize} ${line.nameWeight || line.fontWeight} ${line.italic ? 'italic' : ''} ${line.nameFontFamily || line.fontFamily || 'font-sans'} ${getWordArtClass(line.nameTextEffect)} leading-tight tracking-tight drop-shadow-lg`}
                        style={{ ...getWordArtStyle(line.nameTextEffect, line.nameColor || line.color, line.nameEffectColor), ...(line.nameTextEffect && line.nameTextEffect !== 'none' ? {} : { color: line.nameColor || line.color }) }}
                      >
                        {line.name}
                      </div>
                      {line.jobTitle && (
                        <div 
                          className={`${line.jobTitleSize || 'text-2xl md:text-3xl'} ${line.jobTitleWeight || 'font-medium'} ${line.jobTitleFontFamily || line.fontFamily || 'font-sans'} ${getWordArtClass(line.jobTitleTextEffect)} leading-tight drop-shadow-sm transition-opacity`}
                          style={{ ...getWordArtStyle(line.jobTitleTextEffect, line.jobTitleColor || line.color, line.jobTitleEffectColor), opacity: line.jobTitleColor ? 1 : 0.7, ...(line.jobTitleTextEffect && line.jobTitleTextEffect !== 'none' ? {} : { color: line.jobTitleColor || line.color }) }}
                        >
                          {line.jobTitle}
                        </div>
                      )}
                      {line.companyName && (
                        <div 
                          className={`${line.companyNameSize || 'text-xl md:text-2xl'} ${line.companyNameWeight || 'font-light'} ${line.companyNameFontFamily || line.fontFamily || 'font-sans'} ${getWordArtClass(line.companyNameTextEffect)} italic mt-1`}
                          style={{ ...getWordArtStyle(line.companyNameTextEffect, line.companyNameColor || line.color, line.companyNameEffectColor), opacity: line.companyNameColor ? 1 : 0.5, ...(line.companyNameTextEffect && line.companyNameTextEffect !== 'none' ? {} : { color: line.companyNameColor || line.color }) }}
                        >
                          {line.companyName}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div 
                      className={`${line.fontSize} ${line.fontWeight} ${line.italic ? 'italic' : ''} ${line.fontFamily || (line.italic ? 'font-serif' : 'font-sans')} ${getWordArtClass(line.textEffect)} leading-tight tracking-tight drop-shadow-lg whitespace-pre-wrap ${line.align === 'center' ? 'text-center' : line.align === 'right' ? 'text-right' : 'text-left'}`}
                      style={{ ...getWordArtStyle(line.textEffect, line.color, line.effectColor), opacity: line.opacity }}
                    >
                      {line.text}
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>

          {/* Progress Indicators */}
          <div className="absolute bottom-12 right-12 z-30 flex items-center gap-4">
             {slides.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-1 transition-all duration-500 rounded-full ${idx === currentIndex ? 'w-12 bg-white' : 'w-2 bg-white/20'}`}
                />
             ))}
             <span className="text-white/40 text-[10px] font-bold tracking-widest ml-4">
               {String(currentIndex + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
             </span>
          </div>

          {/* Vertical Decor Text */}
          <div className="absolute top-12 right-12 z-20 hidden md:block">
            <p className="text-white/20 text-[10px] font-bold uppercase tracking-[1em] whitespace-nowrap" style={{ writingMode: 'vertical-rl' }}>
              MODERN WELCOME DISPLAY SYSTEM — EST 2024
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
