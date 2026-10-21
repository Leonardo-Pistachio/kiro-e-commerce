import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage, type Product } from '../api';
import { EXAMPLE_PROMPTS, GREETING, MAX_MESSAGE_LENGTH, buildHistory, chatReply, errorReply } from '../chat';
import { formatPrice } from '../format';
import { useAddToCart } from '../hooks';

// Interactive shopping assistant: a round launcher fixed to the bottom-right
// corner of every page that opens a chat panel. Each message is sent with the
// conversation so far to POST /api/assistant/chat, which replies in natural
// language (Bedrock, or a rule-based fallback) with up to 5 catalog products.
// Ids and test ids use the `chat-widget-` prefix so they never clash with the
// inline home-page Smart search panel.

const PANEL_ID = 'chat-widget-panel';
const TITLE_ID = 'chat-widget-title';
const INPUT_ID = 'chat-widget-input';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  products: Product[];
  isError: boolean;
}

function toTestIdSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function ChatProduct({ product, onNavigate }: { product: Product; onNavigate: () => void }) {
  const { addToCart, busy, message } = useAddToCart();
  const isOutOfStock = product.stock === 0;
  return (
    <li className="chat-widget-product" data-testid={`chat-widget-product-${product.id}`}>
      <Link to={`/products/${product.id}`} className="chat-widget-product-link" onClick={onNavigate} data-testid={`chat-widget-product-link-${product.id}`}>
        <img src={product.image} alt="" className="chat-widget-product-image" />
        <span className="chat-widget-product-name">{product.name}</span>
        <span className="price" data-testid={`chat-widget-product-price-${product.id}`}>{formatPrice(product.priceCents)}</span>
      </Link>
      <button
        type="button"
        className="button small"
        disabled={busy || isOutOfStock}
        onClick={() => void addToCart(product.id, 1)}
        aria-label={isOutOfStock ? `${product.name} is out of stock` : `Add ${product.name} to cart`}
        data-testid={`chat-widget-product-add-${product.id}`}
      >
        {isOutOfStock ? 'Out of stock' : 'Add to cart'}
      </button>
      {message && (
        <p className={`chat-widget-product-note ${message.kind}`} role="status">
          {message.text}
        </p>
      )}
    </li>
  );
}

function AssistantBubble({ message, onNavigate }: { message: ChatMessage; onNavigate: () => void }) {
  return (
    <li className={`chat-widget-message assistant${message.isError ? ' error' : ''}`} data-testid={message.isError ? 'chat-widget-message-error' : 'chat-widget-message-assistant'}>
      <p className="chat-widget-bubble">{message.text}</p>
      {message.products.length > 0 && (
        <ul className="chat-widget-products" aria-label="Recommended products">
          {message.products.map((product) => (
            <ChatProduct key={product.id} product={product} onNavigate={onNavigate} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** The panel's conversation. It mounts on every open, so each opening starts fresh (FR2.6). */
function ChatPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const threadRef = useRef<HTMLOListElement>(null);
  const nextIdRef = useRef(1);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    inputRef.current?.focus();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Keep the newest message in view without scrolling the page itself.
  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTop = thread.scrollHeight;
  }, [messages, busy]);

  const append = (role: ChatMessage['role'], text: string, products: Product[] = [], isError = false) => {
    const id = nextIdRef.current++;
    setMessages((current) => [...current, { id, role, text, products, isError }]);
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    // The conversation so far (this open panel only) goes with every message (FR5.2).
    const history = buildHistory(messages, trimmed);
    append('user', trimmed);
    setDraft('');
    setBusy(true);
    try {
      const reply = chatReply(await api.assistantChat(history));
      if (isMountedRef.current) append('assistant', reply.text, reply.products);
    } catch (failure) {
      if (isMountedRef.current) append('assistant', errorReply(errorMessage(failure)).text, [], true);
    } finally {
      if (isMountedRef.current) {
        setBusy(false);
        inputRef.current?.focus();
      }
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void send(draft);
  };

  return (
    <section id={PANEL_ID} className="chat-widget-panel" role="dialog" aria-modal="false" aria-labelledby={TITLE_ID} data-testid="chat-widget-panel">
      <header className="chat-widget-header">
        <h2 id={TITLE_ID}>Shopping assistant</h2>
        <button type="button" className="chat-widget-close" onClick={onClose} aria-label="Close shopping assistant" data-testid="chat-widget-close-button">
          <span aria-hidden="true">×</span>
        </button>
      </header>
      <ol ref={threadRef} className="chat-widget-thread" aria-live="polite" aria-label="Conversation" data-testid="chat-widget-thread">
        <li className="chat-widget-message assistant" data-testid="chat-widget-greeting">
          <p className="chat-widget-bubble">{GREETING}</p>
          <div className="chat-widget-examples">
            {EXAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="chip clickable"
                disabled={busy}
                onClick={() => void send(prompt)}
                data-testid={`chat-widget-example-${toTestIdSlug(prompt)}`}
              >
                {prompt}
              </button>
            ))}
          </div>
        </li>
        {messages.map((message) =>
          message.role === 'user' ? (
            <li key={message.id} className="chat-widget-message user" data-testid="chat-widget-message-user">
              <p className="chat-widget-bubble">{message.text}</p>
            </li>
          ) : (
            <AssistantBubble key={message.id} message={message} onNavigate={onClose} />
          ),
        )}
        {busy && (
          <li className="chat-widget-message assistant" data-testid="chat-widget-typing">
            <p className="chat-widget-bubble chat-widget-typing">
              <span className="visually-hidden">Assistant is typing…</span>
              <span className="chat-widget-dot" aria-hidden="true" />
              <span className="chat-widget-dot" aria-hidden="true" />
              <span className="chat-widget-dot" aria-hidden="true" />
            </p>
          </li>
        )}
      </ol>
      <form className="chat-widget-form" onSubmit={onSubmit} data-testid="chat-widget-form">
        <label htmlFor={INPUT_ID} className="visually-hidden">Message the shopping assistant</label>
        <input
          ref={inputRef}
          id={INPUT_ID}
          type="text"
          value={draft}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="Ask about a product or refine your request"
          autoComplete="off"
          onChange={(event) => setDraft(event.target.value)}
          data-testid="chat-widget-input"
        />
        <button type="submit" disabled={busy || !draft.trim()} data-testid="chat-widget-send-button">
          Send
        </button>
      </form>
    </section>
  );
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    setIsOpen(false);
    launcherRef.current?.focus();
  };

  // Escape closes the panel from anywhere on the page while it is open.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      launcherRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  return (
    <div className="chat-widget" data-testid="chat-widget">
      {isOpen && <ChatPanel onClose={close} />}
      <button
        ref={launcherRef}
        type="button"
        className={`chat-widget-launcher${isOpen ? ' open' : ''}`}
        aria-expanded={isOpen}
        aria-controls={PANEL_ID}
        aria-label={isOpen ? 'Close shopping assistant' : 'Open shopping assistant'}
        onClick={() => setIsOpen((current) => !current)}
        data-testid="chat-widget-launcher"
      >
        <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false">
          {isOpen ? (
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          ) : (
            <path
              d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4A2.5 2.5 0 0 1 4 13.5z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
              fill="none"
            />
          )}
        </svg>
      </button>
    </div>
  );
}
