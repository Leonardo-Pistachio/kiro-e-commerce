import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage, type Order } from '../api';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime, formatPrice } from '../format';
import { usePolling } from '../hooks';

export const REFRESH_MS = 5000;

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setOrders(await api.orders());
      setError('');
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }, []);
  usePolling(load, REFRESH_MS);

  return (
    <section className="panel" data-testid="orders-page">
      <h1>My Orders</h1>
      <p className="muted small">Status refreshes automatically every 5 seconds.</p>
      {error && <p className="note error" role="alert" data-testid="orders-error">{error}</p>}
      {!orders && !error && <p className="muted">Loading orders…</p>}
      {orders && orders.length === 0 && (
        <p className="empty" data-testid="orders-empty">You have no orders yet. <Link to="/" data-testid="orders-browse-link">Start shopping</Link></p>
      )}
      {orders && orders.length > 0 && (
        <table className="table" data-testid="orders-table">
          <thead>
            <tr>
              <th scope="col">Order</th>
              <th scope="col">Placed</th>
              <th scope="col">Items</th>
              <th scope="col">Total</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} data-testid={`orders-row-${order.id}`}>
                <td>
                  <Link to={`/orders/${order.id}`} data-testid={`orders-link-${order.id}`}>Order #{order.id}</Link>
                </td>
                <td>{formatDateTime(order.placedAt)}</td>
                <td>{order.items.map((item) => `${item.quantity} × ${item.name}`).join(', ')}</td>
                <td>{formatPrice(order.totalCents)}</td>
                <td>
                  <StatusBadge status={order.status} testId={`orders-status-${order.id}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
