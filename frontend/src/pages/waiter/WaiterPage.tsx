import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut, Plus, X, Minus, RefreshCw, ClipboardList, CheckCircle2,
  UtensilsCrossed, Search, AlertCircle, Loader2, Clock, QrCode, Bell, Layers,
  Receipt, BellRing, ChefHat, Hand,
} from 'lucide-react';
import ScanOrderModal from './ScanOrderModal';
import BottomNav from '@/components/shared/BottomNav';
import { useAuthStore } from '@/store/useAuthStore';
import {
  createOrder, updateOrderStatus, timeAgo,
  type Order, type OrderStatus, type NewOrderItem,
} from '@/services/ordersApi';
import {
  fetchSessions, paySession, fetchAlerts, resolveAlert,
  type TableSession, type SessionOrder, type WaiterAlert, type AlertType,
} from '@/services/sessionsApi';
import { buildMenu } from '@/services/api';

// ── Menu flattening (reuse build-menu shape) ─────────────────────────────────

interface MenuLine { id: string; name: string; price: number; category: string }

function useMenu(restaurantId: string | undefined) {
  const { data } = useQuery({
    queryKey: ['waiter-menu', restaurantId],
    queryFn: () => buildMenu(restaurantId ?? ''),
    enabled: !!restaurantId,
  });

  return useMemo<MenuLine[]>(() => {
    const cats = data?.categories ?? [];
    const lines: MenuLine[] = [];
    const pushItems = (items: any[], category: string) => {
      (items ?? []).forEach((i: any) => {
        const price = i.prices?.[0]?.value ?? 0;
        lines.push({ id: i.id, name: i.name, price, category });
      });
    };
    cats.forEach((c: any) => {
      pushItems(c.items, c.categoryName);
      (c.subCategories ?? []).forEach((sc: any) => pushItems(sc.items, c.categoryName));
    });
    return lines;
  }, [data]);
}

const ORDER_STATUS_STYLE: Record<OrderStatus, { label: string; dot: string; chip: string }> = {
  Pending:   { label: 'Pending',   dot: 'bg-amber-500',   chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  Preparing: { label: 'Preparing', dot: 'bg-blue-500',    chip: 'bg-blue-50 text-blue-700 border-blue-200' },
  Ready:     { label: 'Ready',     dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Served:    { label: 'Served',    dot: 'bg-stone-400',   chip: 'bg-stone-100 text-stone-600 border-stone-200' },
  Paid:      { label: 'Paid',      dot: 'bg-violet-500',  chip: 'bg-violet-50 text-violet-700 border-violet-200' },
  Cancelled: { label: 'Cancelled', dot: 'bg-red-500',     chip: 'bg-red-50 text-red-700 border-red-200' },
};

const ALERT_STYLE: Record<AlertType, { icon: typeof BellRing; ring: string; text: string }> = {
  NewOrder:   { icon: ClipboardList, ring: 'bg-amber-100 border-amber-300',   text: 'text-amber-800' },
  OrderReady: { icon: ChefHat,       ring: 'bg-emerald-100 border-emerald-300', text: 'text-emerald-800' },
  CallWaiter: { icon: Hand,          ring: 'bg-rose-100 border-rose-300',     text: 'text-rose-800' },
};

// ── New Order Modal ──────────────────────────────────────────────────────────

type CartLine = Omit<NewOrderItem, 'quantity'> & { qty: number };

function NewOrderModal({
  menu, presetTable, onClose, onCreated,
}: {
  menu: MenuLine[];
  presetTable?: string;
  onClose: () => void;
  onCreated: (o: Order) => void;
}) {
  const [table, setTable] = useState(presetTable ?? '');
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState<Record<string, CartLine>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const filtered = useMemo(
    () => menu.filter(m => m.name.toLowerCase().includes(search.toLowerCase())).slice(0, 60),
    [menu, search],
  );

  const cart = Object.values(lines);
  const total = cart.reduce((s, l) => s + l.price * l.qty, 0);

  const add = (m: MenuLine) =>
    setLines(prev => {
      const ex = prev[m.id];
      return { ...prev, [m.id]: ex
        ? { ...ex, qty: ex.qty + 1 }
        : { menuItemId: m.id, itemName: m.name, price: m.price, qty: 1 } };
    });

  const changeQty = (id: string, delta: number) =>
    setLines(prev => {
      const ex = prev[id];
      if (!ex) return prev;
      const qty = ex.qty + delta;
      if (qty <= 0) { const { [id]: _, ...rest } = prev; return rest; }
      return { ...prev, [id]: { ...ex, qty } };
    });

  const submit = async () => {
    setError('');
    if (!table.trim()) { setError('Enter a table number.'); return; }
    if (cart.length === 0) { setError('Add at least one item.'); return; }
    setSaving(true);
    try {
      const order = await createOrder({
        tableNumber: table.trim(),
        items: cart.map(l => ({ menuItemId: l.menuItemId, itemName: l.itemName, price: l.price, quantity: l.qty })),
      });
      onCreated(order);
    } catch (e: any) {
      setError(e.message || 'Failed to create order');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="bg-white w-full max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[92vh] pb-safe"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-stone-500" />
            {presetTable ? `Add to Table ${presetTable}` : 'New Order'}
          </h2>
          <button onClick={onClose} className="p-2 -m-1 text-stone-400 hover:text-stone-700"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-5 py-3 border-b border-stone-100 space-y-3">
          <input
            value={table}
            onChange={e => setTable(e.target.value)}
            placeholder="Table number (e.g. 7)"
            inputMode="numeric"
            disabled={!!presetTable}
            className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-800 disabled:bg-stone-100 disabled:text-stone-500"
          />
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search menu items…"
              className="w-full pl-9 pr-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-800"
            />
          </div>
        </div>

        {/* Menu list */}
        <div className="flex-1 overflow-y-auto px-5 py-2 min-h-[120px]">
          {menu.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-8">
              No menu items found. Ask your admin to publish the menu first.
            </p>
          ) : filtered.map(m => (
            <button
              key={m.id}
              onClick={() => add(m)}
              className="w-full flex items-center justify-between py-3 border-b border-stone-50 active:bg-stone-50 rounded-lg px-2 text-left"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-800 truncate">{m.name}</p>
                <p className="text-xs text-stone-400 truncate">{m.category}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-sm text-stone-600">₹{m.price.toFixed(0)}</span>
                <span className="w-7 h-7 rounded-lg bg-stone-900 text-white flex items-center justify-center"><Plus className="w-3.5 h-3.5" /></span>
              </div>
            </button>
          ))}
        </div>

        {/* Cart */}
        {cart.length > 0 && (
          <div className="px-5 py-3 border-t border-stone-100 bg-stone-50 max-h-44 overflow-y-auto space-y-2">
            {cart.map(l => (
              <div key={l.menuItemId} className="flex items-center justify-between text-sm">
                <span className="text-stone-700 truncate flex-1">{l.itemName}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => changeQty(l.menuItemId!, -1)} className="w-8 h-8 rounded-lg bg-white border border-stone-200 flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                  <span className="w-5 text-center font-semibold">{l.qty}</span>
                  <button onClick={() => changeQty(l.menuItemId!, 1)} className="w-8 h-8 rounded-lg bg-white border border-stone-200 flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                  <span className="w-14 text-right font-medium text-stone-800">₹{(l.price * l.qty).toFixed(0)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mx-5 my-2 flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        <div className="px-5 py-4 border-t border-stone-100 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-stone-400">Total</p>
            <p className="text-xl font-bold text-stone-900">₹{total.toFixed(0)}</p>
          </div>
          <button
            onClick={submit}
            disabled={saving}
            className="px-6 py-3.5 bg-stone-900 text-white rounded-xl font-semibold text-sm hover:bg-stone-800 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {presetTable ? 'Add to Tab' : 'Place Order'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Session Card ─────────────────────────────────────────────────────────────

function OrderBatch({ order, index, onServe, busy }: {
  order: SessionOrder;
  index: number;
  onServe: (orderId: string) => void;
  busy: boolean;
}) {
  const style = ORDER_STATUS_STYLE[order.status as OrderStatus] ?? ORDER_STATUS_STYLE.Pending;
  return (
    <div className="rounded-xl border border-stone-100 bg-stone-50/60 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-stone-500">Batch {index + 1} · {timeAgo(order.createdAt)}</span>
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${style.chip}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} /> {style.label}
        </span>
      </div>
      <ul className="space-y-1 mb-2">
        {order.items.map(it => (
          <li key={it.id} className="flex justify-between text-sm text-stone-600">
            <span><span className="font-medium text-stone-800">{it.quantity}×</span> {it.itemName}</span>
            <span>₹{(it.price * it.quantity).toFixed(0)}</span>
          </li>
        ))}
      </ul>
      {order.status === 'Ready' && (
        <button
          onClick={() => onServe(order.id)}
          disabled={busy}
          className="w-full py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold active:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          Mark Served
        </button>
      )}
    </div>
  );
}

function SessionCard({ session, onAddItems, onServe, onPay, busyOrderId, paying }: {
  session: TableSession;
  onAddItems: (table: string) => void;
  onServe: (orderId: string) => void;
  onPay: (session: TableSession) => void;
  busyOrderId: string | null;
  paying: boolean;
}) {
  const activeOrders = session.orders.filter(o => o.status !== 'Cancelled');
  const allServed = activeOrders.length > 0 && activeOrders.every(o => o.status === 'Served');
  const batchCount = activeOrders.length;

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-stone-900 text-lg">Table {session.tableNumber}</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-blue-50 text-blue-700 border-blue-200">
            <Receipt className="w-3 h-3" /> Open tab · {batchCount} batch{batchCount === 1 ? '' : 'es'}
          </span>
        </div>
        <span className="text-xs text-stone-400 flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(session.createdAt)}</span>
      </div>

      <div className="space-y-2 mb-3">
        {activeOrders.map((o, i) => (
          <OrderBatch key={o.id} order={o} index={i} onServe={onServe} busy={busyOrderId === o.id} />
        ))}
      </div>

        <div className="flex items-center justify-between pt-3 border-t border-stone-100">
        <div>
          <p className="text-[11px] text-stone-400 uppercase tracking-wide">Running total</p>
          <p className="font-bold text-stone-900 text-lg">₹{session.total.toFixed(0)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAddItems(session.tableNumber)}
            className="px-3 py-2.5 bg-stone-100 text-stone-800 rounded-xl text-sm font-semibold active:bg-stone-200 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
          {allServed && (
            <button
              onClick={() => onPay(session)}
              disabled={paying}
              className="px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold active:bg-violet-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
              Pay & Close
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Alerts banner ────────────────────────────────────────────────────────────

function AlertsBanner({ alerts, onResolve, busyId }: {
  alerts: WaiterAlert[];
  onResolve: (id: string) => void;
  busyId: string | null;
}) {
  if (alerts.length === 0) return null;
  return (
    <div className="space-y-2 mb-1">
      <AnimatePresence>
        {alerts.map(a => {
          const s = ALERT_STYLE[a.type];
          const Icon = s.icon;
          return (
            <motion.div
              key={a.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 40 }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${s.ring}`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${s.text}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${s.text} truncate`}>{a.message}</p>
                <p className="text-[11px] text-stone-500">{timeAgo(a.createdAt)}</p>
              </div>
              <button
                onClick={() => onResolve(a.id)}
                disabled={busyId === a.id}
                className="p-1.5 rounded-lg hover:bg-white/60 disabled:opacity-50"
                aria-label="Dismiss alert"
              >
                {busyId === a.id ? <Loader2 className="w-4 h-4 animate-spin text-stone-500" /> : <X className="w-4 h-4 text-stone-500" />}
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function WaiterPage() {
  const { user, token, logout } = useAuthStore();
  const navigate = useNavigate();
  const menu = useMenu(user?.restaurantId);

  const [sessions, setSessions] = useState<TableSession[]>([]);
  const [alerts, setAlerts] = useState<WaiterAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [presetTable, setPresetTable] = useState<string | undefined>(undefined);
  const [showScan, setShowScan] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [busyAlertId, setBusyAlertId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [tab, setTab] = useState<'tables' | 'alerts'>('tables');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [s, a] = await Promise.all([fetchSessions('Open'), fetchAlerts()]);
      setSessions(s);
      setAlerts(a);
    } catch (e: any) {
      showToast(e.message || 'Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(load, 8000); // poll every 8s
    return () => clearInterval(t);
  }, [load]);

  const serve = async (orderId: string) => {
    setBusyOrderId(orderId);
    try {
      await updateOrderStatus(orderId, 'Served');
      await load();
      showToast('Marked served');
    } catch (e: any) {
      showToast(e.message || 'Update failed', 'error');
    } finally {
      setBusyOrderId(null);
    }
  };

  const pay = async (session: TableSession) => {
    setPayingId(session.id);
    try {
      await paySession(session.id);
      setSessions(prev => prev.filter(s => s.id !== session.id));
      showToast(`Table ${session.tableNumber} paid · ₹${session.total.toFixed(0)}`);
    } catch (e: any) {
      showToast(e.message || 'Payment failed', 'error');
    } finally {
      setPayingId(null);
    }
  };

  const dismissAlert = async (id: string) => {
    setBusyAlertId(id);
    setAlerts(prev => prev.filter(a => a.id !== id)); // optimistic
    try {
      await resolveAlert(id);
    } catch (e: any) {
      showToast(e.message || 'Failed to dismiss', 'error');
      load();
    } finally {
      setBusyAlertId(null);
    }
  };

  const openAdd = (table: string) => { setPresetTable(table); setShowModal(true); };
  const openNew = () => { setPresetTable(undefined); setShowModal(true); };

  const onCreated = (o: Order) => {
    setShowModal(false);
    setPresetTable(undefined);
    load();
    showToast(`Order for Table ${o.tableNumber} placed`);
  };

  return (
    <div className="min-h-screen bg-stone-100 pb-[calc(220px+env(safe-area-inset-bottom,0px))]">
      {/* ── Top App Bar ── */}
      <header className="bg-white px-4 py-3 shadow-sm flex justify-between items-center sticky top-0 z-30 max-w-[430px] mx-auto border-b border-stone-200">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <UtensilsCrossed className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-stone-900 leading-none">Waiter</h1>
            <p className="text-xs text-stone-400 truncate">{user?.name} · {user?.restaurantName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={load} className="p-2.5 text-stone-400 hover:text-stone-700 rounded-full active:bg-stone-100" aria-label="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => { logout(); navigate('/login'); }} className="p-2.5 text-stone-400 hover:text-stone-700 rounded-full active:bg-stone-100" aria-label="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-[430px] mx-auto px-4 pt-4 space-y-3">
        {/* Alerts always visible at top of Tables tab; full list on Alerts tab */}
        {tab === 'tables' && (
          <AlertsBanner alerts={alerts} onResolve={dismissAlert} busyId={busyAlertId} />
        )}

        {tab === 'alerts' ? (
          alerts.length === 0 ? (
            <div className="text-center py-20 flex flex-col items-center">
              <div className="w-16 h-16 bg-stone-200 rounded-2xl flex items-center justify-center mb-4">
                <BellRing className="w-8 h-8 text-stone-400" />
              </div>
              <p className="font-semibold text-stone-700">No alerts</p>
              <p className="text-sm text-stone-400 mt-1">You're all caught up.</p>
            </div>
          ) : (
            <AlertsBanner alerts={alerts} onResolve={dismissAlert} busyId={busyAlertId} />
          )
        ) : loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="h-40 bg-white rounded-2xl border border-stone-200 animate-pulse" />)
        ) : sessions.length === 0 ? (
          <div className="text-center py-20 flex flex-col items-center">
            <div className="w-16 h-16 bg-stone-200 rounded-2xl flex items-center justify-center mb-4">
              <ClipboardList className="w-8 h-8 text-stone-400" />
            </div>
            <p className="font-semibold text-stone-700">No open tables</p>
            <p className="text-sm text-stone-400 mt-1">Tap Add Order to open a table tab.</p>
          </div>
        ) : (
          <AnimatePresence>
            {sessions.map(s => (
              <SessionCard
                key={s.id}
                session={s}
                onAddItems={openAdd}
                onServe={serve}
                onPay={pay}
                busyOrderId={busyOrderId}
                paying={payingId === s.id}
              />
            ))}
          </AnimatePresence>
        )}
      </main>

      {/* ── Floating Actions (Scan QR bubble + Add Order pill) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-[430px] mx-auto pointer-events-none">
        <div className="absolute right-4 left-4 bottom-[calc(80px+env(safe-area-inset-bottom,0px))] flex flex-col items-center gap-3">
          <button
            onClick={() => setShowScan(true)}
            aria-label="Scan customer order QR"
            className="pointer-events-auto self-end w-14 h-14 rounded-full bg-blue-600 text-white shadow-xl flex items-center justify-center active:scale-95 transition-transform"
          >
            <QrCode className="w-7 h-7" />
          </button>
          <button
            onClick={openNew}
            aria-label="Add Order"
            className="pointer-events-auto w-full h-14 rounded-full bg-stone-900 text-white shadow-xl flex items-center justify-center gap-2 font-semibold text-base active:scale-[0.98] transition-transform"
          >
            <Plus className="w-6 h-6" /> Add Order
          </button>
        </div>
      </div>

      {/* ── Bottom App Bar ── */}
      <BottomNav
        layoutId="waiter-nav"
        activeTab={tab}
        onTabChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: 'tables', label: 'Tables', icon: <Layers className="w-5 h-5" />, badge: sessions.length },
          { id: 'alerts', label: 'Alerts', icon: <Bell className="w-5 h-5" />, badge: alerts.length },
        ]}
      />

      <AnimatePresence>
        {showScan && (
          <ScanOrderModal
            menu={menu}
            onClose={() => setShowScan(false)}
            onCreated={(o) => { setShowScan(false); load(); showToast(`Order for Table ${o.tableNumber} placed`); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <NewOrderModal
            menu={menu}
            presetTable={presetTable}
            onClose={() => { setShowModal(false); setPresetTable(undefined); }}
            onCreated={onCreated}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-28 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium ${
              toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
