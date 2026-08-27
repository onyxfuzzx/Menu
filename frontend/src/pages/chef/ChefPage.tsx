import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, RefreshCw, Loader2, ChefHat, Clock, Flame, CheckCircle2, AlertCircle, Bell, UtensilsCrossed } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import BottomNav from '@/components/shared/BottomNav';
import {
  fetchOrders, updateOrderStatus, timeAgo,
  type Order, type OrderStatus,
} from '@/services/ordersApi';

// ── Column definitions ───────────────────────────────────────────────────────

// KDS shows only the kitchen-relevant statuses
type KdsStatus = 'Pending' | 'Preparing' | 'Ready';

const COLUMNS: {
  key: KdsStatus;
  title: string;
  accent: string;
  headerText: string;
  next?: { label: string; status: OrderStatus; btn: string };
}[] = [
  {
    key: 'Pending', title: 'New Orders', accent: 'border-l-amber-500', headerText: 'text-amber-600',
    next: { label: 'Start Preparing', status: 'Preparing', btn: 'bg-amber-600 hover:bg-amber-700' },
  },
  {
    key: 'Preparing', title: 'Preparing', accent: 'border-l-blue-500', headerText: 'text-blue-600',
    next: { label: 'Mark as Ready', status: 'Ready', btn: 'bg-emerald-600 hover:bg-emerald-700' },
  },
  {
    key: 'Ready', title: 'Ready to Serve', accent: 'border-l-emerald-500', headerText: 'text-emerald-600',
  },
];

function TicketCard({ order, next, onAdvance, busy }: {
  order: Order;
  next?: { label: string; status: OrderStatus; btn: string };
  onAdvance: (o: Order, s: OrderStatus) => void;
  busy: boolean;
}) {
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
      className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <span className="font-bold text-lg text-stone-900">Table {order.tableNumber}</span>
        <span className="text-stone-400 text-xs flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(order.createdAt)}</span>
      </div>
      <ul className="space-y-1.5 mb-4">
        {order.items.map(it => (
          <li key={it.id} className="flex gap-3 text-stone-700 text-sm">
            <span className="font-bold text-amber-600 w-7">{it.quantity}×</span>
            <span className="flex-1">{it.itemName}{it.notes ? <span className="block text-xs text-stone-400 italic">{it.notes}</span> : null}</span>
          </li>
        ))}
      </ul>
      {next && (
        <button
          onClick={() => onAdvance(order, next.status)}
          disabled={busy}
          className={`w-full py-3 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${next.btn}`}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4" />}
          {next.label}
        </button>
      )}
    </motion.div>
  );
}

export default function ChefPage() {
  const { user, token, logout } = useAuthStore();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [mobileTab, setMobileTab] = useState<KdsStatus>('Pending');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchOrders();
      setOrders(data);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(load, 8000); // KDS polls faster
    return () => clearInterval(t);
  }, [load]);

  const advance = async (order: Order, status: OrderStatus) => {
    setBusyId(order.id);
    // optimistic
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status } : o));
    try {
      const updated = await updateOrderStatus(order.id, status);
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
    } catch (e: any) {
      setError(e.message || 'Update failed');
      load(); // resync on failure
    } finally {
      setBusyId(null);
    }
  };

  const byStatus = (s: OrderStatus) =>
    orders.filter(o => o.status === s).sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));

  const counts = {
    Pending: byStatus('Pending').length,
    Preparing: byStatus('Preparing').length,
    Ready: byStatus('Ready').length,
  };

  const renderColumnBody = (col: typeof COLUMNS[number]) => {
    const items = byStatus(col.key);
    return loading ? (
      [...Array(2)].map((_, i) => <div key={i} className="h-28 bg-stone-100 rounded-lg animate-pulse" />)
    ) : items.length === 0 ? (
      <div className="text-stone-400 text-center mt-10 text-sm flex flex-col items-center gap-2">
        {col.key === 'Ready' ? <CheckCircle2 className="w-8 h-8" /> : <ChefHat className="w-8 h-8" />}
        {col.key === 'Ready' ? 'Nothing waiting for pickup' : 'No tickets'}
      </div>
    ) : (
      <AnimatePresence>
        {items.map(o => (
          <TicketCard key={o.id} order={o} next={col.next} onAdvance={advance} busy={busyId === o.id} />
        ))}
      </AnimatePresence>
    );
  };

  const activeMobileCol = COLUMNS.find(c => c.key === mobileTab)!;

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 pb-bottom-nav md:pb-4">
      {/* ── Top App Bar ── */}
      <header className="sticky top-0 z-40 flex justify-between items-center bg-white px-4 py-3 shadow-sm border-b border-stone-200 md:mx-4 md:mt-4 md:rounded-xl md:border md:static">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center flex-shrink-0">
            <ChefHat className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold text-stone-900 leading-none">Kitchen Display</h1>
            <p className="text-xs text-stone-400 truncate">{user?.name} · {user?.restaurantName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={load} className="p-2.5 text-stone-400 hover:text-stone-700 rounded-full active:bg-stone-100" aria-label="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => { logout(); navigate('/login'); }}
            className="px-3 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 text-sm flex items-center gap-1.5">
            <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </header>

      <div className="p-3 sm:p-4">
        {error && (
          <div className="mb-4 flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {/* ── Mobile: single column driven by bottom tabs ── */}
        <div className="md:hidden max-w-[430px] mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={mobileTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <div className={`bg-white rounded-xl p-4 border-l-4 border border-stone-200 shadow-sm ${activeMobileCol.accent}`}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className={`text-lg font-bold ${activeMobileCol.headerText}`}>{activeMobileCol.title}</h2>
                  <span className="bg-stone-100 text-stone-600 px-3 py-1 rounded-full text-sm font-medium">
                    {counts[mobileTab]}
                  </span>
                </div>
                <div className="space-y-4">
                  {renderColumnBody(activeMobileCol)}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Desktop: 3-column kanban ── */}
        <div className="hidden md:grid grid-cols-3 gap-4 sm:gap-6">
          {COLUMNS.map(col => {
            const items = byStatus(col.key);
            return (
              <div key={col.key} className={`bg-white rounded-xl p-4 flex flex-col md:h-[calc(100vh-140px)] border-l-4 border border-stone-200 shadow-sm ${col.accent}`}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className={`text-lg font-bold ${col.headerText}`}>{col.title}</h2>
                  <span className="bg-stone-100 text-stone-600 px-3 py-1 rounded-full text-sm font-medium">{items.length}</span>
                </div>
                <div className="space-y-4 overflow-y-auto flex-1 pr-1">
                  {renderColumnBody(col)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Mobile Bottom App Bar ── */}
      <div className="md:hidden">
        <BottomNav
          layoutId="chef-nav"
          activeTab={mobileTab}
          onTabChange={(id) => setMobileTab(id as KdsStatus)}
          tabs={[
            { id: 'Pending', label: 'New', icon: <Bell className="w-5 h-5" />, badge: counts.Pending },
            { id: 'Preparing', label: 'Preparing', icon: <Flame className="w-5 h-5" />, badge: counts.Preparing },
            { id: 'Ready', label: 'Ready', icon: <UtensilsCrossed className="w-5 h-5" />, badge: counts.Ready },
          ]}
        />
      </div>
    </div>
  );
}
