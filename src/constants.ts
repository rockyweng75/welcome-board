
export interface Template {
  id: string;
  name: string;
  layout: 'left' | 'center' | 'right' | 'full';
  backgroundUrl: string;      // local path e.g. /presets/t-elegant.jpg, or CSS gradient fallback
  backgroundGradient: string; // CSS gradient shown when backgroundUrl image is absent
  theme: {
    textColor: string;
    accentColor: string;
    fontFamily: 'serif' | 'sans';
    overlayOpacity: number;
    titleSize: string; // Tailwind class
  };
}

export const TEMPLATES: Template[] = [
  {
    id: 't-elegant',
    name: '典雅商務',
    layout: 'left',
    backgroundUrl: '/presets/t-elegant.jpg',
    backgroundGradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    theme: {
      textColor: 'text-white',
      accentColor: 'bg-orange-500',
      fontFamily: 'serif',
      overlayOpacity: 0.4,
      titleSize: 'text-4xl md:text-6xl'
    }
  },
  {
    id: 't-modern-centered',
    name: '簡約置中',
    layout: 'center',
    backgroundUrl: '/presets/t-modern-centered.jpg',
    backgroundGradient: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
    theme: {
      textColor: 'text-white',
      accentColor: 'bg-blue-500',
      fontFamily: 'sans',
      overlayOpacity: 0.3,
      titleSize: 'text-5xl md:text-7xl'
    }
  },
  {
    id: 't-bold-dark',
    name: '沉穩深色',
    layout: 'right',
    backgroundUrl: '/presets/t-bold-dark.jpg',
    backgroundGradient: 'linear-gradient(135deg, #1c1c1c 0%, #2d2d2d 100%)',
    theme: {
      textColor: 'text-white',
      accentColor: 'bg-white',
      fontFamily: 'sans',
      overlayOpacity: 0.6,
      titleSize: 'text-6xl md:text-8xl'
    }
  },
  {
    id: 't-nature-soft',
    name: '清新自然',
    layout: 'left',
    backgroundUrl: '/presets/t-nature-soft.jpg',
    backgroundGradient: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
    theme: {
      textColor: 'text-white',
      accentColor: 'bg-green-500',
      fontFamily: 'serif',
      overlayOpacity: 0.2,
      titleSize: 'text-4xl md:text-6xl'
    }
  },
  {
    id: 't-vip-gold',
    name: '尊榮金典',
    layout: 'center',
    backgroundUrl: '/presets/t-vip-gold.jpg',
    backgroundGradient: 'linear-gradient(135deg, #7b6208 0%, #c8a951 50%, #7b6208 100%)',
    theme: {
      textColor: 'text-white',
      accentColor: 'bg-amber-400',
      fontFamily: 'serif',
      overlayOpacity: 0.6,
      titleSize: 'text-6xl md:text-8xl'
    }
  },
  {
    id: 't-vip-modern',
    name: '極簡貴賓',
    layout: 'left',
    backgroundUrl: '/presets/t-vip-modern.jpg',
    backgroundGradient: 'linear-gradient(135deg, #232526 0%, #414345 100%)',
    theme: {
      textColor: 'text-white',
      accentColor: 'bg-white',
      fontFamily: 'sans',
      overlayOpacity: 0.4,
      titleSize: 'text-5xl md:text-7xl'
    }
  }
];
