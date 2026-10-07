/**
 * Barrsa Seller API Client
 *
 * Used by the OpenClaw plugin to call back into the Barrsa Configuration API.
 * Barrsa owns the data; OpenClaw is the intelligent operator.
 */

export class BarrsaSellerClient {
  private baseUrl: string;
  private token: string;
  private userId?: string;

  constructor(baseUrl: string, token: string, userId?: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.token = token;
    this.userId = userId;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}/seller${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.token}`,
    };

    if (this.userId) {
      headers["X-User-ID"] = this.userId;
    }

    const options: RequestInit = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const msg =
        (data as Record<string, string>)?.error || `HTTP ${response.status}`;
      throw new Error(`Barrsa API error: ${msg}`);
    }

    return (data as Record<string, T>)?.data ?? (data as T);
  }

  // ── Categories ──────────────────────────────────────────────────

  async listCategories() {
    return this.request("GET", "/categories");
  }

  // ── Profile ─────────────────────────────────────────────────────

  async getSellerProfile() {
    return this.request("GET", "/profile");
  }

  // ── Products ────────────────────────────────────────────────────

  async createProduct(data: Record<string, unknown>) {
    return this.request("POST", "/products", data);
  }

  async updateProduct(productId: string, data: Record<string, unknown>) {
    return this.request("PATCH", `/products/${productId}`, data);
  }

  async getProduct(productId: string) {
    return this.request("GET", `/products/${productId}`);
  }

  // ── Versions ────────────────────────────────────────────────────

  async createProductVersion(
    productId: string,
    data: Record<string, unknown>,
  ) {
    return this.request("POST", `/products/${productId}/versions`, data);
  }

  // ── Assets ──────────────────────────────────────────────────────

  async createAsset(productId: string, data: Record<string, unknown>) {
    return this.request("POST", `/products/${productId}/assets`, data);
  }

  // ── Listing Outputs ─────────────────────────────────────────────

  async createListingOutput(productId: string, data: Record<string, unknown>) {
    return this.request("POST", `/products/${productId}/listings`, data);
  }

  // ── Approvals ───────────────────────────────────────────────────

  async createApproval(data: Record<string, unknown>) {
    return this.request("POST", "/approvals", data);
  }

  // ── Publishing ──────────────────────────────────────────────────

  async publish(data: Record<string, unknown>) {
    return this.request("POST", "/publishing/publish", data);
  }

  async listPublishingJobs(params?: Record<string, unknown>) {
    const query = new URLSearchParams();
    if (params?.productId) query.set("productId", String(params.productId));
    if (params?.status) query.set("status", String(params.status));
    const qs = query.toString();
    return this.request("GET", `/publishing/jobs${qs ? `?${qs}` : ""}`);
  }

  // ── Social Accounts ─────────────────────────────────────────────

  async listSocialAccounts() {
    return this.request("GET", "/social-accounts");
  }

  // ── Publishing Targets ──────────────────────────────────────────

  async listPublishingTargets() {
    return this.request("GET", "/publishing-targets");
  }

  // ── Promotions ──────────────────────────────────────────────────

  async createPromotion(data: Record<string, unknown>) {
    return this.request("POST", "/promotions", data);
  }

  // ── Orders (Marketplace Economy) ────────────────────────────────

  async createOrder(data: Record<string, unknown>) {
    return this.request("POST", "/orders", data);
  }

  async getOrder(orderId: string) {
    return this.request("GET", `/orders/${orderId}`);
  }

  async listOrders(params?: Record<string, unknown>) {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", String(params.status));
    if (params?.productId) query.set("productId", String(params.productId));
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString();
    return this.request("GET", `/orders${qs ? `?${qs}` : ""}`);
  }

  async updateOrder(orderId: string, data: Record<string, unknown>) {
    return this.request("PATCH", `/orders/${orderId}`, data);
  }

  async confirmPayment(orderId: string, data: Record<string, unknown>) {
    return this.request("POST", `/orders/${orderId}/confirm-payment`, data);
  }

  // ── Wallet ──────────────────────────────────────────────────────

  async getWalletSettings() {
    return this.request("GET", "/wallet/settings");
  }

  async getWalletBalances(params?: { chain?: string; refresh?: boolean }) {
    const query = new URLSearchParams();
    if (params?.chain) query.set("chain", params.chain);
    if (params?.refresh) query.set("refresh", "true");
    const qs = query.toString();
    return this.request("GET", `/wallet/balances${qs ? `?${qs}` : ""}`);
  }

  async requestWalletTransfer(data: Record<string, unknown>) {
    return this.request("POST", "/wallet/transfers", data);
  }

  async requestWalletSwap(data: Record<string, unknown>) {
    return this.request("POST", "/wallet/swaps", data);
  }

  async listWalletActions(params?: Record<string, unknown>) {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", String(params.status));
    if (params?.actionType) query.set("actionType", String(params.actionType));
    const qs = query.toString();
    return this.request("GET", `/wallet/actions${qs ? `?${qs}` : ""}`);
  }

  async getWalletTransactions(params?: Record<string, unknown>) {
    const query = new URLSearchParams();
    if (params?.chain) query.set("chain", String(params.chain));
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString();
    return this.request("GET", `/wallet/transactions${qs ? `?${qs}` : ""}`);
  }

  async createWalletPaymentLink(data: Record<string, unknown>) {
    return this.request("POST", "/wallet/payment-links", data);
  }
}
