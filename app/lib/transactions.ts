import { z } from "zod";

export type NormalizedStatus = "success" | "failed" | "abandoned" | "other";

export type NormalizedTransaction = {
  id?: string;
  status: NormalizedStatus;
  rawStatus?: string;
  customerName?: string;
  customerEmail?: string;
  failureReason?: string;
  gatewayResponse?: string;
  amount?: number;
  currency?: string;
  createdAt?: string;
};

export type TransactionMeta = {
  total?: number;
  totalVolume?: number;
  currency?: string;
  message?: string;
  page?: number;
  perPage?: number;
  pageCount?: number;
};

export type NormalizedTransactionResult = {
  transactions: NormalizedTransaction[];
  meta: TransactionMeta;
};

const nullableString = z.union([z.string(), z.null()]).optional();

const paystackCustomerSchema = z
  .object({
    email: nullableString,
    first_name: nullableString,
    last_name: nullableString,
    phone: nullableString,
  })
  .passthrough();

const paystackTransactionEntrySchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    reference: z.string().optional(),
    amount: z.number().optional(),
    amount_in_minor: z.number().optional(),
    status: z.string().optional(),
    state: z.string().optional(),
    current_status: z.string().optional(),
    createdAt: z.string().optional(),
    created_at: z.string().optional(),
    gateway_response: z.string().optional(),
    gatewayResponse: z.string().optional(),
    failure_reason: z.string().optional(),
    failureReason: z.string().optional(),
    reason: z.string().optional(),
    status_reason: z.string().optional(),
    customer: paystackCustomerSchema.optional(),
    customer_data: paystackCustomerSchema.optional(),
    customerDetails: paystackCustomerSchema.optional(),
    customer_name: z.string().optional(),
    customerName: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    customer_email: z.string().optional(),
    customerEmail: z.string().optional(),
    authorization: z.record(z.string(), z.unknown()).optional(),
    metadata: z.union([z.record(z.string(), z.unknown()), z.unknown()]).optional(),
    log: z.unknown().optional(),
  })
  .passthrough();

const paystackMetaSchema = z
  .object({
    total: z.number().optional(),
    total_volume: z.number().optional(),
    total_volume_in_minor: z.number().optional(),
    currency: z.string().optional(),
    per_page: z.number().optional(),
    page: z.number().optional(),
    page_count: z.number().optional(),
  })
  .passthrough();

export const paystackTransactionResponseSchema = z.object({
  status: z.boolean().optional(),
  message: z.string().optional(),
  data: z.array(paystackTransactionEntrySchema),
  meta: paystackMetaSchema.optional(),
});

export type PaystackTransactionResponse = z.infer<
  typeof paystackTransactionResponseSchema
>;

export const normalizeTransactionsFromOutput = (
  data: unknown
): NormalizedTransactionResult => {
  if (isTransactionPayload(data)) {
    const transactions = data.data
      .map((entry) => normalizeTransaction(entry))
      .filter((txn): txn is NormalizedTransaction => Boolean(txn));

    const metaRecord = getRecord(data.meta);
    const meta: TransactionMeta = {
      total: asNumber(metaRecord?.total) ?? transactions.length,
      totalVolume: asNumber(
        metaRecord?.total_volume ?? metaRecord?.total_volume_in_minor
      ),
      currency: asString(metaRecord?.currency),
      message: asString(data.message),
      page: asNumber(metaRecord?.page),
      perPage: asNumber(metaRecord?.per_page),
      pageCount: asNumber(metaRecord?.page_count),
    };

    if (!meta.currency) {
      meta.currency = inferCurrency(transactions);
    }

    if (!meta.totalVolume) {
      meta.totalVolume = sumAmounts(transactions);
    }

    return { transactions, meta };
  }

  const candidates = extractTransactionArrays(data);
  const source = candidates.find((set): set is unknown[] => Array.isArray(set));
  const transactions = (source ?? [])
    .map((entry) => normalizeTransaction(entry))
    .filter((txn): txn is NormalizedTransaction => Boolean(txn));

  const record = getRecord(data);
  const recordMeta = getRecord(record?.meta);
  const meta: TransactionMeta = {
    total: asNumber(recordMeta?.total ?? record?.total) ?? transactions.length,
    totalVolume: asNumber(
      recordMeta?.total_volume ?? record?.total_volume
    ),
    currency:
      asString(recordMeta?.currency ?? record?.currency) ??
      inferCurrency(transactions),
    message: asString(record?.message),
  };

  if (!meta.totalVolume) {
    meta.totalVolume = sumAmounts(transactions);
  }

  return { transactions, meta };
};

export const sumAmounts = (
  transactions: NormalizedTransaction[]
): number | undefined => {
  const total = transactions.reduce(
    (acc, txn) => acc + (txn.amount ?? 0),
    0
  );

  return total > 0 ? total : undefined;
};

export const inferCurrency = (transactions: NormalizedTransaction[]) =>
  transactions.find((txn) => txn.currency)?.currency;

export const formatCurrencyAmount = (value: number, currency?: string) => {
  try {
    if (currency) {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(value);
    }

    return new Intl.NumberFormat(undefined, {
      style: "decimal",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return currency
      ? `${currency} ${value.toLocaleString()}`
      : value.toLocaleString();
  }
};

const extractTransactionArrays = (data: unknown): unknown[] => {
  if (!data) return [];

  if (Array.isArray(data)) {
    return [data];
  }

  if (isRecord(data)) {
    const possibleKeys = [
      "transactions",
      "data",
      "items",
      "records",
      "results",
    ];

    return possibleKeys
      .map((key) => data[key])
      .filter((value): value is unknown[] => Array.isArray(value));
  }

  return [];
};

const normalizeTransaction = (entry: unknown): NormalizedTransaction | null => {
  if (!isRecord(entry)) {
    return null;
  }

  const rawStatus = asString(
    entry.status ?? entry.state ?? entry.current_status
  );
  const normalizedStatus = normalizeStatus(rawStatus);

  const customer =
    getRecord(entry.customer) ??
    getRecord(entry.customer_data) ??
    getRecord(entry.customerDetails);
  const authorization = getRecord(entry.authorization);
  const metadata = getRecord(entry.metadata);

  const customerName =
    buildName(
      asString(entry.first_name ?? customer?.first_name),
      asString(entry.last_name ?? customer?.last_name),
      asString(
        customer?.name ??
          entry.customer_name ??
          entry.customerName ??
          entry.name
      )
    ) ?? asString(authorization?.account_name);

  const customerEmail =
    asString(customer?.email) ??
    asString(entry.customer_email ?? entry.email ?? entry.customerEmail) ??
    asString(authorization?.email) ??
    asString(metadata?.email);

  const gatewayResponse = asString(
    entry.gateway_response ?? entry.gatewayResponse
  );

  const failureReason =
    gatewayResponse ??
    asString(entry.failure_reason ?? entry.failureReason) ??
    asString(entry.reason ?? entry.status_reason) ??
    extractErrorFromLog(entry.log);

  const idValue =
    entry.id ?? entry.reference ?? entry.transaction_id ?? entry.transactionId;
  const amount = asNumber(entry.amount ?? entry.amount_in_minor);
  const currency = asString(entry.currency);
  const createdAt = asString(entry.createdAt ?? entry.created_at);

  return {
    id: toId(idValue),
    status: normalizedStatus,
    rawStatus: rawStatus?.toLowerCase(),
    customerName,
    customerEmail,
    failureReason,
    gatewayResponse,
    amount,
    currency,
    createdAt,
  };
};

const normalizeStatus = (value?: string | null): NormalizedStatus => {
  if (!value) {
    return "other";
  }

  const status = value.toLowerCase();

  if (["success", "successful"].includes(status)) {
    return "success";
  }

  if (["failed", "failure", "error"].includes(status)) {
    return "failed";
  }

  if (
    [
      "abandoned",
      "cancelled",
      "canceled",
      "timeout",
      "timed out",
      "expired",
    ].includes(status)
  ) {
    return "abandoned";
  }

  return "other";
};

const buildName = (
  firstName?: string,
  lastName?: string,
  fallback?: string | null
): string | undefined => {
  const parts = [firstName, lastName].filter(Boolean);
  if (parts.length) {
    return parts.join(" ").trim();
  }

  return fallback?.trim() || undefined;
};

const extractErrorFromLog = (log: unknown): string | undefined => {
  const record = getRecord(log);
  if (!record) return undefined;

  if (Array.isArray(record.errors)) {
    const first = record.errors.find((error) => typeof error === "string");
    if (first && typeof first === "string") {
      return first;
    }

    const firstMessage = record.errors
      .map((error) =>
        isRecord(error)
          ? asString(error.message ?? error.detail ?? error.description)
          : undefined
      )
      .find(Boolean);

    if (firstMessage) {
      return firstMessage;
    }
  }

  return asString(record.message);
};

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

const getRecord = (value: unknown): Record<string, unknown> | undefined =>
  isRecord(value) ? value : undefined;

const isRecord = (value: unknown): value is Record<string, any> =>
  typeof value === "object" && value !== null;

const toId = (value: unknown): string | undefined => {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return undefined;
};

const isTransactionPayload = (value: unknown): value is {
  status?: boolean;
  message?: string;
  data: unknown[];
  meta?: Record<string, unknown>;
} => isRecord(value) && Array.isArray(value.data);
