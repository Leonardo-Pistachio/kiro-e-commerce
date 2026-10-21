import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, errorMessage, type Category, type Product } from '../api';
import { Assistant } from '../components/Assistant';
import { HeroStarfield } from '../components/HeroStarfield';
import { ProductGrid } from '../components/ProductCard';

const CATEGORIES: Category[] = ['Laptops', 'Desktops', 'Monitors', 'Accessories'];

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? '';
  const [searchText, setSearchText] = useState(q);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => setSearchText(q), [q]);

  useEffect(() => {
    let isCurrent = true;
    setError('');
    api
      .products({ q, category })
      .then((list) => isCurrent && setProducts(list))
      .catch((failure) => isCurrent && setError(errorMessage(failure)));
    return () => {
      isCurrent = false;
    };
  }, [q, category]);

  const updateParams = (changes: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setSearchParams(next);
  };

  return (
    <>
      <section className="hero">
        <HeroStarfield />
        <h1>Find your next PC</h1>
        <p className="muted">Laptops, desktops, monitors and accessories, shipped in seconds (it is a demo).</p>
      </section>

      <Assistant />

      <section aria-labelledby="catalog-title">
        <div className="toolbar">
          <h2 id="catalog-title">Catalog</h2>
          <form
            className="toolbar-search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              updateParams({ q: searchText.trim() });
            }}
          >
            <label htmlFor="catalog-search-input" className="visually-hidden">Search the catalog</label>
            <input
              id="catalog-search-input"
              type="search"
              placeholder="Search name or description"
              value={searchText}
              maxLength={100}
              onChange={(event) => setSearchText(event.target.value)}
              data-testid="catalog-search-input"
            />
            <button type="submit" data-testid="catalog-search-button">Search</button>
          </form>
          <label htmlFor="catalog-category-select" className="visually-hidden">Category</label>
          <select
            id="catalog-category-select"
            value={category}
            onChange={(event) => updateParams({ category: event.target.value })}
            data-testid="catalog-category-select"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          {(q || category) && (
            <button type="button" className="link-button" onClick={() => updateParams({ q: '', category: '' })} data-testid="catalog-clear-filters-button">
              Clear filters
            </button>
          )}
        </div>

        {error && <p className="note error" role="alert" data-testid="catalog-error">{error}</p>}
        {!products && !error && <p className="muted">Loading products…</p>}
        {products && products.length === 0 && (
          <p className="empty" data-testid="catalog-empty">No products match your search. Try another word or category.</p>
        )}
        {products && products.length > 0 && <ProductGrid products={products} testId="catalog-grid" />}
      </section>
    </>
  );
}
