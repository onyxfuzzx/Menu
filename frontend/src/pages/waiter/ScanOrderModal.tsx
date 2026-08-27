import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import { X, QrCode, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { createOrder, type Order } from '@/services/ordersApi';

interface MenuLine { id: string; name: string; price: number; category: string }

interface ScannedItem { id: string; qty: number }
interface ScannedOrder {
  type?: string;
  restro?: string;
  items?: ScannedItem[];
  total?: number;
}

const SCANNER_ID = 'waiter-qr-reader';

export default function ScanOrderModal({
  menu, onClose, onCreated,
}: {
  menu: MenuLine[];
  onClose: () => void;
  onCreated: (o: Order) => void;
}) {
  const [step, setStep] = useState<'scan' | 'confirm'>('scan');
  const [scanned, setScanned] = useState<ScannedOrder | null>(null);
  const [table, setTable] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Resolve scanned item ids against the live menu → order lines.
  const resolved = useMemo(() => {
    if (!scanned?.items) return [];
    return scanned.items.map(si => {
      const m = menu.find(x => x.id === si.id);
      return {
        menuItemId: si.id,
        itemName: m?.name ?? 'Unknown item',
        price: m?.price ?? 0,
        quantity: si.qty,
        found: !!m,
      };
    });
  }, [scanned, menu]);

  const total = resolved.reduce((s, l) => s + l.price * l.quantity, 0);

  // Start / stop the camera when on the scan step.
  useEffect(() => {
    if (step !== 'scan') return;
    let cancelled = false;
    let started = false;
    let scanner: Html5Qrcode;
    try {
      scanner = new Html5Qrcode(SCANNER_ID);
    } catch {
      setError('Scanner failed to initialise. Try reopening.');
      return;
    }
    scannerRef.current = scanner;

    const handleDecoded = (text: string) => {
      let parsed: ScannedOrder;
      try {
        parsed = JSON.parse(text);
      } catch {
        setError('This QR is not a valid order code.');
        return;
      }
      if (parsed.type !== 'order' || !Array.isArray(parsed.items) || parsed.items.length === 0) {
        setError('This QR is not a valid order code.');
        return;
      }
      setError('');
      setScanned(parsed);
      setStep('confirm');
    };

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        handleDecoded,
        () => { /* per-frame decode failures are noise */ },
      )
      .then(() => { started = true; })
      .catch(() => {
        if (!cancelled) setError('Unable to access camera. Grant camera permission and try again.');
      });

    return () => {
      cancelled = true;
      const stopSafely = async () => {
        try {
          if (started) await scanner.stop();
        } catch { /* not running yet */ }
        try { scanner.clear(); } catch { /* nothing to clear */ }
      };
      void stopSafely();
      scannerRef.current = null;
    };
  }, [step]);

  const submit = async () => {
    setError('');
    if (!table.trim()) { setError('Enter a table number.'); return; }
    if (resolved.length === 0) { setError('No items to place.'); return; }
    setSaving(true);
    try {
      const order = await createOrder({
        tableNumber: table.trim(),
        items: resolved.map(l => ({
          menuItemId: l.found ? l.menuItemId : null,
          itemName: l.itemName,
          price: l.price,
          quantity: l.quantity,
        })),
      });
      onCreated(order);
    } catch (e: any) {
      setError(e.message || 'Failed to create order');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="bg-white w-full max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[92vh]"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            {step === 'confirm' && (
              <button onClick={() => { setStep('scan'); setScanned(null); }} className="p-1 -ml-1 text-stone-400 hover:text-stone-700">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <QrCode className="w-5 h-5 text-stone-500" /> Scan Customer Order
          </h2>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-700"><X className="w-5 h-5" /></button>
        </div>

        {step === 'scan' ? (
          <div className="px-5 py-4">
            <p className="text-sm text-stone-500 text-center mb-4">
              Point the camera at the customer’s order QR code.
            </p>
            <div id={SCANNER_ID} className="w-full rounded-xl overflow-hidden bg-stone-900 min-h-[240px]" />
          </div>
        ) : (
          <>
            <div className="px-5 py-3 border-b border-stone-100">
              <label className="block text-xs font-medium text-stone-400 mb-1">Table number</label>
              <input
                autoFocus
                value={table}
                onChange={e => setTable(e.target.value)}
                placeholder="e.g. 7"
                className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-800"
              />
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3 min-h-[100px]">
              <p className="text-xs font-medium text-stone-400 mb-2">{resolved.length} item{resolved.length === 1 ? '' : 's'}</p>
              <div className="space-y-2">
                {resolved.map((l, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-stone-700 truncate flex-1">
                      <span className="font-semibold text-stone-900">{l.quantity}×</span> {l.itemName}
                      {!l.found && <span className="ml-2 text-xs text-amber-600">(not on menu)</span>}
                    </span>
                    <span className="w-16 text-right font-medium text-stone-800">₹{(l.price * l.quantity).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {error && (
          <div className="mx-5 my-2 flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {step === 'confirm' && (
          <div className="px-5 py-4 border-t border-stone-100 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-stone-400">Total</p>
              <p className="text-xl font-bold text-stone-900">₹{total.toFixed(0)}</p>
            </div>
            <button
              onClick={submit}
              disabled={saving}
              className="px-6 py-3 bg-stone-900 text-white rounded-xl font-semibold text-sm hover:bg-stone-800 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Place Order
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
