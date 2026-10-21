// Typed client for the store API. Every call goes through `request`, which
// turns network failures and JSON error envelopes into an ApiError with a
// message that can be shown to the shopper as-is.

export type Category = 'Laptops' | 'Desktops' | 'Monitors' | 'Accessories';
export type OrderStatus = 'Pending' | 'Paid' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface Product {
  id: number;
  name: string;
  description: string;
  category: Category;
  priceCents: number;
  stock: number;
  image: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
}

export interface CartLine {
  productId: number;
  name: string;
  image: string;
  priceCents: number;
  stock: number;
  quantity: number;
  lineTotalCents: number;
}

export interface Cart {
  items: CartLine[];
  count: number;
  totalCents: number;
}

export interface ShippingInfo {
  recipientName: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
}

export interface OrderItem {
  productId: number;
  name: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}

export interface Order {
  id: number;
  status: OrderStatus;
  totalCents: number;
  placedAt: string;
  shipsAt: string;
  deliversAt: string;
  canCancel: boolean;
  shipping: ShippingInfo;
  items: OrderItem[];
}

export interface AssistantFilters {
  category?: Category;
  minPrice?: number;
  maxPrice?: number;
  keywords?: string[];
}

export interface AssistantResult {
  source: 'bedrock' | 'rules';
  filters: AssistantFilters;
  keywordsRelaxed: boolean;
  products: Product[];
}

export type ChatRole = 'user' | 'assistant';

/** One turn of the widget conversation, as sent to POST /api/assistant/chat. */
export interface ChatTurn {
  role: ChatRole;
  text: string;
}

export interface AssistantChatResult extends AssistantResult {
  /** Natural-language reply (Bedrock) or templated reply (rule-based fallback). */
  reply: string;
}

export interface AuthResult {
  token: string;
  user: User;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

/** Called when the server says the session is no longer valid. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: init.method ?? 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Cannot reach the store server. Check that it is running and try again.');
  }
  if (response.status === 204) return undefined as T;
  const data = (await response.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
  if (!response.ok) {
    if (response.status === 401 && authToken) onUnauthorized?.();
    throw new ApiError(response.status, data?.error?.code ?? 'HTTP_ERROR', data?.error?.message ?? `Request failed (HTTP ${response.status}).`);
  }
  return data as T;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export const api = {
  products: (params: { q?: string; category?: string }) => {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.category) query.set('category', params.category);
    const suffix = query.toString() ? `?${query}` : '';
    return request<{ products: Product[] }>(`/products${suffix}`).then((data) => data.products);
  },
  product: (id: number) => request<{ product: Product }>(`/products/${id}`).then((data) => data.product),
  categories: () => request<{ categories: Category[] }>('/categories').then((data) => data.categories),

  signup: (input: { email: string; name: string; password: string }) => request<AuthResult>('/auth/signup', { method: 'POST', body: input }),
  login: (input: { email: string; password: string }) => request<AuthResult>('/auth/login', { method: 'POST', body: input }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  me: () => request<{ user: User }>('/auth/me').then((data) => data.user),

  cart: () => request<Cart>('/cart'),
  addToCart: (productId: number, quantity: number) => request<Cart>('/cart', { method: 'POST', body: { productId, quantity } }),
  updateCartLine: (productId: number, quantity: number) => request<Cart>(`/cart/${productId}`, { method: 'PATCH', body: { quantity } }),
  removeCartLine: (productId: number) => request<Cart>(`/cart/${productId}`, { method: 'DELETE' }),

  placeOrder: (shipping: ShippingInfo, buyNow?: { productId: number; quantity: number }) =>
    request<{ order: Order }>('/orders', { method: 'POST', body: { shipping, buyNow } }).then((data) => data.order),
  orders: () => request<{ orders: Order[] }>('/orders').then((data) => data.orders),
  order: (id: number) => request<{ order: Order }>(`/orders/${id}`).then((data) => data.order),
  cancelOrder: (id: number) => request<{ order: Order }>(`/orders/${id}/cancel`, { method: 'POST' }).then((data) => data.order),

  assistant: (message: string) => request<AssistantResult>('/assistant', { method: 'POST', body: { message } }),
  assistantChat: (messages: ChatTurn[]) => request<AssistantChatResult>('/assistant/chat', { method: 'POST', body: { messages } }),
};
