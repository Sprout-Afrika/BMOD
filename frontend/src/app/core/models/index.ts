export interface User {
  id: string;
  email: string;
  role: 'USER' | 'STAFF' | 'ADMIN';
  is_verified: boolean;
  preferred_currency: 'NGN' | 'USD';
  created_at: string;
}

export interface ProductImage {
  id: string;
  url: string;
  position: number;
  alt_text: string | null;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  category: 'clothes' | 'bags' | 'accessories';
  gender_target: 'men' | 'women' | 'unisex';
  price_ngn: number;
  sizes: string[] | null;
  is_in_stock: boolean;
  is_featured: boolean;
  images: ProductImage[];
  outfit_tags?: Product[];
  recommended?: Product[];
  created_at?: string;
  updated_at?: string;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  page_size: number;
}

export interface CartItem {
  id: string;
  product_id: string;
  product: Product;
  size: string | null;
  quantity: number;
  line_total_ngn: number;
}

export interface Cart {
  items: CartItem[];
  total_ngn: number;
  total_usd: number | null;
  item_count: number;
}

export interface CheckoutRequest {
  customer_name: string;
  phone: string;
  delivery_address: string;
  payment_method: 'Bank Transfer' | 'Cash' | 'POS';
  whatsapp_opt_in: boolean;
}

export interface CheckoutResponse {
  url: string;
  order_summary: string;
  order_ref: string;
  expires_at: string;
}

export interface WishlistItem {
  id: string;
  product_id: string;
  product: Product;
  added_at: string;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface IntegrationStatus {
  services: Record<string, {
    status: 'ok' | 'error' | 'not_configured';
    message: string | null;
  }>;
}
