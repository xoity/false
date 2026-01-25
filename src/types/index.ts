// Banner module types
export interface Banner {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  link_url?: string;
  is_active: boolean;
  display_order: number;
  start_date?: Date;
  end_date?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBannerDTO {
  title: string;
  description?: string;
  image_url: string;
  link_url?: string;
  is_active?: boolean;
  display_order?: number;
  start_date?: Date;
  end_date?: Date;
}

export interface UpdateBannerDTO {
  title?: string;
  description?: string;
  image_url?: string;
  link_url?: string;
  is_active?: boolean;
  display_order?: number;
  start_date?: Date;
  end_date?: Date;
}

// API response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Medusa service types
export interface MedusaModuleService {
  retrieve(id: string, config?: FindConfig): Promise<unknown>;
  list(filters?: Record<string, unknown>, config?: FindConfig): Promise<unknown[]>;
  create(data: Record<string, unknown>): Promise<unknown>;
  update(id: string, data: Record<string, unknown>): Promise<unknown>;
  delete(id: string): Promise<void>;
}

export interface FindConfig {
  select?: string[];
  relations?: string[];
  skip?: number;
  take?: number;
  order?: Record<string, "ASC" | "DESC">;
}

// Product metadata types
export interface ProductMetadata {
  brandId?: string; // Brand ID: '1'-'6' for Crossbow, Vigo Boutique, Vigo Shoes, Stepsstar, Stepsstar Kids, Louis Cardy
  brand?: string; // Legacy field - kept for backwards compatibility
  material?: string;
  care_instructions?: string;
  country_of_origin?: string;
  is_featured?: boolean;
  featured_order?: number;
  seo_title?: string;
  seo_description?: string;
  tags?: string[];
}

// Brand information
export interface BrandInfo {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export const BRANDS: Record<string, BrandInfo> = {
  "1": { id: "1", name: "Crossbow", slug: "crossbow", description: "Quality footwear" },
  "2": { id: "2", name: "Vigo Boutique", slug: "vigo-boutique", description: "Elegant abayas" },
  "3": {
    id: "3",
    name: "Vigo Shoes",
    slug: "vigo-shoes",
    description: "All sorts of shoes and items",
  },
  "4": { id: "4", name: "Stepsstar", slug: "stepsstar", description: "Fashion constellation" },
  "5": { id: "5", name: "Stepsstar Kids", slug: "stepsstar-kids", description: "Kids fashion" },
  "6": {
    id: "6",
    name: "Louis Cardy",
    slug: "louis-cardy",
    description: "Modern style and elegance",
  },
};

// Inventory types
export interface InventoryLevel {
  id: string;
  inventory_item_id: string;
  location_id: string;
  stocked_quantity: number;
  reserved_quantity: number;
  incoming_quantity: number;
  available_quantity: number;
  created_at: Date;
  updated_at: Date;
}

export interface InventoryItem {
  id: string;
  sku: string;
  origin_country?: string;
  hs_code?: string;
  mid_code?: string;
  material?: string;
  weight?: number;
  length?: number;
  height?: number;
  width?: number;
  requires_shipping: boolean;
  created_at: Date;
  updated_at: Date;
}

// Pricing types
export interface Price {
  id: string;
  currency_code: string;
  amount: number;
  min_quantity?: number;
  max_quantity?: number;
  price_list_id?: string;
  variant_id: string;
  region_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface PriceList {
  id: string;
  name: string;
  description?: string;
  type: "sale" | "override";
  status: "active" | "draft";
  starts_at?: Date;
  ends_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// Shipping types
export interface ShippingOption {
  id: string;
  name: string;
  region_id: string;
  profile_id: string;
  provider_id: string;
  price_type: "flat_rate" | "calculated";
  amount?: number;
  is_return: boolean;
  admin_only: boolean;
  data: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface FulfillmentProvider {
  id: string;
  is_installed: boolean;
}

// Customer types
export interface Customer {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  billing_address_id?: string;
  phone?: string;
  has_account: boolean;
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface CustomerGroup {
  id: string;
  name: string;
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

// Order types
export interface Order {
  id: string;
  status: OrderStatus;
  fulfillment_status: FulfillmentStatus;
  payment_status: PaymentStatus;
  display_id: number;
  cart_id?: string;
  customer_id: string;
  email: string;
  billing_address_id?: string;
  shipping_address_id?: string;
  region_id: string;
  currency_code: string;
  tax_rate?: number;
  subtotal: number;
  tax_total: number;
  shipping_total: number;
  discount_total: number;
  gift_card_total: number;
  total: number;
  refunded_total: number;
  paid_total: number;
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  canceled_at?: Date;
}

export type OrderStatus = "pending" | "completed" | "archived" | "canceled" | "requires_action";

export type FulfillmentStatus =
  | "not_fulfilled"
  | "partially_fulfilled"
  | "fulfilled"
  | "partially_shipped"
  | "shipped"
  | "partially_returned"
  | "returned"
  | "canceled"
  | "requires_action";

export type PaymentStatus =
  | "not_paid"
  | "awaiting"
  | "captured"
  | "partially_refunded"
  | "refunded"
  | "canceled"
  | "requires_action";

// Workflow types
export interface WorkflowContext {
  container: unknown;
  manager: unknown;
}

export interface WorkflowInput<T = Record<string, unknown>> {
  data: T;
  context: WorkflowContext;
}

export interface WorkflowOutput<T = Record<string, unknown>> {
  data: T;
  success: boolean;
  error?: string;
}

// Subscriber types
export interface SubscriberConfig {
  event: string;
  context: {
    subscriberId: string;
  };
}

export interface SubscriberArgs<T = unknown> {
  event: {
    name: string;
    data: T;
    metadata?: Record<string, unknown>;
  };
  container: unknown;
  pluginOptions: Record<string, unknown>;
}

// Job types
export interface JobConfig {
  name: string;
  schedule: string;
  data?: Record<string, unknown>;
}

export interface JobContext {
  container: unknown;
  logger: Logger;
}

export interface Logger {
  error(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

// Admin API types
export interface AdminAuthRequest {
  email: string;
  password: string;
}

export interface AdminAuthResponse {
  user: AdminUser;
  token: string;
  expires_at: Date;
}

export interface AdminUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: AdminRole;
  api_token?: string;
  created_at: Date;
  updated_at: Date;
}

export type AdminRole = "admin" | "member" | "developer";

// Type guards
export function isBanner(obj: unknown): obj is Banner {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "id" in obj &&
    "title" in obj &&
    "image_url" in obj &&
    typeof (obj as Banner).id === "string" &&
    typeof (obj as Banner).title === "string"
  );
}

export function isOrder(obj: unknown): obj is Order {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "id" in obj &&
    "status" in obj &&
    "total" in obj &&
    typeof (obj as Order).id === "string"
  );
}

// Utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// HTTP types
export interface RequestWithUser extends Request {
  user?: AdminUser;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  statusCode: number;
}
