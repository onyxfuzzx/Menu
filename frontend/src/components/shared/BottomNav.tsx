import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

export interface BottomNavTab {
  id: string;
  label: string;
  icon: ReactNode;
  /** Optional count badge (e.g. pending orders). Hidden when 0/undefined. */
  badge?: number;
}

interface BottomNavProps {
  tabs: BottomNavTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  /** Unique layoutId so multiple navs never share the framer-motion indicator */
  layoutId?: string;
  /** Optional center floating action button (Material style) */
  fab?: ReactNode;
}

/**
 * Material-style bottom app bar, shared across all mobile screens.
 * Handles Android safe-area insets (gesture nav bar) via pb-safe.
 */
export default function BottomNav({ tabs, activeTab, onTabChange, layoutId = 'bottom-nav-indicator', fab }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 max-w-[430px] mx-auto bg-white border-t border-stone-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-safe">
      <div className="h-16 flex items-stretch justify-around relative">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center relative min-w-0 transition-colors ${
                isActive ? 'text-stone-900' : 'text-stone-400 active:text-stone-600'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <motion.div layoutId={layoutId} className="absolute top-0 w-12 h-1 rounded-b-full bg-stone-900" />
              )}
              <div className={`relative mb-0.5 transition-transform ${isActive ? '-translate-y-0.5' : ''}`}>
                {tab.icon}
                {!!tab.badge && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] truncate max-w-full px-1 ${isActive ? 'font-bold' : 'font-semibold'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
      {fab && (
        <div className="absolute left-1/2 -translate-x-1/2 -top-6 z-50">
          {fab}
        </div>
      )}
    </nav>
  );
}
