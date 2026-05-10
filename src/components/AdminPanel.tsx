import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { 
  Upload, Trash2, ChevronRight, Image as ImageIcon, Calendar, Type, Plus, Minus, 
  Settings2, ArrowLeft, Save, MousePointer2, Layout, Maximize2, Monitor, Smartphone,
  Layers, Palette, Type as TypeIcon, User as UserIcon, X, Check, Copy, Wand2, Download, UploadCloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toJpeg, toCanvas } from 'html-to-image';
import { storage, Slide, TextLine, getWordArtClass, getWordArtStyle, DEFAULT_WELCOME_MESSAGES } from '../lib/storage';
import { generatePresetImage } from '../lib/generator';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

import { TEMPLATES, Template as TemplateType } from '../constants';

const TEXT_EFFECTS = [
  { label: ' (無特效)', value: 'none' },
  { label: '尊貴金', value: 'gold' },
  { label: '科技銀', value: 'silver' },
  { label: '復古銅', value: 'bronze' },
  { label: '霓虹發光', value: 'neon' },
  { label: '立體浮雕', value: '3d' },
  { label: '空心描邊', value: 'stroke' },
];

// Returns the CSS style object for any background value:
// - local/remote URL  → backgroundImage
// - CSS gradient string → background
function getBackgroundStyle(value: string | null | undefined, gradient?: string): React.CSSProperties {
  if (!value) return gradient ? { background: gradient } : {};
  if (value.startsWith('http') || value.startsWith('/') || value.startsWith('data:')) {
    const style: React.CSSProperties = {
      backgroundImage: gradient ? `url(${value}), ${gradient}` : `url(${value})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
    return style;
  }
  return { background: value };
}

const FONT_SIZES = [
  { label: '巨型', value: 'text-8xl md:text-[10rem]' },
  { label: '超大', value: 'text-6xl md:text-8xl' },
  { label: '特大', value: 'text-5xl md:text-6xl' },
  { label: '大', value: 'text-4xl md:text-5xl' },
  { label: '中', value: 'text-2xl md:text-4xl' },
  { label: '小', value: 'text-xl md:text-2xl' },
  { label: '微', value: 'text-base md:text-lg' },
];

const FONT_WEIGHTS = [
  { label: '極粗', value: 'font-extrabold' },
  { label: '粗', value: 'font-bold' },
  { label: '中', value: 'font-semibold' },
  { label: '常規', value: 'font-normal' },
  { label: '細', value: 'font-light' },
];

const FONT_FAMILIES = [
  { label: '預設', value: 'font-sans' },
  { label: '經典', value: 'font-serif' },
  { label: '標楷體', value: 'font-kaiti' },
];

const SlideThumbnail = ({ slide }: { slide: Slide }) => {
  const displayUrl = slide.thumbnailUrl || slide.previewUrl || slide.imageUrl;
  
  return (
    <div className="w-full h-full relative bg-gray-900 overflow-hidden select-none">
      {displayUrl ? (
        <img 
          src={displayUrl} 
          alt="" 
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500">
          <span className="text-sm">無圖片</span>
        </div>
      )}
      <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-all duration-500" />
    </div>
  );
};

interface EditorState {
  id?: string;
  isNew?: boolean; // 標記是否為新建看板（尚未存在於伺服器）
  createdAt?: string; // 原始建立時間（編輯時保留）
  image: string | null;
  selectedTemplateId: string | null;
  lines: TextLine[];
  expiryDays: string;
  title: string;
  subtitle: string;
  isDefault?: boolean;
}

const TextStyleEditor = ({ label, prefix = '', line, onChange }: { label: string, prefix?: '' | 'name' | 'jobTitle' | 'companyName', line: TextLine, onChange: (updates: Partial<TextLine>) => void }) => {
  if (!line) return null;
  const getField = (field: string) => prefix ? `${prefix}${field.charAt(0).toUpperCase() + field.slice(1)}` : field;
  
  const fontFamily = line[getField('fontFamily') as keyof TextLine] as string || 'font-sans';
  const fontSize = line[getField('fontSize') as keyof TextLine] as string || (prefix === 'companyName' ? 'text-sm' : prefix === 'jobTitle' ? 'text-2xl' : 'text-4xl');
  const fontWeight = line[getField('fontWeight') as keyof TextLine] as string || (prefix === 'companyName' ? 'font-normal' : prefix === 'jobTitle' ? 'font-medium' : 'font-bold');
  const color = line[getField('color') as keyof TextLine] as string || '#ffffff';
  const textEffect = line[getField('textEffect') as keyof TextLine] as string || 'none';
  const effectColor = line[getField('effectColor') as keyof TextLine] as string || color;

  const handleChange = (field: string, value: any) => {
    onChange({ [getField(field)]: value });
  };

  return (
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase">{label}</label>
              <div className="flex gap-2 items-center">
                  <span className="text-[10px] text-gray-400">文字</span>
                  <input type="color" value={color} onChange={e => handleChange('color', e.target.value)} className="w-5 h-5 border-none bg-transparent cursor-pointer p-0" />
                  {textEffect !== 'none' && !['gold', 'silver', 'bronze'].includes(textEffect) && (
                      <>
                      <span className="text-[10px] text-orange-400 ml-2">特效</span>
                      <input type="color" value={effectColor} onChange={e => handleChange('effectColor', e.target.value)} className="w-5 h-5 border-none bg-transparent cursor-pointer p-0" />
                      </>
                  )}
              </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col">
                <label className="text-[9px] font-bold text-gray-400 uppercase mb-1">字型</label>
                <select className="bg-gray-50 rounded-xl px-2 py-1.5 text-xs font-bold" value={fontFamily} onChange={(e) => handleChange('fontFamily', e.target.value)}>
                  {FONT_FAMILIES.map(font => <option key={font.value} value={font.value}>{font.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-[9px] font-bold text-gray-400 uppercase mb-1">特效</label>
                <select className="bg-orange-50 text-orange-600 rounded-xl px-2 py-1.5 text-xs font-bold" value={textEffect} onChange={(e) => handleChange('textEffect', e.target.value)}>
                  {TEXT_EFFECTS.map(effect => <option key={effect.value} value={effect.value}>{effect.label}</option>)}
                </select>
              </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col">
                <label className="text-[9px] font-bold text-gray-400 uppercase mb-1">大小</label>
                <select className="bg-gray-50 rounded-xl px-2 py-1.5 text-xs font-bold" value={fontSize} onChange={(e) => handleChange('fontSize', e.target.value)}>
                  {FONT_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-[9px] font-bold text-gray-400 uppercase mb-1">粗細</label>
                <select className="bg-gray-50 rounded-xl px-2 py-1.5 text-xs font-bold" value={fontWeight} onChange={(e) => handleChange('fontWeight', e.target.value)}>
                  {FONT_WEIGHTS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                </select>
              </div>
          </div>
      </div>
  );
};

export default function AdminPanel() {
  const [view, setView] = useState<'list' | 'editor' | 'templates'>('list');
  const [slides, setSlides] = useState<Slide[]>([]);
  const [defaultSlide, setDefaultSlide] = useState<Slide | null>(null);
  const [loading, setLoading] = useState(false);
  const [customBackgrounds, setCustomBackgrounds] = useState<{ id: string; name: string; url: string }[]>([]);
  const [presetBackgrounds, setPresetBackgrounds] = useState<{ name: string; url: string }[]>([]);
  const [isGeneratingPresets, setIsGeneratingPresets] = useState(false);
  
  // Settings
  const [rotationSpeed, setRotationSpeed] = useState(10);
  const [autoPlay, setAutoPlay] = useState(true);
  const [uiFontSize, setUiFontSize] = useState<number>(12);
  const [welcomeMessages, setWelcomeMessages] = useState<string[]>(DEFAULT_WELCOME_MESSAGES);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [editingMessagesText, setEditingMessagesText] = useState("");
  
  // Editor State
  const [editor, setEditor] = useState<EditorState>({
    image: null,
    selectedTemplateId: null,
    lines: [],
    expiryDays: '7',
    title: '',
    subtitle: '',
    isDefault: false
  });
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [sectionsOpen, setSectionsOpen] = useState({
    templates: true,
    toolboxes: true,
    background: true,
    properties: true,
    slideSettings: true
  });
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      await refreshSlides();
      await refreshBackgrounds();
      await refreshDefaultSlide();
      await refreshPresets();
      const settings = await storage.getSettings();
      setRotationSpeed(settings.rotationSpeed);
      setAutoPlay(settings.autoPlay);
      if (settings.uiFontSize) setUiFontSize(settings.uiFontSize);
      if (settings.welcomeMessages) setWelcomeMessages(settings.welcomeMessages);
    };
    init();
  }, []);

  const refreshSlides = async () => {
    setSlides(await storage.getSlides());
  };

  const refreshDefaultSlide = async () => {
    setDefaultSlide(await storage.getDefaultSlide());
  };

  const refreshBackgrounds = async () => {
    setCustomBackgrounds(await storage.getCustomBackgrounds());
  };

  const refreshPresets = async () => {
    setPresetBackgrounds(await storage.getPresetBackgrounds());
  };

  const handleUploadBackground = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        await storage.addCustomBackground(file.name.split('.')[0], reader.result as string);
        await refreshBackgrounds();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGeneratePresets = async () => {
    if (!confirm('將重新隨機產生所有內建背景（包含星空效果），這可能會覆蓋您原本放在 data/presets/ 的圖片，確定要繼續嗎？')) return;
    setIsGeneratingPresets(true);
    try {
      for (const t of TEMPLATES) {
        const dataUri = generatePresetImage(t.id, t.backgroundGradient);
        await storage.uploadPreset(t.id, dataUri);
      }
      const ts = Date.now();
      const refreshed = (await storage.getPresetBackgrounds()).map(p => ({ ...p, url: `${p.url}?ts=${ts}` }));
      setPresetBackgrounds(refreshed);
    } catch(e) {
      console.error(e)
      alert('產生預設背景失敗');
    } finally {
      setIsGeneratingPresets(false);
    }
  };

  const startTutorial = () => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      steps: [
        { element: '#create-btn', popover: { title: '建立新看板', description: '點擊這裡可以建立新的歡迎看板、名片或是活動海報。', side: "bottom", align: 'start' }},
        { element: '#templates-btn', popover: { title: '素材管理', description: '在這裡可以管理您的背景圖庫或是匯入新的底圖。', side: "bottom", align: 'start' }},
      ]
    });
    driverObj.drive();
  };

  const startEditorTutorial = () => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      steps: [
        { element: '#editor-left-sidebar', popover: { title: '工具列', description: '左側面板提供各式各樣的「快速模板」與「文字掛件」供您拖曳或點選加入。', side: "right", align: 'start' }},
        { element: '#editor-canvas', popover: { title: '畫布預覽', description: '您可以在畫布中點選與拖曳掛件來調整它們的位置，並即時預覽效果。', side: "bottom", align: 'start' }},
        { element: '#editor-right-sidebar', popover: { title: '屬性設定', description: '點選畫布上的掛件後，右側面板會出現調整字型、顏色、特效的屬性選項；若未點選任何掛件，則可設定看板存活天數等全域選項。', side: "left", align: 'start' }},
        { element: '#save-board-btn', popover: { title: '發布變更', description: '編輯完成後，點擊這裡儲存並發布到輪播系統中！', side: "bottom", align: 'start' }},
      ]
    });
    driverObj.drive();
  };

  const handleDeleteBackground = async (id: string) => {
    if (confirm('確定要刪除此背景圖片嗎？')) {
      await storage.deleteCustomBackground(id);
      await refreshBackgrounds();
    }
  };

  const generateLinesForTemplate = (template: TemplateType): TextLine[] => {
    // Randomly pick a welcome text
    const randomWelcome = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)] || '歡迎光臨';
    
    // Safer range for layout (avoiding extreme edges)
    const SAFE_X_MIN = 15;
    const SAFE_X_MAX = 85;
    const SAFE_Y_MIN = 15;
    const SAFE_Y_MAX = 85;

    const layouts = [
      { align: template.layout === 'full' ? 'center' : template.layout, nameY: 40, welcomeY: 70 },
      { align: template.layout === 'full' ? 'center' : template.layout, nameY: 30, welcomeY: 60 },
      { align: 'center', nameY: 55, welcomeY: 20 }, // High welcome, low name
      { align: template.layout === 'full' ? 'center' : template.layout, nameY: 50, welcomeY: 80 },
    ];
    
    const layoutIdx = Math.floor(Math.random() * layouts.length);
    const selected = layouts[layoutIdx];
    const align = (selected.align as 'left' | 'center' | 'right') || 'center';
    
    // Calculate safe X based on alignment
    let x = 50;
    if (align === 'left') x = SAFE_X_MIN + 5; // Slight offset from min edge
    if (align === 'right') x = SAFE_X_MAX - 5; // Slight offset from max edge
    
    // Ensure Y coordinates are within safe bounds
    const nameY = Math.min(SAFE_Y_MAX - 10, Math.max(SAFE_Y_MIN, selected.nameY));
    const welcomeY = Math.min(SAFE_Y_MAX, Math.max(SAFE_Y_MIN + 10, selected.welcomeY));

    return [
      { 
        id: crypto.randomUUID(), 
        type: 'business-card', 
        text: '', 
        name: '貴賓姓名', 
        nameSize: template.theme.titleSize,
        nameWeight: 'font-bold',
        nameColor: '#ffffff',
        jobTitle: '職務頭銜', 
        companyName: '公司名稱 / 組織',
        jobTitleSize: 'text-2xl md:text-3xl',
        jobTitleWeight: 'font-semibold',
        jobTitleColor: '#ffffff',
        companyNameSize: 'text-sm md:text-base',
        companyNameWeight: 'font-normal',
        companyNameColor: '#ffffff',
        fontSize: template.theme.titleSize, 
        fontWeight: 'font-bold', 
        color: '#ffffff',
        italic: false, 
        opacity: 1, 
        align: align, 
        x: x, 
        y: nameY 
      },
      {
        id: crypto.randomUUID(),
        type: 'standard',
        text: randomWelcome,
        fontSize: 'text-xl md:text-2xl',
        fontWeight: 'font-normal',
        color: '#ffffff',
        italic: true,
        opacity: 0.7,
        align: align, 
        x: x, 
        y: welcomeY
      }
    ];
  };

  const handleUpdateSettings = async (updates: { rotationSpeed?: number, autoPlay?: boolean, uiFontSize?: number, welcomeMessages?: string[] }) => {
    await storage.updateSettings(updates);
    if (updates.rotationSpeed !== undefined) setRotationSpeed(updates.rotationSpeed);
    if (updates.autoPlay !== undefined) setAutoPlay(updates.autoPlay);
    if (updates.uiFontSize !== undefined) setUiFontSize(updates.uiFontSize);
    if (updates.welcomeMessages !== undefined) setWelcomeMessages(updates.welcomeMessages);
  };

  const handleBackup = () => {
    window.location.href = '/api/backup';
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('匯入備份將會覆蓋目前所有的看板與設定，確定要繼續嗎？')) {
      e.target.value = '';
      return;
    }
    
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const res = await fetch('/api/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: reader.result })
        });
        if (!res.ok) throw new Error('復原失敗');
        alert('備份匯入成功！系統將重新載入。');
        window.location.reload();
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      alert('備份匯入失敗！');
    } finally {
      setLoading(false);
    }
  };

  const openEditor = (slide?: Slide) => {
    if (slide) {
      setEditor({
        id: slide.id,
        isNew: false,
        createdAt: slide.createdAt,
        image: slide.imageUrl,
        selectedTemplateId: slide.templateId || null,
        lines: slide.lines || [],
        expiryDays: slide.isDefault ? '9999' : '7',
        title: slide.title,
        subtitle: slide.subtitle,
        isDefault: slide.isDefault
      });
    } else {
      setEditor({
        id: crypto.randomUUID(),
        isNew: true,
        createdAt: new Date().toISOString(),
        image: presetBackgrounds[0]?.url ?? null,
        selectedTemplateId: null,
        lines: [
          { id: crypto.randomUUID(), type: 'standard', text: '歡迎光臨', fontSize: 'text-6xl md:text-8xl', fontWeight: 'font-bold', italic: false, opacity: 1, align: 'center', x: 50, y: 40 }
        ],
        expiryDays: '7',
        title: '',
        subtitle: '',
        isDefault: false
      });
    }
    setView('editor');
    setSelectedLineId(null);
  };

  const closeEditor = () => {
    setView('list');
  };

  const handleLineChange = (id: string, updates: Partial<TextLine>) => {
    setEditor(prev => ({
      ...prev,
      lines: prev.lines.map(l => l.id === id ? { ...l, ...updates } : l)
    }));
  };

  const addWidget = (type: 'standard' | 'business-card') => {
    let newLine: TextLine;
    if (type === 'standard') {
      newLine = {
        id: crypto.randomUUID(),
        type: 'standard',
        text: '新增文字',
        fontSize: 'text-2xl md:text-4xl',
        fontWeight: 'font-bold',
        color: '#ffffff',
        italic: false,
        opacity: 1,
        align: 'center',
        x: 50,
        y: 50
      };
    } else {
      newLine = {
      id: crypto.randomUUID(),
      type: 'business-card',
      text: '',
      name: '姓名',
      nameSize: 'text-4xl md:text-5xl',
      nameWeight: 'font-bold',
      nameColor: '#ffffff',
      jobTitle: '職稱',
      jobTitleSize: 'text-xl md:text-2xl',
      jobTitleWeight: 'font-medium',
      jobTitleColor: '#ffffff',
      companyName: '公司名稱',
      companyNameSize: 'text-xs md:text-sm',
      companyNameWeight: 'font-normal',
      companyNameColor: '#ffffff',
      fontSize: 'text-4xl md:text-5xl',
      fontWeight: 'font-bold',
      color: '#ffffff',
      italic: false,
      opacity: 1,
      align: 'center',
      x: 50,
      y: 50
    };
    }
    
    setEditor(prev => ({
      ...prev,
      lines: [...prev.lines, newLine]
    }));
    setSelectedLineId(newLine.id);
  };

  const removeLine = (id: string) => {
    setEditor(prev => ({
      ...prev,
      lines: prev.lines.filter(l => l.id !== id)
    }));
    if (selectedLineId === id) setSelectedLineId(null);
  };

  const handleSave = async () => {
    if (!editor.image) {
      alert('請先選擇背景圖片');
      return;
    }
    
    setLoading(true);
    console.log('Save triggered');
    
    // Deselect to avoid showing selection UI in the screenshot
    setSelectedLineId(null);
    
    // Wait briefly for UI to update
    await new Promise(r => setTimeout(r, 300));

    try {
      let previewUrl = '';
      let thumbnailUrl = '';

      if (canvasRef.current) {
        try {
          console.log('Capturing canvas with html-to-image...');
          const element = canvasRef.current;
          
          // Temporarily reset transform for capture
          const originalTransform = element.style.transform;
          element.style.transform = 'none';
          
          // Capture at high quality
          const dataUrl = await toJpeg(element, {
            quality: 0.8,
            pixelRatio: 2,
            backgroundColor: '#000000',
            cacheBust: true,
            // Force the capture width/height to avoid transform side effects
            width: 1000,
            height: 562.5
          });
          
          previewUrl = dataUrl;
          
          // Create small thumbnail
          thumbnailUrl = await toJpeg(element, {
            quality: 0.6,
            width: 480,
            height: 270,
            backgroundColor: '#000000',
          });
          
          // Restore transform
          element.style.transform = originalTransform;
          
          console.log('Capture successful');
        } catch (captureErr) {
          console.error('Capture failed error:', captureErr);
        }
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (parseInt(editor.expiryDays) || 7));

      const slideData = {
        id: editor.id,
        imageUrl: editor.image,
        previewUrl,
        thumbnailUrl,
        title: editor.title || editor.lines[0]?.name || editor.lines[0]?.text || '未具名看板',
        subtitle: editor.subtitle || '',
        expiresAt: expiresAt.toISOString(),
        createdAt: editor.createdAt || new Date().toISOString(),
        order: slides.length,
        templateId: editor.selectedTemplateId || undefined,
        lines: editor.lines,
        isDefault: editor.isDefault
      };

      if (editor.isDefault) {
        await storage.updateDefaultSlide(slideData);
        await refreshDefaultSlide();
      } else if (editor.isNew) {
        await storage.addSlide(slideData);
      } else if (editor.id) {
        await storage.updateSlide(editor.id, slideData);
      }
      
      console.log('Storage updated');
      await refreshSlides();
      closeEditor();
    } catch (err) {
      console.error('Terminal save error:', err);
      alert(`儲存失敗: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await storage.deleteSlide(id);
    await refreshSlides();
    setConfirmDeleteId(null);
  };

  const currentTemplate = editor.selectedTemplateId ? TEMPLATES.find(t => t.id === editor.selectedTemplateId) : null;
  const theme = currentTemplate?.theme || {
    textColor: 'text-white',
    accentColor: 'bg-white',
    fontFamily: 'sans',
    overlayOpacity: 0.1,
    titleSize: 'text-4xl'
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#141414] font-sans selection:bg-orange-100">
      <style>{`
        label, .text-\\[8px\\], .text-\\[9px\\], .text-\\[10px\\], .text-xs {
          font-size: max(${uiFontSize}pt, 12pt) !important;
          line-height: normal !important;
        }
      `}</style>
      <AnimatePresence mode="wait">
        {view === 'list' ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-6 md:p-12 lg:p-20"
          >
            <div className="max-w-7xl mx-auto">
              <header className="flex flex-col gap-8 mb-12">
                {/* 第一排：標題 與 動作按鈕 */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-1 bg-orange-500 rounded-full" />
                      <span className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-orange-500">Board Administration</span>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter italic font-serif flex items-baseline gap-2">
                      看板管理中心 <span className="text-xl md:text-2xl text-gray-300 font-sans not-italic font-normal tracking-normal underline decoration-1 underline-offset-8">v2.0</span>
                    </h1>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <button 
                      id="tutorial-btn"
                      onClick={startTutorial}
                      className="h-14 w-14 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-2xl font-bold flex items-center justify-center transition-all active:scale-95 shadow-sm"
                      title="功能導覽"
                    >
                      <span className="text-xl font-black italic">?</span>
                    </button>

                    <button 
                      id="templates-btn"
                      onClick={() => setView('templates')}
                      className="flex-1 lg:flex-none h-14 px-6 bg-white hover:bg-orange-50 text-orange-600 border border-orange-100 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
                    >
                      <ImageIcon className="w-5 h-5" /> 素材中心
                    </button>

                    <button 
                      id="create-btn"
                      onClick={() => openEditor()}
                      className="flex-1 lg:flex-none h-14 px-6 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-orange-500/20"
                    >
                      <Plus className="w-5 h-5" /> 建立新看板
                    </button>
                  </div>
                </div>

                {/* 第二排：設定區塊 */}
                <div className="inline-flex items-center gap-3 bg-white px-6 py-3 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 w-full lg:w-auto overflow-x-auto custom-scrollbar">
                  <Settings2 className="w-4 h-4 text-gray-400 shrink-0" />
                  <div className="flex items-center gap-4 flex-nowrap min-w-max">
                     <div className="flex flex-col">
                       <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">播送間隔 (S)</span>
                       <input 
                          type="number" 
                          value={rotationSpeed}
                          onChange={(e) => handleUpdateSettings({ rotationSpeed: parseInt(e.target.value) })}
                          className="w-12 h-6 border-none bg-transparent font-bold text-sm p-0 focus:ring-0"
                       />
                     </div>
                     <div className="h-6 w-px bg-gray-100" />
                     <button 
                       onClick={() => handleUpdateSettings({ autoPlay: !autoPlay })}
                       className="flex flex-col items-start"
                     >
                       <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">自動播放</span>
                       <span className={`text-sm font-bold ${autoPlay ? 'text-green-500' : 'text-gray-300'}`}>
                         {autoPlay ? 'ON' : 'OFF'}
                       </span>
                     </button>
                     <div className="h-6 w-px bg-gray-100" />
                     <div className="flex flex-col">
                       <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">UI字型大小 (pt)</span>
                       <input 
                          type="number" 
                          min="12"
                          value={uiFontSize}
                          onChange={(e) => handleUpdateSettings({ uiFontSize: parseInt(e.target.value) || 12 })}
                          className="w-12 h-6 border-none bg-transparent font-bold text-sm p-0 focus:ring-0"
                          title="依12pt為最小"
                       />
                     </div>
                     <div className="h-6 w-px bg-gray-100" />
                     <button 
                       onClick={handleBackup}
                       className="flex flex-col items-start px-2 py-1 hover:bg-gray-50 rounded-lg transition-colors"
                     >
                       <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">系統備份</span>
                       <span className="text-sm font-bold text-indigo-500 leading-none">下載</span>
                     </button>
                     <div className="h-6 w-px bg-gray-100" />
                     <label className="flex flex-col items-start px-2 py-1 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
                       <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">系統還原</span>
                       <span className="text-sm font-bold text-indigo-500 leading-none">匯入</span>
                       <input type="file" accept=".zip" className="hidden" onChange={handleRestore} disabled={loading} />
                     </label>
                  </div>
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {defaultSlide && (
                  <motion.div 
                    layout
                    key={defaultSlide.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="group relative cursor-pointer"
                    onClick={() => openEditor(defaultSlide)}
                  >
                    <div className="relative aspect-[16/10] rounded-[48px] overflow-hidden shadow-[0_15px_45px_rgba(37,99,235,0.1)] border-4 border-blue-50 transition-all duration-700 hover:shadow-[0_30px_80px_rgba(37,99,235,0.2)] hover:-translate-y-3">
                       {/* Background Thumbnail */}
                       <div className="absolute inset-0">
                          <SlideThumbnail slide={defaultSlide} />
                       </div>
                       
                       {/* Top Tags */}
                       <div className="absolute top-8 left-8 flex gap-2 z-10">
                          <span className="px-5 py-2 bg-blue-600 text-white text-[10px] font-black tracking-[0.2em] rounded-2xl uppercase shadow-xl">
                            DEFAULT HOME
                          </span>
                       </div>

                       {/* Hover Overlay Actions */}
                       <div className="absolute top-8 right-8 flex gap-3 z-10 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                          <button 
                            onClick={(e) => { e.stopPropagation(); openEditor(defaultSlide); }}
                            className="w-12 h-12 flex items-center justify-center bg-white/90 backdrop-blur-xl text-gray-900 hover:bg-blue-600 hover:text-white rounded-2xl transition-all shadow-xl border border-white/20"
                          >
                            <Settings2 size={20} />
                          </button>
                       </div>
                       {/* Bottom Info Overlay */}
                       <div className="absolute inset-x-0 bottom-0 p-8 pt-12 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none transition-transform duration-700">
                          <div className="flex justify-between items-end">
                            <div>
                               <h3 className="text-2xl font-black text-white tracking-tight leading-tight drop-shadow-lg">{defaultSlide.title || '預設首頁'}</h3>
                                <div className="flex items-center gap-3 mt-3">
                                   <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shadow-[0_0_10px_rgba(37,99,235,0.8)]" />
                                   <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.1em]">
                                      永久生效 (僅在無看板時顯示)
                                   </p>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                  </motion.div>
                )}
                {slides.map((slide) => (
                  <motion.div 
                    layout
                    key={slide.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="group relative cursor-pointer"
                    onClick={() => openEditor(slide)}
                  >
                    <div className="relative aspect-[16/10] rounded-[48px] overflow-hidden shadow-[0_15px_45px_rgba(0,0,0,0.08)] border border-white transition-all duration-700 hover:shadow-[0_30px_80px_rgba(0,0,0,0.15)] hover:-translate-y-3">
                       {/* Background Thumbnail */}
                       <div className="absolute inset-0">
                          <SlideThumbnail slide={slide} />
                       </div>
                       
                       {/* Top Tags */}
                       <div className="absolute top-8 left-8 flex gap-2 z-10">
                          <span className="px-5 py-2 bg-white/90 backdrop-blur-xl border border-white/20 text-[#141414] text-[10px] font-black tracking-[0.2em] rounded-2xl uppercase shadow-xl">
                            {slide.templateId ? 'TEMPLATE' : 'CUSTOM'}
                          </span>
                       </div>

                       {/* Hover Overlay Actions */}
                       <div className="absolute top-8 right-8 flex gap-3 z-10 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                          <button 
                            onClick={(e) => { e.stopPropagation(); openEditor(slide); }}
                            className="w-12 h-12 flex items-center justify-center bg-white/90 backdrop-blur-xl text-gray-900 hover:bg-orange-500 hover:text-white rounded-2xl transition-all shadow-xl border border-white/20"
                          >
                            <Settings2 size={20} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(slide.id); }}
                            className="w-12 h-12 flex items-center justify-center bg-white/90 backdrop-blur-xl text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all shadow-xl border border-white/20"
                          >
                            <Trash2 size={20} />
                          </button>
                       </div>
                       {/* Bottom Info Overlay - Transparent / Glassmorphism */}
                       <div className="absolute inset-x-0 bottom-0 p-8 pt-12 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none transition-transform duration-700">
                          <div className="flex justify-between items-end">
                            <div>
                               <h3 className="text-2xl font-black text-white tracking-tight leading-tight drop-shadow-lg">{slide.title || '未具名看板'}</h3>
                                <div className="flex items-center gap-3 mt-3">
                                   <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse shadow-[0_0_10px_rgba(251,146,60,0.8)]" />
                                   <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.1em]">
                                      到期日: {format(new Date(slide.expiresAt), 'yyyy/MM/dd')}
                                   </p>
                                </div>
                             </div>
                             
                             <div className="flex items-center gap-3 bg-white/20 backdrop-blur-2xl px-5 py-3 rounded-3xl border border-white/10 transition-colors group-hover:bg-white/30">
                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                                   <UserIcon size={14} className="text-white" />
                                </div>
                                <span className="text-[10px] font-black text-white/90 uppercase tracking-widest leading-none">Admin</span>
                             </div>
                          </div>
                       </div>
                    </div>
                  </motion.div>
                ))}
                
                {slides.length === 0 && (
                  <div className="col-span-full py-32 flex flex-col items-center justify-center border-4 border-dashed border-gray-100 rounded-[60px]">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                      <Layout className="w-10 h-10 text-gray-200" />
                    </div>
                    <p className="text-gray-400 font-bold text-xl mb-8">尚無任何看板內容</p>
                    <button 
                      onClick={() => openEditor()}
                      className="px-10 py-5 bg-orange-500 hover:bg-orange-600 text-white rounded-3xl font-bold transition-all shadow-xl shadow-orange-500/20"
                    >
                      立刻開始建立
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : view === 'templates' ? (
          <motion.div 
            key="templates"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="fixed inset-0 z-50 bg-[#FDFDFD] flex flex-col"
          >
            <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 shrink-0">
               <div className="flex items-center gap-6">
                  <button 
                    onClick={() => setView('list')}
                    className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-full transition-all"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-400" />
                  </button>
                  <div className="h-8 w-px bg-gray-100" />
                  <h2 className="text-xl font-black italic font-serif">素材管理中心</h2>
               </div>

               <div className="flex items-center gap-4">
                  <button 
                    onClick={() => {
                      setEditingMessagesText(welcomeMessages.join('\n'));
                      setShowMessagesModal(true);
                    }}
                    className="h-12 px-6 bg-white hover:bg-gray-50 text-indigo-600 border border-indigo-100 rounded-2xl font-bold flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-sm"
                  >
                    <Type className="w-4 h-4" /> 歡迎詞庫管理
                  </button>

                  <button 
                    disabled={isGeneratingPresets}
                    onClick={handleGeneratePresets}
                    className="h-12 px-6 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl font-bold flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                  >
                    <Wand2 className="w-4 h-4" />
                    {isGeneratingPresets ? '生成中...' : '一鍵產生幾何星空背景'}
                  </button>

                  <label className="h-12 px-6 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-lg shadow-orange-500/20">
                     <Upload className="w-4 h-4" /> 上傳自訂背景
                     <input type="file" accept="image/*" className="hidden" onChange={handleUploadBackground} />
                  </label>
               </div>
            </header>

            <div className="flex-1 overflow-y-auto p-12">
               <div className="max-w-6xl mx-auto">
                  <section className="mb-16">
                     <div className="flex items-center gap-3 mb-8">
                        <div className="w-8 h-1 bg-gray-900 rounded-full" />
                        <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">內建素材 Preset Backgrounds</h3>
                     </div>
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                     {presetBackgrounds.map((bg) => (
                          <div key={bg.url} className="group relative aspect-[16/10] rounded-3xl overflow-hidden border border-gray-100 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
                             <img src={bg.url} alt={bg.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                             <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                <span className="text-white text-xs font-bold">{bg.name}</span>
                             </div>
                             <div className="absolute top-4 left-4">
                                <span className="px-3 py-1 bg-white/90 backdrop-blur text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm border border-white/20">System</span>
                             </div>
                          </div>
                        ))}
                        {presetBackgrounds.length === 0 && (
                          <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-100 rounded-3xl">
                             <p className="text-xs font-bold text-gray-300 uppercase tracking-widest">請將圖片放入 data/presets/ 資料夾</p>
                          </div>
                        )}
                     </div>
                  </section>

                  <section>
                     <div className="flex items-center gap-3 mb-8">
                        <div className="w-8 h-1 bg-orange-500 rounded-full" />
                        <h3 className="text-sm font-black uppercase tracking-widest text-orange-500">自定義素材 Custom Assets</h3>
                     </div>
                     
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {customBackgrounds.map((bg) => (
                          <div key={bg.id} className="group relative aspect-[16/10] rounded-3xl overflow-hidden border border-gray-100 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
                             <img src={bg.url} alt={bg.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                             <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex justify-between items-center translate-y-full group-hover:translate-y-0 transition-transform">
                                <span className="text-white text-xs font-bold truncate max-w-[120px]">{bg.name}</span>
                                <button 
                                  onClick={() => handleDeleteBackground(bg.id)}
                                  className="w-8 h-8 flex items-center justify-center bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-xl backdrop-blur transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                             </div>
                          </div>
                        ))}

                        <label className="aspect-[16/10] rounded-3xl border-4 border-dashed border-gray-100 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-orange-200 hover:bg-orange-50/30 transition-all group">
                           <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-white group-hover:shadow-lg transition-all group-hover:scale-110">
                              <Plus className="w-6 h-6 text-gray-300 group-hover:text-orange-500" />
                           </div>
                           <span className="text-xs font-bold text-gray-300 group-hover:text-orange-500">上傳新素材</span>
                           <input type="file" accept="image/*" className="hidden" onChange={handleUploadBackground} />
                        </label>
                     </div>

                     {customBackgrounds.length === 0 && (
                        <div className="py-20 text-center border-2 border-dashed border-gray-50 rounded-[40px] mt-4">
                           <p className="text-xs font-bold text-gray-300 uppercase tracking-widest">尚無自定義素材</p>
                        </div>
                     )}
                  </section>
               </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="editor"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed inset-0 z-50 bg-[#F5F5F7] flex flex-col overflow-hidden"
          >
            {/* Editor Top Bar */}
            <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 shrink-0">
               <div className="flex items-center gap-6">
                  <button 
                    onClick={closeEditor}
                    className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-full transition-all"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-400" />
                  </button>
                  <div className="h-8 w-px bg-gray-100" />
                  <div>
                    <h2 className="text-lg font-bold flex items-center gap-2">
                       {editor.id ? '編輯看板' : '建立新看板'}
                       {editor.title && <span className="text-gray-300 font-normal">/ {editor.title}</span>}
                    </h2>
                  </div>
               </div>

               <div className="flex items-center gap-4">
                  <button
                    id="editor-tutorial-btn"
                    onClick={startEditorTutorial}
                    className="h-12 w-12 bg-white hover:bg-gray-50 text-indigo-500 border border-gray-100 rounded-2xl font-bold flex items-center justify-center transition-all active:scale-95 shadow-sm mr-2"
                    title="編輯器導覽"
                  >
                    <span className="text-xl font-black italic">?</span>
                  </button>
                  <div className="hidden lg:flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-2xl border border-gray-100 mr-4">
                     <button className="w-8 h-8 flex items-center justify-center bg-white shadow-sm rounded-lg text-[#141414]"><Monitor className="w-4 h-4" /></button>
                     <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"><Smartphone className="w-4 h-4" /></button>
                  </div>
                  <button 
                    id="save-board-btn"
                    disabled={loading || !editor.image}
                    onClick={handleSave}
                    className="h-12 px-8 bg-black hover:bg-orange-600 text-white rounded-2xl font-bold flex items-center gap-3 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                  >
                    {loading ? '儲存中...' : <><Save className="w-4 h-4" /> 發布變更</>}
                  </button>
               </div>
            </header>

            <div className="flex-1 flex overflow-hidden relative">
                {/* Control Toggles */}
                <div className="absolute top-1/2 -translate-y-1/2 left-0 z-40">
                  {!leftSidebarOpen && (
                    <button 
                      onClick={() => setLeftSidebarOpen(true)}
                      className="w-10 h-20 bg-orange-500 text-white rounded-r-2xl shadow-2xl flex items-center justify-center hover:bg-orange-600 transition-all hover:w-12 group"
                      title="開啟工具箱"
                    >
                      <ChevronRight className="w-6 h-6 group-hover:scale-125 transition-transform" />
                    </button>
                  )}
               </div>
               <div className="absolute top-1/2 -translate-y-1/2 right-0 z-40">
                  {!rightSidebarOpen && (
                    <button 
                      onClick={() => setRightSidebarOpen(true)}
                      className="w-10 h-20 bg-orange-500 text-white rounded-l-2xl shadow-2xl flex items-center justify-center hover:bg-orange-600 transition-all hover:w-12 group"
                      title="開啟屬性欄"
                    >
                      <ChevronRight className="w-6 h-6 rotate-180 group-hover:scale-125 transition-transform" />
                    </button>
                  )}
               </div>

               {/* Left Toolbox */}
               <motion.aside 
                 id="editor-left-sidebar"
                 initial={false}
                 animate={{ width: leftSidebarOpen ? 320 : 0, opacity: leftSidebarOpen ? 1 : 0 }}
                 className="bg-white border-r border-gray-100 flex flex-col shrink-0 overflow-hidden relative"
               >
                  <div className="w-[320px] h-full flex flex-col overflow-y-auto">
                    <div className="p-8">
                       <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#141414]">WinForm UI Toolbox</h3>
                           <button 
                             onClick={() => setLeftSidebarOpen(false)} 
                             className="w-8 h-8 flex items-center justify-center bg-gray-50 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-all"
                             title="收合工具箱"
                           >
                             <ChevronRight className="w-4 h-4 rotate-180" />
                           </button>
                       </div>
                       
                       {/* Quick Templates Section */}
                       <div className="mb-10">
                          <button 
                            onClick={() => setSectionsOpen(prev => ({ ...prev, templates: !prev.templates }))}
                            className="w-full flex items-center justify-between text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-500 mb-6 border-b border-gray-50 pb-4 group"
                          >
                             <span className="flex items-center gap-2">
                               Quick Templates
                             </span>
                             <ChevronRight className={`w-3 h-3 transition-transform ${sectionsOpen.templates ? 'rotate-90' : ''}`} />
                          </button>
                          
                          <AnimatePresence>
                            {sectionsOpen.templates && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="grid grid-cols-2 gap-3 overflow-hidden"
                              >
                                {TEMPLATES.map(t => (
                                  <button 
                                    key={t.id}
                                    onClick={() => {
                                      setEditor(prev => ({ 
                                        ...prev, 
                                        selectedTemplateId: t.id, 
                                        image: t.backgroundUrl,
                                        lines: generateLinesForTemplate(t)
                                      }));
                                    }}
                                    className={`p-3 rounded-2xl border text-left flex flex-col gap-2 transition-all group ${editor.selectedTemplateId === t.id ? 'bg-orange-50 border-orange-500 shadow-md' : 'bg-white border-gray-100 hover:border-orange-200'}`}
                                  >
                                    <span className="text-[10px] font-bold truncate flex items-center gap-1">
                                      <UserIcon className="w-3 h-3 text-orange-500" /> {t.name}
                                    </span>
                                    <div className="w-full h-8 rounded-lg overflow-hidden" style={getBackgroundStyle(t.backgroundUrl, t.backgroundGradient)} />
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                       </div>

                       {/* Widgets Section */}
                       <div className="mb-10">
                          <button 
                            onClick={() => setSectionsOpen(prev => ({ ...prev, toolboxes: !prev.toolboxes }))}
                            className="w-full flex items-center justify-between text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-500 mb-6 border-b border-gray-50 pb-4 group"
                          >
                             Widgets
                             <ChevronRight className={`w-3 h-3 transition-transform ${sectionsOpen.toolboxes ? 'rotate-90' : ''}`} />
                          </button>

                          <AnimatePresence>
                            {sectionsOpen.toolboxes && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="grid grid-cols-1 gap-4 overflow-hidden"
                              >
                                <button 
                                  onClick={() => addWidget('standard')}
                                  className="group p-5 bg-gray-50 hover:bg-orange-50 text-left rounded-3xl transition-all border border-gray-200 hover:border-orange-200"
                                >
                                  <div className="w-10 h-10 bg-white border border-gray-100 rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                                    <TypeIcon className="w-5 h-5 text-orange-500" />
                                  </div>
                                  <p className="font-bold text-sm mb-1 text-[#141414]">標準文字掛件</p>
                                  <p className="text-[10px] text-gray-600 leading-relaxed">普通的單行文字，可用於歡迎詞或標語。</p>
                                </button>

                                <button 
                                  onClick={() => addWidget('business-card')}
                                  className="group p-5 bg-gray-50 hover:bg-blue-50 text-left rounded-3xl transition-all border border-gray-200 hover:border-blue-200"
                                >
                                  <div className="w-10 h-10 bg-white border border-gray-100 rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                                    <UserIcon className="w-5 h-5 text-blue-500" />
                                  </div>
                                  <p className="font-bold text-sm mb-1 text-[#141414]">人物名片掛件</p>
                                  <p className="text-[10px] text-gray-600 leading-relaxed">格式化的名片，包含姓名與職稱展示。</p>
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                       </div>

                       {/* Background Section */}
                       <div className="mb-10">
                          <button 
                            onClick={() => setSectionsOpen(prev => ({ ...prev, background: !prev.background }))}
                            className="w-full flex items-center justify-between text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-500 mb-6 border-b border-gray-50 pb-4 group"
                          >
                             Background Settings
                             <ChevronRight className={`w-3 h-3 transition-transform ${sectionsOpen.background ? 'rotate-90' : ''}`} />
                          </button>

                          <AnimatePresence>
                            {sectionsOpen.background && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="space-y-6 overflow-hidden"
                              >
                                <div className="relative group aspect-video rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
                                  <div className="w-full h-full" style={getBackgroundStyle(editor.image ?? '', TEMPLATES.find(t => t.id === editor.selectedTemplateId)?.backgroundGradient)} />
                                  {editor.image && (
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <label className="p-3 bg-white text-black rounded-2xl cursor-pointer font-bold text-xs shadow-lg">
                                            更換圖片
                                            <input 
                                              type="file" 
                                              accept="image/*" 
                                              className="hidden" 
                                              onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                  const reader = new FileReader();
                                                  reader.onloadend = async () => {
                                                    const url = await storage.uploadSlideImage(reader.result as string, editor.id, file.name);
                                                    setEditor(prev => ({ ...prev, image: url }));
                                                  };
                                                  reader.readAsDataURL(file);
                                                }
                                              }}
                                            />
                                        </label>
                                      </div>
                                  )}
                                  {!editor.image && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-300">
                                      <ImageIcon className="w-8 h-8" />
                                      <span className="text-xs font-bold">上傳背景</span>
                                    </div>
                                  )}
                                </div>

                                <div className="grid grid-cols-4 gap-2">
                                  {presetBackgrounds.map(bg => (
                                    <button 
                                      key={bg.url}
                                      onClick={() => setEditor(prev => ({ ...prev, image: bg.url, selectedTemplateId: null }))}
                                      className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${editor.image === bg.url ? 'border-orange-500 scale-95 shadow-md' : 'border-gray-100 hover:border-orange-200'}`}
                                    >
                                      <img src={bg.url} alt={bg.name} className="w-full h-full object-cover" />
                                    </button>
                                  ))}
                                  {customBackgrounds.map(bg => (
                                    <button 
                                      key={bg.id}
                                      onClick={() => setEditor(prev => ({ ...prev, image: bg.url, selectedTemplateId: null }))}
                                      className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${editor.image === bg.url ? 'border-orange-500 scale-95 shadow-md' : 'border-gray-100 hover:border-orange-200'}`}
                                    >
                                      <img src={bg.url} alt={bg.name} className="w-full h-full object-cover" />
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                       </div>
                    </div>
                  </div>
               </motion.aside>

               {/* Central Canvas Workspace */}
               <main id="editor-canvas" className="flex-1 bg-[#222] p-12 flex flex-col items-center justify-center overflow-hidden relative shadow-inner">
                  {/* Canvas Toolbar */}
                  <div className="absolute top-8 flex items-center gap-4 z-30">
                     <div className="flex bg-white/90 backdrop-blur-md p-1 rounded-2xl shadow-2xl border border-white/20">
                        <button 
                           onClick={() => setCanvasScale(prev => Math.max(0.2, prev - 0.1))}
                           className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-xl text-gray-400"
                        >
                           <Minus className="w-4 h-4" />
                        </button>
                        <span className="px-4 flex items-center text-xs font-bold text-gray-500 min-w-[70px] justify-center tabular-nums">
                           {Math.round(canvasScale * 100)}%
                        </span>
                        <button 
                           onClick={() => setCanvasScale(prev => Math.min(2, prev + 0.1))}
                           className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-xl text-gray-400"
                        >
                           <Plus className="w-4 h-4" />
                        </button>
                        <div className="w-px h-6 bg-gray-200 my-auto mx-2" />
                        <button 
                           onClick={() => setIsPreviewMode(!isPreviewMode)}
                           className={`h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${isPreviewMode ? 'bg-[#141414] text-white' : 'text-gray-400 hover:bg-gray-100'}`}
                        >
                           <Maximize2 className="w-4 h-4" /> 
                           {isPreviewMode ? '退出預覽' : '全屏預覽'}
                        </button>
                     </div>
                  </div>

                  {/* The Canvas itself */}
                  <div 
                    ref={canvasRef}
                    className={`relative bg-black transition-all duration-500 origin-center select-none shadow-[0_0_100px_rgba(0,0,0,0.5)] ${isPreviewMode ? 'z-50' : 'z-20'}`}
                    style={{ 
                      width: '1000px', 
                      height: '562.5px', // 16:9
                      transform: `scale(${canvasScale})`
                    }}
                    onClick={() => setSelectedLineId(null)}
                  >
                     {(editor.image || editor.selectedTemplateId) && <div className="absolute inset-0" style={getBackgroundStyle(editor.image ?? '', TEMPLATES.find(t => t.id === editor.selectedTemplateId)?.backgroundGradient)} />}
                     <div className="absolute inset-0 bg-black/20 pointer-events-none" style={{ opacity: theme.overlayOpacity }} />
                     
                     <AnimatePresence>
                        {editor.lines.map((line) => (
                          <motion.div
                            key={line.id}
                            drag
                            dragMomentum={false}
                            dragElastic={0}
                            dragConstraints={canvasRef}
                            onDragEnd={(e, info) => {
                              if (!canvasRef.current) return;
                              // Only update if there was actual movement to avoid interference with clicks
                              if (Math.abs(info.offset.x) < 1 && Math.abs(info.offset.y) < 1) return;

                              const rect = canvasRef.current.getBoundingClientRect();
                              // Convert offset (delta from start of drag in screen pixels) to percentage
                              const deltaXPercent = (info.offset.x / rect.width) * 100;
                              const deltaYPercent = (info.offset.y / rect.height) * 100;
                              
                              handleLineChange(line.id, { 
                                x: Math.min(100, Math.max(0, line.x + deltaXPercent)), 
                                y: Math.min(100, Math.max(0, line.y + deltaYPercent))
                              });
                            }}
                            onTap={() => {
                              setSelectedLineId(line.id);
                            }}
                            className={`absolute cursor-move group ${selectedLineId === line.id ? 'z-[60]' : 'z-40'}`}
                            style={{ 
                              left: `${line.x}%`, 
                              top: `${line.y}%`,
                              fontSize: 'inherit'
                            }}
                          >
                             {/* Alignment Wrapper - Isolates transform from Framer Motion drag logic */}
                             <div 
                                style={{ 
                                  transform: `translate(${line.align === 'center' ? '-50%' : line.align === 'right' ? '-100%' : '0'}, -50%)`,
                                }}
                                className="relative"
                             >
                               {/* Selection Box */}
                               {selectedLineId === line.id && !isPreviewMode && (
                                 <div className="absolute inset-[-12px] border-2 border-orange-500 rounded-lg shadow-[0_0_20px_rgba(249,115,22,0.3)] animate-pulse" />
                               )}
                               
                               <div className={`relative pointer-events-none ${theme.textColor} ${line.align === 'center' ? 'text-center' : line.align === 'right' ? 'text-right' : 'text-left'}`}>
                                  {line.type === 'business-card' ? (
                                    <div className={`flex flex-col gap-1 ${line.align === 'center' ? 'items-center' : line.align === 'right' ? 'items-end' : 'items-start'}`}>
                                      <div 
                                        className={`${line.nameSize || line.fontSize} ${line.nameWeight || line.fontWeight} ${line.italic ? 'italic' : ''} ${line.nameFontFamily || line.fontFamily || 'font-sans'} ${getWordArtClass(line.nameTextEffect)} leading-tight tracking-tight drop-shadow-md`}
                                        style={{ ...getWordArtStyle(line.nameTextEffect, line.nameColor || line.color, line.nameEffectColor), ...(line.nameTextEffect && line.nameTextEffect !== 'none' ? {} : { color: line.nameColor || line.color }) }}
                                      >
                                        {line.name || '姓名'}
                                      </div>
                                      <div 
                                        className={`${line.jobTitleSize} ${line.jobTitleWeight || 'font-medium'} ${line.jobTitleFontFamily || line.fontFamily || 'font-sans'} ${getWordArtClass(line.jobTitleTextEffect)} whitespace-nowrap leading-tight transition-opacity`}
                                        style={{ ...getWordArtStyle(line.jobTitleTextEffect, line.jobTitleColor || line.color, line.jobTitleEffectColor), opacity: line.jobTitleColor ? 1 : 0.7, ...(line.jobTitleTextEffect && line.jobTitleTextEffect !== 'none' ? {} : { color: line.jobTitleColor || line.color }) }}
                                      >
                                        {line.jobTitle || '職稱'}
                                      </div>
                                      {line.companyName && (
                                        <div 
                                          className={`${line.companyNameSize || 'text-[0.6em]'} ${line.companyNameWeight || 'font-normal'} ${line.companyNameFontFamily || line.fontFamily || 'font-sans'} ${getWordArtClass(line.companyNameTextEffect)} italic leading-relaxed`}
                                          style={{ ...getWordArtStyle(line.companyNameTextEffect, line.companyNameColor || line.color, line.companyNameEffectColor), opacity: line.companyNameColor ? 1 : 0.4, ...(line.companyNameTextEffect && line.companyNameTextEffect !== 'none' ? {} : { color: line.companyNameColor || line.color }) }}
                                        >
                                          {line.companyName}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div 
                                      className={`${line.fontSize} ${line.fontWeight} ${line.italic ? 'italic' : ''} ${line.fontFamily || (line.italic ? 'font-serif' : 'font-sans')} ${getWordArtClass(line.textEffect)} leading-tight tracking-tight transition-all drop-shadow-md whitespace-pre-wrap`}
                                      style={{ opacity: line.opacity, ...getWordArtStyle(line.textEffect, line.color, line.effectColor) }}
                                    >
                                      {line.text || '點擊編輯'}
                                    </div>
                                  )}
                               </div>
                               
                               {/* Floating Tooltips */}
                               {selectedLineId === line.id && !isPreviewMode && (
                                 <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-1 pointer-events-auto">
                                    <button onClick={() => removeLine(line.id)} className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"><Trash2 className="w-4 h-4" /></button>
                                 </div>
                               )}
                             </div>
                          </motion.div>
                        ))}
                     </AnimatePresence>
                  </div>
               </main>

               {/* Right sidebar Properties */}
               <motion.aside 
                 id="editor-right-sidebar"
                 initial={false}
                 animate={{ width: rightSidebarOpen ? 384 : 0, opacity: rightSidebarOpen ? 1 : 0 }}
                 className="bg-white border-l border-gray-100 flex flex-col shrink-0 overflow-hidden relative"
               >
                  <div className="w-[384px] h-full flex flex-col overflow-y-auto">
                    <div className="p-8">
                       <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#141414]">Element Properties</h3>
                           <button 
                             onClick={() => setRightSidebarOpen(false)} 
                             className="w-8 h-8 flex items-center justify-center bg-gray-50 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-all"
                             title="收合屬性欄"
                           >
                             <ChevronRight className="w-4 h-4" />
                           </button>
                       </div>
                     
                     {selectedLineId ? (
                       <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                          {/* Content Properties Section */}
                          <div>
                            <button 
                              onClick={() => setSectionsOpen(prev => ({ ...prev, properties: !prev.properties }))}
                              className="w-full flex items-center justify-between text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-500 mb-6 border-b border-gray-50 pb-4 group"
                            >
                               Content Properties
                               <ChevronRight className={`w-3 h-3 transition-transform ${sectionsOpen.properties ? 'rotate-90' : ''}`} />
                            </button>

                            <AnimatePresence>
                              {sectionsOpen.properties && (
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="space-y-6 overflow-hidden"
                                >
                                  {editor.lines.find(l => l.id === selectedLineId)?.type === 'business-card' ? (
                                     <div className="space-y-6">
                                        {/* Name Settings */}
                                         <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-4">
                                            <input 
                                              type="text" 
                                              value={editor.lines.find(l => l.id === selectedLineId)?.name || ''}
                                              placeholder="輸入姓名"
                                              onChange={(e) => handleLineChange(selectedLineId, { name: e.target.value })}
                                              className="w-full h-12 bg-white border-none rounded-2xl px-5 font-bold focus:ring-2 focus:ring-orange-500/10 mb-4 shadow-sm"
                                            />
                                            <TextStyleEditor 
                                              label="人物姓名設定" 
                                              prefix="name" 
                                              line={editor.lines.find(l => l.id === selectedLineId)!} 
                                              onChange={(updates) => handleLineChange(selectedLineId, updates)} 
                                            />
                                         </div>

                                         {/* Job Title Settings */}
                                         <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-4">
                                            <input 
                                              type="text" 
                                              value={editor.lines.find(l => l.id === selectedLineId)?.jobTitle || ''}
                                              placeholder="輸入職務"
                                              onChange={(e) => handleLineChange(selectedLineId, { jobTitle: e.target.value })}
                                              className="w-full h-12 bg-white border-none rounded-2xl px-5 font-bold focus:ring-2 focus:ring-orange-500/10 mb-4 shadow-sm"
                                            />
                                            <TextStyleEditor 
                                              label="職稱頭銜設定" 
                                              prefix="jobTitle" 
                                              line={editor.lines.find(l => l.id === selectedLineId)!} 
                                              onChange={(updates) => handleLineChange(selectedLineId, updates)} 
                                            />
                                         </div>

                                         {/* Company Settings */}
                                         <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-4">
                                            <input 
                                              type="text" 
                                              value={editor.lines.find(l => l.id === selectedLineId)?.companyName || ''}
                                              placeholder="輸入公司名稱"
                                              onChange={(e) => handleLineChange(selectedLineId, { companyName: e.target.value })}
                                              className="w-full h-12 bg-white border-none rounded-2xl px-5 font-bold focus:ring-2 focus:ring-orange-500/10 mb-4 shadow-sm"
                                            />
                                            <TextStyleEditor 
                                              label="公司名稱設定" 
                                              prefix="companyName" 
                                              line={editor.lines.find(l => l.id === selectedLineId)!} 
                                              onChange={(updates) => handleLineChange(selectedLineId, updates)} 
                                            />
                                         </div>
                                      </div>
                                  ) : (
                                     <div className="space-y-4 mb-4">
                                        <textarea 
                                          value={editor.lines.find(l => l.id === selectedLineId)?.text || ''}
                                          onChange={(e) => handleLineChange(selectedLineId, { text: e.target.value })}
                                          rows={3}
                                          className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold focus:ring-2 focus:ring-orange-500/10 resize-none shadow-sm"
                                        />
                                        <TextStyleEditor 
                                          label="標準文字設定" 
                                          prefix="" 
                                          line={editor.lines.find(l => l.id === selectedLineId)!} 
                                          onChange={(updates) => handleLineChange(selectedLineId, updates)} 
                                        />
                                     </div>
                                  )}

                                  <div className="flex flex-col">
                                     <label className="text-[10px] font-bold text-gray-400 uppercase mb-2">文字對齊</label>
                                     <div className="flex bg-gray-50 p-1 rounded-2xl">
                                        {(['left', 'center', 'right'] as const).map(align => (
                                          <button 
                                            key={align}
                                            onClick={() => handleLineChange(selectedLineId!, { align })}
                                            className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl transition-all ${editor.lines.find(l => l.id === selectedLineId)?.align === align ? 'bg-white shadow-sm text-black scale-[1.02]' : 'text-gray-300 hover:text-gray-500'}`}
                                          >
                                             <div className={`h-1 mb-1 rounded-full bg-current ${align === 'left' ? 'w-full mr-auto' : align === 'center' ? 'w-2/3' : 'w-full ml-auto'}`} />
                                             <div className={`h-1 mb-1 rounded-full bg-current ${align === 'left' ? 'w-2/3 mr-auto' : align === 'center' ? 'w-full' : 'w-2/3 ml-auto'}`} />
                                             <span className="text-[8px] font-bold uppercase tracking-tighter mt-1">{align}</span>
                                          </button>
                                        ))}
                                     </div>
                                  </div>

                                  <div className="flex flex-col">
                                     <div className="flex justify-between items-baseline mb-4">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">不透明度</label>
                                        <span className="text-xs font-bold font-mono">
                                          {Math.round((editor.lines.find(l => l.id === selectedLineId)?.opacity || 1) * 100)}%
                                        </span>
                                     </div>
                                     <input 
                                       type="range" 
                                       min="0" 
                                       max="1" 
                                       step="0.05"
                                       value={editor.lines.find(l => l.id === selectedLineId)?.opacity || 1}
                                       onChange={(e) => handleLineChange(selectedLineId!, { opacity: parseFloat(e.target.value) })}
                                       className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                     />
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          
                          <div className="pt-8 border-t border-gray-50">
                             <button 
                               onClick={() => removeLine(selectedLineId!)}
                               className="w-full h-14 bg-red-50 hover:bg-red-500 hover:text-white text-red-500 rounded-[28px] font-bold flex items-center justify-center gap-3 transition-all active:scale-95"
                             >
                                <Trash2 className="w-4 h-4" /> 移除此掛件
                             </button>
                          </div>
                       </div>
                     ) : (
                       <div className="space-y-12">
                          <div className="flex flex-col items-center justify-center py-20 text-center px-8">
                             <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                <MousePointer2 className="w-8 h-8 text-gray-200" />
                             </div>
                             <p className="text-sm font-bold text-gray-400 leading-relaxed">選擇畫布上的物件<br />來編輯屬性</p>
                          </div>

                          <div className="border-t border-gray-100 pt-10">
                              <button 
                                onClick={() => setSectionsOpen(prev => ({ ...prev, slideSettings: !prev.slideSettings }))}
                                className="w-full flex items-center justify-between text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-500 mb-6 border-b border-gray-50 pb-4 group"
                              >
                                 Slide Settings
                                 <ChevronRight className={`w-3 h-3 transition-transform ${sectionsOpen.slideSettings ? 'rotate-90' : ''}`} />
                              </button>

                              <AnimatePresence>
                                {sectionsOpen.slideSettings && (
                                  <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="space-y-6 overflow-hidden"
                                  >
                                    <div className="flex flex-col">
                                       <label className="text-[10px] font-bold text-gray-400 uppercase mb-2">管理標題</label>
                                       <input 
                                         type="text" 
                                         value={editor.title}
                                         onChange={(e) => setEditor(prev => ({ ...prev, title: e.target.value }))}
                                         className="w-full h-12 bg-gray-50 border-none rounded-2xl px-5 font-bold focus:ring-2 focus:ring-orange-500/10 placeholder:text-gray-200"
                                       />
                                    </div>
                                    {!editor.isDefault && (
                                      <div className="flex flex-col">
                                         <label className="text-[10px] font-bold text-gray-400 uppercase mb-2">保存天數</label>
                                         <select 
                                           className="w-full h-14 bg-gray-50 border-none rounded-2xl px-5 font-bold appearance-none cursor-pointer"
                                           value={editor.expiryDays}
                                           onChange={(e) => setEditor(prev => ({ ...prev, expiryDays: e.target.value }))}
                                         >
                                            <option value="1">1 天 (明日到期)</option>
                                            <option value="3">3 天</option>
                                            <option value="7">7 天 (預設值)</option>
                                            <option value="14">14 天</option>
                                            <option value="30">30 天</option>
                                         </select>
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                          </div>
                       </div>
                     )}
                    </div>
                  </div>
               </motion.aside>
            </div>
         </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDeleteId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white p-12 rounded-[50px] shadow-2xl max-w-sm w-full text-center overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-3 bg-red-500" />
              <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8"><Trash2 className="w-12 h-12 text-red-500" /></div>
              <h3 className="text-3xl font-extrabold tracking-tight mb-4">確定刪除？</h3>
              <p className="text-gray-400 mb-10 leading-relaxed font-medium">內容刪除後將無法復原，並立即從播送系統中移除。</p>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setConfirmDeleteId(null)} className="py-4 bg-gray-50 text-gray-400 rounded-3xl font-bold hover:bg-gray-100 transition-all">取消</button>
                <button onClick={() => handleDelete(confirmDeleteId)} className="py-4 bg-red-500 text-white rounded-3xl font-bold hover:bg-red-600 transition-all shadow-xl shadow-red-500/20">確定刪除</button>
              </div>
            </motion.div>
          </div>
        )}

        {showMessagesModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowMessagesModal(false)} className="absolute inset-0 bg-[#FDFDFD]/80 backdrop-blur-2xl" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white rounded-[2rem] p-10 shadow-2xl border border-gray-100 max-w-2xl w-full text-center overflow-hidden">
              <h3 className="text-3xl font-extrabold tracking-tight mb-4">設定隨機歡迎詞庫</h3>
              <p className="text-gray-400 mb-6 leading-relaxed font-medium">使用樣板自動產生圖卡時，會從以下的詞庫中隨機挑選一句作為歡迎標語。(請一行一句)</p>
              <textarea 
                value={editingMessagesText}
                onChange={e => setEditingMessagesText(e.target.value)}
                className="w-full h-64 p-4 border border-gray-200 rounded-2xl bg-gray-50 font-medium text-gray-700 leading-relaxed mb-8 custom-scrollbar resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                placeholder="請輸入歡迎詞，每行一句"
              />
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setShowMessagesModal(false)} className="py-4 bg-gray-50 text-gray-400 rounded-3xl font-bold hover:bg-gray-100 transition-all">取消</button>
                <button onClick={() => {
                  const msgs = editingMessagesText.split('\n').map(s => s.trim()).filter(Boolean);
                  if (msgs.length === 0) msgs.push('歡迎光臨');
                  handleUpdateSettings({ welcomeMessages: msgs });
                  setShowMessagesModal(false);
                }} className="py-4 bg-indigo-500 text-white rounded-3xl font-bold shadow-xl shadow-indigo-500/30 hover:bg-indigo-600 transition-all">儲存並套用</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
