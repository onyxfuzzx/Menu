import { classifyBadge } from '@/utils/badges';

interface Props {
  badges: string[];
  /** Max chips before collapsing the rest into a "+N" pill. */
  max?: number;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Renders an item's tag/quantity/prep badges as colored chips.
 * Dietary (veg/nonveg/jain) and bestseller are rendered separately elsewhere,
 * so they are filtered out here to avoid duplication.
 *
 * Single source of truth shared by the RestroAdmin editor and the customer menu
 * so any tag saved in the editor renders identically for the customer.
 */
export default function ItemBadgeChips({ badges, max = 99, size = 'sm', className = '' }: Props) {
  const tagOnly = badges.filter((b) => {
    const t = classifyBadge(b);
    if (t === 'veg' || t === 'nonveg') return false;
    if (/^jain$/i.test(b.trim())) return false;
    if (/bestseller|best seller|must try/i.test(b)) return false;
    return true;
  });

  if (tagOnly.length === 0) return null;

  const visible = tagOnly.slice(0, max);
  const overflow = tagOnly.length - max;
  const pad = size === 'md' ? 'text-[10px] px-2 py-0.5' : 'text-[9px] px-1.5 py-0.5';

  return (
    <div className={`flex gap-1 flex-wrap ${className}`}>
      {visible.map((b, i) => {
        const type = classifyBadge(b);
        let bg = '#fee2e2';
        let fg = '#dc2626';
        if (type === 'quantity') {
          bg = '#f3f4f6';
          fg = '#6b7280';
        } else if (type === 'prep') {
          bg = '#fef3c7';
          fg = '#d97706';
        }
        return (
          <span
            key={i}
            className={`${pad} font-bold rounded uppercase tracking-wider`}
            style={{ background: bg, color: fg }}
          >
            {b}
          </span>
        );
      })}
      {overflow > 0 && (
        <span className={`${pad} font-bold rounded bg-gray-100 text-gray-500`}>+{overflow}</span>
      )}
    </div>
  );
}
