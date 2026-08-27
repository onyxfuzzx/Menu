import { useRef, useState, useEffect } from 'react';
import { Pencil, Loader2 } from 'lucide-react';
import { getSavedTheme, getSavedBanner, setSavedBanner } from '@/utils/themeConfig';
import { updateRestaurantSettings } from '@/services/api';

interface Props {
  restaurantId: string;
  /** When true, shows a pencil overlay so an admin can replace the banner. */
  editable?: boolean;
  /** Notifies the parent that the banner changed (new data-URL). */
  onBannerChange?: (dataUrl: string) => void;
  bannerUrl?: string;
}

export default function CustomerHero({ restaurantId, editable = false, onBannerChange, bannerUrl }: Props) {
  const theme = getSavedTheme(restaurantId);
  const v = theme.vars;
  const [banner, setBanner] = useState(() => bannerUrl || getSavedBanner(restaurantId));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (bannerUrl) {
      setBanner(bannerUrl);
    }
  }, [bannerUrl]);

  const handleUpload = (input: HTMLInputElement) => {
    setError('');
    const file = input.files?.[0];
    if (!file) return;
    const okType = /\.(png|jpe?g|webp)$/i.test(file.name) || /^image\/(png|jpeg|webp)$/i.test(file.type);
    if (!okType) { setError('Use PNG, JPG or WEBP'); input.value = ''; return; }
    if (file.size > 2 * 1024 * 1024) { setError('Max 2MB'); input.value = ''; return; }
    setLoading(true);
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      setSavedBanner(restaurantId, dataUrl);
      setBanner(dataUrl);
      if (restaurantId) {
        updateRestaurantSettings(restaurantId, { bannerUrl: dataUrl }).catch(console.error);
      }
      setLoading(false);
      onBannerChange?.(dataUrl);
    };
    reader.onerror = () => { setError('Failed to read image'); setLoading(false); };
    reader.readAsDataURL(file);
    input.value = '';
  };

  return (
    <section
      id="hero-banner"
      className="mx-4 relative h-[180px] rounded-xl overflow-hidden shadow-sm flex items-end"
      style={{ background: v['--hero-bg'] || v['--primary-light'] }}
    >
      <img src={banner} className="absolute inset-0 w-full h-full object-cover" alt="Banner" />
      <div
        className="absolute inset-0"
      ></div>

      {editable && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/55 backdrop-blur-sm text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform hover:bg-black/70"
            aria-label="Edit banner"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
          </button>
          {error && (
            <span className="absolute bottom-3 right-3 z-10 text-[11px] font-semibold px-2 py-1 rounded-md bg-red-600 text-white shadow">
              {error}
            </span>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={e => handleUpload(e.currentTarget)}
          />
        </>
      )}
    </section>
  );
}
