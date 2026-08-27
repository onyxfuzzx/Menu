import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Share2, Globe, Download, Frame as FrameIcon, ScanLine, Upload,
  AlertTriangle, AlertCircle, Check, Ban,
  Utensils, UtensilsCrossed, ChefHat, Pizza, Sandwich, Soup, Salad,
  Coffee, CupSoda, Wine, Cake, Croissant, IceCream, Cookie,
} from 'lucide-react';
import QRCodeStyling from 'qr-code-styling';
import * as htmlToImage from 'html-to-image';
import { toast } from 'sonner';
import type { Theme } from '@/utils/themeConfig';

interface Props {
  menuUrl: string;
  selectedTheme: Theme;
}

/* ───────────────────────── config model ───────────────────────── */

type FrameId = 'none' | 'rounded' | 'ticket' | 'badge' | 'corner' | 'bubble' | 'ribbon' | 'dashed';
type SubTab = 'frames' | 'appearance' | 'logo';
type ColorRole = 'fg' | 'bg' | 'text';

interface QrEditorConfig {
  frame: FrameId;
  message: string;
  colors: Record<ColorRole, string>;
  logo: string; // 'none' | preset id | data-URL (custom upload)
}

const DEFAULT_CONFIG: QrEditorConfig = {
  frame: 'none',
  message: 'SCAN ME',
  colors: { fg: '#000000', bg: '#ffffff', text: '#111827' },
  logo: 'none',
};

const STORAGE_KEY = 'qrEditorConfig';

const FRAMES: { id: FrameId; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'ticket', label: 'Ticket' },
  { id: 'badge', label: 'Badge' },
  { id: 'corner', label: 'Corners' },
  { id: 'bubble', label: 'Bubble' },
  { id: 'ribbon', label: 'Ribbon' },
  { id: 'dashed', label: 'Dashed' },
];

const COLOR_PRESETS = ['#000000', '#ffffff', '#ef4444', '#B45309', '#0F5F4C',
  '#1E40AF', '#BE185D', '#111827', '#D97706', '#065F46'];

const LOGO_PRESETS: { id: string; label: string; Icon: React.ComponentType<{ className?: string }> | null }[] = [
  { id: 'none', label: 'None', Icon: null },
  { id: 'utensils', label: 'Restaurant', Icon: Utensils },
  { id: 'utensils-crossed', label: 'Takeaway', Icon: UtensilsCrossed },
  { id: 'chef-hat', label: 'Chef Hat', Icon: ChefHat },
  { id: 'pizza', label: 'Pizza', Icon: Pizza },
  { id: 'sandwich', label: 'Burger', Icon: Sandwich },
  { id: 'soup', label: 'Food Bowl', Icon: Soup },
  { id: 'salad', label: 'Salad', Icon: Salad },
  { id: 'coffee', label: 'Coffee', Icon: Coffee },
  { id: 'cup-soda', label: 'Drinks', Icon: CupSoda },
  { id: 'wine', label: 'Beverage', Icon: Wine },
  { id: 'cake', label: 'Cake', Icon: Cake },
  { id: 'croissant', label: 'Bakery', Icon: Croissant },
  { id: 'ice-cream-cone', label: 'Ice Cream', Icon: IceCream },
  { id: 'cookie', label: 'Dessert', Icon: Cookie },
];

/* ─────────────────────── contrast helpers ─────────────────────── */

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function relLum(rgb: [number, number, number]) {
  const a = rgb.map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function hasScanContrast(fg: string, bg: string) {
  const L1 = relLum(hexToRgb(fg)), L2 = relLum(hexToRgb(bg));
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05) >= 3;
}

function loadSavedConfig(): QrEditorConfig {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '');
    if (!saved || typeof saved !== 'object') return DEFAULT_CONFIG;
    return {
      frame: FRAMES.some(f => f.id === saved.frame) ? saved.frame : DEFAULT_CONFIG.frame,
      message: typeof saved.message === 'string' ? saved.message : DEFAULT_CONFIG.message,
      colors: {
        fg: typeof saved.colors?.fg === 'string' ? saved.colors.fg : DEFAULT_CONFIG.colors.fg,
        bg: typeof saved.colors?.bg === 'string' ? saved.colors.bg : DEFAULT_CONFIG.colors.bg,
        text: typeof saved.colors?.text === 'string' ? saved.colors.text : DEFAULT_CONFIG.colors.text,
      },
      logo: typeof saved.logo === 'string' ? saved.logo : DEFAULT_CONFIG.logo,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

/* ──────────────────────────── component ───────────────────────── */

export default function QREditorTab({ menuUrl, selectedTheme }: Props) {
  const v = selectedTheme.vars;
  const [config, setConfig] = useState<QrEditorConfig>(loadSavedConfig);
  const [subTab, setSubTab] = useState<SubTab>('frames');
  const [uploadError, setUploadError] = useState('');
  const [customLogoThumb, setCustomLogoThumb] = useState<string | null>(
    () => (loadSavedConfig().logo.startsWith('data:') ? loadSavedConfig().logo : null),
  );

  const qrRef = useRef<QRCodeStyling | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const logoGridRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const contrastOk = useMemo(
    () => hasScanContrast(config.colors.fg, config.colors.bg),
    [config.colors.fg, config.colors.bg],
  );

  // Serialize a rendered preset icon (svg in the grid) into an SVG data-URL.
  const presetLogoDataUrl = useCallback((id: string): string | null => {
    const src = logoGridRef.current?.querySelector(`[data-logo-icon="${id}"] svg`);
    if (!src) return null;
    const clone = src.cloneNode(true) as SVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', '48');
    clone.setAttribute('height', '48');
    clone.setAttribute('stroke', '#111827');
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
  }, []);

  const resolveLogoImage = useCallback((): string => {
    if (!config.logo || config.logo === 'none') return '';
    if (config.logo.startsWith('data:')) return config.logo;
    return presetLogoDataUrl(config.logo) ?? '';
  }, [config.logo, presetLogoDataUrl]);

  // Init QR instance once.
  useEffect(() => {
    const qr = new QRCodeStyling({
      width: 240,
      height: 240,
      type: 'canvas',
      data: menuUrl,
      margin: 8,
      qrOptions: { errorCorrectionLevel: 'H' },
      dotsOptions: { color: config.colors.fg, type: 'square' },
      backgroundOptions: { color: config.colors.bg },
    });
    qrRef.current = qr;
    if (canvasRef.current) {
      canvasRef.current.innerHTML = '';
      qr.append(canvasRef.current);
    }
    return () => { qrRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live-update the QR on any config/url change + persist.
  useEffect(() => {
    qrRef.current?.update({
      data: menuUrl,
      image: resolveLogoImage(),
      qrOptions: { errorCorrectionLevel: 'H' },
      dotsOptions: { color: config.colors.fg, type: 'square' },
      backgroundOptions: { color: config.colors.bg },
      imageOptions: { margin: 6, imageSize: 0.38, hideBackgroundDots: true, crossOrigin: 'anonymous' },
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch { /* storage unavailable/full — ignore */ }
  }, [config, menuUrl, resolveLogoImage]);

  /* ── actions ── */

  const setColor = (role: ColorRole, hex: string) =>
    setConfig(c => ({ ...c, colors: { ...c.colors, [role]: hex } }));

  const selectLogo = (id: string) => {
    setUploadError('');
    setCustomLogoThumb(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setConfig(c => ({ ...c, logo: id }));
  };

  const handleLogoUpload = (input: HTMLInputElement) => {
    setUploadError('');
    const file = input.files?.[0];
    if (!file) return;
    const okType = /\.(svg|png|jpe?g)$/i.test(file.name) || /^image\/(svg\+xml|png|jpeg)$/i.test(file.type);
    if (!okType) { setUploadError('Unsupported file type — use SVG, PNG, or JPG.'); input.value = ''; return; }
    if (file.size > 2 * 1024 * 1024) { setUploadError('File is too large — maximum 2MB.'); input.value = ''; return; }
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      setCustomLogoThumb(dataUrl);
      setConfig(c => ({ ...c, logo: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  // Download the bare QR (dots/bg/logo) as a PNG via the library.
  const downloadQR = () => {
    qrRef.current?.download({ name: 'menu-qr', extension: 'png' });
  };

  // Download the full preview (frame + message + QR) by rasterizing the wrapper.
  const downloadFramedQR = async () => {
    const wrap = wrapRef.current;
    if (!wrap) { downloadQR(); return; }
    try {
      const dataUrl = await htmlToImage.toPng(wrap, { pixelRatio: 3, backgroundColor: config.colors.bg });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'menu-qr-framed.png';
      a.click();
    } catch {
      downloadQR();
    }
  };

  const msgTextStyle = { color: config.colors.text } as React.CSSProperties;

  return (
    <motion.div key="qr" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="max-w-md mx-auto pb-24">
      {/* frame styles for the live preview (ids match the wrapper below) */}
      <style>{QR_FRAME_CSS}</style>

      {/* Hidden icon source: preset logos are serialized from these SVGs, so they
          must stay mounted even when the Logo tab is closed. */}
      <div ref={logoGridRef} className="hidden" aria-hidden="true">
        {LOGO_PRESETS.map(p => p.Icon && (
          <span key={p.id} data-logo-icon={p.id}><p.Icon /></span>
        ))}
      </div>

      {/* ── QR preview ── */}
      <div className="bg-white border-b border-stone-200">
        <div className="flex flex-col items-center pt-6 pb-4 px-4">
          <div
            id="printable-qr"
            ref={wrapRef}
            className={`qr-preview-wrap flex flex-col items-center justify-center bg-white rounded-2xl p-3 shadow-sm border border-stone-100 ${config.frame !== 'none' ? `frame-${config.frame}` : ''}`}
          >
            <div className="qr-msg-top" style={{ display: 'none', ...msgTextStyle }}>{config.message}</div>
            <div ref={canvasRef} className="qr-canvas w-[240px] h-[240px]" />
            <div className="qr-msg-bottom" style={{ display: 'none', ...msgTextStyle }}>{config.message}</div>
          </div>

          <div className={`flex items-center gap-1.5 mt-3 ${contrastOk ? 'text-emerald-600' : 'text-amber-600'}`}>
            <ScanLine className="w-4 h-4" />
            <span className="text-sm font-medium">{contrastOk ? 'Scan Ready' : 'Low Contrast'}</span>
          </div>

          {/* Theme badge */}
          <div className="flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm" style={{ background: v['--primary'], color: v['--text-on-primary'] || '#fff' }}>
            <span>{selectedTheme.emoji}</span>
            <span>{selectedTheme.name} theme active</span>
          </div>

          {/* Download actions */}
          <div className="flex items-stretch gap-2 mt-3 w-full max-w-[360px]">
            <button
              onClick={downloadQR}
              title="Download the plain QR code, no frame or message"
              className="flex-1 flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-xl bg-stone-900 text-white text-[11px] font-semibold leading-tight text-center active:scale-95 transition min-h-[52px]"
            >
              <Download className="w-4 h-4" />
              DOWNLOAD QR<br />(WITHOUT FRAME)
            </button>
            <button
              onClick={downloadFramedQR}
              title="Download the QR with the selected frame and message"
              className="flex-1 flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-xl text-white text-[11px] font-semibold leading-tight text-center active:scale-95 transition min-h-[52px]"
              style={{ background: v['--primary'] }}
            >
              <FrameIcon className="w-4 h-4" />
              DOWNLOAD QR<br />(WITH FRAME)
            </button>
          </div>

          {/* Link actions */}
          <div className="flex items-stretch gap-2 mt-2 w-full max-w-[360px]">
            <button
              onClick={() => { navigator.clipboard.writeText(menuUrl); toast.success('Link copied!'); }}
              className="flex-1 py-2.5 bg-stone-100 text-stone-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-stone-200 transition-colors border border-stone-200 text-xs active:scale-95"
            >
              <Share2 className="w-4 h-4" /> Copy Link
            </button>
            <button
              onClick={() => window.open(menuUrl, '_blank')}
              className="flex-1 py-2.5 bg-stone-100 text-stone-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-stone-200 transition-colors border border-stone-200 text-xs active:scale-95"
            >
              <Globe className="w-4 h-4" /> Open Live Menu
            </button>
          </div>
        </div>

        {/* ── Sub-tab bar ── */}
        <div className="flex px-3">
          {(['frames', 'appearance', 'logo'] as SubTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setSubTab(tab)}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${subTab === tab ? 'text-stone-900' : 'border-transparent text-stone-500'}`}
              style={subTab === tab ? { borderColor: v['--primary'], color: v['--primary'] } : undefined}
            >
              {tab === 'frames' ? 'Frames' : tab === 'appearance' ? 'Appearance' : 'Logo & Brand'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Panels ── */}
      <div className="px-4 py-5 min-h-[40vh]">
        {subTab === 'frames' && (
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">Frame Style</p>
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              {FRAMES.map(f => {
                const active = config.frame === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setConfig(c => ({ ...c, frame: f.id }))}
                    className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border-2 min-h-[80px] active:scale-95 transition-all ${active ? 'bg-red-50' : 'border-stone-100 bg-white'}`}
                    style={active ? { borderColor: v['--primary'] } : undefined}
                  >
                    <div className={`frame-mini frame-mini-${f.id}`} />
                    <span className="text-[10px] font-semibold text-stone-700 uppercase tracking-wide leading-none">{f.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="border-t border-stone-100 pt-4">
              <label className="text-xs font-semibold text-stone-600 uppercase tracking-wide mb-2 block">Message Text</label>
              <input
                type="text"
                value={config.message}
                maxLength={20}
                onChange={e => setConfig(c => ({ ...c, message: e.target.value }))}
                placeholder="SCAN ME"
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400"
              />
              <p className="text-xs text-stone-400 mt-1.5">Shown in frames with a text bar (Badge, Ribbon)</p>
            </div>
          </div>
        )}

        {subTab === 'appearance' && (
          <div className="space-y-5">
            {([
              ['fg', 'Foreground Color', null],
              ['bg', 'Background Color', null],
              ['text', 'Text Color', '(frame message)'],
            ] as [ColorRole, string, string | null][]).map(([role, label, hint]) => (
              <div key={role}>
                <label className="block text-sm font-semibold text-stone-800 mb-2">
                  {label}{hint && <span className="font-normal text-stone-400"> {hint}</span>}
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {COLOR_PRESETS.map(hex => {
                    const active = hex.toLowerCase() === config.colors[role].toLowerCase();
                    const light = relLum(hexToRgb(hex)) > 0.6;
                    return (
                      <button
                        key={hex}
                        onClick={() => setColor(role, hex)}
                        aria-label={hex}
                        className="flex items-center justify-center rounded-full shrink-0 active:scale-90 transition-transform w-11 h-11"
                      >
                        <span
                          className={`flex items-center justify-center rounded-full w-[30px] h-[30px] ${active ? 'ring-2 ring-offset-1' : ''} ${light ? 'border border-stone-300' : ''}`}
                          style={{ background: hex, ...(active ? { ['--tw-ring-color' as string]: v['--primary'] } : {}) }}
                        >
                          {active && <Check className="w-4 h-4" style={{ color: light ? '#111827' : '#ffffff' }} />}
                        </span>
                      </button>
                    );
                  })}
                  <label className="relative flex items-center justify-center cursor-pointer shrink-0 w-11 h-11" title="Custom color">
                    <span className="rounded-full border-2 border-dashed border-stone-400 w-[34px] h-[34px]" style={{ background: config.colors[role] }} />
                    <input
                      type="color"
                      value={config.colors[role]}
                      onChange={e => setColor(role, e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-11 h-11"
                    />
                  </label>
                </div>
              </div>
            ))}
            {!contrastOk && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Low contrast — may not scan</span>
              </div>
            )}
          </div>
        )}

        {subTab === 'logo' && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-1">Preset Logos</label>
              <p className="text-xs text-stone-400 mb-3">Food &amp; restaurant icons placed in the QR center</p>
              <div className="grid grid-cols-3 gap-2.5">
                {LOGO_PRESETS.map(p => {
                  const active = config.logo === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => selectLogo(p.id)}
                      className={`flex flex-col items-center justify-center gap-1.5 min-h-[72px] py-2.5 rounded-xl border-2 bg-white active:scale-95 transition ${active ? 'ring-2' : 'border-stone-200'}`}
                      style={active ? { borderColor: v['--primary'], ['--tw-ring-color' as string]: `${v['--primary']}4d` } : undefined}
                    >
                      {p.Icon ? (
                        <span className="flex items-center justify-center">
                          <p.Icon className="w-6 h-6 text-stone-700" />
                        </span>
                      ) : (
                        <Ban className="w-6 h-6 text-stone-400" />
                      )}
                      <span className="text-[10px] font-medium text-stone-600 leading-tight text-center px-1">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-2">Custom Logo</label>
              <label className="flex flex-col items-center justify-center gap-1 w-full min-h-[100px] px-4 py-5 rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 text-center cursor-pointer active:bg-stone-100 transition-colors">
                {customLogoThumb && (
                  <img src={customLogoThumb} alt="logo preview" className="w-12 h-12 object-contain rounded-lg border border-stone-200 bg-white mb-1" />
                )}
                <Upload className="w-6 h-6 text-stone-400" />
                <span className="text-sm font-medium text-stone-600">Upload logo</span>
                <span className="text-xs text-stone-400">SVG / PNG / JPG · up to 2MB</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".svg,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={e => handleLogoUpload(e.currentTarget)}
                />
              </label>
              {uploadError && (
                <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─────────────── frame CSS (ported from the HTML editor) ─────────────── */

const QR_FRAME_CSS = `
.qr-canvas canvas, .qr-canvas svg {
  width: 100% !important;
  height: 100% !important;
  display: block;
  border-radius: 8px;
}
.qr-preview-wrap { position: relative; }

.frame-rounded {
  border: 3px solid #111827 !important;
  border-radius: 16px !important;
  padding: 14px !important;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
}
.frame-ticket {
  border: 2px dashed #374151 !important;
  outline: 2px solid #374151 !important;
  outline-offset: 5px !important;
  border-radius: 4px !important;
  padding: 14px !important;
  box-shadow: none !important;
}
.frame-badge {
  border: 3px solid #111827 !important;
  border-radius: 12px !important;
  padding: 0 !important;
  overflow: hidden !important;
  flex-direction: column !important;
  box-shadow: none !important;
}
.frame-badge .qr-canvas { margin: 12px auto 0; }
.frame-badge .qr-msg-bottom {
  display: flex !important;
  align-items: center;
  justify-content: center;
  background: #111827;
  width: 100%;
  padding: 7px 8px;
  margin-top: 12px;
  font-size: 11px;
  letter-spacing: 0.14em;
  font-weight: 700;
  text-transform: uppercase;
}
.frame-corner {
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  background-color: white !important;
  padding: 20px !important;
  background-image:
    linear-gradient(#111827, #111827), linear-gradient(#111827, #111827),
    linear-gradient(#111827, #111827), linear-gradient(#111827, #111827),
    linear-gradient(#111827, #111827), linear-gradient(#111827, #111827),
    linear-gradient(#111827, #111827), linear-gradient(#111827, #111827) !important;
  background-size:
    24px 3px, 3px 24px, 24px 3px, 3px 24px,
    24px 3px, 3px 24px, 24px 3px, 3px 24px !important;
  background-position:
    top 0 left 0, top 0 left 0, top 0 right 0, top 0 right 0,
    bottom 0 left 0, bottom 0 left 0, bottom 0 right 0, bottom 0 right 0 !important;
  background-repeat: no-repeat !important;
}
.frame-bubble {
  border: 3px solid #111827 !important;
  border-radius: 16px !important;
  padding: 12px !important;
  margin-bottom: 22px !important;
  box-shadow: none !important;
}
.frame-bubble::after {
  content: '';
  position: absolute;
  bottom: -18px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 14px solid transparent;
  border-right: 14px solid transparent;
  border-top: 18px solid #111827;
}
.frame-ribbon {
  border: 3px solid #111827 !important;
  border-radius: 8px !important;
  padding: 0 !important;
  overflow: hidden !important;
  flex-direction: column !important;
  box-shadow: none !important;
}
.frame-ribbon .qr-canvas { margin: 0 auto 12px; }
.frame-ribbon .qr-msg-top {
  display: flex !important;
  align-items: center;
  justify-content: center;
  background: #111827;
  width: 100%;
  padding: 7px 8px;
  margin-bottom: 12px;
  font-size: 11px;
  letter-spacing: 0.14em;
  font-weight: 700;
  text-transform: uppercase;
}
.frame-dashed {
  border: 3px dashed #111827 !important;
  border-radius: 8px !important;
  padding: 14px !important;
  box-shadow: none !important;
}

/* mini previews in the frame selector */
.frame-mini {
  width: 48px;
  height: 48px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}
.frame-mini::before {
  content: '';
  width: 26px;
  height: 26px;
  border-radius: 2px;
  background-color: #e5e7eb;
  background-image:
    repeating-linear-gradient(0deg, #aaa 0, #aaa 1px, transparent 1px, transparent 4px),
    repeating-linear-gradient(90deg, #aaa 0, #aaa 1px, transparent 1px, transparent 4px);
}
.frame-mini-none { border: 1.5px dashed #d1d5db; border-radius: 6px; }
.frame-mini-rounded { border: 2.5px solid #111827; border-radius: 10px; }
.frame-mini-ticket { border: 2px dashed #374151; box-shadow: 0 0 0 2px #374151; border-radius: 2px; }
.frame-mini-bubble { border: 2.5px solid #111827; border-radius: 8px; overflow: visible; }
.frame-mini-bubble::after {
  content: '';
  position: absolute;
  bottom: -9px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 7px solid transparent;
  border-right: 7px solid transparent;
  border-top: 9px solid #111827;
}
.frame-mini-dashed { border: 2px dashed #111827; border-radius: 4px; }
.frame-mini-badge {
  border: 2px solid #111827;
  border-radius: 5px;
  flex-direction: column;
  justify-content: space-between;
  padding: 4px 4px 0 4px;
  overflow: hidden;
}
.frame-mini-badge::before { width: 28px; height: 22px; margin: 0; }
.frame-mini-badge::after {
  content: '';
  width: 100%;
  height: 10px;
  background: #111827;
  flex-shrink: 0;
}
.frame-mini-ribbon {
  border: 2px solid #111827;
  border-radius: 4px;
  flex-direction: column;
  justify-content: space-between;
  padding: 0 4px 4px 4px;
  overflow: hidden;
}
.frame-mini-ribbon::before { order: 2; width: 28px; height: 22px; margin: 0; }
.frame-mini-ribbon::after {
  content: '';
  order: 1;
  width: 100%;
  height: 10px;
  background: #111827;
  flex-shrink: 0;
}
.frame-mini-corner {
  border: none;
  border-radius: 0;
  background-color: white;
  background-image:
    linear-gradient(#111827, #111827), linear-gradient(#111827, #111827),
    linear-gradient(#111827, #111827), linear-gradient(#111827, #111827),
    linear-gradient(#111827, #111827), linear-gradient(#111827, #111827),
    linear-gradient(#111827, #111827), linear-gradient(#111827, #111827);
  background-size:
    14px 2px, 2px 14px, 14px 2px, 2px 14px,
    14px 2px, 2px 14px, 14px 2px, 2px 14px;
  background-position:
    top 0 left 0, top 0 left 0, top 0 right 0, top 0 right 0,
    bottom 0 left 0, bottom 0 left 0, bottom 0 right 0, bottom 0 right 0;
  background-repeat: no-repeat;
}
`;
