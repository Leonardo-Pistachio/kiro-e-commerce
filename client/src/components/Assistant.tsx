import { useState, type FormEvent } from 'react';
import { api, errorMessage, type AssistantResult } from '../api';
import { formatDollars } from '../format';
import { ProductGrid } from './ProductCard';

const EXAMPLES = ['gaming laptop under 1500', 'wireless mouse', '4k monitor', 'quiet office desktop under 1000'];

function FilterChips({ result }: { result: AssistantResult }) {
  const { filters } = result;
  const chips: string[] = [];
  if (filters.category) chips.push(`Category: ${filters.category}`);
  if (filters.minPrice !== undefined) chips.push(`Min: ${formatDollars(filters.minPrice)}`);
  if (filters.maxPrice !== undefined) chips.push(`Max: ${formatDollars(filters.maxPrice)}`);
  for (const keyword of filters.keywords ?? []) chips.push(`Keyword: ${keyword}`);
  return (
    <div className="chips" data-testid="assistant-filters">
      <span className={`chip source ${result.source}`} data-testid="assistant-source">
        {result.source === 'bedrock' ? 'Amazon Bedrock' : 'Rule-based'}
      </span>
      {chips.length === 0 ? <span className="chip">No filters: showing everything</span> : chips.map((chip) => <span key={chip} className="chip">{chip}</span>)}
    </div>
  );
}

export function Assistant() {
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<AssistantResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const ask = async (text: string) => {
    if (!text.trim()) return;
    setBusy(true);
    setError('');
    try {
      setResult(await api.assistant(text));
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void ask(message);
  };

  return (
    <section className="panel assistant" aria-labelledby="assistant-title" data-testid="assistant-panel">
      <h2 id="assistant-title">✨ Smart search</h2>
      <p className="muted">Search the catalog in plain words: category, budget and features are turned into filters.</p>
      <form className="assistant-form" role="search" onSubmit={onSubmit}>
        <label htmlFor="assistant-input" className="visually-hidden">Smart search</label>
        <input
          id="assistant-input"
          type="text"
          value={message}
          maxLength={300}
          placeholder="e.g. gaming laptop under 1500"
          onChange={(event) => setMessage(event.target.value)}
          data-testid="assistant-input"
        />
        <button type="submit" disabled={busy || !message.trim()} data-testid="assistant-submit-button">
          {busy ? 'Searching…' : 'Search'}
        </button>
      </form>
      <div className="examples">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            className="chip clickable"
            onClick={() => {
              setMessage(example);
              void ask(example);
            }}
            data-testid={`assistant-example-${example.replace(/\s+/g, '-')}`}
          >
            {example}
          </button>
        ))}
      </div>
      {error && <p className="note error" role="alert" data-testid="assistant-error">{error}</p>}
      {result && (
        <div className="assistant-result" data-testid="assistant-result">
          <FilterChips result={result} />
          {result.keywordsRelaxed && <p className="muted">No exact keyword match, so the keywords were ignored and the other filters kept.</p>}
          {result.products.length === 0 ? (
            <p className="empty" data-testid="assistant-empty">No products match that search. Try a higher budget or another category.</p>
          ) : (
            <ProductGrid products={result.products} testId="assistant-results-grid" />
          )}
        </div>
      )}
    </section>
  );
}
