import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Check, Moon, Sun, Palette, LayoutGrid } from 'lucide-react';
import { THEMES, loadGoogleFont, applyThemeVarsToElement } from '@/utils/themeConfig';
import type { Theme, ThemeVars } from '@/utils/themeConfig';

type ThemeCategory = 'all' | 'dark' | 'light' | 'neutral';

interface Props {
  restaurantId: string;
  selectedThemeId: string;
  onSelectTheme: (id: string) => void;
  menuUrl: string;
  allItems: any[];
}

export default function ThemeEditorTab({ restaurantId, selectedThemeId, onSelectTheme, menuUrl, allItems }: Props) {
  const [themeFilter, setThemeFilter] = useState<ThemeCategory>('all');
  const selectedTheme = THEMES.find(t => t.id === selectedThemeId) || THEMES[0];
  const filteredThemes = themeFilter === 'all' ? THEMES : THEMES.filter(t => t.category === themeFilter);

  const counts = {
    all: THEMES.length,
    dark: THEMES.filter(t => t.category === 'dark').length,
    light: THEMES.filter(t => t.category === 'light').length,
    neutral: THEMES.filter(t => t.category === 'neutral').length,
  };

  return (
    <motion.div key="theme" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="max-w-[430px] mx-auto pb-24">
      {/* Header */}
      <div className="pt-5 pb-2 px-4 flex flex-col items-center">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2 mb-0.5">
          <Sparkles className="w-5 h-5 text-amber-500" /> Menu Themes
        </h2>
        <p className="text-xs text-stone-400 mb-4">Choose a look that matches your brand</p>
      </div>

      {/* Phone preview with actual menu iframe */}
      <div className="px-4 pb-4 flex flex-col items-center">
        <PhoneIframePreview
          restaurantId={restaurantId}
          theme={selectedTheme}
          menuUrl={menuUrl}
        />
      </div>

      {/* Filter buttons — all 4 in one line */}
      <div className="flex gap-1.5 px-4 mb-4">
        {([
          { id: 'all' as ThemeCategory, label: `All (${counts.all})`, Icon: LayoutGrid },
          { id: 'dark' as ThemeCategory, label: `Dark`, Icon: Moon },
          { id: 'light' as ThemeCategory, label: `Light`, Icon: Sun },
          { id: 'neutral' as ThemeCategory, label: `Warm`, Icon: Palette },
        ]).map(f => (
          <button
            key={f.id}
            onClick={() => setThemeFilter(f.id)}
            className="flex-1 py-1.5 rounded-full text-[11px] font-semibold border transition-all whitespace-nowrap flex items-center justify-center gap-1"
            style={{
              background: themeFilter === f.id ? selectedTheme.vars['--primary'] : '#fff',
              color: themeFilter === f.id ? selectedTheme.vars['--text-on-primary'] || '#fff' : '#6b7280',
              borderColor: themeFilter === f.id ? selectedTheme.vars['--primary'] : '#e5e7eb',
            }}
          >
            <f.Icon className="w-3.5 h-3.5" /> {f.label}
          </button>
        ))}
      </div>

      {/* Theme cards horizontal scroll */}
      <div className="flex gap-3 overflow-x-auto px-4 pb-6 pt-1 hide-scrollbar" style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
        {filteredThemes.map(theme => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            selected={selectedThemeId === theme.id}
            onSelect={() => onSelectTheme(theme.id)}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ── Phone frame with actual menu iframe ─────────────────────────────────────────

function PhoneIframePreview({ restaurantId, theme, menuUrl }: { restaurantId: string; theme: Theme; menuUrl: string }) {
  const v = theme.vars;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeReady, setIframeReady] = useState(false);

  // When theme changes, apply vars to iframe document if loaded same-origin
  useEffect(() => {
    if (!iframeRef.current) return;
    try {
      const iframeDoc = iframeRef.current.contentDocument;
      if (iframeDoc) {
        applyThemeVarsToElement(iframeDoc.documentElement, v);
        // Also load the theme's fonts
        loadGoogleFont(theme.fonts.heading);
        loadGoogleFont(theme.fonts.body);
      }
    } catch {
      // Cross-origin — can't access iframe content, that's OK
    }
  }, [theme, v]);

  // Also apply theme vars to the iframe wrapper so the background matches
  return (
    <div className="relative flex-shrink-0">
      {/* Phone body */}
      <div className="w-[200px] h-[400px] bg-stone-900 rounded-[32px] p-[5px] shadow-2xl relative overflow-hidden">
        {/* Screen */}
        <div className="w-full h-full rounded-[28px] overflow-hidden relative" style={{ background: v['--bg-page'] }}>
          <iframe
            ref={iframeRef}
            key={theme.id}
            src={`/restaurant/${restaurantId}/menu`}
            className="border-0 absolute top-0 left-1/2"
            style={{
              width: '430px',
              height: '900px',
              transform: 'translateX(-50%) scale(0.44)',
              transformOrigin: 'top center',
              pointerEvents: 'none',
            }}
            onLoad={() => setIframeReady(true)}
            title="Menu preview"
          />
          {!iframeReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-50">
              <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Notch */}
        <div className="absolute top-[5px] left-1/2 -translate-x-1/2 w-16 h-[10px] bg-stone-900 rounded-b-xl z-10" />
      </div>

      {/* Glow effect behind phone */}
      <div
        className="absolute -inset-8 rounded-full blur-3xl opacity-20 -z-10"
        style={{ background: v['--primary'] }}
      />
    </div>
  );
}

// ── Theme card (3-column grid) ──────────────────────────────────────────────────

function ThemeCard({ theme, selected, onSelect }: { theme: Theme; selected: boolean; onSelect: () => void }) {
  const v = theme.vars;
  return (
    <div
      onClick={onSelect}
      className={`snap-start min-w-[130px] w-[130px] p-2.5 rounded-2xl border-2 transition-all cursor-pointer flex-shrink-0 flex flex-col relative ${
        selected ? 'shadow-lg' : 'shadow-sm hover:shadow-md'
      }`}
      style={{
        borderColor: selected ? v['--primary'] : '#e5e7eb',
        background: '#fff',
      }}
    >
      {selected && (
        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white shadow z-10" style={{ background: v['--primary'] }}>
          <Check className="w-3 h-3" strokeWidth={3} />
        </div>
      )}

      {/* Color swatch preview */}
      <div className="h-16 rounded-xl mb-2 relative overflow-hidden flex shadow-inner border border-stone-100" style={{ background: v['--bg'] }}>
        {/* Hero area */}
        <div className="w-2/5 h-full relative" style={{ background: v['--hero-bg'] || v['--primary-light'] }}>
          <div className="absolute inset-0 bg-black/10" />
        </div>
        {/* Content area */}
        <div className="w-3/5 h-full flex flex-col gap-[3px] p-1" style={{ background: v['--bg-page'] }}>
          <div className="h-[5px] w-full rounded-sm" style={{ background: v['--surface'] }} />
          <div className="h-[5px] w-3/4 rounded-sm" style={{ background: v['--surface'] }} />
          <div className="flex-1" />
          <div className="h-[14px] w-full rounded-sm flex items-center" style={{ background: v['--surface'] }}>
            <div className="h-full w-1/2 rounded-sm opacity-40" style={{ background: v['--border'] }} />
          </div>
        </div>
        {/* Primary accent dot */}
        <div className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full shadow-sm" style={{ background: v['--primary'] }} />
      </div>

      {/* Theme name */}
      <div className="text-center flex flex-col items-center">
        <span className="text-sm">{theme.emoji}</span>
        <h4 className="font-bold text-[10px] text-stone-700 leading-tight line-clamp-2 mt-0.5">{theme.name}</h4>
      </div>
    </div>
  );
}
