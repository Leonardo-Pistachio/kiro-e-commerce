import type { CSSProperties, PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../api';
import { formatPrice } from '../format';
import { useAddToCart } from '../hooks';

// Cap the stagger so long grids still finish their entrance quickly.
const MAX_STAGGER_STEPS = 8;
// Maximum tilt in degrees; kept small so the card reads as weighty hardware.
const TILT_X = 5;
const TILT_Y = 7;

// Writes pointer position into CSS variables directly, so moving the mouse
// never re-renders React. Only mouse pointers tilt; touch and pen just lift.
function trackPointer(event: PointerEvent<HTMLElement>) {
  if (event.pointerType !== 'mouse') return;
  const card = event.currentTarget;
  const box = card.getBoundingClientRect();
  const x = (event.clientX - box.left) / box.width;
  const y = (event.clientY - box.top) / box.height;
  card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
  card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
  card.style.setProperty('--rx', `${((0.5 - y) * TILT_X).toFixed(2)}deg`);
  card.style.setProperty('--ry', `${((x - 0.5) * TILT_Y).toFixed(2)}deg`);
}

function resetPointer(event: PointerEvent<HTMLElement>) {
  const card = event.currentTarget;
  card.style.removeProperty('--rx');
  card.style.removeProperty('--ry');
}

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { addToCart, busy, message } = useAddToCart();
  const isOutOfStock = product.stock === 0;
  const staggerStyle = { '--i': Math.min(index, MAX_STAGGER_STEPS) } as CSSProperties;

  return (
    <article
      className="card"
      style={staggerStyle}
      onPointerMove={trackPointer}
      onPointerLeave={resetPointer}
      data-testid={`product-card-${product.id}`}
    >
      <Link to={`/products/${product.id}`} className="card-link" data-testid={`product-card-link-${product.id}`}>
        <div className="card-media">
          <img src={product.image} alt="" className="card-image" />
        </div>
        <span className="card-category">{product.category}</span>
        <h3 className="card-title">{product.name}</h3>
      </Link>
      <div className="card-footer">
        <span className="price" data-testid={`product-card-price-${product.id}`}>{formatPrice(product.priceCents)}</span>
        {isOutOfStock ? (
          <span className="stock out">Out of stock</span>
        ) : (
          <button
            type="button"
            className="button small"
            disabled={busy}
            onClick={() => void addToCart(product.id, 1)}
            data-testid={`product-card-add-${product.id}`}
          >
            Add to cart
          </button>
        )}
      </div>
      {message && (
        <p className={`note ${message.kind}`} role="status">
          {message.text}
        </p>
      )}
    </article>
  );
}

export function ProductGrid({ products, testId }: { products: Product[]; testId: string }) {
  return (
    <div className="grid" data-testid={testId}>
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} index={index} />
      ))}
    </div>
  );
}
