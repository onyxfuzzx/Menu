import { useAuthStore } from '@/store/useAuthStore';

// ── Types (mirror backend SessionsController / AlertsController DTOs) ─────────

export type SessionStatus = 'Open' | 'Paid';

export interface SessionOrderItem {
  id: string;
  itemName: string;
  quantity: number;
  price: number;
  notes: string;
  status: string;
}

export interface SessionOrder {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: SessionOrderItem[];
}

export interface TableSession {
  id: string;
  restaurantId: string;
  tableNumber: string;
  status: SessionStatus;
  waiterName?: string | null;
  waiterId?: string | null;
  total: number;
  createdAt: string;
  updatedAt: string;
  orders: SessionOrder[];
}

export type AlertType = 'NewOrder' | 'OrderReady' | 'CallWaiter';

export interface WaiterAlert {
  id: string;
  type: AlertType;
  tableNumber: string;
  sessionId?: string | null;
  orderId?: string | null;
  message: string;
  resolved: boolean;
  createdAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseError(res: Response): Promise<never> {
  let message = `Request failed (${res.status})`;
  try {
    const data = await res.json();
    if (data?.message) message = data.message;
  } catch {
    /* non-JSON error body */
  }
  throw new Error(message);
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function fetchSessions(status?: SessionStatus): Promise<TableSession[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`/api/sessions${qs}`, { headers: authHeaders() });
  if (!res.ok) return parseError(res);
  return res.json();
}

export async function paySession(id: string): Promise<TableSession> {
  const res = await fetch(`/api/sessions/${id}/pay`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) return parseError(res);
  return res.json();
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export async function fetchAlerts(): Promise<WaiterAlert[]> {
  const res = await fetch('/api/alerts', { headers: authHeaders() });
  if (!res.ok) return parseError(res);
  return res.json();
}

export async function resolveAlert(id: string): Promise<WaiterAlert> {
  const res = await fetch(`/api/alerts/${id}/resolve`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) return parseError(res);
  return res.json();
}

/** Public — the customer's browser calls this (no auth token). */
export async function callWaiter(restaurantId: string, tableNumber: string): Promise<void> {
  const res = await fetch('/api/alerts/call-waiter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ restaurantId, tableNumber }),
  });
  if (!res.ok) return parseError(res);
}
