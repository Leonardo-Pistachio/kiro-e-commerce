import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useSession } from '../session';

export function Header() {
  const { user, cartCount, signOut } = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');

  // Keep the box in sync when the URL search changes (back button, home filters).
  useEffect(() => setQuery(searchParams.get('q') ?? ''), [searchParams]);

  // Bump the cart badge only when the count goes up, not on first render.
  const [bumpKey, setBumpKey] = useState(0);
  const previousCount = useRef(cartCount);
  useEffect(() => {
    if (cartCount > previousCount.current) setBumpKey((key) => key + 1);
    previousCount.current = cartCount;
  }, [cartCount]);

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (query.trim()) params.set('q', query.trim());
    else params.delete('q');
    navigate(`/?${params}`);
  };

  const onLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="site-header">
      <div className="container header-row">
        <Link to="/" className="brand" data-testid="header-home-link">
          <img src="/brand/kiro-icon-128.png" alt="" width={30} height={30} className="brand-mark" /> Kiro PC Store
        </Link>
        <form className="header-search" role="search" onSubmit={onSearch}>
          <label htmlFor="header-search-input" className="visually-hidden">Search products</label>
          <input
            id="header-search-input"
            type="search"
            placeholder="Search laptops, monitors…"
            value={query}
            maxLength={100}
            onChange={(event) => setQuery(event.target.value)}
            data-testid="header-search-input"
          />
          <button type="submit" data-testid="header-search-button">Search</button>
        </form>
        <nav className="header-nav" aria-label="Account">
          {user ? (
            <>
              <NavLink to="/orders" data-testid="header-orders-link">My Orders</NavLink>
              <NavLink to="/cart" data-testid="header-cart-link">
                Cart <span key={bumpKey} className={bumpKey ? 'badge bump' : 'badge'} data-testid="header-cart-count" aria-label={`${cartCount} items in cart`}>{cartCount}</span>
              </NavLink>
              <span className="muted" data-testid="header-user-name">Hi, {user.name}</span>
              <button type="button" className="link-button" onClick={onLogout} data-testid="header-logout-button">Log out</button>
            </>
          ) : (
            <>
              <NavLink to="/login" data-testid="header-login-link">Log in</NavLink>
              <NavLink to="/signup" className="button small" data-testid="header-signup-link">Sign up</NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
