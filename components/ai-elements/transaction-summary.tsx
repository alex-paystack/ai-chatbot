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
import type {
  NormalizedStatus,
  NormalizedTransaction,
  TransactionMeta,
} from "~/lib/transactions";
import {
  formatCurrencyAmount,
  inferCurrency,
  sumAmounts,
} from "~/lib/transactions";

export type {
  NormalizedStatus,
  NormalizedTransaction,
  TransactionMeta,
  NormalizedTransactionResult,
} from "~/lib/transactions";

export { normalizeTransactionsFromOutput } from "~/lib/transactions";

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
    <Card className={cn("w-full m-3", className)} {...props}>
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


const capitalize = (value: string) =>
  value.replace(/(^|\s)\w/g, (char) => char.toUpperCase());
