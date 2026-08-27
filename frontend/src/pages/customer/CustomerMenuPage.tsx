import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { buildMenu, updateRestaurantSettings } from '@/services/api';
import { Menu as MenuIcon, Home, ShoppingCart, Info, ArrowUp } from 'lucide-react';

import { getSavedTheme, getSavedThemeId, setSavedThemeId, getSavedBanner, setSavedBanner, DEFAULT_BANNER, THEMES, applyThemeVarsToElement } from '@/utils/themeConfig';
import CustomerHero from './components/CustomerHero';
import CustomerSearchBar from './components/CustomerSearchBar';
import CustomerBestSellers from './components/CustomerBestSellers';
import CustomerCategoryList, { CategoryPopup } from './components/CustomerCategoryList';
import CustomerMenuGrid from './components/CustomerMenuGrid';
import CustomerItemModal from './components/CustomerItemModal';
import CustomerCart from './components/CustomerCart';
import CallWaiterButton from './components/CallWaiterButton';

// ── Backend shapes (build-menu response) ────────────────────────────────────────
interface RawPrice { label: string | null; value: number; originalPrice: number | null }
interface RawItem {
  id: string;
  name: string;
  description: string | null;
  notes: string | null;
  badges: string[];
  prices: RawPrice[];
  imageUrl?: string | null;
  spiceLevel?: number;
}
interface RawSubCategory { subCategoryName: string; notes: string | null; items: RawItem[] }
interface RawCategory {
  id: string;
  categoryName: string;
  notes: string | null;
  sortOrder: number;
  items: RawItem[];
  subCategories: RawSubCategory[];
  emoji?: string | null;
}

export type Dietary = 'veg' | 'nonveg' | 'jain' | null;
export interface Price { label: string | null; value: number; originalPrice: number | null }
export interface FlatItem {
  id: string;
  name: string;
  description: string;
  notes: string | null;
  category: string;
  subCategory: string | null;
  badges: string[];
  dietary: Dietary;
  prices: Price[];
  bestseller: boolean;
  image: string;
  spiceLevel: number;
}
export interface CartItem extends FlatItem {
  price: number;
  variantLabel: string | null;
  lineId: string;
  qty: number;
}
interface CategoryMeta { name: string; emoji: string; notes: string; count: number }

const IMAGE_POOL = [
  '/images/starters/chicken-tikka.png', '/images/starters/paneer-tikka.png', '/images/starters/fish-fry.png',
  '/images/breads/butter-naan.png', '/images/rice-biryani/chicken-biryani.png', '/images/main-course/butter-chicken.png',
];
const FALLBACK_IMAGE = '/images/starters/chicken-tikka.png';

export default function CustomerMenuPage() {
  const { id: restaurantId } = useParams<{ id: string }>();

  const { data } = useQuery({
    queryKey: ['customer-menu', restaurantId],
    queryFn: () => buildMenu(restaurantId ?? ''),
    enabled: !!restaurantId,
  });

  const localThemeId = useMemo(() => getSavedThemeId(restaurantId ?? ''), [restaurantId]);
  const dbThemeId = data?.themeId;
  const themeId = (dbThemeId && dbThemeId !== 'default') ? dbThemeId : (localThemeId || 'default');
  const theme = useMemo(() => THEMES.find(t => t.id === themeId) || THEMES[0], [themeId]);
  const v = theme.vars;

  useEffect(() => {
    applyThemeVarsToElement(document.documentElement, theme.vars);
  }, [theme]);

  useEffect(() => {
    if (!restaurantId || !data) return;

    if (data.themeId && data.themeId !== 'default') {
      setSavedThemeId(restaurantId, data.themeId);
    } else if (localThemeId && localThemeId !== 'default') {
      updateRestaurantSettings(restaurantId, { themeId: localThemeId }).catch(console.error);
    }

    if (data.bannerUrl) {
      setSavedBanner(restaurantId, data.bannerUrl);
    } else {
      const localBanner = getSavedBanner(restaurantId);
      if (localBanner && localBanner !== DEFAULT_BANNER) {
        updateRestaurantSettings(restaurantId, { bannerUrl: localBanner }).catch(console.error);
      }
    }
  }, [data, restaurantId, localThemeId]);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'veg' | 'nonveg' | 'bestseller' | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'home' | 'orders'>('home');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'compact'>('list');
  const [catCollapsed, setCatCollapsed] = useState(false);
  const [showCategoryPopup, setShowCategoryPopup] = useState(false);
  const [modalItemId, setModalItemId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const manualSelectRef = useRef(false);

  // When user manually clicks a category, just scroll to its section (never filter)
  const handleCategorySelect = (cat: string) => {
    if (cat === 'All') {
      setActiveCategory('All');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    // Briefly suppress scroll spy so it doesn't fight with programmatic scroll
    manualSelectRef.current = true;
    setActiveCategory(cat); // update the highlighted pill immediately
    const el = document.querySelector<HTMLElement>(`[data-category-section="${cat}"]`);
    if (el) {
      const offset = 130; // account for sticky headers
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
    setTimeout(() => { manualSelectRef.current = false; }, 900);
  };

  useEffect(() => {
    const handleScroll = () => {
      setCatCollapsed(window.scrollY > 300);
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);



  const rawCategories: RawCategory[] = useMemo(() => data?.categories || [], [data]);

  const menuData: FlatItem[] = useMemo(() => {
    const items: FlatItem[] = [];
    let idx = 0;
    const ordered = [...rawCategories].sort((a, b) => a.sortOrder - b.sortOrder);
    
    const push = (raw: RawItem, category: string, subCategory: string | null) => {
      const badges = raw.badges || [];
      const prices = (raw.prices || []).map(p => ({ label: p.label ?? null, value: p.value, originalPrice: p.originalPrice ?? null }));
      if (prices.length === 0) prices.push({ label: null, value: 0, originalPrice: null });

      let dietary: Dietary = null;
      if (badges.some(b => /veg/i.test(b) && !/non/i.test(b))) dietary = 'veg';
      if (badges.some(b => /non[\s_-]?veg/i.test(b))) dietary = 'nonveg';
      
      const bestseller = badges.some(b => /bestseller|best seller|must try/i.test(b));

      items.push({
        id: raw.id || `gen-${idx}`,
        name: raw.name || '',
        description: raw.description || '',
        notes: raw.notes || null,
        category,
        subCategory,
        badges,
        dietary,
        prices,
        bestseller,
        image: raw.imageUrl || FALLBACK_IMAGE,
        spiceLevel: raw.spiceLevel ?? 0,
      });
      idx++;
    };

    ordered.forEach(c => {
      (c.items || []).forEach(i => push(i, c.categoryName, null));
      (c.subCategories || []).forEach(sc => {
        (sc.items || []).forEach(i => push(i, c.categoryName, sc.subCategoryName));
      });
    });
    return items;
  }, [rawCategories]);

  const categories: CategoryMeta[] = useMemo(() => {
    const counts: Record<string, number> = {};
    menuData.forEach(item => { counts[item.category] = (counts[item.category] || 0) + 1; });
    return Object.entries(counts).map(([name, count]) => ({
      name,
      emoji: rawCategories.find(c => c.categoryName === name)?.emoji || getCategoryEmoji(name),
      notes: rawCategories.find(c => c.categoryName === name)?.notes || '',
      count
    }));
  }, [menuData, rawCategories]);

  function getCategoryEmoji(name: string): string {
    const n = name.toLowerCase();
    if (/tandoor|kabab/.test(n)) return '🍢';
    if (/rice.*noodle/.test(n)) return '🍜';
    if (/rice.*biryani/.test(n)) return '🍚';
    if (/naan|bread/.test(n)) return '🫓';
    if (/dessert|sweet/.test(n)) return '🍰';
    if (/beverage|drink/.test(n)) return '🥤';
    return '🍽️';
  }

  const filteredItems = useMemo(() => {
    return menuData.filter(item => {
      if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (activeFilter === 'veg' && item.dietary !== 'veg') return false;
      if (activeFilter === 'nonveg' && item.dietary !== 'nonveg') return false;
      if (activeFilter === 'bestseller' && !item.bestseller) return false;
      return true;
    });
  }, [menuData, searchQuery, activeFilter]);

  const handleAddToCart = (item: FlatItem) => {
    const lineId = `${item.id}-${item.prices[0]?.label || 'default'}`;
    setCart(prev => {
      const ex = prev.find(c => c.lineId === lineId);
      if (ex) return prev.map(c => c.lineId === lineId ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, price: item.prices[0]?.value || 0, variantLabel: item.prices[0]?.label || null, lineId, qty: 1 }];
    });
  };

  const handleUpdateQty = (lineId: string, delta: number) => {
    setCart(prev => prev.map(c => c.lineId === lineId ? { ...c, qty: c.qty + delta } : c).filter(c => c.qty > 0));
  };

  const totalCartItems = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <div data-theme className="max-w-[430px] mx-auto min-h-screen relative shadow-2xl" style={{ fontFamily: v['--font-body'], backgroundColor: v['--bg-page'], color: v['--text-primary'] }}>
      
      {activeTab === 'home' && (
        <div className="pt-4 pb-20 animate-fade-in">
          <CustomerHero restaurantId={restaurantId || ''} bannerUrl={data?.bannerUrl} />
          
          <CustomerSearchBar 
            restaurantId={restaurantId || ''} 
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            activeFilter={activeFilter} setActiveFilter={setActiveFilter}
          />
          
          {!searchQuery && !activeFilter && (
            <CustomerBestSellers 
              restaurantId={restaurantId || ''} 
              items={filteredItems} 
              onOpenModal={setModalItemId} 
            />
          )}

          <CustomerCategoryList 
            restaurantId={restaurantId || ''} 
            categories={categories}
            activeCategory={activeCategory} setActiveCategory={handleCategorySelect}
            collapsed={catCollapsed} onOpenPopup={() => setShowCategoryPopup(true)}
          />

          <CustomerMenuGrid 
            restaurantId={restaurantId || ''}
            items={filteredItems}
            cart={cart}
            onAddToCart={handleAddToCart}
            onUpdateQty={handleUpdateQty}
            onOpenModal={setModalItemId}
            viewMode={viewMode}
            setViewMode={setViewMode}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            manualSelectRef={manualSelectRef}
          />

          {/* Floating buttons — pinned to the centered 430px column, not the viewport edge */}
          <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[430px] pointer-events-none">
            {restaurantId && <CallWaiterButton restaurantId={restaurantId} />}

            {showScrollTop && (
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="pointer-events-auto absolute right-4 bottom-[160px] w-12 h-12 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border animate-fade-in"
                style={{ background: v['--surface'] || '#ffffff', color: v['--text-primary'] || '#1f2937', borderColor: v['--border'] || '#e5e7eb' }}
              >
                <ArrowUp className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={() => setShowCategoryPopup(true)}
              className="pointer-events-auto absolute right-4 bottom-[100px] rounded-full pl-3 pr-4 py-2.5 shadow-lg flex items-center gap-2 active:scale-95 transition-transform border"
              style={{
                background: v['--surface'] || v['--floating-btn-bg'] || '#1f2937',
                color: v['--text-primary'] || '#ffffff',
                borderColor: v['--border'] || 'transparent'
              }}
            >
              <MenuIcon className="w-5 h-5" />
              <span className="font-bold text-sm">Menu</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1 min-w-[20px] text-center shadow-sm" style={{ background: v['--primary'], color: v['--text-on-primary'] || '#ffffff' }}>
                {categories.length}
              </span>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <CustomerCart 
          cart={cart} 
          onUpdateQty={handleUpdateQty} 
          onClearCart={() => setCart([])} 
          onBrowseMenu={() => setActiveTab('home')}
          restaurantId={restaurantId || ''}
        />
      )}

      {showCategoryPopup && (
        <CategoryPopup 
          restaurantId={restaurantId || ''}
          categories={categories}
          activeCategory={activeCategory}
          setActiveCategory={(cat) => { handleCategorySelect(cat); setShowCategoryPopup(false); }}
          onClose={() => setShowCategoryPopup(false)}
        />
      )}

      {modalItemId && (
        <CustomerItemModal 
          restaurantId={restaurantId || ''}
          item={menuData.find(i => i.id === modalItemId) || null}
          onClose={() => setModalItemId(null)}
          cart={cart}
          onAddToCart={handleAddToCart}
          onUpdateQty={handleUpdateQty}
        />
      )}

      {/* Bottom Nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto border-t z-40 pb-safe"
        style={{ background: v['--nav-bg'] || '#ffffff', borderColor: v['--nav-border'] || '#e5e7eb' }}
      >
        <div className="h-[65px] flex justify-around items-center">
        <button 
          onClick={() => setActiveTab('home')}
          className="flex flex-col items-center justify-center w-full h-full relative"
          style={{ color: activeTab === 'home' ? v['--primary'] : v['--nav-inactive'] }}
        >
          {activeTab === 'home' && <div className="absolute top-0 w-8 h-1 rounded-b-full" style={{ background: v['--primary'] }}></div>}
          <Home className={`w-6 h-6 mb-1 transition-transform ${activeTab === 'home' ? '-translate-y-1' : ''}`} />
          <span className="text-[10px] font-bold">Home</span>
        </button>

        <button 
          onClick={() => setActiveTab('orders')}
          className="flex flex-col items-center justify-center w-full h-full relative"
          style={{ color: activeTab === 'orders' ? v['--primary'] : v['--nav-inactive'] }}
        >
          {activeTab === 'orders' && <div className="absolute top-0 w-8 h-1 rounded-b-full" style={{ background: v['--primary'] }}></div>}
          <div className="relative">
            <ShoppingCart className={`w-6 h-6 mb-1 transition-transform ${activeTab === 'orders' ? '-translate-y-1' : ''}`} />
            {totalCartItems > 0 && (
              <div 
                className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm"
                style={{ background: v['--primary'] }}
              >
                {totalCartItems}
              </div>
            )}
          </div>
          <span className="text-[10px] font-bold">Orders</span>
        </button>

        <button 
          className="flex flex-col items-center justify-center w-full h-full relative"
          style={{ color: v['--nav-inactive'] }}
        >
          <Info className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-bold">Info</span>
        </button>
        </div>
      </nav>
    </div>
  );
}
