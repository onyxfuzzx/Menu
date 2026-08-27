import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { buildMenu, updateRestaurantSettings } from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, QrCode, Menu as MenuIcon, ArrowLeft, ExternalLink, Images as ImagesIcon } from 'lucide-react';
import { getSavedThemeId, setSavedThemeId, THEMES, applyThemeVarsToElement, loadGoogleFont } from '@/utils/themeConfig';
import BottomNav from '@/components/shared/BottomNav';

import MenuEditorTab from './components/MenuEditorTab';
import RestroMenuEditorTab from './components/restro-editor/RestroMenuEditorTab';
import ThemeEditorTab from './components/ThemeEditorTab';
import QREditorTab from './components/QREditorTab';
import ImageFunnelTab from './components/ImageFunnelTab';

type TabType = 'menu' | 'theme' | 'qr' | 'images';

export default function MenuManagerPage() {
  const { id: restaurantId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<TabType>('theme');
  const [selectedThemeId, setSelectedThemeId] = useState(() => getSavedThemeId(restaurantId ?? ''));
  const [showSavedToast, setShowSavedToast] = useState(false);
  const savedToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedTheme = useMemo(() => THEMES.find(t => t.id === selectedThemeId) ?? THEMES[0], [selectedThemeId]);

  const { data: menuData, isLoading } = useQuery({
    queryKey: ['manager-menu', restaurantId],
    queryFn: () => buildMenu(restaurantId ?? ''),
    enabled: !!restaurantId,
  });

  const localThemeId = useMemo(() => getSavedThemeId(restaurantId ?? ''), [restaurantId]);

  useEffect(() => {
    if (!restaurantId || !menuData) return;
    if (menuData.themeId && menuData.themeId !== 'default') {
      setSelectedThemeId(menuData.themeId);
      setSavedThemeId(restaurantId, menuData.themeId);
    } else if (localThemeId && localThemeId !== 'default') {
      updateRestaurantSettings(restaurantId, { themeId: localThemeId }).catch(console.error);
    }
  }, [menuData, restaurantId, localThemeId]);

  const categories = menuData?.categories || [];
  const allItems = useMemo(() => {
    const items: any[] = [];
    categories.forEach((c: any) => { items.push(...c.items); c.subCategories.forEach((sc: any) => items.push(...sc.items)); });
    return items;
  }, [categories]);

  useEffect(() => {
    const root = document.documentElement;
    applyThemeVarsToElement(root as unknown as HTMLElement, selectedTheme.vars);
    loadGoogleFont(selectedTheme.fonts.heading);
    loadGoogleFont(selectedTheme.fonts.body);
    
    if (restaurantId) {
      setSavedThemeId(restaurantId, selectedTheme.id);
    }
  }, [selectedTheme, restaurantId]);

  useEffect(() => {
    return () => {
      const root = document.documentElement;
      Object.keys(selectedTheme.vars).forEach(k => root.style.removeProperty(k));
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectTheme = useCallback((id: string) => {
    setSelectedThemeId(id);
    if (restaurantId) {
      setSavedThemeId(restaurantId, id);
      updateRestaurantSettings(restaurantId, { themeId: id }).catch(console.error);
    }
    if (savedToastTimer.current) clearTimeout(savedToastTimer.current);
    setShowSavedToast(true);
    savedToastTimer.current = setTimeout(() => setShowSavedToast(false), 1500);
  }, [restaurantId]);

  const menuUrl = `${window.location.origin}/restaurant/${restaurantId}/menu`;

  const NAV_TABS = useMemo(() => {
    const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
      { id: 'menu', label: 'Menu', icon: <MenuIcon className="w-5 h-5" /> },
      { id: 'theme', label: 'Themes', icon: <Palette className="w-5 h-5" /> },
      { id: 'qr', label: 'QR', icon: <QrCode className="w-5 h-5" /> },
    ];
    if (user?.role === 'SuperAdmin') {
      tabs.push({ id: 'images', label: 'Images', icon: <ImagesIcon className="w-5 h-5" /> });
    }
    return tabs;
  }, [user?.role]);

  return (
    <div className="min-h-screen bg-stone-50 pb-bottom-nav">
      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-stone-200 shadow-sm max-w-[430px] mx-auto">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/restro-admin')} className="flex items-center justify-center w-8 h-8 rounded-full bg-stone-100 text-stone-600 hover:text-stone-900 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-base font-bold text-stone-900 leading-none">Menu Studio</h1>
              <p className="text-[10px] text-stone-400 mt-0.5 uppercase tracking-wider">{user?.restaurantName || restaurantId}</p>
            </div>
          </div>

          <button
            onClick={() => window.open(menuUrl, '_blank')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Preview
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="max-w-[430px] mx-auto bg-stone-50 min-h-screen">
        <AnimatePresence mode="wait">
          {activeTab === 'menu' && (
            user?.role === 'RestroAdmin'
              ? <RestroMenuEditorTab restaurantId={restaurantId ?? ''} categories={categories} isLoading={isLoading} />
              : <MenuEditorTab categories={categories} allItems={allItems} isLoading={isLoading} />
          )}
          {activeTab === 'theme' && <ThemeEditorTab restaurantId={restaurantId ?? ''} selectedThemeId={selectedThemeId} onSelectTheme={handleSelectTheme} menuUrl={menuUrl} allItems={allItems} />}
          {activeTab === 'qr' && <QREditorTab menuUrl={menuUrl} selectedTheme={selectedTheme} />}
          {activeTab === 'images' && user?.role === 'SuperAdmin' && <ImageFunnelTab />}
        </AnimatePresence>
      </div>

      {/* ── Mobile Bottom Nav ── */}
      <BottomNav
        layoutId="menu-studio-nav"
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as TabType)}
        tabs={NAV_TABS}
      />

      {/* ── "Saved" toast ── */}
      <AnimatePresence>
        {showSavedToast && (
          <motion.div
            initial={{ opacity: 0, y: 10, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 10, x: '-50%' }}
            className="fixed bottom-24 left-1/2 z-50 px-5 py-2.5 rounded-full text-sm font-bold shadow-xl flex items-center gap-2"
            style={{ background: selectedTheme.vars['--primary'], color: selectedTheme.vars['--text-on-primary'] || '#fff' }}
          >
            {selectedTheme.emoji} Theme Saved
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media print {
          body > * { display: none !important; }
          #printable-qr { display: block !important; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); }
        }
      `}</style>
    </div>
  );
}
