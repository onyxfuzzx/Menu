import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ItemLocation } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Produces a unique stable string ID for a droppable item list.
 * Used by @dnd-kit useDroppable and useSortable data.listId.
 * Lives here (not in a component file) so Vite Fast Refresh is not blocked.
 */
export function listIdOf(loc: ItemLocation): string {
  return `${loc.categoryId}::${loc.subCategory ?? "__top__"}`;
}
