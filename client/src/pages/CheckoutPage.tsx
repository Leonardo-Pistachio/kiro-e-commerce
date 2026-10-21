import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, errorMessage, type ShippingInfo } from '../api';
import { formatPrice } from '../format';
import { useSession } from '../session';

interface SummaryLine {
  productId: number;
  name: string;
  priceCents: number;
  quantity: number;
}

const FIELDS: { key: keyof ShippingInfo; label: string; autoComplete: string; maxLength: number }[] = [
  { key: 'recipientName', label: 'Recipient name', autoComplete: 'name', maxLength: 100 },
  { key: 'address', label: 'Address', autoComplete: 'street-address', maxLength: 200 },
  { key: 'city', label: 'City', autoComplete: 'address-level2', maxLength: 100 },
  { key: 'postalCode', label: 'Postal code', autoComplete: 'postal-code', maxLength: 20 },
  { key: 'phone', label: 'Phone', autoComplete: 'tel', maxLength: 30 },
];

const TEST_IDS: Record<keyof ShippingInfo, string> = {
  recipientName: 'checkout-recipient-name-input',
  address: 'checkout-address-input',
  city: 'checkout-city-input',
  postalCode: 'checkout-postal-code-input',
  phone: 'checkout-phone-input',
};

export function CheckoutPage() {
  const { user, refreshCart } = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const buyNowId = Number(searchParams.get('buyNow')) || 0;
  const buyNowQuantity = Math.max(1, Number(searchParams.get('qty')) || 1);
  const [lines, setLines] = useState<SummaryLine[] | null>(null);
  const [shipping, setShipping] = useState<ShippingInfo>({ recipientName: user?.name ?? '', address: '', city: '', postalCode: '', phone: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    const load = buyNowId
      ? api.product(buyNowId).then((product) => [{ productId: product.id, name: product.name, priceCents: product.priceCents, quantity: buyNowQuantity }])
      : api.cart().then((cart) => cart.items.map((line) => ({ productId: line.productId, name: line.name, priceCents: line.priceCents, quantity: line.quantity })));
    load.then((summary) => isCurrent && setLines(summary)).catch((failure) => isCurrent && setError(errorMessage(failure)));
    return () => {
      isCurrent = false;
    };
  }, [buyNowId, buyNowQuantity]);

  const totalCents = (lines ?? []).reduce((sum, line) => sum + line.priceCents * line.quantity, 0);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const order = await api.placeOrder(shipping, buyNowId ? { productId: buyNowId, quantity: buyNowQuantity } : undefined);
      await refreshCart();
      navigate(`/orders/${order.id}`, { replace: true });
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  if (!lines) return error ? <p className="note error" role="alert" data-testid="checkout-error">{error}</p> : <p className="muted">Loading checkout…</p>;
  if (lines.length === 0) {
    return (
      <section className="panel">
        <p className="empty" data-testid="checkout-empty">Nothing to check out. <Link to="/" data-testid="checkout-browse-link">Browse the catalog</Link></p>
      </section>
    );
  }

  return (
    <section className="panel checkout" data-testid="checkout-page">
      <h1>Checkout {buyNowId ? <span className="chip">Buy now</span> : null}</h1>
      <div className="checkout-layout">
        <form className="form" onSubmit={onSubmit} data-testid="checkout-form">
          <h2>Shipping information</h2>
          {FIELDS.map((field) => (
            <div key={field.key} className="field">
              <label htmlFor={`checkout-${field.key}`}>{field.label}</label>
              <input
                id={`checkout-${field.key}`}
                required
                autoComplete={field.autoComplete}
                maxLength={field.maxLength}
                value={shipping[field.key]}
                onChange={(event) => setShipping({ ...shipping, [field.key]: event.target.value })}
                data-testid={TEST_IDS[field.key]}
              />
            </div>
          ))}
          <h2>Payment</h2>
          <p className="simulated" data-testid="checkout-payment-note">💳 Payment is simulated for this demo. No card is needed and nothing is charged.</p>
          {error && <p className="note error" role="alert" data-testid="checkout-error">{error}</p>}
          <button type="submit" disabled={busy} data-testid="checkout-place-order-button">
            {busy ? 'Placing order…' : `Pay ${formatPrice(totalCents)} and place order`}
          </button>
        </form>
        <aside className="summary" aria-labelledby="checkout-summary-title" data-testid="checkout-summary">
          <h2 id="checkout-summary-title">Order summary</h2>
          <ul className="plain-list">
            {lines.map((line) => (
              <li key={line.productId}>
                <span>{line.quantity} × {line.name}</span>
                <span>{formatPrice(line.priceCents * line.quantity)}</span>
              </li>
            ))}
          </ul>
          <p className="summary-total">
            Total <strong data-testid="checkout-total">{formatPrice(totalCents)}</strong>
          </p>
        </aside>
      </div>
    </section>
  );
}
