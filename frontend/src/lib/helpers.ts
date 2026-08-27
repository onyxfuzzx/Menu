export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix e.g. "data:image/jpeg;base64,"
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function formatPageNumber(n: number): string {
  return `Page ${n}`;
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: "Only JPEG, PNG, and WEBP images are allowed." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { valid: false, error: "Image size must be under 20MB." };
  }
  return { valid: true };
}

export function countTotalItems(
  categories: { items: { id: string }[]; subCategories?: { items: { id: string }[] }[] }[]
): number {
  let count = 0;
  for (const cat of categories) {
    count += cat.items?.length || 0;
    if (cat.subCategories) {
      for (const sub of cat.subCategories) {
        count += sub.items?.length || 0;
      }
    }
  }
  return count;
}

// ─── Image compression helper (RestroAdmin editor) ────────────────────────────

/**
 * Compresses an image file to a JPEG data URL suitable for storing in the DB
 * and sending in sync payloads.
 *
 * Strategy: draw onto an off-screen canvas scaled to maxDim × maxDim (preserving
 * aspect ratio), export as JPEG at the given quality. Rejects if the resulting
 * data URL exceeds ~700 KB (base64 ~933 KB encoded) so DB rows and sync payloads
 * stay manageable.
 *
 * NOTE: base64-in-DB is acceptable for MVP. A proper CDN / file store (S3, GCS,
 * Cloudflare Images) is the recommended upgrade path once the product ships.
 */
export function compressImageToDataUrl(
  file: File,
  maxDim = 800,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Scale down while preserving aspect ratio
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context unavailable."));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL("image/jpeg", quality);

      // ~700 KB of raw bytes ≈ ~933 KB base64; keep a safe margin
      const approxBytes = Math.round((dataUrl.length * 3) / 4);
      if (approxBytes > 700 * 1024) {
        reject(
          new Error(
            "Image is too large after compression. Please use a smaller image (under ~700 KB)."
          )
        );
        return;
      }

      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image file."));
    };

    img.src = url;
  });
}

