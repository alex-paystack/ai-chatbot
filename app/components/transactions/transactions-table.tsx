import type { NormalizedTransaction } from "~/lib/transactions";
import { formatCurrencyAmount } from "~/lib/transactions";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

type TransactionsTableProps = {
  transactions: NormalizedTransaction[];
  isLoading?: boolean;
  currency?: string;
};

const STATUS_STYLES: Record<NormalizedTransaction["status"], string> = {
  success: "bg-emerald-500/10 text-emerald-600",
  failed: "bg-rose-500/10 text-rose-600",
  abandoned: "bg-amber-500/10 text-amber-600",
  other: "bg-muted text-foreground",
};

export const TransactionsTable = ({
  transactions,
  isLoading = false,
  currency,
}: TransactionsTableProps) => {
  const showEmptyState = !isLoading && transactions.length === 0;

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Transaction</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3">Gateway Response</th>
          </tr>
        </thead>
        <tbody>
          {isLoading
            ? Array.from({ length: 6 }).map((_, index) => (
                <SkeletonRow key={`skeleton-${index}`} />
              ))
            : showEmptyState
              ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm text-muted-foreground"
                  >
                    No transactions match the selected filters.
                  </td>
                </tr>
              )
              : transactions.map((txn, index) => (
                  <tr key={txn.id ?? `${txn.createdAt ?? "txn"}-${index}`}>
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium">
                        {txn.id ?? "Unknown ID"}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {txn.rawStatus ?? "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium">
                        {txn.customerName ?? "Unnamed customer"}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {txn.customerEmail ?? "Email unavailable"}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {formatAmount(txn.amount, txn.currency ?? currency)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Badge
                        className={cn(
                          "text-xs font-semibold capitalize",
                          STATUS_STYLES[txn.status]
                        )}
                      >
                        {txn.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 align-top text-sm">
                      {formatDate(txn.createdAt)}
                    </td>
                    <td className="px-4 py-3 align-top text-sm text-muted-foreground">
                      {txn.failureReason ?? txn.rawStatus ?? "—"}
                    </td>
                  </tr>
                ))}
        </tbody>
      </table>
    </div>
  );
};

const SkeletonRow = () => (
  <tr className="animate-pulse border-b last:border-0">
    {Array.from({ length: 6 }).map((_, index) => (
      <td key={index} className="px-4 py-4">
        <div className="h-4 w-full rounded bg-muted" />
      </td>
    ))}
  </tr>
);

const formatAmount = (amount?: number, currency?: string) => {
  if (typeof amount !== "number") {
    return "—";
  }

  return formatCurrencyAmount(amount / 100, currency);
};

const formatDate = (value?: string) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};
