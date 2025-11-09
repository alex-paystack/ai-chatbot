import { useMemo, useState, type ReactNode } from "react";
import type { Route } from "./+types/transactions";
import { Form, Link, data, useLoaderData, useNavigation } from "react-router";
import { z } from "zod";
import { fetchTransactions } from "~/lib/transactions.server";
import type {
  NormalizedTransactionResult,
  TransactionMeta,
} from "~/lib/transactions";
import { formatCurrencyAmount } from "~/lib/transactions";
import type { AssistantPageContext } from "~/lib/assistant-context";
import { PageAssistantProvider } from "~/components/assistant/page-assistant-context";
import { AssistantDock } from "~/components/assistant/assistant-dock";
import { TransactionsTable } from "~/components/transactions/transactions-table";
import { TransactionSummaryCard } from "../../components/ai-elements/transaction-summary";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { MessageCircleIcon } from "lucide-react";

const ROWS_PER_PAGE = 25;
const DEFAULT_RANGE_DAYS = 30;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const statusOptions = ["all", "success", "failed", "abandoned", "other"] as const;

const filtersSchema = z.object({
  from: z.string().regex(DATE_PATTERN).optional(),
  to: z.string().regex(DATE_PATTERN).optional(),
  status: z.enum(statusOptions).optional(),
  page: z.coerce.number().int().min(1).optional(),
});

type TransactionStatusFilter = (typeof statusOptions)[number];

type TransactionFilters = {
  from: string;
  to: string;
  status: TransactionStatusFilter;
  page: number;
};

export const meta = () => [{ title: "Transactions" }];

export const loader = async ({ request }: Route.LoaderArgs) => {
  const url = new URL(request.url);
  const raw = {
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
  };

  const parsed = filtersSchema.safeParse(raw);
  const fallbackRange = getDefaultDateRange();

  let filters: TransactionFilters = {
    from: parsed.success && parsed.data.from ? parsed.data.from : fallbackRange.from,
    to: parsed.success && parsed.data.to ? parsed.data.to : fallbackRange.to,
    status:
      parsed.success && parsed.data.status ? parsed.data.status : "all",
    page: parsed.success && parsed.data.page ? parsed.data.page : 1,
  };

  filters = ensureChronologicalOrder(filters);

  try {
    const fetchResult = await fetchTransactions({
      startDate: filters.from,
      endDate: filters.to,
      perPage: ROWS_PER_PAGE,
      page: filters.page,
      status: filters.status === "all" ? undefined : filters.status,
    });

    const assistantContext = buildAssistantContext({
      data: fetchResult.normalized,
      filters,
    });

    return data({
      transactions: fetchResult.normalized.transactions,
      meta: fetchResult.normalized.meta,
      filters,
      perPage: ROWS_PER_PAGE,
      error: null as string | null,
      assistantContext,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to fetch transactions";

    const emptyResult: NormalizedTransactionResult = {
      transactions: [],
      meta: {},
    };

    const assistantContext = buildAssistantContext({
      data: emptyResult,
      filters,
      error: message,
    });

    return data(
      {
        transactions: [] as NormalizedTransactionResult["transactions"],
        meta: {} as TransactionMeta,
        filters,
        perPage: ROWS_PER_PAGE,
        error: message,
        assistantContext,
      },
      { status: 500 }
    );
  }
};

export default function TransactionsRoute() {
  const { transactions, meta, filters, perPage, error, assistantContext } =
    useLoaderData<Route.ComponentProps["loaderData"]>();
  const navigation = useNavigation();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const isLoading = navigation.state !== "idle";

  const totalRecords = meta?.total ?? transactions.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / perPage));
  const hasNextPage =
    meta?.total != null
      ? filters.page < totalPages
      : transactions.length === perPage;

  const buildPageLink = (page: number) => {
    const params = new URLSearchParams({
      from: filters.from,
      to: filters.to,
      status: filters.status,
      page: String(page),
    });
    return `/transactions?${params.toString()}`;
  };

  const filterProps = useMemo(() => filters, [filters]);

  return (
    <PageAssistantProvider value={assistantContext}>
      <main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Dashboard
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-bold">Transactions</h1>
            <div className="text-sm text-muted-foreground">
              Last refreshed {new Date().toLocaleTimeString()}
            </div>
          </div>
        </header>

        <FiltersForm filters={filterProps} isSubmitting={isLoading} />

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Unable to load transactions</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <TransactionSummaryCard
          transactions={transactions}
          meta={meta}
          isLoading={isLoading && transactions.length === 0}
        />

        <TransactionsTable
          transactions={transactions}
          isLoading={isLoading}
          currency={meta?.currency}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            Page {filters.page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              asChild
              disabled={filters.page <= 1 || isLoading}
            >
              <Link to={buildPageLink(Math.max(1, filters.page - 1))}>Prev</Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              disabled={!hasNextPage || isLoading}
            >
              <Link to={buildPageLink(filters.page + 1)}>Next</Link>
            </Button>
          </div>
        </div>
      </main>

      <AssistantDock open={assistantOpen} onClose={() => setAssistantOpen(false)} />

      <Button
        type="button"
        size="icon-lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
        onClick={() => setAssistantOpen(true)}
        aria-label="Open assistant"
      >
        <MessageCircleIcon className="size-5" />
      </Button>
    </PageAssistantProvider>
  );
}

const FiltersForm = ({
  filters,
  isSubmitting,
}: {
  filters: TransactionFilters;
  isSubmitting: boolean;
}) => {
  return (
    <Form
      method="get"
      className="rounded-2xl border bg-card p-4 shadow-sm"
    >
      <input type="hidden" name="page" value={1} />
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="From">
          <Input type="date" name="from" defaultValue={filters.from} max={filters.to} />
        </Field>
        <Field label="To">
          <Input type="date" name="to" defaultValue={filters.to} min={filters.from} />
        </Field>
        <Field label="Status">
          <select
            name="status"
            defaultValue={filters.status}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option === "all" ? "All statuses" : option}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Updating…" : "Apply filters"}
        </Button>
        <Button variant="ghost" asChild>
          <Link to="/transactions">Reset</Link>
        </Button>
      </div>
    </Form>
  );
};

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
    {label}
    <div className="mt-1">{children}</div>
  </label>
);

const getDefaultDateRange = () => {
  const now = new Date();
  const to = formatDateInput(now);
  const start = new Date(now);
  start.setDate(start.getDate() - (DEFAULT_RANGE_DAYS - 1));
  const from = formatDateInput(start);
  return { from, to };
};

const ensureChronologicalOrder = (filters: TransactionFilters) => {
  const fromDate = new Date(filters.from);
  const toDate = new Date(filters.to);

  if (fromDate > toDate) {
    return {
      ...filters,
      from: formatDateInput(toDate),
      to: formatDateInput(fromDate),
    };
  }

  return filters;
};

const formatDateInput = (date: Date) => date.toISOString().slice(0, 10);

const buildAssistantContext = ({
  data,
  filters,
  error,
}: {
  data: NormalizedTransactionResult;
  filters: TransactionFilters;
  error?: string | null;
}): AssistantPageContext => {
  const { transactions, meta } = data;
  const summary = error
    ? `Latest fetch failed: ${error}`
    : `Showing ${transactions.length} of ${meta.total ?? transactions.length} transactions from ${filters.from} to ${filters.to} (status: ${filters.status}).`;

  const tableRows = transactions.slice(0, 25).map((txn) => ({
    id: txn.id,
    values: {
      id: txn.id ?? "n/a",
      customer: txn.customerName ?? "Unknown",
      email: txn.customerEmail ?? "Unknown",
      amount:
        typeof txn.amount === "number"
          ? formatCurrencyAmount(
              txn.amount / 100,
              txn.currency ?? meta.currency
            )
          : "—",
      status: txn.status,
      createdAt: txn.createdAt ?? "",
      gatewayResponse: txn.gatewayResponse ?? txn.failureReason ?? "—",
    },
    note: txn.failureReason,
  }));

  const stats = {
    visibleRows: transactions.length,
    totalTransactions: meta.total ?? transactions.length,
    totalVolumeMinor: meta.totalVolume ?? 0,
    successCount: transactions.filter((txn) => txn.status === "success").length,
    failedCount: transactions.filter((txn) => txn.status === "failed").length,
    abandonedCount: transactions.filter((txn) => txn.status === "abandoned").length,
  } satisfies Record<string, number>;

  return {
    pageId: "transactions-dashboard",
    title: "Transactions Dashboard",
    description: "Detailed Paystack transaction table",
    path: "/transactions",
    timestamp: new Date().toISOString(),
    summary,
    filters: {
      from: filters.from,
      to: filters.to,
      status: filters.status,
      page: String(filters.page),
    },
    stats,
    table: {
      columns: [
        "ID",
        "Customer",
        "Email",
        "Amount",
        "Status",
        "Created",
        "Gateway Response",
      ],
      visibleCount: transactions.length,
      rows: tableRows,
    },
    highlights: error ? [error] : undefined,
  } satisfies AssistantPageContext;
};
