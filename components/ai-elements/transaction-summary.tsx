"use client";

import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { cn } from "~/lib/utils";
import type { ComponentProps } from "react";

type NormalizedStatus = "success" | "failed" | "abandoned" | "other";

export type NormalizedTransaction = {
  id?: string;
  status: NormalizedStatus;
  rawStatus?: string;
  customerName?: string;
  customerEmail?: string;
  failureReason?: string;
  amount?: number;
  currency?: string;
  createdAt?: string;
};

export type TransactionMeta = {
  total?: number;
  totalVolume?: number;
  currency?: string;
  message?: string;
};

export type NormalizedTransactionResult = {
  transactions: NormalizedTransaction[];
  meta: TransactionMeta;
};

export type TransactionSummaryCardProps = ComponentProps<typeof Card> & {
  transactions: NormalizedTransaction[];
  meta?: TransactionMeta;
  isLoading?: boolean;
};

type CustomerSummary = {
  name?: string;
  email?: string;
  count: number;
};

type FailureReasonSummary = {
  reason: string;
  count: number;
  percentage: number;
};

const STATUS_LABELS: Record<NormalizedStatus, string> = {
  success: "Successful",
  failed: "Failed",
  abandoned: "Abandoned",
  other: "Other",
};

const STATUS_ACCENTS: Record<NormalizedStatus, string> = {
  success: "text-emerald-600",
  failed: "text-rose-600",
  abandoned: "text-amber-600",
  other: "text-muted-foreground",
};

const SkeletonBlock = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse rounded-md bg-muted/60", className)} />
);

export const TransactionSummaryCard = ({
  transactions,
  meta,
  isLoading = false,
  className,
  ...props
}: TransactionSummaryCardProps) => {
  const total = meta?.total ?? transactions.length;
  const statusCounts = transactions.reduce(
    (acc, txn) => {
      acc[txn.status] = (acc[txn.status] ?? 0) + 1;
      return acc;
    },
    {
      success: 0,
      failed: 0,
      abandoned: 0,
      other: 0,
    } satisfies Record<NormalizedStatus, number>
  );

  const customers = summarizeCustomers(transactions);
  const failureReasons = summarizeFailureReasons(transactions);
  const currency = meta?.currency ?? inferCurrency(transactions);
  const totalVolume =
    typeof meta?.totalVolume === "number" && meta.totalVolume > 0
      ? meta.totalVolume
      : sumAmounts(transactions);
  const formattedVolume = totalVolume
    ? formatCurrencyAmount(totalVolume / 100, currency)
    : undefined;
  const showEmptyState = !isLoading && total === 0;

  return (
    <Card className={cn("w-full", className)} {...props}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Transaction Snapshot</CardTitle>
            <CardDescription>
              {isLoading ? (
                <SkeletonBlock className="h-4 w-56" />
              ) : (
                "Overview of your transactions for the selected time period."
              )}
            </CardDescription>
            {isLoading ? (
              <SkeletonBlock className="h-3 w-40" />
            ) : (
              formattedVolume && (
                <p className="text-xs font-medium text-muted-foreground">
                  Total volume {formattedVolume}
                </p>
              )
            )}
          </div>
          {isLoading ? (
            <SkeletonBlock className="h-6 w-16 rounded-full" />
          ) : (
            <Badge variant="secondary" className="text-xs">
              {total} total
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {showEmptyState ? (
          <p className="text-sm text-muted-foreground">
            No transactions were returned for this request.
          </p>
        ) : (
          <div className="space-y-6">
            <section>
              <div className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Status Breakdown
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(Object.keys(STATUS_LABELS) as NormalizedStatus[]).map(
                  (status) => (
                    <div
                      key={status}
                      className="rounded-lg border bg-muted/40 p-4"
                    >
                      {isLoading ? (
                        <div className="space-y-3">
                          <SkeletonBlock className="h-3 w-20" />
                          <SkeletonBlock className="h-7 w-12" />
                        </div>
                      ) : (
                        <>
                          <p className="text-xs text-muted-foreground">
                            {STATUS_LABELS[status]}
                          </p>
                          <p
                            className={cn(
                              "text-2xl font-semibold",
                              STATUS_ACCENTS[status]
                            )}
                          >
                            {statusCounts[status] ?? 0}
                          </p>
                        </>
                      )}
                    </div>
                  )
                )}
              </div>
            </section>

            <Separator />

            <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <header className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Customers</p>
                    <p className="text-xs text-muted-foreground">
                      Unique customers involved in this batch.
                    </p>
                  </div>
                  {isLoading ? (
                    <SkeletonBlock className="h-4 w-16" />
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      {customers.totalUnique} unique
                    </Badge>
                  )}
                </header>
                {isLoading ? (
                  <ul className="divide-y divide-border overflow-hidden rounded-lg border">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <li key={index} className="bg-background/80 p-3">
                        <SkeletonBlock className="h-4 w-40" />
                        <div className="mt-2 flex items-center justify-between">
                          <SkeletonBlock className="h-3 w-32" />
                          <SkeletonBlock className="h-3 w-16" />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : customers.list.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No customer details were included in these transactions.
                  </p>
                ) : (
                  <ul className="divide-y divide-border overflow-hidden rounded-lg border">
                    {customers.list.map((customer) => (
                      <li key={customer.key} className="bg-background/80 p-3">
                        <p className="text-sm font-medium">
                          {customer.name ?? "Unknown customer"}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{customer.email ?? "Email unavailable"}</span>
                          <span>{customer.count} txn</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <header className="mb-3">
                  <p className="text-sm font-medium">Top Failure Reasons</p>
                  <p className="text-xs text-muted-foreground">
                    Derived from non-successful transactions.
                  </p>
                </header>
                {isLoading ? (
                  <ul className="space-y-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <li
                        key={index}
                        className="rounded-lg border bg-muted/30 p-3"
                      >
                        <SkeletonBlock className="h-4 w-32" />
                        <SkeletonBlock className="mt-2 h-3 w-40" />
                      </li>
                    ))}
                  </ul>
                ) : failureReasons.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No failed or abandoned transactions to analyze.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {failureReasons.map((reason) => (
                      <li
                        key={reason.reason}
                        className="rounded-lg border bg-muted/30 p-3"
                      >
                        <p className="text-sm font-medium">{reason.reason}</p>
                        <p className="text-xs text-muted-foreground">
                          {reason.count} cases · {reason.percentage}% of failures
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

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
      totalVolume: asNumber(metaRecord?.total_volume),
      currency: asString(metaRecord?.currency),
      message: asString(data.message),
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
    totalVolume: asNumber(recordMeta?.total_volume ?? record?.total_volume),
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

const summarizeCustomers = (transactions: NormalizedTransaction[]) => {
  const map = new Map<string, CustomerSummary>();

  transactions.forEach((txn, index) => {
    const keySource = (txn.customerEmail ?? txn.customerName ?? txn.id ?? index) as string | number;
    if (!keySource) {
      return;
    }

    const key = typeof keySource === "string" ? keySource.toLowerCase() : String(keySource);
    const existing = map.get(key);

    if (existing) {
      existing.count += 1;
      existing.name = existing.name ?? txn.customerName;
      existing.email = existing.email ?? txn.customerEmail;
    } else {
      map.set(key, {
        name: txn.customerName,
        email: txn.customerEmail,
        count: 1,
      });
    }
  });

  const list = Array.from(map.entries())
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    list,
    totalUnique: map.size,
  };
};

const summarizeFailureReasons = (
  transactions: NormalizedTransaction[]
): FailureReasonSummary[] => {
  const reasons = new Map<string, number>();

  const nonSuccessTxns = transactions.filter((txn) => txn.status !== "success");

  nonSuccessTxns.forEach((txn) => {
    const reason = txn.failureReason?.trim();
    if (!reason) {
      return;
    }

    const key = reason.toLowerCase();
    reasons.set(key, (reasons.get(key) ?? 0) + 1);
  });

  if (reasons.size === 0 || nonSuccessTxns.length === 0) {
    return [];
  }

  return Array.from(reasons.entries())
    .map(([key, count]) => ({
      reason: capitalize(key),
      count,
      percentage: Math.max(
        1,
        Math.round((count / nonSuccessTxns.length) * 100)
      ),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
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
      asString(customer?.first_name ?? entry.first_name),
      asString(customer?.last_name ?? entry.last_name),
      asString(
        customer?.name ??
          entry.customer_name ??
          entry.customerName ??
          entry.name
      )
    ) ?? asString(authorization?.account_name);

  const customerEmail =
    asString(customer?.email) ??
    asString(entry.customer_email ?? entry.email) ??
    asString(authorization?.email) ??
    asString(metadata?.email);

  const failureReason =
    asString(entry.gateway_response ?? entry.gatewayResponse) ??
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

const capitalize = (value: string) =>
  value.replace(/(^|\s)\w/g, (char) => char.toUpperCase());

const sumAmounts = (
  transactions: NormalizedTransaction[]
): number | undefined => {
  const total = transactions.reduce(
    (acc, txn) => acc + (txn.amount ?? 0),
    0
  );

  return total > 0 ? total : undefined;
};

const inferCurrency = (transactions: NormalizedTransaction[]) =>
  transactions.find((txn) => txn.currency)?.currency;

const formatCurrencyAmount = (value: number, currency?: string) => {
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

const isTransactionPayload = (value: unknown): value is {
  status?: boolean;
  message?: string;
  data: unknown[];
  meta?: Record<string, unknown>;
} => isRecord(value) && Array.isArray(value.data);
