
export interface TextLine {
  id: string;
  type?: 'standard' | 'business-card';
  text: string;
  color?: string; // Custom hex color
  // Business Card fields
  name?: string;
  nameSize?: string;
  nameWeight?: string;
  nameColor?: string;
  nameFontFamily?: string;
  nameTextEffect?: string;
  nameEffectColor?: string;
  jobTitle?: string;
  jobTitleSize?: string;
  jobTitleWeight?: string;
  jobTitleColor?: string;
  jobTitleFontFamily?: string;
  jobTitleTextEffect?: string;
  jobTitleEffectColor?: string;
  companyName?: string;
  companyNameSize?: string;
  companyNameWeight?: string;
  companyNameColor?: string;
  companyNameFontFamily?: string;
  companyNameTextEffect?: string;
  companyNameEffectColor?: string;
  // Common fields
  fontFamily?: string;
  textEffect?: string;
  effectColor?: string;
  fontSize: string;
  fontWeight: string;
  italic: boolean;
  opacity: number;
  align: 'left' | 'center' | 'right';
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
}

export interface Slide {
  id: string;
  imageUrl: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  title: string;
  subtitle: string;
  expiresAt: string; // ISO string
  createdAt: string; // ISO string
  order: number;
  templateId?: string;
  lines?: TextLine[];
  verticalPadding?: number; // 0-100 to represent percentage from top
  isDefault?: boolean;
}

export const getWordArtStyle = (effect?: string, baseColor: string = '#ffffff', effectColor?: string) => {
  const eColor = effectColor || baseColor;
  if (!effect || effect === 'none') return { color: baseColor };
  switch (effect) {
    case 'neon':
      return { 
        color: '#ffffff', 
        textShadow: `0 0 10px ${eColor}, 0 0 20px ${eColor}, 0 0 40px ${eColor}, 0 0 80px ${eColor}` 
      };
    case '3d':
      return { 
        color: baseColor, 
        textShadow: `1px 1px 0px #333, 2px 2px 0px #333, 3px 3px 0px #333, 4px 4px 0px #333, 5px 5px 0px #333, 6px 6px 15px rgba(0,0,0,0.6)` 
      };
    case 'stroke':
      return { 
        color: 'transparent', 
        WebkitTextStroke: `2px ${eColor}`, 
        filter: 'drop-shadow(2px 2px 0px rgba(0,0,0,0.3))' 
      };
    default:
      // 對於漸層 (gold, silver, bronze) 會另外套用 css class
      return { color: baseColor };
  }
};

export const getWordArtClass = (effect?: string) => {
  if (!effect || effect === 'none') return '';
  if (['gold', 'silver', 'bronze'].includes(effect)) {
    return `wordart-${effect}`;
  }
  return '';
};



export interface AppSettings {
  rotationSpeed: number;
  autoPlay: boolean;
  uiFontSize?: number;
  welcomeMessages?: string[];
}

export const DEFAULT_WELCOME_MESSAGES = [
  '竭誠歡迎 蒞臨指導',
  '期待您的光臨與合作',
  '歡迎尊榮貴賓 蒞臨本公司',
  '與您攜手 共創未來',
  '志同道合 歡迎蒞臨',
  '您的到來 是我們的榮幸',
  '感謝支持 歡迎參訪'
];

const DEFAULT_SETTINGS: AppSettings = {
  rotationSpeed: 10,
  autoPlay: true,
  uiFontSize: 12,
  welcomeMessages: DEFAULT_WELCOME_MESSAGES
};

export const storage = {
  getSlides: async (): Promise<Slide[]> => {
    try {
      const resp = await fetch('/api/slides');
      if (!resp.ok) throw new Error('Failed to fetch slides');
      return await resp.json();
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  uploadPreset: async (id: string, dataUri: string): Promise<string> => {
    const res = await fetch('/api/upload/preset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, data: dataUri }),
    });
    if (!res.ok) throw new Error('Failed to upload preset image');
    const json = await res.json();
    return json.url;
  },
  
  getSettings: async (): Promise<AppSettings> => {
    try {
      const resp = await fetch('/api/settings');
      if (!resp.ok) throw new Error('Failed to fetch settings');
      const data = await resp.json();
      return { ...DEFAULT_SETTINGS, ...data };
    } catch (err) {
      console.error(err);
      return DEFAULT_SETTINGS;
    }
  },

  updateSettings: async (settings: Partial<AppSettings>) => {
    try {
      const current = await storage.getSettings();
      const updated = { ...current, ...settings };
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch (err) {
      console.error(err);
    }
  },
  
  getActiveSlides: async (): Promise<Slide[]> => {
    const slides = await storage.getSlides();
    const now = new Date().toISOString();
    const active = slides
      .filter(slide => slide.expiresAt > now)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    if (active.length === 0) {
      const defaultSlide = await storage.getDefaultSlide();
      return [defaultSlide];
    }
    return active;
  },

  getDefaultSlide: async (): Promise<Slide> => {
    try {
      const resp = await fetch('/api/default-slide');
      if (!resp.ok) throw new Error('Failed to fetch default slide');
      return await resp.json();
    } catch (err) {
      console.error(err);
      return {
        id: 'default-home',
        imageUrl: '',
        title: '歡迎光臨',
        subtitle: 'Welcome',
        lines: [{ 
          id: '1', 
          text: '歡迎光臨', 
          fontSize: '100', 
          fontWeight: 'black', 
          italic: true, 
          opacity: 1, 
          align: 'center', 
          x: 50, 
          y: 50,
          color: '#FFFFFF' 
        }],
        expiresAt: '2099-12-31T23:59:59.999Z',
        createdAt: new Date().toISOString(),
        order: 0,
        isDefault: true
      };
    }
  },

  updateDefaultSlide: async (updates: Partial<Slide>) => {
    try {
      const current = await storage.getDefaultSlide();
      const updated = { ...current, ...updates };
      await fetch('/api/default-slide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch (err) {
      console.error(err);
    }
  },

  addSlide: async (slide: Omit<Slide, 'id'> & { id?: string }) => {
    const slides = await storage.getSlides();
    
    // 自動清理機制：刪除已過期超過 30 天的看板
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const filteredSlides = slides.filter(s => {
      const expirationDate = new Date(s.expiresAt);
      return expirationDate >= thirtyDaysAgo;
    });

    const newSlide: Slide = {
      ...slide,
      id: slide.id || crypto.randomUUID()
    };
    const updated = [newSlide, ...filteredSlides];
    await fetch('/api/slides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    return newSlide;
  },

  deleteSlide: async (id: string) => {
    await fetch(`/api/slides/${id}`, { method: 'DELETE' });
  },

  updateSlide: async (id: string, updates: Partial<Slide>) => {
    await fetch(`/api/slides/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  },

  // Upload an image file for a slide background. Returns the served URL.
  uploadSlideImage: async (dataUri: string, slideId?: string, name?: string): Promise<string> => {
    const resp = await fetch('/api/upload/slide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: dataUri, slideId, name })
    });
    if (!resp.ok) throw new Error('Failed to upload slide image');
    const { url } = await resp.json();
    return url;
  },

  // Preset backgrounds (admin-managed files in data/presets/)
  getPresetBackgrounds: async (): Promise<{ name: string; url: string }[]> => {
    try {
      const resp = await fetch('/api/presets');
      if (!resp.ok) throw new Error('Failed to fetch presets');
      return await resp.json();
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  // Custom Backgrounds (user-uploaded reusable assets in data/backgrounds/)
  getCustomBackgrounds: async (): Promise<{ id: string; name: string; url: string }[]> => {
    try {
      const resp = await fetch('/api/backgrounds');
      if (!resp.ok) throw new Error('Failed to fetch backgrounds');
      return await resp.json();
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  // Upload and register a reusable background image.
  addCustomBackground: async (name: string, dataUri: string): Promise<{ id: string; name: string; url: string }> => {
    const resp = await fetch('/api/upload/background', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: dataUri, name })
    });
    if (!resp.ok) throw new Error('Failed to upload background');
    return resp.json();
  },

  deleteCustomBackground: async (id: string) => {
    await fetch(`/api/backgrounds/${id}`, { method: 'DELETE' });
  }
};
