import {
  normalizeTransactionsFromOutput,
  paystackTransactionResponseSchema,
} from "~/lib/transactions";
import type {
  NormalizedTransactionResult,
  PaystackTransactionResponse,
} from "~/lib/transactions";

export type TransactionFetchInput = {
  startDate: string;
  endDate: string;
  perPage?: number;
  page?: number;
  status?: string;
  signal?: AbortSignal;
};

export type FetchTransactionsResult = {
  raw: PaystackTransactionResponse;
  normalized: NormalizedTransactionResult;
};

const PAYSTACK_ENDPOINT =
  "https://studio-api.paystack.co/transaction?reduced_fields=true";

export async function fetchTransactions(
  input: TransactionFetchInput
): Promise<FetchTransactionsResult> {
  const token = process.env.PAYSTACK_JWT;

  if (!token) {
    throw new Error("PAYSTACK_JWT is not configured");
  }

  const params = new URLSearchParams();
  params.set("from", input.startDate);
  params.set("to", input.endDate);

  if (input.perPage) {
    params.set("perPage", String(input.perPage));
  }

  if (input.page) {
    params.set("page", String(input.page));
  }

  if (input.status) {
    params.set("status", input.status);
  }

  const response = await fetch(`${PAYSTACK_ENDPOINT}&${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "jwt-auth": "true",
      Accept: "application/json",
    },
    signal: input.signal,
  });

  const json = (await response.json().catch(() => ({}))) as unknown;

  if (!response.ok) {
    const message =
      (typeof json === "object" && json && "message" in json
        ? String((json as { message?: unknown }).message)
        : undefined) || "Unable to fetch transactions";
    throw new Error(message);
  }

  const parsed = paystackTransactionResponseSchema.parse(json);

  return {
    raw: parsed,
    normalized: normalizeTransactionsFromOutput(parsed),
  };
}
