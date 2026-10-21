import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, errorMessage, type Cart } from '../api';
import { formatPrice } from '../format';
import { useSession } from '../session';

export function CartPage() {
  const { refreshCart } = useSession();
  const navigate = useNavigate();
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setCart(await api.cart());
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const apply = async (change: Promise<Cart>) => {
    setError('');
    try {
      setCart(await change);
      await refreshCart();
    } catch (failure) {
      setError(errorMessage(failure));
      await load();
    }
  };

  if (!cart) return error ? <p className="note error" role="alert">{error}</p> : <p className="muted">Loading cart…</p>;

  return (
    <section className="panel" data-testid="cart-page">
      <h1>Your cart</h1>
      {error && <p className="note error" role="alert" data-testid="cart-error">{error}</p>}
      {cart.items.length === 0 ? (
        <p className="empty" data-testid="cart-empty">
          Your cart is empty. <Link to="/" data-testid="cart-browse-link">Browse the catalog</Link>
        </p>
      ) : (
        <>
          <table className="table" data-testid="cart-table">
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Price</th>
                <th scope="col">Quantity</th>
                <th scope="col">Total</th>
                <th scope="col"><span className="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {cart.items.map((line) => (
                <tr key={line.productId} data-testid={`cart-row-${line.productId}`}>
                  <td>
                    <Link to={`/products/${line.productId}`} className="line-product" data-testid={`cart-product-link-${line.productId}`}>
                      <img src={line.image} alt="" className="thumb" />
                      {line.name}
                    </Link>
                  </td>
                  <td>{formatPrice(line.priceCents)}</td>
                  <td>
                    <label htmlFor={`cart-qty-${line.productId}`} className="visually-hidden">Quantity for {line.name}</label>
                    <input
                      id={`cart-qty-${line.productId}`}
                      type="number"
                      className="qty"
                      min={1}
                      max={line.stock}
                      value={line.quantity}
                      onChange={(event) => {
                        const quantity = Number(event.target.value);
                        if (Number.isInteger(quantity) && quantity >= 1) void apply(api.updateCartLine(line.productId, quantity));
                      }}
                      data-testid={`cart-quantity-input-${line.productId}`}
                    />
                    <span className="muted small"> of {line.stock}</span>
                  </td>
                  <td>{formatPrice(line.lineTotalCents)}</td>
                  <td>
                    <button type="button" className="link-button danger" onClick={() => void apply(api.removeCartLine(line.productId))} data-testid={`cart-remove-button-${line.productId}`}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="summary-row">
            <span>
              Total: <strong data-testid="cart-total">{formatPrice(cart.totalCents)}</strong>
            </span>
            <button type="button" onClick={() => navigate('/checkout')} data-testid="cart-checkout-button">
              Checkout
            </button>
          </div>
        </>
      )}
    </section>
  );
}
