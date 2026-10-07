'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Minus, Plus, ShoppingBag, Zap } from 'lucide-react';
import { useCart } from './CartProvider';
import { addToCart } from '@/lib/metaPixel';
import { waLink } from '@/lib/config';
import { WhatsAppIcon } from './Icons';
import InstallButton from './InstallButton';

export default function ProductActions({ product }) {
  const { add } = useCart();
  const router = useRouter();
  const [size, setSize] = useState('');
  const [qty, setQty] = useState(1);
  const [err, setErr] = useState('');
  const [added, setAdded] = useState(false);
  const needSize = product.sizes.length > 0;

  const ok = () => {
    if (needSize && !size) { setErr('Please select a size first'); return false; }
    setErr('');
    return true;
  };
  const put = () => { add(product, { size, qty }); addToCart(product, qty); };

  if (!product.inStock) {
    return (
      <div className="mt-6 rounded-2xl border border-line bg-surface p-4">
        <p className="font-semibold text-cream">Currently sold out</p>
        <a className="btn-wa mt-3 w-full" href={waLink(`Assalam o Alaikum, please tell me when "${product.name}" is back in stock.`)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={20} /> Ask on WhatsApp</a>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {needSize && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-cream">Size</legend>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((s) => (
              <button key={s} type="button" onClick={() => { setSize(s); setErr(''); }} aria-pressed={size === s}
                className={`min-w-12 rounded-xl border px-3.5 py-2.5 text-sm font-semibold ${size === s ? 'border-gold bg-gold text-ink' : 'border-line bg-surface text-cream hover:border-bronze'}`}>{s}</button>
            ))}
          </div>
        </fieldset>
      )}
      {err && <p role="alert" className="mt-2 text-sm font-medium text-red-400">{err}</p>}

      <div className="mt-4 flex items-center gap-3">
        <span className="text-sm font-semibold text-cream">Quantity</span>
        <div className="flex items-center rounded-xl border border-line bg-surface">
          <button type="button" aria-label="Decrease" className="p-3" onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus size={16} /></button>
          <span className="w-8 text-center font-semibold" aria-live="polite">{qty}</span>
          <button type="button" aria-label="Increase" className="p-3" onClick={() => setQty((q) => Math.min(10, q + 1))}><Plus size={16} /></button>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <button type="button" className="btn-gold" onClick={() => { if (ok()) { put(); router.push('/checkout'); } }}>
          <Zap size={18} /> Order now, pay on delivery
        </button>
        <button type="button" className="btn-ghost" onClick={() => { if (ok()) { put(); setAdded(true); } }}>
          <ShoppingBag size={18} /> Add to cart
        </button>
        <a className="btn-wa" target="_blank" rel="noopener noreferrer"
          href={waLink(`Assalam o Alaikum, I want to order: ${product.name}${size ? `, size ${size}` : ''}, quantity ${qty}. City: `)}>
          <WhatsAppIcon size={20} /> Order on WhatsApp
        </a>
      </div>

      {added && (
        <div role="status" className="mt-4 rounded-2xl border border-bronze bg-surface p-4">
          <p className="flex items-center gap-2 font-semibold text-cream"><Check size={18} className="text-gold" /> Added to your cart</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/checkout" className="btn-gold !py-2.5">Checkout</Link>
            <Link href="/products" className="btn-ghost !py-2.5">Keep shopping</Link>
          </div>
          <InstallButton className="mt-3" full />
        </div>
      )}
    </div>
  );
}
