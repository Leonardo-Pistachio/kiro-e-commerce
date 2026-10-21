import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, errorMessage, type Product } from '../api';
import { formatPrice } from '../format';
import { useAddToCart } from '../hooks';

export function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const { addToCart, busy, message } = useAddToCart();

  useEffect(() => {
    let isCurrent = true;
    api
      .product(Number(id))
      .then((found) => isCurrent && setProduct(found))
      .catch((failure) => isCurrent && setError(errorMessage(failure)));
    return () => {
      isCurrent = false;
    };
  }, [id]);

  if (error) {
    return (
      <section className="panel">
        <p className="note error" role="alert" data-testid="product-error">{error}</p>
        <Link to="/" data-testid="product-back-link">Back to the catalog</Link>
      </section>
    );
  }
  if (!product) return <p className="muted">Loading product…</p>;

  const isOutOfStock = product.stock === 0;
  const safeQuantity = Math.min(Math.max(1, quantity), Math.max(1, product.stock));

  return (
    <section className="panel product-detail" data-testid="product-detail">
      <Link to="/" className="muted" data-testid="product-back-link">← Back to the catalog</Link>
      <div className="detail-layout">
        <img src={product.image} alt="" className="detail-image" />
        <div>
          <span className="card-category">{product.category}</span>
          <h1 data-testid="product-name">{product.name}</h1>
          <p className="price large" data-testid="product-price">{formatPrice(product.priceCents)}</p>
          <p>{product.description}</p>
          <p className={`stock ${isOutOfStock ? 'out' : 'in'}`} data-testid="product-stock">
            {isOutOfStock ? 'Out of stock' : `${product.stock} in stock`}
          </p>
          {!isOutOfStock && (
            <div className="buy-row">
              <label htmlFor="product-quantity-input">Quantity</label>
              <input
                id="product-quantity-input"
                type="number"
                min={1}
                max={product.stock}
                value={safeQuantity}
                onChange={(event) => setQuantity(Number(event.target.value) || 1)}
                data-testid="product-quantity-input"
              />
              <button type="button" disabled={busy} onClick={() => void addToCart(product.id, safeQuantity)} data-testid="product-add-to-cart-button">
                Add to cart
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => navigate(`/checkout?buyNow=${product.id}&qty=${safeQuantity}`)}
                data-testid="product-buy-now-button"
              >
                Buy now
              </button>
            </div>
          )}
          {message && (
            <p className={`note ${message.kind}`} role="status" data-testid="product-cart-message">
              {message.text} {message.kind === 'ok' && <Link to="/cart" data-testid="product-view-cart-link">View cart</Link>}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
