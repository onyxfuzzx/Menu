import { useState } from 'react';
import { ArrowLeft, ShoppingCart, Plus, Minus, ArrowRight, FileText, QrCode, ClipboardList } from 'lucide-react';
import QRCode from 'react-qr-code';
import type { CartItem } from '../CustomerMenuPage';

interface Props {
  cart: CartItem[];
  onUpdateQty: (lineId: string, delta: number) => void;
  onClearCart: () => void;
  onBrowseMenu: () => void;
  restaurantId: string;
}

export default function CustomerCart({ cart, onUpdateQty, onBrowseMenu, restaurantId }: Props) {
  const [view, setView] = useState<'cart' | 'checkout'>('cart');
  const [checkoutMode, setCheckoutMode] = useState<'none' | 'text' | 'qr'>('none');

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const cgst = subtotal * 0.025;
  const sgst = subtotal * 0.025;
  const packing = cart.length > 0 ? 10 : 0; // arbitrary packing fee
  const total = subtotal + cgst + sgst + packing;

  const totalItems = cart.reduce((s, i) => s + i.qty, 0);

  if (view === 'cart') {
    return (
      <div className="h-full relative block min-h-screen pb-24 bg-gray-50">
        <div className="px-4 py-4 border-b border-gray-100 bg-white sticky top-0 z-30 shadow-sm">
          <h2 className="text-xl font-bold flex items-center gap-2"><ShoppingCart className="w-5 h-5" style={{ color: 'var(--primary)' }} /> Your Cart</h2>
          <p className="text-sm text-gray-500 mt-1">{totalItems} items</p>
        </div>

        {cart.length === 0 ? (
          <div className="py-16 text-center px-4 flex flex-col items-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <ShoppingCart className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Your cart is empty</h3>
            <p className="text-gray-500 text-sm mb-6">Looks like you haven't added anything to your cart yet.</p>
            <button
              onClick={onBrowseMenu}
              className="text-white px-6 py-3 rounded-full font-medium shadow-md"
              style={{ background: 'var(--primary)' }}
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="px-4 py-2 divide-y divide-gray-100 bg-white shadow-sm mb-4">
              {cart.map(item => (
                <div key={item.lineId} className="py-3 flex gap-3">
                  <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                    <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <h4 className="font-bold text-gray-800 text-sm">{item.name}</h4>
                        <div className="font-bold text-xs mt-0.5" style={{ color: 'var(--primary)' }}>₹{(item.price * item.qty).toFixed(2)}</div>
                      </div>
                      <div className="flex items-center bg-gray-100 border border-gray-200 rounded-lg p-1">
                        <button onClick={() => onUpdateQty(item.lineId, -1)} className="w-6 h-6 flex items-center justify-center text-gray-600 active:bg-gray-200 rounded"><Minus className="w-3 h-3" /></button>
                        <span className="w-6 text-center font-bold text-xs">{item.qty}</span>
                        <button onClick={() => onUpdateQty(item.lineId, 1)} className="w-6 h-6 flex items-center justify-center text-gray-600 active:bg-gray-200 rounded"><Plus className="w-3 h-3" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 py-6 bg-white shadow-sm mb-4">
              <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Bill Summary</h3>
              <div className="flex justify-between items-center py-1.5 text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-800">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 text-sm">
                <span className="text-gray-600">CGST (2.5%)</span>
                <span className="font-medium text-gray-800">₹{cgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 text-sm">
                <span className="text-gray-600">SGST (2.5%)</span>
                <span className="font-medium text-gray-800">₹{sgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 text-sm">
                <span className="text-gray-600">Packing Charges</span>
                <span className="font-medium text-gray-800">₹{packing.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center py-4 mt-2 border-t border-dashed border-gray-300">
                <span className="font-bold text-lg text-gray-800">Total</span>
                <span className="font-bold text-xl" style={{ color: 'var(--primary)' }}>₹{total.toFixed(2)}</span>
              </div>
            </div>

            <div className="px-4 pb-28 pt-4 bg-white sticky bottom-0 border-t border-gray-100 z-10 shadow-lg">
              <button
                onClick={() => setView('checkout')}
                className="w-full text-white h-14 rounded-xl font-bold flex justify-between items-center px-6 shadow-lg transform active:scale-95 transition-transform"
                style={{ background: 'var(--primary)' }}
              >
                <span className="flex flex-col items-start">
                  <span className="text-xs font-normal opacity-90">Total to pay</span>
                  <span>₹{total.toFixed(2)}</span>
                </span>
                <span className="flex items-center gap-1">Proceed to Checkout <ArrowRight className="w-5 h-5" /></span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Checkout View
  const textOrder = cart.map(c => `${c.qty}x ${c.name} - ₹${(c.price * c.qty).toFixed(2)}`).join('\n') + `\n\nTotal: ₹${total.toFixed(2)}`;
  const qrData = JSON.stringify({ type: 'order', restro: restaurantId, items: cart.map(c => ({ id: c.id, qty: c.qty })), total });

  return (
    <div className="h-full min-h-screen bg-gray-50 flex flex-col animate-fade-in pb-24">
      <div className="px-4 py-4 border-b border-gray-200 bg-white sticky top-0 z-30 shadow-sm flex items-center">
        <button onClick={() => setView('cart')} className="mr-3 p-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h2 className="text-xl font-bold flex items-center gap-2"><ClipboardList className="w-5 h-5" style={{ color: 'var(--primary)' }} /> Order Summary</h2>
      </div>

      <div className="p-4 flex-1">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <p className="text-sm text-gray-600 text-center mb-6">How would you like to share your order with the restaurant?</p>

          <div className="flex flex-col gap-4">
            <button
              onClick={() => setCheckoutMode('text')}
              className="w-full border-2 font-bold h-12 rounded-lg flex items-center justify-center gap-2 active:opacity-80 transition-opacity"
              style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
            >
              <FileText className="w-5 h-5" /> Show Items as Text
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-medium uppercase">or</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <button
              onClick={() => setCheckoutMode('qr')}
              className="w-full text-white font-bold h-12 rounded-lg flex items-center justify-center gap-2 shadow-md active:opacity-90 transition-opacity"
              style={{ background: 'var(--primary)' }}
            >
              <QrCode className="w-5 h-5" /> Show QR Code
            </button>
          </div>
        </div>

        {checkoutMode === 'text' && (
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 font-mono text-xs whitespace-pre overflow-x-auto text-gray-800 animate-fade-in">
            {textOrder}
          </div>
        )}

        {checkoutMode === 'qr' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center min-h-[300px] animate-fade-in">
            <h3 className="font-bold text-center mb-1 text-gray-800">Scan at Counter</h3>
            <p className="text-xs text-gray-500 text-center mb-6">Show this code to place your order</p>
            <div className="p-2 bg-white rounded border border-gray-200 shadow-sm">
              <QRCode value={qrData} size={200} />
            </div>
            <p className="font-bold mt-6 text-xl" style={{ color: 'var(--primary)' }}>₹{total.toFixed(2)}</p>
          </div>
        )}
      </div>

      <div className="p-4 mt-auto bg-gray-50 sticky bottom-0 border-t border-gray-100 z-10">
        <button 
          onClick={() => setView('cart')}
          className="w-full h-12 rounded-xl text-gray-600 font-medium flex items-center justify-center gap-1 active:bg-gray-200 transition-colors bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Cart
        </button>
      </div>
    </div>
  );
}
