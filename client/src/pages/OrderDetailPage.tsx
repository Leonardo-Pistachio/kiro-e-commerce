import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, errorMessage, type Order, type OrderStatus } from '../api';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime, formatPrice } from '../format';
import { usePolling } from '../hooks';
import { REFRESH_MS } from './OrdersPage';

const STEPS: OrderStatus[] = ['Paid', 'Shipped', 'Delivered'];

function Timeline({ order }: { order: Order }) {
  if (order.status === 'Cancelled') return <p className="note error" data-testid="order-cancelled-note">This order was cancelled and its items were returned to stock.</p>;
  const reached = STEPS.indexOf(order.status);
  const times: Record<string, string> = { Paid: order.placedAt, Shipped: order.shipsAt, Delivered: order.deliversAt };
  return (
    <ol className="timeline" data-testid="order-timeline">
      {STEPS.map((step, index) => (
        <li key={step} className={index <= reached ? 'done' : ''}>
          <strong>{step}</strong>
          <span className="muted small">{index <= reached ? formatDateTime(times[step]) : `expected ${formatDateTime(times[step])}`}</span>
        </li>
      ))}
    </ol>
  );
}

export function OrderDetailPage() {
  const { id } = useParams();
  const orderId = Number(id);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setOrder(await api.order(orderId));
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }, [orderId]);
  usePolling(load, REFRESH_MS);

  const onCancel = async () => {
    setBusy(true);
    setError('');
    try {
      setOrder(await api.cancelOrder(orderId));
    } catch (failure) {
      // The server decides: show its reason and the fresh status.
      setError(errorMessage(failure));
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (!order) {
    return error ? (
      <section className="panel">
        <p className="note error" role="alert" data-testid="order-error">{error}</p>
        <Link to="/orders" data-testid="order-back-link">Back to My Orders</Link>
      </section>
    ) : (
      <p className="muted">Loading order…</p>
    );
  }

  return (
    <section className="panel" data-testid="order-detail">
      <Link to="/orders" className="muted" data-testid="order-back-link">← My Orders</Link>
      <div className="order-header">
        <h1>Order #{order.id}</h1>
        <StatusBadge status={order.status} testId="order-status" />
      </div>
      <p className="muted small">Placed {formatDateTime(order.placedAt)}. Status refreshes every 5 seconds.</p>
      <Timeline order={order} />

      {error && <p className="note error" role="alert" data-testid="order-error">{error}</p>}

      <h2>Items</h2>
      <table className="table" data-testid="order-items-table">
        <thead>
          <tr>
            <th scope="col">Product</th>
            <th scope="col">Unit price</th>
            <th scope="col">Quantity</th>
            <th scope="col">Line total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.productId}>
              <td>{item.name}</td>
              <td>{formatPrice(item.unitPriceCents)}</td>
              <td>{item.quantity}</td>
              <td>{formatPrice(item.lineTotalCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="summary-total">
        Total <strong data-testid="order-total">{formatPrice(order.totalCents)}</strong>
      </p>

      <h2>Shipping to</h2>
      <address className="shipping" data-testid="order-shipping">
        {order.shipping.recipientName}
        <br />
        {order.shipping.address}
        <br />
        {order.shipping.city} {order.shipping.postalCode}
        <br />
        {order.shipping.phone}
      </address>

      {order.canCancel && (
        <button type="button" className="button danger" disabled={busy} onClick={() => void onCancel()} data-testid="order-cancel-button">
          {busy ? 'Cancelling…' : 'Cancel order'}
        </button>
      )}
    </section>
  );
}
