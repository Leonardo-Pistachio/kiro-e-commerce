import type { ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ChatWidget } from './components/ChatWidget';
import { Header } from './components/Header';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { OrdersPage } from './pages/OrdersPage';
import { ProductPage } from './pages/ProductPage';
import { SignupPage } from './pages/SignupPage';
import { useSession } from './session';

/** Sends visitors to the login page and back again afterwards. */
function RequireLogin({ children }: { children: ReactNode }) {
  const { user, ready } = useSession();
  const location = useLocation();
  if (!ready) return <p className="muted">Loading…</p>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <>
      <Header />
      <main className="container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products/:id" element={<ProductPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/cart" element={<RequireLogin><CartPage /></RequireLogin>} />
          <Route path="/checkout" element={<RequireLogin><CheckoutPage /></RequireLogin>} />
          <Route path="/orders" element={<RequireLogin><OrdersPage /></RequireLogin>} />
          <Route path="/orders/:id" element={<RequireLogin><OrderDetailPage /></RequireLogin>} />
          <Route
            path="*"
            element={
              <section className="panel">
                <h1>Page not found</h1>
                <Link to="/" data-testid="not-found-home-link">Back to the store</Link>
              </section>
            }
          />
        </Routes>
      </main>
      <ChatWidget />
    </>
  );
}
