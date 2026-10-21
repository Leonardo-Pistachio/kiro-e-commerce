import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, errorMessage } from './api';
import { useSession } from './session';

/** Runs `load` now and then every `intervalMs` until the component unmounts. */
export function usePolling(load: () => Promise<void>, intervalMs: number): void {
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    void loadRef.current();
    const timer = window.setInterval(() => void loadRef.current(), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
}

/** Adds a product to the cart, sending visitors to log in first. */
export function useAddToCart() {
  const { user, refreshCart } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const addToCart = useCallback(
    async (productId: number, quantity: number) => {
      if (!user) {
        navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
        return;
      }
      setBusy(true);
      setMessage(null);
      try {
        await api.addToCart(productId, quantity);
        await refreshCart();
        setMessage({ kind: 'ok', text: 'Added to cart' });
      } catch (error) {
        setMessage({ kind: 'error', text: errorMessage(error) });
      } finally {
        setBusy(false);
      }
    },
    [user, navigate, location, refreshCart],
  );

  return { addToCart, busy, message };
}
