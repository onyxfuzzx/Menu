import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useMenuStore } from '@/store/menuStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Users, Activity, Plus, X, Eye, EyeOff,
  ToggleLeft, ToggleRight, Trash2, ChevronRight, RefreshCw,
  AlertCircle, CheckCircle2, LogOut, ExternalLink, Home
} from 'lucide-react';
import BottomNav from '@/components/shared/BottomNav';

// ── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  totalRestaurants: number;
  activeRestaurants: number;
  totalUsers: number;
  totalAdmins: number;
}

interface RestaurantItem {
  id: string;
  name: string;
  address: string;
  contactInfo: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  adminEmail?: string;
  adminName?: string;
  adminId?: string;
  userCount: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

// ── Register Modal ────────────────────────────────────────────────────────────

function RegisterRestaurantModal({
  token, onClose, onSuccess,
}: { token: string; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    restaurantName: '', address: '', contactInfo: '',
    adminName: '', adminEmail: '', adminPassword: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/restaurants', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const d = await res.json();
          throw new Error(d.message || 'Failed to register restaurant');
        } else {
          throw new Error('Server error occurred while registering restaurant');
        }
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-lg overflow-y-auto max-h-[92vh] pb-safe"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-5 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">Register Restaurant</h2>
            <p className="text-violet-200 text-sm mt-0.5">Create a restaurant and its admin account</p>
          </div>
          <button onClick={onClose} className="text-violet-200 hover:text-white transition-colors p-2 -m-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Restaurant section */}
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">Restaurant Details</p>
            <div className="space-y-3">
              <input
                required
                placeholder="Restaurant name *"
                value={form.restaurantName}
                onChange={set('restaurantName')}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
              <input
                placeholder="Address"
                value={form.address}
                onChange={set('address')}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
              <input
                placeholder="Contact info (phone / website)"
                value={form.contactInfo}
                onChange={set('contactInfo')}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="border-t border-stone-100" />

          {/* Admin section */}
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">Admin Account</p>
            <div className="space-y-3">
              <input
                placeholder="Full name"
                value={form.adminName}
                onChange={set('adminName')}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
              <input
                required
                type="email"
                placeholder="Email address *"
                value={form.adminEmail}
                onChange={set('adminEmail')}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
              <div className="relative">
                <input
                  required
                  type={showPass ? 'text' : 'password'}
                  placeholder="Password (min 6 chars) *"
                  value={form.adminPassword}
                  onChange={set('adminPassword')}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent pr-10"
                />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-3 border border-stone-200 text-stone-700 rounded-xl text-sm font-medium hover:bg-stone-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-violet-700 hover:to-indigo-700 transition-all disabled:opacity-50 shadow-sm">
              {loading ? 'Creating...' : 'Create Restaurant'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
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
        <p className="text-xl font-bold text-stone-900">{value}</p>
        <p className="text-xs text-stone-500">{label}</p>
      </div>
    </motion.div>
  );
}

// ── Restaurant Card (mobile-friendly) ─────────────────────────────────────────

function RestaurantCard({ r, index, togglingId, deletingId, onToggle, onDelete, onManage }: {
  r: RestaurantItem;
  index: number;
  togglingId: string | null;
  deletingId: string | null;
  onToggle: (id: string) => void;
  onDelete: (id: string, name: string) => void;
  onManage: (r: RestaurantItem) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="p-4"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-stone-900 truncate">{r.name}</p>
          <p className="text-xs text-stone-400 truncate mt-0.5">
            {r.address || 'No address'} · {timeAgo(r.createdAt)}
          </p>
          {r.adminEmail ? (
            <p className="text-xs text-stone-500 truncate mt-1">{r.adminName || r.adminEmail} · {r.adminEmail}</p>
          ) : (
            <p className="text-xs text-stone-400 italic mt-1">No admin set</p>
          )}
        </div>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0 ${
          r.status === 'Active'
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-stone-100 text-stone-500'
        }`}>
          {r.status}
        </span>
      </div>

      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-stone-500 flex items-center gap-1">
          <Users className="w-3.5 h-3.5" /> {r.userCount} staff
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggle(r.id)}
            disabled={togglingId === r.id}
            title={r.status === 'Active' ? 'Deactivate' : 'Activate'}
            className="p-2 rounded-lg text-stone-400 active:bg-stone-100 transition-colors disabled:opacity-40"
          >
            {r.status === 'Active'
              ? <ToggleRight className="h-5 w-5 text-emerald-500" />
              : <ToggleLeft className="h-5 w-5" />}
          </button>
          <button
            onClick={() => onDelete(r.id, r.name)}
            disabled={deletingId === r.id}
            title="Delete restaurant"
            className="p-2 rounded-lg text-stone-400 active:text-red-600 active:bg-red-50 transition-colors disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            title="View live menu"
            onClick={() => window.open(`/restaurant/${r.id}/menu`, '_blank')}
            className="p-2 rounded-lg text-stone-400 active:bg-stone-100 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
          <button
            title="Manage restaurant"
            onClick={() => onManage(r)}
            className="p-2 rounded-lg bg-stone-900 text-white active:bg-stone-800 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

type NavTab = 'home' | 'restaurants';

export default function AdminPage() {
  const { user, token, logout } = useAuthStore();
  const navigate = useNavigate();
  const setRestaurantId = useMenuStore(s => s.setRestaurantId);
  const setRestaurantName = useMenuStore(s => s.setRestaurantName);

  const [stats, setStats] = useState<Stats | null>(null);
  const [restaurants, setRestaurants] = useState<RestaurantItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [navTab, setNavTab] = useState<NavTab>('home');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [statsRes, restRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: authHeaders(token) }),
        fetch('/api/admin/restaurants', { headers: authHeaders(token) }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (restRes.ok) setRestaurants(await restRes.json());
    } catch {
      // ignore — will retry next interval
    } finally {
      setLoadingData(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleToggleStatus = async (id: string) => {
    setTogglingId(id);
    try {
      const res = await fetch(`/api/admin/restaurants/${id}/toggle-status`, {
        method: 'PATCH',
        headers: authHeaders(token!),
      });
      if (!res.ok) throw new Error();
      const { status } = await res.json();
      setRestaurants(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      showToast(`Restaurant marked as ${status}`);
    } catch {
      showToast('Failed to update status', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/restaurants/${id}`, {
        method: 'DELETE',
        headers: authHeaders(token!),
      });
      if (!res.ok) throw new Error();
      setRestaurants(prev => prev.filter(r => r.id !== id));
      showToast(`"${name}" deleted`);
    } catch {
      showToast('Failed to delete restaurant', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleManage = (r: RestaurantItem) => {
    setRestaurantId(r.id);
    setRestaurantName(r.name);
    navigate(`/restaurant/${r.id}/manage`);
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-bottom-nav">
      {/* ── Top App Bar ── */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-stone-200 max-w-[430px] mx-auto">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-stone-900 leading-none">Menu V1</h1>
              <p className="text-xs text-stone-400 truncate">Super Admin · {user?.name}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="flex items-center justify-center w-9 h-9 rounded-full text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors flex-shrink-0"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
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
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-stone-900">Live Overview</h2>
                <button
                  onClick={fetchData}
                  className="flex items-center gap-1.5 text-sm text-stone-500 active:text-stone-800 transition-colors p-1"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </button>
              </div>
              {loadingData ? (
                <div className="grid grid-cols-2 gap-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-stone-200 p-4 h-20 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Restaurants" value={stats?.totalRestaurants ?? 0} icon={Building2} color="bg-violet-100 text-violet-600" />
                  <StatCard label="Active" value={stats?.activeRestaurants ?? 0} icon={CheckCircle2} color="bg-emerald-100 text-emerald-600" />
                  <StatCard label="Admins" value={stats?.totalAdmins ?? 0} icon={Users} color="bg-blue-100 text-blue-600" />
                  <StatCard label="Total Staff" value={stats?.totalUsers ?? 0} icon={Activity} color="bg-amber-100 text-amber-600" />
                </div>
              )}
            </motion.div>
          )}

          {/* ════ RESTAURANTS TAB ════ */}
          {navTab === 'restaurants' && (
            <motion.div
              key="restaurants"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-stone-900">Restaurants</h2>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
                >
                  <Plus className="h-4 w-4" />
                  Register
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                {loadingData ? (
                  <div className="p-8 text-center text-stone-400 text-sm">Loading...</div>
                ) : restaurants.length === 0 ? (
                  <div className="p-12 text-center">
                    <Building2 className="h-10 w-10 text-stone-300 mx-auto mb-3" />
                    <p className="text-stone-500 font-medium">No restaurants yet</p>
                    <p className="text-stone-400 text-sm mt-1">Tap "Register" to add your first one.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100">
                    {restaurants.map((r, i) => (
                      <RestaurantCard
                        key={r.id}
                        r={r}
                        index={i}
                        togglingId={togglingId}
                        deletingId={deletingId}
                        onToggle={handleToggleStatus}
                        onDelete={handleDelete}
                        onManage={handleManage}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ── Bottom App Bar ── */}
      <BottomNav
        layoutId="admin-nav"
        activeTab={navTab}
        onTabChange={(id) => setNavTab(id as NavTab)}
        tabs={[
          { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
          { id: 'restaurants', label: 'Restaurants', icon: <Building2 className="w-5 h-5" />, badge: 0 },
        ]}
      />

      {/* Register modal */}
      <AnimatePresence>
        {showModal && (
          <RegisterRestaurantModal
            token={token!}
            onClose={() => setShowModal(false)}
            onSuccess={() => {
              setShowModal(false);
              fetchData();
              showToast('Restaurant registered successfully!');
            }}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95, x: '-50%' }}
            animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
            exit={{ opacity: 0, y: 20, scale: 0.95, x: '-50%' }}
            className={`fixed bottom-24 left-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {toast.type === 'success'
              ? <CheckCircle2 className="h-4 w-4" />
              : <AlertCircle className="h-4 w-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
