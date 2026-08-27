const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Merchant {
  id: string;
  name: string;
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

export interface CreateMerchantPayload {
  name: string;
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

export async function fetchMerchants(): Promise<Merchant[]> {
  const res = await fetch(`${API_BASE_URL}/merchants`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch merchants');
  return res.json();
}

export async function fetchMerchant(merchantId: string): Promise<Merchant> {
  const res = await fetch(`${API_BASE_URL}/merchants/${merchantId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch merchant details');
  return res.json();
}

export async function createMerchant(payload: CreateMerchantPayload): Promise<Merchant> {
  const res = await fetch(`${API_BASE_URL}/merchants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to seed demo merchant');
  return res.json();
}

export async function fetchCatalogItems(merchantId: string): Promise<CatalogItem[]> {
  const res = await fetch(`${API_BASE_URL}/catalog/items?merchant_id=${merchantId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch catalog items');
  return res.json();
}

export async function createCatalogItem(payload: CreateCatalogItemPayload): Promise<CatalogItem> {
  const res = await fetch(`${API_BASE_URL}/catalog/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update catalog item');
  return res.json();
}

export async function deleteCatalogItem(itemId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/catalog/items/${itemId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete catalog item');
}

export async function fetchAgentSchema(merchantId: string): Promise<Record<string, any>> {
  const res = await fetch(`${API_BASE_URL}/catalog/agent-schema?merchant_id=${merchantId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch agent schema');
  return res.json();
}
