import { useAuthStore } from '@/store/useAuthStore';

// ── Types (mirror backend OrdersController DTOs) ─────────────────────────────

export type OrderStatus = 'Pending' | 'Preparing' | 'Ready' | 'Served' | 'Paid' | 'Cancelled';

export interface OrderItem {
  id: string;
  menuItemId: string | null;
  itemName: string;
  quantity: number;
  price: number;
  notes: string;
  status: string;
}

export interface Order {
  id: string;
  restaurantId: string;
  tableNumber: string;
  sessionId?: string | null;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  assignedChefName?: string | null;
  assignedWaiterName?: string | null;
  assignedWaiterId?: string | null;
  items: OrderItem[];
}

export interface NewOrderItem {
  menuItemId?: string | null;
  itemName: string;
  quantity: number;
  price: number;
  notes?: string;
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

// ── API ──────────────────────────────────────────────────────────────────────

export async function fetchOrders(status?: OrderStatus): Promise<Order[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`/api/orders${qs}`, { headers: authHeaders() });
  if (!res.ok) return parseError(res);
  return res.json();
}

export async function createOrder(payload: {
  tableNumber: string;
  items: NewOrderItem[];
}): Promise<Order> {
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) return parseError(res);
  return res.json();
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  const res = await fetch(`/api/orders/${id}/status`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) return parseError(res);
  return res.json();
}

export async function deleteOrder(id: string): Promise<void> {
  const res = await fetch(`/api/orders/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok && res.status !== 204) return parseError(res);
}

// ── Time helper shared by dashboards ─────────────────────────────────────────

export function timeAgo(dateIso: string): string {
  const diff = Date.now() - new Date(dateIso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
