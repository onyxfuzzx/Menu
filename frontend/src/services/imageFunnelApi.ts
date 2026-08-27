/**
 * Image Funnel API Client
 *
 * Talks to the image normalization funnel endpoints in the main backend.
 * All Phase 3 write operations (POST/PUT/DELETE) require a SuperAdmin JWT token.
 */

import axios from "axios";
import { useAuthStore } from "@/store/useAuthStore";

// Use the same /api proxy as the rest of the app (Vite proxies to backend:5010)
const funnelApi = axios.create({
  baseURL: "/api",
  timeout: 30_000,
});

// Attach Bearer token on every request (needed for Phase 3 write endpoints)
funnelApi.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

funnelApi.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.error ??
      err.response?.data?.message ??
      err.message ??
      "Network error";
    return Promise.reject(new Error(message));
  }
);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Phase3Alias {
  id: string;
  aliasRaw: string;
  aliasNormalized: string;
}

export interface Phase3Image {
  id: string;
  slug: string;
  fileName: string;
  imageUrl: string;
  aliases: Phase3Alias[];
  createdAt: string;
  updatedAt: string;
}

export interface Phase3ListResponse {
  items: Phase3Image[];
  total: number;
}

export interface Phase3Conflict {
  conflict: "alias" | "slug";
  value: string;
  ownedByImage: { id: string; slug: string };
}

export interface Phase1ImageItem {
  id: number;
  slug: string;
  fileName: string;
  imageUrl: string;
  displayName: string;
  sortOrder: number;
}

export interface Phase2ImageItem {
  id: number;
  rootWord: string;
  fileName: string;
  imageUrl: string;
  frequencyCount: number;
  sortOrder: number;
}

export interface NormalizeImageResult {
  imageUrl: string;
  phase: number;
  matchedBy: string;
}

export interface SuggestorItem {
  nameRaw: string;
  usedByFileName?: string | null;
}

// ─── Phase 3 API ─────────────────────────────────────────────────────────────

export async function publishPhase3Image(
  file: File,
  slug: string,
  aliases: string[],
  forceTransferAliases?: string[]
): Promise<Phase3Image> {
  const form = new FormData();
  form.append("image", file);
  form.append("slug", slug);
  form.append("aliases", JSON.stringify(aliases));
  if (forceTransferAliases && forceTransferAliases.length > 0) {
    form.append("forceTransferAliases", JSON.stringify(forceTransferAliases));
  }
  const { data } = await funnelApi.post<Phase3Image>("/phase3", form);
  return data;
}

export async function listPhase3Images(
  search?: string,
  page = 1,
  pageSize = 100
): Promise<Phase3ListResponse> {
  const { data } = await funnelApi.get<Phase3ListResponse>("/phase3", {
    params: { search: search || undefined, page, pageSize },
  });
  return data;
}

export async function updatePhase3Aliases(
  id: string,
  add: string[],
  removeIds: string[]
): Promise<Phase3Image> {
  const { data } = await funnelApi.put<Phase3Image>(`/phase3/${id}/aliases`, {
    add,
    removeIds,
  });
  return data;
}

export async function deletePhase3Image(id: string): Promise<void> {
  await funnelApi.delete(`/phase3/${id}`);
}

// ─── Phase 1 & 2 API (read-only) ─────────────────────────────────────────────

export async function listPhase1Images(): Promise<Phase1ImageItem[]> {
  const { data } = await funnelApi.get<Phase1ImageItem[]>("/phase1");
  return data;
}

export async function listPhase2Images(): Promise<Phase2ImageItem[]> {
  const { data } = await funnelApi.get<Phase2ImageItem[]>("/phase2");
  return data;
}

// ─── Suggestor ────────────────────────────────────────────────────────────────

export async function getSuggestions(query: string): Promise<SuggestorItem[]> {
  const { data } = await funnelApi.get<{ suggestions: SuggestorItem[] }>(
    "/suggestor",
    { params: { query } }
  );
  return data.suggestions;
}

// ─── Normalize (for preview) ──────────────────────────────────────────────────

export async function resolveImage(
  itemName: string,
  categoryName?: string
): Promise<NormalizeImageResult> {
  const { data } = await funnelApi.get<NormalizeImageResult>("/normalize-image", {
    params: { itemName, categoryName },
  });
  return data;
}

// ─── Unmatched Log ────────────────────────────────────────────────────────────

export async function getUnmatchedLogs(days = 7) {
  const { data } = await funnelApi.get("/unmatched", { params: { days } });
  return data.items as {
    nameNormalized: string;
    count: number;
    lastSeen: string;
  }[];
}

export { funnelApi };
