export type RoleName = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "CASHIER" | "SUPPORT";

export type PermissionCode =
  | "users:read"
  | "users:manage"
  | "roles:manage"
  | "customers:read"
  | "customers:manage"
  | "packages:read"
  | "packages:manage"
  | "locations:read"
  | "locations:manage"
  | "payments:read"
  | "payments:reconcile"
  | "vouchers:read"
  | "vouchers:manage"
  | "vouchers:sell"
  | "vouchers:redeem"
  | "subscriptions:read"
  | "subscriptions:manage"
  | "network:read"
  | "network:manage"
  | "reports:read"
  | "settings:manage"
  | "audit:read";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  roles: RoleName[];
  permissions: PermissionCode[];
}

export interface PackageDto {
  id: string;
  name: string;
  description: string | null;
  durationValue: number;
  durationUnit: "MINUTE" | "HOUR" | "DAY" | "WEEK" | "MONTH";
  priceTzs: number;
  dataLimitMb: number | null;
  downloadKbps: number | null;
  uploadKbps: number | null;
  maxDevices: number;
  isActive: boolean;
  isArchived: boolean;
  locationIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface LocationDto {
  id: string;
  name: string;
  code: string;
}

export interface DashboardOverview {
  generatedAt: string;
  timezone: string;
  revenue: { totalTzs: number; todayTzs: number; weekTzs: number; monthTzs: number };
  counts: {
    customers: number;
    activeSubscriptions: number;
    expiredSubscriptions: number;
    activeSessions: number;
    pendingPayments: number;
    vouchersSold: number;
    accessPointsOnline: number;
    accessPointsOffline: number;
  };
  revenueLast7Days: Array<{ date: string; amountTzs: number; payments: number }>;
}

export type CustomerStatus = "ACTIVE" | "SUSPENDED";

export interface CustomerListItem {
  id: string;
  fullName: string | null;
  phoneNumber: string;
  status: CustomerStatus;
  subscriptionCount: number;
  paymentCount: number;
  createdAt: string;
}

export interface CustomerDetail {
  id: string;
  fullName: string | null;
  phoneNumber: string;
  email: string | null;
  status: CustomerStatus;
  createdAt: string;
  devices: Array<{ id: string; macAddress: string; lastIpAddress: string | null; lastSeenAt: string | null }>;
  subscriptions: Array<{ id: string; packageName: string; status: string; sourceType: string; startsAt: string | null; expiresAt: string | null }>;
  payments: Array<{ id: string; reference: string; packageName: string; amountTzs: number; status: string; initiatedAt: string }>;
  activeSessionCount: number;
}

export interface PaymentDto {
  id: string;
  reference: string;
  amountTzs: number;
  currency: string;
  phoneNumber: string;
  status: string;
  failureReason: string | null;
  providerTransactionId: string | null;
  packageName: string | null;
  providerCode: string | null;
  providerName: string | null;
  initiatedAt: string;
  paidAt: string | null;
  failedAt: string | null;
}

export interface SubscriptionListItem {
  id: string;
  customerPhone: string;
  customerName: string | null;
  packageName: string;
  locationName: string;
  sourceType: string;
  status: string;
  startsAt: string | null;
  expiresAt: string | null;
}

export interface SubscriptionDetail {
  id: string;
  customer: { id: string; phoneNumber: string; fullName: string | null };
  packageName: string;
  dataLimitMb: number | null;
  maxDevices: number;
  locationName: string;
  sourceType: string;
  status: string;
  startsAt: string | null;
  expiresAt: string | null;
  history: Array<{ from: string | null; to: string; reason: string | null; at: string }>;
  devices: Array<{ macAddress: string; addedAt: string; removedAt: string | null }>;
  authorizations: Array<{ macAddress: string; status: string; lastError: string | null; authorizedAt: string | null }>;
}

export interface VoucherBatchDto {
  id: string;
  name: string;
  packageName: string;
  quantity: number;
  usageLimit: number;
  expiresAt: string | null;
  createdAt: string;
  soldCount: number;
  redeemedCount: number;
  revokedCount: number;
}

export interface VoucherListItem {
  id: string;
  codeHint: string;
  packageName: string;
  status: "ACTIVE" | "REVOKED" | "EXPIRED" | "EXHAUSTED";
  usageLimit: number;
  usedCount: number;
  expiresAt: string | null;
  soldAt: string | null;
  soldChannel: "CASH" | "MOBILE_MONEY" | null;
  soldAmountTzs: number | null;
}

export interface VoucherDetail extends VoucherListItem {
  revokedAt: string | null;
  revokedReason: string | null;
  redemptions: Array<{ id: string; status: string; customerPhone: string | null; macAddress: string; failureReason: string | null; redeemedAt: string }>;
}

export interface VoucherCodeRow {
  id: string;
  code: string | null;
  packageName: string;
  priceTzs: number;
  durationValue: number;
  durationUnit: string;
  usageLimit: number;
  expiresAt: string | null;
  status: string;
}

export interface NetworkOverview {
  dataSource: string;
  note: string;
  controllers: Array<{ id: string; name: string; baseUrl: string; isActive: boolean; lastTestedAt: string | null; lastTestStatus: string | null; lastError: string | null }>;
  sites: Array<{ id: string; name: string; omadaSiteId: string; isActive: boolean; controllerId: string }>;
  accessPoints: Array<{ id: string; name: string; model: string | null; macAddress: string; status: string; lastSeenAt: string | null; networkSiteId: string }>;
  activeSessionCount: number;
  recentEvents: Array<{ id: string; type: string; severity: string; message: string; createdAt: string }>;
}

export interface RevenueReport {
  totalRevenueTzs: number;
  paymentCount: number;
  byDay: Array<{ day: string; revenueTzs: number; count: number }>;
  byPackage: Array<{ packageId: string; packageName: string; revenueTzs: number; count: number }>;
}

export interface VoucherSalesReport {
  soldCount: number;
  totalTzs: number;
  byChannel: Record<string, { count: number; amountTzs: number }>;
}

export interface CustomerGrowthReport {
  newCustomers: number;
  byDay: Array<{ day: string; count: number }>;
}

export interface PaymentProviderDto {
  code: "SELCOM" | "CLICKPESA" | "MOCK";
  name: string;
  isEnabled: boolean;
  isRegistered: boolean;
  isMockInProduction: boolean;
}

export interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  actor: { email: string; name: string } | null;
  createdAt: string;
}
