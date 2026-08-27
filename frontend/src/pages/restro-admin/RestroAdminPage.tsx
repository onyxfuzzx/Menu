import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChefHat, Users, UtensilsCrossed, X, Plus, Trash2,
  Eye, EyeOff, LogOut, AlertCircle, CheckCircle2,
  RefreshCw, ExternalLink, Building2, Shield, Clock,
  QrCode, Menu, Home, ChevronRight, ClipboardList,
  Calendar, Search
} from 'lucide-react';
import BottomNav from '@/components/shared/BottomNav';
import { fetchOrders, timeAgo } from '@/services/ordersApi';
import type { Order } from '@/services/ordersApi';

// ── Types ─────────────────────────────────────────────────────────────────────

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'Chef' | 'Waiter';
  createdAt: string;
}

interface RestaurantInfo {
  id: string;
  name: string;
  address: string;
  contactInfo: string;
  status: string;
  staffCount: number;
  chefCount: number;
  waiterCount: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function authHeaders(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// ── Register Staff Modal ──────────────────────────────────────────────────────

function RegisterStaffModal({
  token, defaultRole, onClose, onSuccess,
}: {
  token: string;
  defaultRole: 'Chef' | 'Waiter';
  onClose: () => void;
  onSuccess: (member: StaffMember) => void;
}) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: defaultRole });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/restro-admin/staff', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(form),
      });
      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : null;
      if (!res.ok) throw new Error(data?.message || `Failed to register staff (${res.status})`);
      onSuccess(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const roleColors = {
    Chef: { bg: 'from-orange-500 to-amber-500', light: 'bg-orange-50 text-orange-700', icon: ChefHat },
    Waiter: { bg: 'from-blue-500 to-indigo-500', light: 'bg-blue-50 text-blue-700', icon: Users },
  };
  const RoleIcon = roleColors[form.role as 'Chef' | 'Waiter'].icon;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden pb-safe"
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${roleColors[form.role as 'Chef' | 'Waiter'].bg} px-6 py-5 flex justify-between items-center`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <RoleIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Register Staff</h2>
              <p className="text-white/80 text-sm mt-0.5">Add a new team member</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors p-2 -m-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Role selector */}
          <div>
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider block mb-2">Role</label>
            <div className="grid grid-cols-2 gap-3">
              {(['Chef', 'Waiter'] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, role: r }))}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                    form.role === r
                      ? r === 'Chef'
                        ? 'border-orange-400 bg-orange-50 text-orange-700'
                        : 'border-blue-400 bg-blue-50 text-blue-700'
                      : 'border-stone-200 text-stone-500 hover:border-stone-300'
                  }`}
                >
                  {r === 'Chef' ? <ChefHat className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider block mb-2">Full Name *</label>
            <input
              required
              placeholder="e.g. Rahul Sharma"
              value={form.name}
              onChange={set('name')}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider block mb-2">Email Address *</label>
            <input
              required
              type="email"
              placeholder="staff@restaurant.com"
              value={form.email}
              onChange={set('email')}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider block mb-2">Password *</label>
            <div className="relative">
              <input
                required
                type={showPass ? 'text' : 'password'}
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={set('password')}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent pr-10"
              />
              <button type="button" onClick={() => setShowPass(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-3 border border-stone-200 text-stone-700 rounded-xl text-sm font-medium hover:bg-stone-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className={`flex-1 px-4 py-3 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 shadow-sm bg-gradient-to-r ${roleColors[form.role as 'Chef' | 'Waiter'].bg}`}>
              {loading ? 'Creating...' : `Add ${form.role}`}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Staff Card ────────────────────────────────────────────────────────────────

function StaffCard({ member, onDelete, deleting }: {
  member: StaffMember;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const isChef = member.role === 'Chef';
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      layout
      className="flex items-center gap-3 p-4 rounded-xl border border-stone-100 bg-white transition-all"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
        isChef ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
      }`}>
        {isChef ? <ChefHat className="w-5 h-5" /> : <Users className="w-5 h-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-stone-900 truncate">{member.name}</p>
        <p className="text-xs text-stone-400 truncate">{member.email}</p>
        <div className="flex items-center gap-1 text-[11px] text-stone-400 mt-0.5">
          <Clock className="w-3 h-3" />
          {timeAgo(member.createdAt)}
        </div>
      </div>
      {/* Always visible — touch devices have no hover */}
      <button
        onClick={() => onDelete(member.id)}
        disabled={deleting}
        className="p-2.5 rounded-xl text-stone-400 hover:text-red-500 active:bg-red-50 hover:bg-red-50 transition-colors disabled:opacity-30 flex-shrink-0"
        aria-label={`Remove ${member.name}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number | string; icon: React.ElementType; color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-stone-200 p-4 flex items-center gap-3 shadow-sm"
    >
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-stone-900 truncate">{value}</p>
        <p className="text-xs text-stone-500">{label}</p>
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type NavTab = 'home' | 'staff' | 'menu' | 'logs';
type OrderLogTab = 'all' | 'chef' | 'waiter';

const STATUS_COLORS: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-700',
  Preparing: 'bg-blue-100 text-blue-700',
  Ready: 'bg-emerald-100 text-emerald-700',
  Served: 'bg-purple-100 text-purple-700',
  Paid: 'bg-stone-100 text-stone-600',
  Cancelled: 'bg-red-100 text-red-600',
};

export default function RestroAdminPage() {
  const { user, token, logout } = useAuthStore();
  const navigate = useNavigate();

  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [defaultRole, setDefaultRole] = useState<'Chef' | 'Waiter'>('Waiter');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [navTab, setNavTab] = useState<NavTab>('home');
  const [staffFilter, setStaffFilter] = useState<'all' | 'chef' | 'waiter'>('all');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderLogTab, setOrderLogTab] = useState<OrderLogTab>('all');
  const [logDateFrom, setLogDateFrom] = useState('');
  const [logDateTo, setLogDateTo] = useState('');
  const [logSearch, setLogSearch] = useState('');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [infoRes, staffRes, ordersData] = await Promise.all([
        fetch('/api/restro-admin/restaurant', { headers: authHeaders(token) }),
        fetch('/api/restro-admin/staff', { headers: authHeaders(token) }),
        fetchOrders().catch(() => [] as Order[]),
      ]);
      if (infoRes.ok) setRestaurantInfo(await infoRes.json());
      if (staffRes.ok) setStaff(await staffRes.json());
      setOrders(ordersData);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setOrdersLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: string) => {
    const member = staff.find(s => s.id === id);
    if (!window.confirm(`Remove "${member?.name}"? They will no longer be able to log in.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/restro-admin/staff/${id}`, {
        method: 'DELETE',
        headers: authHeaders(token!),
      });
      if (!res.ok) throw new Error();
      setStaff(prev => prev.filter(s => s.id !== id));
      showToast(`${member?.name} removed`);
    } catch {
      showToast('Failed to remove staff member', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredStaff = staff.filter(s =>
    staffFilter === 'all' ? true :
    staffFilter === 'chef' ? s.role === 'Chef' : s.role === 'Waiter'
  );

  const chefCount = staff.filter(s => s.role === 'Chef').length;
  const waiterCount = staff.filter(s => s.role === 'Waiter').length;
  const menuUrl = user?.restaurantId ? `/restaurant/${user.restaurantId}/menu` : '#';
  const manageUrl = user?.restaurantId ? `/restaurant/${user.restaurantId}/manage` : '#';

  return (
    <div className="min-h-screen bg-stone-50 pb-bottom-nav">

      {/* ── Top App Bar ── */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-stone-200 max-w-[430px] mx-auto">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
              <UtensilsCrossed className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-stone-900 leading-none truncate">
                {restaurantInfo?.name || user?.restaurantName || 'Restaurant'}
              </h1>
              <p className="text-xs text-stone-400 truncate">Admin: {user?.name}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="flex items-center justify-center w-9 h-9 rounded-full text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors flex-shrink-0"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-[430px] mx-auto px-4 py-5">
        <AnimatePresence mode="wait">

          {/* ════ HOME TAB ════ */}
          {navTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="space-y-5"
            >
              {/* Restaurant Info Card */}
              {restaurantInfo && (
                <section className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-stone-900">{restaurantInfo.name}</h3>
                      {restaurantInfo.address && <p className="text-sm text-stone-500 mt-0.5">{restaurantInfo.address}</p>}
                      {restaurantInfo.contactInfo && <p className="text-sm text-stone-400">{restaurantInfo.contactInfo}</p>}
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0 ${
                      restaurantInfo.status === 'Active'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-stone-100 text-stone-500'
                    }`}>
                      {restaurantInfo.status}
                    </span>
                  </div>
                </section>
              )}

              {/* Stats */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-stone-900">Overview</h2>
                  <button onClick={fetchData} className="flex items-center gap-1.5 text-sm text-stone-500 active:text-stone-800 transition-colors p-1">
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                  </button>
                </div>

                {loading ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="bg-white rounded-2xl border border-stone-200 p-4 h-20 animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard label="Total Staff" value={staff.length} icon={Users} color="bg-violet-100 text-violet-600" />
                    <StatCard label="Chefs" value={chefCount} icon={ChefHat} color="bg-orange-100 text-orange-600" />
                    <StatCard label="Waiters" value={waiterCount} icon={Users} color="bg-blue-100 text-blue-600" />
                    <StatCard
                      label="Status"
                      value={restaurantInfo?.status ?? '—'}
                      icon={Shield}
                      color={restaurantInfo?.status === 'Active' ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-100 text-stone-500'}
                    />
                  </div>
                )}
              </section>

              {/* Last 24h Activity */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-stone-900">Last 24 Hours</h2>
                  <button onClick={fetchData} className="flex items-center gap-1.5 text-sm text-stone-500 active:text-stone-800 transition-colors p-1">
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                  </button>
                </div>

                {ordersLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="bg-white rounded-xl border border-stone-200 p-4 h-20 animate-pulse" />
                    ))}
                  </div>
                ) : (() => {
                  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
                  const recent = orders.filter(o => new Date(o.createdAt).getTime() > cutoff);

                  if (recent.length === 0) {
                    return (
                      <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center flex flex-col items-center">
                        <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-4">
                          <Clock className="w-8 h-8 text-stone-300" />
                        </div>
                        <p className="font-semibold text-stone-700 mb-1">No activity yet</p>
                        <p className="text-sm text-stone-400">Orders from the last 24 hours will appear here</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      {recent.slice(0, 10).map(order => (
                        <motion.div
                          key={order.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-stone-900">Table {order.tableNumber}</span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLORS[order.status] || 'bg-stone-100 text-stone-500'}`}>
                                {order.status}
                              </span>
                            </div>
                            <span className="text-xs text-stone-400">{timeAgo(order.createdAt)}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mb-1.5">
                            {order.items.map(item => (
                              <span key={item.id} className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                                {item.quantity}x {item.itemName}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-stone-400 font-medium">Total: ₹{order.totalAmount.toFixed(2)}</p>
                            <div className="flex items-center gap-2 text-[11px]">
                              {order.assignedChefName && (
                                <span className="text-orange-600 flex items-center gap-0.5">
                                  <ChefHat className="w-3 h-3" /> {order.assignedChefName}
                                </span>
                              )}
                              {order.assignedWaiterName && (
                                <span className="text-blue-600 flex items-center gap-0.5">
                                  <Users className="w-3 h-3" /> {order.assignedWaiterName}
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  );
                })()}
              </section>
            </motion.div>
          )}

          {/* ════ STAFF TAB ════ */}
          {navTab === 'staff' && (
            <motion.div
              key="staff"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-stone-900">Staff</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setDefaultRole('Chef'); setShowModal(true); }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded-xl text-sm font-semibold active:bg-orange-100 transition-colors"
                  >
                    <ChefHat className="w-4 h-4" /> Chef
                  </button>
                  <button
                    onClick={() => { setDefaultRole('Waiter'); setShowModal(true); }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Waiter
                  </button>
                </div>
              </div>

              {/* Filter tabs */}
              <div className="flex items-center gap-1 bg-stone-100 rounded-xl p-1 w-full">
                {([
                  { id: 'all', label: `All (${staff.length})` },
                  { id: 'chef', label: `Chefs (${chefCount})` },
                  { id: 'waiter', label: `Waiters (${waiterCount})` },
                ] as const).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setStaffFilter(tab.id)}
                    className={`flex-1 px-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                      staffFilter === tab.id
                        ? 'bg-white shadow-sm text-stone-900'
                        : 'text-stone-500'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                {loading ? (
                  <div className="p-8 text-center text-stone-400 text-sm">Loading staff...</div>
                ) : filteredStaff.length === 0 ? (
                  <div className="p-10 text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-4">
                      {staffFilter === 'chef'
                        ? <ChefHat className="w-8 h-8 text-stone-300" />
                        : <Users className="w-8 h-8 text-stone-300" />
                      }
                    </div>
                    <p className="font-semibold text-stone-700 mb-1">No {staffFilter === 'all' ? 'staff' : staffFilter + 's'} yet</p>
                    <p className="text-sm text-stone-400 mb-6">Add your first team member to get started.</p>
                    <button
                      onClick={() => {
                        setDefaultRole(staffFilter === 'chef' ? 'Chef' : 'Waiter');
                        setShowModal(true);
                      }}
                      className="flex items-center gap-2 px-5 py-3 bg-stone-900 text-white rounded-xl font-medium active:bg-stone-800 transition-colors text-sm"
                    >
                      <Plus className="w-4 h-4" /> Add {staffFilter === 'chef' ? 'Chef' : staffFilter === 'waiter' ? 'Waiter' : 'Staff'}
                    </button>
                  </div>
                ) : (
                  <div className="p-3 space-y-2">
                    <AnimatePresence>
                      {filteredStaff.map(member => (
                        <StaffCard
                          key={member.id}
                          member={member}
                          onDelete={handleDelete}
                          deleting={deletingId === member.id}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ════ MENU TAB ════ */}
          {navTab === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="space-y-3"
            >
              <h2 className="text-lg font-bold text-stone-900 mb-1">Menu Tools</h2>

              <Link to={manageUrl}
                className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-stone-200 shadow-sm active:bg-stone-50 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <Menu className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-900">Menu Studio</p>
                  <p className="text-xs text-stone-400">Edit items, themes & QR code</p>
                </div>
                <ChevronRight className="w-5 h-5 text-stone-300" />
              </Link>

              <a href={menuUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-stone-200 shadow-sm active:bg-stone-50 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <QrCode className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-900">Live Menu</p>
                  <p className="text-xs text-stone-400">Preview what customers see</p>
                </div>
                <ExternalLink className="w-4 h-4 text-stone-300" />
              </a>
            </motion.div>
          )}

          {/* ════ LOGS TAB ════ */}
          {navTab === 'logs' && (
            <motion.div
              key="logs"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-stone-900">Order Logs</h2>
                <button onClick={fetchData} className="flex items-center gap-1.5 text-sm text-stone-500 active:text-stone-800 transition-colors p-1">
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>

              {/* Filter tabs */}
              <div className="flex items-center gap-1 bg-stone-100 rounded-xl p-1 w-full">
                {([
                  { id: 'all', label: 'All', icon: ClipboardList },
                  { id: 'chef', label: 'Chef', icon: ChefHat },
                  { id: 'waiter', label: 'Waiter', icon: Users },
                ] as const).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setOrderLogTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                      orderLogTab === tab.id
                        ? 'bg-white shadow-sm text-stone-900'
                        : 'text-stone-500'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Date/Time Filters */}
              <div className="bg-white rounded-2xl border border-stone-200 p-3 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-stone-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-stone-600">Date Range</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-stone-400 mb-0.5 block">From</label>
                    <input
                      type="date"
                      value={logDateFrom}
                      onChange={e => setLogDateFrom(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-stone-400 mb-0.5 block">To</label>
                    <input
                      type="date"
                      value={logDateTo}
                      onChange={e => setLogDateTo(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400"
                    />
                  </div>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by table, item, chef, waiter..."
                    value={logSearch}
                    onChange={e => setLogSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400"
                  />
                </div>
                {(logDateFrom || logDateTo || logSearch) && (
                  <button
                    onClick={() => { setLogDateFrom(''); setLogDateTo(''); setLogSearch(''); }}
                    className="text-xs text-amber-600 font-medium active:text-amber-800"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {ordersLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl border border-stone-200 p-4 h-24 animate-pulse" />
                  ))}
                </div>
              ) : (() => {
                const cutoff = logDateFrom ? new Date(logDateFrom).getTime() : 0;
                const cutoffEnd = logDateTo ? new Date(logDateTo).setHours(23, 59, 59, 999) : Infinity;
                const searchLower = logSearch.toLowerCase();

                const filtered = orders.filter(o => {
                  // Prefer attribution (who actually handled it); fall back to a
                  // status heuristic for legacy orders that have no stored names.
                  if (orderLogTab === 'chef') {
                    const handled = o.assignedChefName
                      ? true
                      : ['Preparing', 'Ready', 'Served', 'Paid'].includes(o.status);
                    if (!handled) return false;
                  }
                  if (orderLogTab === 'waiter') {
                    const handled = o.assignedWaiterName
                      ? true
                      : ['Ready', 'Served', 'Paid'].includes(o.status);
                    if (!handled) return false;
                  }

                  const t = new Date(o.createdAt).getTime();
                  if (t < cutoff || t > cutoffEnd) return false;

                  if (searchLower) {
                    const hay = [
                      o.tableNumber, o.status, o.assignedChefName, o.assignedWaiterName,
                      ...o.items.map(i => i.itemName),
                    ].filter(Boolean).join(' ').toLowerCase();
                    if (!hay.includes(searchLower)) return false;
                  }

                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center flex flex-col items-center">
                      <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-4">
                        <ClipboardList className="w-8 h-8 text-stone-300" />
                      </div>
                      <p className="font-semibold text-stone-700 mb-1">No orders found</p>
                      <p className="text-sm text-stone-400">Try adjusting your filters</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    {filtered.map(order => (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-stone-900">Table {order.tableNumber}</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLORS[order.status] || 'bg-stone-100 text-stone-500'}`}>
                              {order.status}
                            </span>
                          </div>
                          <span className="text-xs text-stone-400">{timeAgo(order.createdAt)}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {order.items.map(item => (
                            <span key={item.id} className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                              {item.quantity}x {item.itemName}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                          <p className="text-xs text-stone-400 font-medium">Total: ₹{order.totalAmount.toFixed(2)}</p>
                          <div className="flex items-center gap-2 text-[11px]">
                            {orderLogTab !== 'waiter' && order.assignedChefName && (
                              <span className="text-orange-600 flex items-center gap-0.5">
                                <ChefHat className="w-3 h-3" /> {order.assignedChefName}
                              </span>
                            )}
                            {orderLogTab !== 'chef' && order.assignedWaiterName && (
                              <span className="text-blue-600 flex items-center gap-0.5">
                                <Users className="w-3 h-3" /> {order.assignedWaiterName}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                );
              })()}
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ── Bottom App Bar ── */}
      <BottomNav
        layoutId="restro-admin-nav"
        activeTab={navTab}
        onTabChange={(id) => setNavTab(id as NavTab)}
        tabs={[
          { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
          { id: 'logs', label: 'Logs', icon: <ClipboardList className="w-5 h-5" /> },
          { id: 'staff', label: 'Staff', icon: <Users className="w-5 h-5" />, badge: 0 },
          { id: 'menu', label: 'Menu', icon: <UtensilsCrossed className="w-5 h-5" /> },
        ]}
      />

      {/* ── Register Modal ── */}
      <AnimatePresence>
        {showModal && (
          <RegisterStaffModal
            token={token!}
            defaultRole={defaultRole}
            onClose={() => setShowModal(false)}
            onSuccess={(member) => {
              setStaff(prev => [member, ...prev]);
              setShowModal(false);
              showToast(`${member.name} (${member.role}) added!`);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95, x: '-50%' }}
            animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
            exit={{ opacity: 0, y: 20, scale: 0.95, x: '-50%' }}
            className={`fixed bottom-24 left-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
              toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {toast.type === 'success'
              ? <CheckCircle2 className="w-4 h-4" />
              : <AlertCircle className="w-4 h-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
