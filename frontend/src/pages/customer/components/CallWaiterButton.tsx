import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Hand, Loader2, CheckCircle2, X } from 'lucide-react';
import { callWaiter } from '@/services/sessionsApi';

interface Props {
  restaurantId: string;
}

const TABLE_KEY = (rid: string) => `customer-table-${rid}`;

/**
 * Floating "Call Waiter" button for the customer menu.
 * Table number comes from the ?table= URL param (encoded in the table QR),
 * falling back to a one-time prompt that is remembered per restaurant.
 */
export default function CallWaiterButton({ restaurantId }: Props) {
  const [searchParams] = useSearchParams();
  const [table, setTable] = useState('');
  const [askTable, setAskTable] = useState(false);
  const [tableInput, setTableInput] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  // ?table= in the QR link wins; else use the remembered table for this restaurant.
  useEffect(() => {
    const fromUrl = searchParams.get('table');
    if (fromUrl) {
      setTable(fromUrl);
      sessionStorage.setItem(TABLE_KEY(restaurantId), fromUrl);
      return;
    }
    const saved = sessionStorage.getItem(TABLE_KEY(restaurantId));
    if (saved) setTable(saved);
  }, [searchParams, restaurantId]);

  const send = async (tbl: string) => {
    setState('sending');
    try {
      await callWaiter(restaurantId, tbl);
      setState('sent');
      setTimeout(() => setState('idle'), 4000);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  };

  const handleClick = () => {
    if (state === 'sending' || state === 'sent') return;
    if (!table) { setTableInput(''); setAskTable(true); return; }
    send(table);
  };

  const confirmTable = () => {
    const t = tableInput.trim();
    if (!t) return;
    sessionStorage.setItem(TABLE_KEY(restaurantId), t);
    setTable(t);
    setAskTable(false);
    send(t);
  };

  return (
    <>
      <button
        onClick={handleClick}
        aria-label="Call waiter"
        className="pointer-events-auto absolute left-4 bottom-[100px] rounded-full pl-3 pr-4 py-2.5 shadow-lg flex items-center gap-2 active:scale-95 transition-transform text-white"
        style={{ background: state === 'sent' ? '#059669' : state === 'error' ? '#dc2626' : '#e11d48' }}
      >
        {state === 'sending' ? <Loader2 className="w-5 h-5 animate-spin" />
          : state === 'sent' ? <CheckCircle2 className="w-5 h-5" />
          : <Hand className="w-5 h-5" />}
        <span className="font-bold text-sm">
          {state === 'sent' ? 'Waiter coming' : state === 'error' ? 'Try again' : 'Call Waiter'}
        </span>
      </button>

      {askTable && (
        <div className="pointer-events-auto fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-[320px] p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800">Your table number</h3>
              <button onClick={() => setAskTable(false)} className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              autoFocus
              value={tableInput}
              onChange={e => setTableInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmTable(); }}
              inputMode="numeric"
              placeholder="e.g. 7"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 mb-3"
            />
            <button
              onClick={confirmTable}
              disabled={!tableInput.trim()}
              className="w-full py-2.5 bg-rose-600 text-white rounded-xl font-bold text-sm disabled:opacity-50 active:bg-rose-700"
            >
              Call Waiter
            </button>
          </div>
        </div>
      )}
    </>
  );
}
