const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Merchant {
  id: string;
  name: string;
  email?: string;
  razorpay_key_id?: string;
  limits_config: Record<string, any>;
}

export interface CatalogItem {
  id: string;
  merchant_id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
}

export interface AuditEvent {
  id: string;
  merchant_id?: string;
  actor_type: string;
  actor_id: string;
  action: string;
  input: Record<string, any>;
  decision: string;
  reasoning: string;
  created_at: string;
}

export interface AuditPaginatedResponse {
  total: number;
  items: AuditEvent[];
  skip: number;
  limit: number;
}

export interface CreateMerchantPayload {
  name: string;
  email?: string;
  password?: string;
  razorpay_key_id?: string;
  limits_config?: Record<string, any>;
}

export interface CreateCatalogItemPayload {
  merchant_id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
}

export interface UpdateCatalogItemPayload {
  name?: string;
  price?: number;
  stock?: number;
  category?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  merchant_id: string;
  merchant_name: string;
  email: string;
}

// Auth Storage Helpers
export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('agentpay_auth_token');
  }
  return null;
}

export function setAuthToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('agentpay_auth_token', token);
  }
}

export function removeAuthToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('agentpay_auth_token');
  }
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function loginMerchant(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Login failed' }));
    throw new Error(err.detail || 'Login failed');
  }
  const data: AuthResponse = await res.json();
  setAuthToken(data.access_token);
  return data;
}

export async function registerMerchant(name: string, email: string, password: string, razorpayKeyId?: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, razorpay_key_id: razorpayKeyId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
    throw new Error(err.detail || 'Registration failed');
  }
  const data: AuthResponse = await res.json();
  setAuthToken(data.access_token);
  return data;
}

export async function createAgentKey(merchantId: string, name: string, scopes: string[]): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/agent/keys/create`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ merchant_id: merchantId, name, scopes }),
  });
  if (!res.ok) throw new Error('Failed to create agent key');
  return res.json();
}

export async function rotateAgentKey(agentId: string, merchantId: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/agent/${agentId}/rotate-key`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ merchant_id: merchantId }),
  });
  if (!res.ok) throw new Error('Failed to rotate agent key');
  return res.json();
}

export async function fetchMerchants(): Promise<Merchant[]> {
  const res = await fetch(`${API_BASE_URL}/merchants`, { headers: getAuthHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch merchants');
  return res.json();
}

export async function fetchMerchant(merchantId: string): Promise<Merchant> {
  const res = await fetch(`${API_BASE_URL}/merchants/${merchantId}`, { headers: getAuthHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch merchant details');
  return res.json();
}

export async function createMerchant(payload: CreateMerchantPayload): Promise<Merchant> {
  const res = await fetch(`${API_BASE_URL}/merchants`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to create merchant');
  }
  return res.json();
}

export async function seedDemoMerchant(): Promise<Merchant> {
  const res = await fetch(`${API_BASE_URL}/merchants/seed`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to seed demo merchant');
  return res.json();
}

export async function fetchCatalogItems(merchantId: string): Promise<CatalogItem[]> {
  const res = await fetch(`${API_BASE_URL}/catalog/items?merchant_id=${merchantId}`, { headers: getAuthHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch catalog items');
  return res.json();
}

export async function createCatalogItem(payload: CreateCatalogItemPayload): Promise<CatalogItem> {
  const res = await fetch(`${API_BASE_URL}/catalog/items`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to create catalog item' }));
    throw new Error(typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail));
  }
  return res.json();
}

export async function updateCatalogItem(itemId: string, payload: UpdateCatalogItemPayload): Promise<CatalogItem> {
  const res = await fetch(`${API_BASE_URL}/catalog/items/${itemId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update catalog item');
  return res.json();
}

export async function deleteCatalogItem(itemId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/catalog/items/${itemId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete catalog item');
}

export async function fetchAgentSchema(merchantId: string): Promise<Record<string, any>> {
  const res = await fetch(`${API_BASE_URL}/catalog/agent-schema?merchant_id=${merchantId}`, { headers: getAuthHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch agent schema');
  return res.json();
}

export async function fetchAuditEvents(params?: {
  merchant_id?: string;
  actor_type?: string;
  action?: string;
  skip?: number;
  limit?: number;
  sort_order?: string;
}): Promise<AuditPaginatedResponse> {
  const queryParams = new URLSearchParams();
  if (params?.merchant_id) queryParams.set('merchant_id', params.merchant_id);
  if (params?.actor_type) queryParams.set('actor_type', params.actor_type);
  if (params?.action) queryParams.set('action', params.action);
  if (params?.skip !== undefined) queryParams.set('skip', params.skip.toString());
  if (params?.limit !== undefined) queryParams.set('limit', params.limit.toString());
  if (params?.sort_order) queryParams.set('sort_order', params.sort_order);

  const res = await fetch(`${API_BASE_URL}/audit/events?${queryParams.toString()}`, { headers: getAuthHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch audit events');
  return res.json();
}

export interface MerchantSettingsPayload {
  name?: string;
  razorpay_key_id?: string;
  max_amount?: number;
  daily_limit?: number;
  allowed_categories?: string[];
  blocked_categories?: string[];
  velocity_limit?: number;
}

export interface MerchantUsageData {
  merchant_id: string;
  merchant_name: string;
  total_transactions: number;
  settled_transactions: number;
  failed_transactions: number;
  total_settled_volume: number;
  period: string;
}

export interface MerchantAgentItem {
  id: string;
  name: string;
  scopes: string[];
  status: string;
  created_at?: string;
  last_used_at?: string;
}

export async function getMerchantMe(): Promise<Merchant> {
  const res = await fetch(`${API_BASE_URL}/merchants/me`, { headers: getAuthHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch merchant profile');
  return res.json();
}

export async function updateMerchantSettings(payload: MerchantSettingsPayload): Promise<Merchant> {
  const res = await fetch(`${API_BASE_URL}/merchants/settings`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update settings' }));
    throw new Error(err.detail || 'Failed to update settings');
  }
  return res.json();
}

export async function getMerchantAgents(): Promise<MerchantAgentItem[]> {
  const res = await fetch(`${API_BASE_URL}/merchants/agents`, { headers: getAuthHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch merchant agents');
  return res.json();
}

export async function createMerchantAgent(name: string, scopes: string[]): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/merchants/agents`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, scopes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create agent' }));
    throw new Error(err.detail || 'Failed to create agent');
  }
  return res.json();
}

export async function getMerchantUsage(): Promise<MerchantUsageData> {
  const res = await fetch(`${API_BASE_URL}/merchants/usage`, { headers: getAuthHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch merchant usage metrics');
  return res.json();
}

export async function fetchMerchantTimeline(range: string = '7d'): Promise<{ date: string; value: number; change: number }[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/merchants/analytics/timeline?range=${range}`, { headers: getAuthHeaders(), cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn('Network error fetching timeline analytics:', err);
    return [];
  }
}

export async function fetchMerchantAgentDistribution(): Promise<{ name: string; value: number; color: string }[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/merchants/analytics/agent-distribution`, { headers: getAuthHeaders(), cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn('Network error fetching agent distribution:', err);
    return [];
  }
}

export async function fetchMerchantDecisionBreakdown(): Promise<{ name: string; count: number; fill: string }[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/merchants/analytics/decision-breakdown`, { headers: getAuthHeaders(), cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn('Network error fetching decision breakdown:', err);
    return [];
  }
}

export async function getWebhooks(): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/webhooks`, { headers: getAuthHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch webhooks');
  return res.json();
}

export async function registerWebhook(url: string, secret?: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/webhooks`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ url, secret }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to register webhook' }));
    throw new Error(err.detail || 'Failed to register webhook');
  }
  return res.json();
}

export async function testWebhook(): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/webhooks/test`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Test webhook failed' }));
    throw new Error(err.detail || 'Test webhook failed');
  }
  return res.json();
}

