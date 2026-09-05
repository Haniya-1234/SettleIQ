import { z } from "zod";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export const razorpayConfigSchema = z.object({
  keyId: z.string().min(1),
  keySecret: z.string().min(1),
});

export type RazorpayConfig = z.infer<typeof razorpayConfigSchema>;

export interface RazorpayClientOptions {
  keyId: string;
  keySecret: string;
  baseUrl?: string;
  /** Request timeout in milliseconds. Default: 30 000. */
  timeoutMs?: number;
  /** Maximum retry attempts on transient / 429 errors. Default: 3. */
  maxRetries?: number;
}

// ---------------------------------------------------------------------------
// Query / Pagination helpers
// ---------------------------------------------------------------------------

export type QueryParams = Record<string, string | number | boolean | undefined>;

export interface PaginationOptions {
  /** Unix timestamp – fetch records created after this time. */
  from?: number;
  /** Unix timestamp – fetch records created before this time. */
  to?: number;
  /** Number of records to fetch (Razorpay max is 100). Default: 100. */
  count?: number;
  /** Number of records to skip (for pagination). Default: 0. */
  skip?: number;
}

// ---------------------------------------------------------------------------
// Razorpay API response shapes
// ---------------------------------------------------------------------------

export interface RazorpayPayment {
  id: string;
  entity: "payment";
  amount: number;
  currency: string;
  status: string;
  order_id: string | null;
  method: string | null;
  description: string | null;
  email: string | null;
  contact: string | null;
  error_code: string | null;
  error_description: string | null;
  error_source: string | null;
  error_step: string | null;
  error_reason: string | null;
  notes: Record<string, string>;
  fee: number | null;
  tax: number | null;
  captured: boolean;
  created_at: number;
  [key: string]: unknown;
}

export interface RazorpayOrder {
  id: string;
  entity: "order";
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string | null;
  status: string;
  notes: Record<string, string>;
  created_at: number;
  [key: string]: unknown;
}

export interface RazorpaySettlement {
  id: string;
  entity: "settlement";
  amount: number;
  status: string;
  fees: number;
  tax: number;
  utr: string | null;
  created_at: number;
  [key: string]: unknown;
}

interface RazorpayListResponse<T> {
  entity: "collection";
  count: number;
  items: T[];
}

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class RazorpayAPIError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string | null;
  public readonly response: unknown;

  constructor(
    message: string,
    statusCode: number,
    errorCode: string | null,
    response: unknown,
  ) {
    super(message);
    this.name = "RazorpayAPIError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.response = response;
  }
}

// ---------------------------------------------------------------------------
// Client implementation
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_PAGE_SIZE = 100;
const INITIAL_RETRY_DELAY_MS = 1_000;

/**
 * Typed Razorpay API client wrapper.
 *
 * - Uses native `fetch` (Node 20+).
 * - Authenticates via HTTP Basic Auth.
 * - Retries on 429 (rate-limit) and transient 5xx errors with exponential back-off.
 * - Each method fetches a single page; the sync layer is responsible for iterating.
 */
export class RazorpayClient {
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(options: RazorpayClientOptions) {
    const config = razorpayConfigSchema.parse(options);
    this.keyId = config.keyId;
    this.keySecret = config.keySecret;
    this.baseUrl = options.baseUrl ?? "https://api.razorpay.com/v1";
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  get isConfigured(): boolean {
    return Boolean(this.keyId && this.keySecret);
  }

  /** Returns client metadata without exposing secrets. */
  getInfo(): { keyId: string; baseUrl: string } {
    return { keyId: this.keyId, baseUrl: this.baseUrl };
  }

  // -------------------------------------------------------------------------
  // Payments
  // -------------------------------------------------------------------------

  /** Fetch a single page of payments. */
  async getPayments(options?: PaginationOptions): Promise<RazorpayPayment[]> {
    const res = await this.request<RazorpayListResponse<RazorpayPayment>>(
      "GET",
      "/payments",
      paginationToParams(options),
    );
    return res.items;
  }

  /** Fetch a single payment by its Razorpay ID. */
  async getPaymentById(paymentId: string): Promise<RazorpayPayment> {
    return this.request<RazorpayPayment>("GET", `/payments/${paymentId}`);
  }

  /** Fetch payments linked to a specific order via /v1/orders/:id/payments. */
  async getPaymentsForOrder(
    orderId: string,
    _options?: PaginationOptions,
  ): Promise<RazorpayPayment[]> {
    const res = await this.request<RazorpayListResponse<RazorpayPayment>>(
      "GET",
      `/orders/${orderId}/payments`,
    );
    return res.items;
  }

  // -------------------------------------------------------------------------
  // Orders
  // -------------------------------------------------------------------------

  /** Fetch a single page of orders. */
  async getOrders(options?: PaginationOptions): Promise<RazorpayOrder[]> {
    const res = await this.request<RazorpayListResponse<RazorpayOrder>>(
      "GET",
      "/orders",
      paginationToParams(options),
    );
    return res.items;
  }

  /** Fetch a single order by its Razorpay ID. */
  async getOrderById(orderId: string): Promise<RazorpayOrder> {
    return this.request<RazorpayOrder>("GET", `/orders/${orderId}`);
  }

  // -------------------------------------------------------------------------
  // Settlements
  // -------------------------------------------------------------------------

  /** Fetch a single page of settlements. */
  async getSettlements(
    options?: PaginationOptions,
  ): Promise<RazorpaySettlement[]> {
    const res = await this.request<RazorpayListResponse<RazorpaySettlement>>(
      "GET",
      "/settlements",
      paginationToParams(options),
    );
    return res.items;
  }

  /** Fetch a single settlement by its Razorpay ID. */
  async getSettlementById(settlementId: string): Promise<RazorpaySettlement> {
    return this.request<RazorpaySettlement>(
      "GET",
      `/settlements${settlementId}`,
    );
  }

  // -------------------------------------------------------------------------
  // Core HTTP transport
  // -------------------------------------------------------------------------

  private async request<T>(
    method: string,
    path: string,
    params?: QueryParams,
  ): Promise<T> {
    const url = this.buildUrl(path, params);
    const headers = this.buildHeaders();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(url, {
          method,
          headers,
          signal: controller.signal,
          cache: "no-store",
        } as any);

        if (response.ok) {
          return (await response.json()) as T;
        }

        const body = await response.text();
        let parsed: unknown;
        try {
          parsed = JSON.parse(body);
        } catch {
          parsed = body;
        }

        // Retry on 429 rate-limit or transient 5xx
        if (response.status === 429 || response.status >= 500) {
          const retryAfterHeader = response.headers.get("retry-after");
          const delayMs = retryAfterHeader
            ? Number(retryAfterHeader) * 1000
            : INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);

          lastError = new RazorpayAPIError(
            `Razorpay API ${response.status}: ${body}`,
            response.status,
            extractErrorCode(parsed),
            parsed,
          );

          if (attempt < this.maxRetries) {
            await sleep(delayMs);
            continue;
          }
        }

        // Non-retryable error
        throw new RazorpayAPIError(
          `Razorpay API ${response.status}: ${body}`,
          response.status,
          extractErrorCode(parsed),
          parsed,
        );
      } catch (error) {
        if (error instanceof RazorpayAPIError) throw error;

        lastError =
          error instanceof Error ? error : new Error(String(error));

        if (attempt < this.maxRetries) {
          await sleep(INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt));
          continue;
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError ?? new Error("Razorpay request failed after retries");
  }

  private buildUrl(path: string, params?: QueryParams): string {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private buildHeaders(): Record<string, string> {
    const credentials = Buffer.from(
      `${this.keyId}:${this.keySecret}`,
    ).toString("base64");

    return {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createRazorpayClient(
  keyId: string | undefined,
  keySecret: string | undefined,
): RazorpayClient | null {
  if (!keyId || !keySecret) return null;
  return new RazorpayClient({ keyId, keySecret });
}

// ---------------------------------------------------------------------------
// Helpers (private)
// ---------------------------------------------------------------------------

function paginationToParams(options?: PaginationOptions): QueryParams {
  if (!options) return {};
  return {
    from: options.from,
    to: options.to,
    count: options.count ?? DEFAULT_PAGE_SIZE,
    skip: options.skip,
  };
}

function extractErrorCode(body: unknown): string | null {
  if (body && typeof body === "object" && "error" in body) {
    const err = (body as Record<string, unknown>).error;
    if (err && typeof err === "object" && "code" in err) {
      return String((err as Record<string, unknown>).code);
    }
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
