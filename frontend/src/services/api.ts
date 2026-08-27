import axios from "axios";
import type { JsonValidationResult } from "@/types";

const api = axios.create({
  baseURL: "/api/menu",
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

// Unwrap backend error messages so TanStack Query gets a clean Error instance.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.message ?? err.message ?? "Network error";
    return Promise.reject(new Error(message));
  }
);

// ─── Option-C Endpoints ────────────────────────────────────────────────────────

export async function validateJson(
  json: string,
  categoryName: string
): Promise<JsonValidationResult> {
  const res = await api.post<JsonValidationResult>("/validate-json", { json, categoryName });
  return res.data;
}

export async function saveCategory(params: {
  json: string;
  categoryName: string;
  restaurantId: string;
  correctionRound: number;
}): Promise<{ success: boolean; categoryId?: string; message: string }> {
  const res = await api.post("/save-category", { ...params, allowWarnings: true });
  return res.data;
}

export async function buildMenu(restaurantId: string) {
  const res = await api.post(`/build-menu/${restaurantId}`);
  return res.data;
}

export async function updateRestaurantSettings(
  restaurantId: string,
  settings: { themeId?: string; bannerUrl?: string }
) {
  const res = await api.put(`/restaurant/${restaurantId}/settings`, settings);
  return res.data;
}

export async function formatErrors(params: {
  categoryName: string;
  errors: JsonValidationResult["errors"];
  isValid: boolean;
  summary: string;
}): Promise<{ report: string; inlineSummary: string }> {
  const res = await api.post("/format-errors", params);
  return res.data;
}

// ─── Editor Autosave ───────────────────────────────────────────────────────────

/** Item shape sent in a category-sync payload (mirrors the backend SyncItemRequest). */
export interface SyncItemPayload {
  name: string;
  description: string | null;
  notes: string | null;
  badges: string[];
  /** URL or base64 data URL compressed client-side (≤~700 KB). Null when no image. */
  imageUrl: string | null;
  /** Spice level 0–3 (0 = not spicy / not set). */
  spiceLevel: number;
  prices: { label: string | null; value: number; originalPrice: number | null }[];
}

/** Sub-category shape sent in a category-sync payload. */
export interface SyncSubCategoryPayload {
  subCategory: string;
  notes: string | null;
  items: SyncItemPayload[];
}

/** Full category snapshot sent to PUT /categories/{dbId}/sync. */
export interface SyncCategoryPayload {
  category: string;
  notes: string | null;
  /** Display emoji for the category (e.g. "🍢"). Null when not set. */
  emoji: string | null;
  sortOrder: number;
  items: SyncItemPayload[];
  subCategories: SyncSubCategoryPayload[];
}

/**
 * Replaces a persisted category's full item tree with the editor's current state.
 * The editor debounce-calls this so build-menu (which reads from the DB) publishes
 * exactly what is on screen.
 */
export async function syncCategory(dbId: string, payload: SyncCategoryPayload) {
  const res = await api.put(`/categories/${dbId}/sync`, payload);
  return res.data as { success: boolean; categoryId: string; itemCount: number };
}

// ─── Legacy CRUD Endpoints ─────────────────────────────────────────────────────

export async function addItem(catId: string, body: object) {
  const res = await api.post(`/categories/${catId}/items`, body);
  return res.data;
}

export async function updateItem(catId: string, itemId: string, body: object) {
  const res = await api.put(`/categories/${catId}/items/${itemId}`, body);
  return res.data;
}

export async function deleteItem(catId: string, itemId: string) {
  await api.delete(`/categories/${catId}/items/${itemId}`);
}

// ─── Confirm / Delete (Workflow Overhaul) ────────────────────────────────────

export async function confirmCategory(dbId: string) {
  const res = await api.put(`/categories/${dbId}/confirm`);
  return res.data as { success: boolean; categoryId: string; status: string };
}

export async function deleteCategory(dbId: string) {
  await api.delete(`/categories/${dbId}`);
}
